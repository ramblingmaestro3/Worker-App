"""Messaging business rules.  HTTP and Socket.IO both use this service."""

from datetime import datetime
from sqlalchemy import or_
from sqlalchemy.exc import IntegrityError
from app.models import db, Conversation, Message, User


class MessageService:
    MAX_MESSAGE_LENGTH = 4000

    @staticmethod
    def _account_type(user):
        return 'worker' if user.role == 'worker' else 'user' if user.role == 'customer' else None

    @classmethod
    def _validate_pair(cls, sender, receiver):
        sender_type, receiver_type = cls._account_type(sender), cls._account_type(receiver)
        if not sender_type or not receiver_type or sender_type == receiver_type:
            return None, 'Conversations are only available between a customer and a worker'
        return (sender_type, receiver_type), None

    @staticmethod
    def _clean_message(value):
        if not isinstance(value, str):
            return None, 'Message must be text'
        value = value.replace('\x00', '').strip()
        if not value:
            return None, 'Message cannot be empty'
        if len(value) > MessageService.MAX_MESSAGE_LENGTH:
            return None, f'Message cannot exceed {MessageService.MAX_MESSAGE_LENGTH} characters'
        return value, None

    @classmethod
    def get_or_create_conversation(cls, sender, receiver):
        pair, error = cls._validate_pair(sender, receiver)
        if error:
            return None, error
        customer_id = sender.id if pair[0] == 'user' else receiver.id
        worker_id = sender.id if pair[0] == 'worker' else receiver.id
        conversation = Conversation.query.filter_by(user_id=customer_id, worker_id=worker_id).first()
        if conversation:
            return conversation, None
        try:
            conversation = Conversation(user_id=customer_id, worker_id=worker_id)
            db.session.add(conversation)
            db.session.flush()
            return conversation, None
        except IntegrityError:
            # A concurrent first message may create the unique pairing first.
            db.session.rollback()
            return Conversation.query.filter_by(user_id=customer_id, worker_id=worker_id).first(), None

    @classmethod
    def send_message(cls, sender_id, receiver_id=None, content=None, conversation_id=None, **kwargs):
        sender = db.session.get(User, sender_id)
        receiver = db.session.get(User, receiver_id) if receiver_id else None
        if not sender or not sender.is_active:
            return None, 'Sender not found or inactive'
        if conversation_id:
            conversation = db.session.get(Conversation, conversation_id)
            if not conversation or sender.id not in (conversation.user_id, conversation.worker_id):
                return None, 'Conversation not found or access denied'
            receiver_id = conversation.worker_id if sender.id == conversation.user_id else conversation.user_id
            receiver = db.session.get(User, receiver_id)
        if not receiver or not receiver.is_active or receiver.id == sender.id:
            return None, 'Recipient not found or invalid'
        cleaned, error = cls._clean_message(content)
        if error:
            return None, error
        conversation, error = cls.get_or_create_conversation(sender, receiver)
        if error:
            return None, error
        sender_type, receiver_type = cls._account_type(sender), cls._account_type(receiver)
        try:
            message = Message(
                conversation_id=conversation.id, sender_id=sender.id, receiver_id=receiver.id,
                sender_type=sender_type, receiver_type=receiver_type, content=cleaned,
                message_type=kwargs.get('message_type', 'text'), status='sent',
            )
            conversation.last_message = cleaned
            conversation.last_message_time = datetime.utcnow()
            if receiver_type == 'user':
                conversation.unread_count_user += 1
            else:
                conversation.unread_count_worker += 1
            db.session.add(message)
            db.session.commit()
            return message, None
        except Exception as exc:
            db.session.rollback()
            return None, f'Message sending failed: {exc}'

    @staticmethod
    def list_conversations(account_id, page=1, per_page=20):
        page, per_page = max(1, page), min(max(1, per_page), 100)
        query = Conversation.query.filter(or_(Conversation.user_id == account_id, Conversation.worker_id == account_id))
        query = query.order_by(Conversation.last_message_time.desc(), Conversation.updated_at.desc())
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        return {'items': [item.to_dict(account_id) for item in pagination.items], 'pagination': {
            'page': page, 'per_page': per_page, 'total_items': pagination.total, 'total_pages': pagination.pages}}

    @staticmethod
    def get_messages(account_id, conversation_id, page=1, per_page=50):
        conversation = db.session.get(Conversation, conversation_id)
        if not conversation or account_id not in (conversation.user_id, conversation.worker_id):
            return None, 'Conversation not found or access denied'
        page, per_page = max(1, page), min(max(1, per_page), 100)
        pagination = Message.query.filter_by(conversation_id=conversation_id).order_by(Message.created_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False)
        return {'conversation': conversation.to_dict(account_id), 'items': [m.to_dict() for m in pagination.items], 'pagination': {
            'page': page, 'per_page': per_page, 'total_items': pagination.total, 'total_pages': pagination.pages}}, None

    @staticmethod
    def mark_message_as_read(message_id, user_id):
        message = db.session.get(Message, message_id)
        if not message or message.receiver_id != user_id:
            return None, 'Message not found or access denied'
        if message.status != 'read':
            message.mark_as_read()
            conversation = message.conversation
            if conversation.user_id == user_id:
                conversation.unread_count_user = max(0, conversation.unread_count_user - 1)
            else:
                conversation.unread_count_worker = max(0, conversation.unread_count_worker - 1)
            db.session.commit()
        return message, None

    @staticmethod
    def mark_conversation_as_read(account_id, conversation_id):
        conversation = db.session.get(Conversation, conversation_id)
        if not conversation or account_id not in (conversation.user_id, conversation.worker_id):
            return [], 'Conversation not found or access denied'
        messages = Message.query.filter_by(conversation_id=conversation_id, receiver_id=account_id).filter(Message.status != 'read').all()
        for message in messages:
            message.mark_as_read()
        if account_id == conversation.user_id:
            conversation.unread_count_user = 0
        else:
            conversation.unread_count_worker = 0
        db.session.commit()
        return messages, None

    @staticmethod
    def mark_delivered_for_user(account_id):
        messages = Message.query.filter_by(receiver_id=account_id, status='sent').all()
        for message in messages:
            message.mark_as_delivered()
        db.session.commit()
        return messages

    @staticmethod
    def delete_message(account_id, message_id):
        message = db.session.get(Message, message_id)
        if not message or message.sender_id != account_id:
            return None, 'Message not found or access denied'
        db.session.delete(message)
        db.session.commit()
        return message, None
