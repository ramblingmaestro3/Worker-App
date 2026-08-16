"""Authenticated HTTP API for conversations and messages."""
from flask import request
from app.services import MessageService
from app.utils.auth import token_required
from app.utils.helpers import format_response


def _page_args():
    return request.args.get('page', 1, type=int), request.args.get('per_page', 50, type=int)


class MessageController:
    @staticmethod
    @token_required
    def list_conversations(current_user):
        page, per_page = _page_args()
        return format_response(success=True, data=MessageService.list_conversations(current_user.id, page, per_page))

    @staticmethod
    @token_required
    def get_messages(current_user, conversation_id):
        page, per_page = _page_args()
        result, error = MessageService.get_messages(current_user.id, conversation_id, page, per_page)
        if error:
            return format_response(success=False, message=error, status_code=404)
        return format_response(success=True, data=result)

    @staticmethod
    @token_required
    def send_message(current_user):
        data = request.get_json(silent=True) or {}
        message, error = MessageService.send_message(
            sender_id=current_user.id, receiver_id=data.get('receiverId', data.get('receiver_id')),
            conversation_id=data.get('conversationId', data.get('conversation_id')),
            content=data.get('message', data.get('content')), message_type=data.get('messageType', data.get('message_type', 'text')),
        )
        if error:
            return format_response(success=False, message=error, status_code=400)
        from app.socket_handlers import emit_new_message
        emit_new_message(message)
        return format_response(success=True, message='Message sent successfully', data={'message': message.to_dict()}, status_code=201)

    @staticmethod
    @token_required
    def mark_as_read(current_user, message_id):
        message, error = MessageService.mark_message_as_read(message_id, current_user.id)
        if error:
            return format_response(success=False, message=error, status_code=404)
        from app.socket_handlers import emit_read_receipt
        emit_read_receipt(message)
        return format_response(success=True, data={'message': message.to_dict()})

    @staticmethod
    @token_required
    def mark_conversation_as_read(current_user, conversation_id):
        messages, error = MessageService.mark_conversation_as_read(current_user.id, conversation_id)
        if error:
            return format_response(success=False, message=error, status_code=404)
        from app.socket_handlers import emit_read_receipt
        for message in messages:
            emit_read_receipt(message)
        return format_response(success=True, data={'messageIds': [m.id for m in messages]})

    @staticmethod
    @token_required
    def delete_message(current_user, message_id):
        message, error = MessageService.delete_message(current_user.id, message_id)
        if error:
            return format_response(success=False, message=error, status_code=404)
        from app.socket_handlers import socketio
        socketio.emit('message:deleted', {'messageId': message_id, 'conversationId': message.conversation_id}, room=f'conversation:{message.conversation_id}')
        return format_response(success=True, message='Message deleted')
