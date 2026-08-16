"""
Message model for WorkerApp.
This model represents in-app chat messages between users.
"""

from datetime import datetime
from app.models import db


class Message(db.Model):
    """
    Message model representing chat messages between users.
    Supports customer-worker communication.
    """
    
    __tablename__ = 'messages'
    
    # Primary Key
    id = db.Column(db.Integer, primary_key=True)
    
    # Foreign Keys
    conversation_id = db.Column(
        db.Integer, db.ForeignKey('conversations.id', ondelete='CASCADE'),
        nullable=True, index=True
    )
    sender_id = db.Column(
        db.Integer,
        db.ForeignKey('users.id', ondelete='CASCADE'),
        nullable=False,
        index=True
    )
    receiver_id = db.Column(
        db.Integer,
        db.ForeignKey('users.id', ondelete='CASCADE'),
        nullable=False,
        index=True
    )
    sender_type = db.Column(db.String(20), nullable=True)  # customer or worker
    receiver_type = db.Column(db.String(20), nullable=True)
    booking_id = db.Column(
        db.Integer,
        db.ForeignKey('bookings.id', ondelete='SET NULL'),
        nullable=True,
        index=True
    )
    
    # Message Content
    content = db.Column(db.Text, nullable=False)
    message_type = db.Column(
        db.String(20),
        default='text',
        nullable=False
    )  # 'text', 'image', 'document', 'location', 'system'
    
    # Attachments
    attachment_url = db.Column(db.String(255), nullable=True)
    attachment_type = db.Column(db.String(50), nullable=True)
    
    # Message Status
    is_read = db.Column(db.Boolean, default=False, nullable=False, index=True)
    read_at = db.Column(db.DateTime, nullable=True)
    is_delivered = db.Column(db.Boolean, default=False, nullable=False)
    delivered_at = db.Column(db.DateTime, nullable=True)
    status = db.Column(db.String(20), default='sent', nullable=False, index=True)
    
    # Message Metadata
    reply_to_message_id = db.Column(db.Integer, nullable=True)
    is_edited = db.Column(db.Boolean, default=False, nullable=False)
    edited_at = db.Column(db.DateTime, nullable=True)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    sender = db.relationship('User', foreign_keys=[sender_id], back_populates='messages_sent')
    receiver = db.relationship('User', foreign_keys=[receiver_id], back_populates='messages_received')
    conversation = db.relationship('Conversation', back_populates='messages')
    
    def __init__(self, sender_id, receiver_id, content, **kwargs):
        """
        Initialize a new message.
        
        Args:
            sender_id (int): Sender user ID
            receiver_id (int): Receiver user ID
            content (str): Message content
            **kwargs: Additional message attributes
        """
        self.sender_id = sender_id
        self.receiver_id = receiver_id
        self.content = content
        # Keep old content/is_read fields during the transition; public API exposes `message` and `status`.
        
        # Set additional attributes
        for key, value in kwargs.items():
            if hasattr(self, key):
                setattr(self, key, value)
    
    def mark_as_read(self):
        """Mark message as read."""
        if not self.is_read:
            self.is_read = True
            self.read_at = datetime.utcnow()
            self.updated_at = datetime.utcnow()
            self.status = 'read'
    
    def mark_as_delivered(self):
        """Mark message as delivered."""
        if not self.is_delivered:
            self.is_delivered = True
            self.delivered_at = datetime.utcnow()
            self.updated_at = datetime.utcnow()
            if self.status == 'sent':
                self.status = 'delivered'
    
    def edit_message(self, new_content):
        """
        Edit the message content.
        
        Args:
            new_content (str): New message content
        """
        self.content = new_content
        self.is_edited = True
        self.edited_at = datetime.utcnow()
        self.updated_at = datetime.utcnow()
    
    def to_dict(self):
        """
        Convert message object to dictionary.
        
        Returns:
            dict: Message data as dictionary
        """
        return {
            'id': self.id,
            'conversationId': self.conversation_id,
            'sender_id': self.sender_id,
            'senderId': self.sender_id,
            'senderType': self.sender_type,
            'receiver_id': self.receiver_id,
            'receiverId': self.receiver_id,
            'receiverType': self.receiver_type,
            'booking_id': self.booking_id,
            'content': self.content,
            'message': self.content,
            'message_type': self.message_type,
            'attachment_url': self.attachment_url,
            'attachment_type': self.attachment_type,
            'is_read': self.is_read,
            'read_at': self.read_at.isoformat() if self.read_at else None,
            'is_delivered': self.is_delivered,
            'status': self.status,
            'delivered_at': self.delivered_at.isoformat() if self.delivered_at else None,
            'reply_to_message_id': self.reply_to_message_id,
            'is_edited': self.is_edited,
            'edited_at': self.edited_at.isoformat() if self.edited_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
    
    def __repr__(self):
        """String representation of the message."""
        return f'<Message from {self.sender_id} to {self.receiver_id}>'
