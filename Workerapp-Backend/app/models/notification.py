"""
Notification model for WorkerApp.
This model represents user notifications.
"""

from datetime import datetime
from app.models import db


class Notification(db.Model):
    """
    Notification model representing user notifications.
    Handles in-app notifications for various events.
    """
    
    __tablename__ = 'notifications'
    
    # Primary Key
    id = db.Column(db.Integer, primary_key=True)
    
    # Foreign Key
    user_id = db.Column(
        db.Integer,
        db.ForeignKey('users.id', ondelete='CASCADE'),
        nullable=False,
        index=True
    )
    
    # Notification Content
    title = db.Column(db.String(200), nullable=False)
    message = db.Column(db.Text, nullable=False)
    notification_type = db.Column(
        db.String(50),
        nullable=False,
        index=True
    )  # 'booking', 'message', 'payment', 'review', 'system', 'promotion'
    
    # Related Entities
    related_entity_type = db.Column(db.String(50), nullable=True)  # 'booking', 'message', 'payment'
    related_entity_id = db.Column(db.Integer, nullable=True)
    
    # Notification Status
    is_read = db.Column(db.Boolean, default=False, nullable=False, index=True)
    read_at = db.Column(db.DateTime, nullable=True)
    
    # Delivery Channels
    sent_via_push = db.Column(db.Boolean, default=False, nullable=False)
    sent_via_email = db.Column(db.Boolean, default=False, nullable=False)
    sent_via_sms = db.Column(db.Boolean, default=False, nullable=False)
    
    # Action URL (deep link)
    action_url = db.Column(db.String(255), nullable=True)
    
    # Priority
    priority = db.Column(
        db.String(20),
        default='normal',
        nullable=False
    )  # 'low', 'normal', 'high', 'urgent'
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)
    expires_at = db.Column(db.DateTime, nullable=True)
    
    # Relationships
    user = db.relationship('User', back_populates='notifications')
    
    def __init__(self, user_id, title, message, notification_type, **kwargs):
        """
        Initialize a new notification.
        
        Args:
            user_id (int): User ID
            title (str): Notification title
            message (str): Notification message
            notification_type (str): Type of notification
            **kwargs: Additional notification attributes
        """
        self.user_id = user_id
        self.title = title
        self.message = message
        self.notification_type = notification_type
        
        # Set additional attributes
        for key, value in kwargs.items():
            if hasattr(self, key):
                setattr(self, key, value)
    
    def mark_as_read(self):
        """Mark notification as read."""
        if not self.is_read:
            self.is_read = True
            self.read_at = datetime.utcnow()
    
    def mark_push_sent(self):
        """Mark push notification as sent."""
        self.sent_via_push = True
    
    def mark_email_sent(self):
        """Mark email notification as sent."""
        self.sent_via_email = True
    
    def mark_sms_sent(self):
        """Mark SMS notification as sent."""
        self.sent_via_sms = True
    
    def is_expired(self):
        """
        Check if notification is expired.
        
        Returns:
            bool: True if expired, False otherwise
        """
        if self.expires_at:
            return datetime.utcnow() > self.expires_at
        return False
    
    def to_dict(self):
        """
        Convert notification object to dictionary.
        
        Returns:
            dict: Notification data as dictionary
        """
        return {
            'id': self.id,
            'user_id': self.user_id,
            'title': self.title,
            'message': self.message,
            'notification_type': self.notification_type,
            'related_entity_type': self.related_entity_type,
            'related_entity_id': self.related_entity_id,
            'is_read': self.is_read,
            'read_at': self.read_at.isoformat() if self.read_at else None,
            'sent_via_push': self.sent_via_push,
            'sent_via_email': self.sent_via_email,
            'sent_via_sms': self.sent_via_sms,
            'action_url': self.action_url,
            'priority': self.priority,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
        }
    
    def __repr__(self):
        """String representation of the notification."""
        return f'<Notification {self.title} - Type: {self.notification_type}>'
