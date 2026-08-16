"""
Routes package for WorkerApp.
Contains Flask blueprints for API endpoints.
"""

from .auth_routes import auth_bp
from .user_routes import user_bp
from .worker_routes import worker_bp
from .booking_routes import booking_bp
from .review_routes import review_bp
from .payment_routes import payment_bp
from .message_routes import message_bp
from .notification_routes import notification_bp
from .service_routes import service_bp
from .ai_routes import ai_bp

__all__ = [
    'auth_bp',
    'user_bp',
    'worker_bp',
    'booking_bp',
    'review_bp',
    'payment_bp',
    'message_bp',
    'notification_bp',
    'service_bp',
    'ai_bp'
]
