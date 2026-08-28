"""
Notification routes for WorkerApp.
"""

from flask import Blueprint
from app.controllers import NotificationController

notification_bp = Blueprint('notifications', __name__, url_prefix='/api/notifications')


# Notification Management
notification_bp.add_url_rule('', view_func=NotificationController.get_notifications, methods=['GET'])
notification_bp.add_url_rule('/<int:notification_id>', view_func=NotificationController.get_notification, methods=['GET'])
notification_bp.add_url_rule('/unread-count', view_func=NotificationController.get_unread_count, methods=['GET'])


# Notification Actions
notification_bp.add_url_rule('/<int:notification_id>/read', view_func=NotificationController.mark_as_read, methods=['POST'])
notification_bp.add_url_rule('/read-all', view_func=NotificationController.mark_all_as_read, methods=['POST'])
