"""Persistent private conversation between one customer and one worker."""

from datetime import datetime
from app.models import db


class Conversation(db.Model):
    """A unique customer/worker pairing; the DB constraint prevents races creating duplicates."""

    __tablename__ = 'conversations'
    __table_args__ = (
        db.UniqueConstraint('user_id', 'worker_id', name='uq_conversation_user_worker'),
        db.Index('ix_conversation_latest_activity', 'last_message_time'),
    )

    id = db.Column(db.Integer, primary_key=True)
    # Both columns intentionally reference users: a worker profile is an extension of its User account.
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    worker_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    last_message = db.Column(db.Text, nullable=True)
    last_message_time = db.Column(db.DateTime, nullable=True, index=True)
    unread_count_user = db.Column(db.Integer, nullable=False, default=0)
    unread_count_worker = db.Column(db.Integer, nullable=False, default=0)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = db.relationship('User', foreign_keys=[user_id])
    worker = db.relationship('User', foreign_keys=[worker_id])
    messages = db.relationship('Message', back_populates='conversation', cascade='all, delete-orphan')

    def partner_for(self, account_id):
        return self.worker if self.user_id == account_id else self.user

    def unread_for(self, account_id):
        return self.unread_count_user if self.user_id == account_id else self.unread_count_worker

    def to_dict(self, account_id=None):
        partner = self.partner_for(account_id) if account_id else None
        return {
            'id': self.id,
            'userId': self.user_id,
            'workerId': self.worker_id,
            'lastMessage': self.last_message,
            'lastMessageTime': self.last_message_time.isoformat() if self.last_message_time else None,
            'unreadCountUser': self.unread_count_user,
            'unreadCountWorker': self.unread_count_worker,
            'unreadCount': self.unread_for(account_id) if account_id else None,
            'partner': partner.to_dict() if partner else None,
            'createdAt': self.created_at.isoformat(),
            'updatedAt': self.updated_at.isoformat() if self.updated_at else None,
        }
