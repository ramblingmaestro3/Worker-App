"""
Database models package for WorkerApp.
This package contains all SQLAlchemy ORM models.
"""

from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

# Import all models here to ensure they're registered with SQLAlchemy
from .user import User
from .worker import Worker
from .service import Service
from .booking import Booking
from .review import Review
from .payment import Payment
from .message import Message
from .conversation import Conversation
from .notification import Notification
from .certification import Certification
from .availability import Availability

__all__ = [
    'db',
    'User',
    'Worker',
    'Service',
    'Booking',
    'Review',
    'Payment',
    'Message',
    'Conversation',
    'Notification',
    'Certification',
    'Availability'
]
