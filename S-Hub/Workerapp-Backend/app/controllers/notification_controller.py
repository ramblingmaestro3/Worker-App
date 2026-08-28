"""
Notification controller for WorkerApp.
Handles notification-related API endpoints.
"""

from flask import request
from app.services import NotificationService
from app.utils.helpers import format_response
from app.utils.auth import token_required


class NotificationController:
    """Controller for notification endpoints."""
    
    @staticmethod
    @token_required
    def get_notifications(current_user):
        """
        Get current user's notifications.
        
        Headers:
            Authorization: Bearer <access_token>
        
        Query Parameters:
            unread_only (bool): Only get unread notifications (default: false)
            page (int): Page number (default: 1)
            per_page (int): Items per page (default: 20)
        
        Returns:
            JSON response with paginated notifications
        """
        unread_only = request.args.get('unread_only', type=bool)
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        result = NotificationService.get_user_notifications(
            user_id=current_user.id,
            unread_only=unread_only,
            page=page,
            per_page=per_page
        )
        
        return format_response(
            success=True,
            data=result
        )
    
    @staticmethod
    @token_required
    def get_notification(current_user, notification_id):
        """
        Get notification by ID.
        
        Headers:
            Authorization: Bearer <access_token>
        
        URL Parameters:
            notification_id (int): Notification ID
        
        Returns:
            JSON response with notification data
        """
        notification = NotificationService.get_notification_by_id(notification_id)
        
        if not notification:
            return format_response(
                success=False,
                message='Notification not found',
                status_code=404
            )
        
        if notification.user_id != current_user.id:
            return format_response(
                success=False,
                message='Unauthorized',
                status_code=403
            )
        
        return format_response(
            success=True,
            data={'notification': notification.to_dict()}
        )
    
    @staticmethod
    @token_required
    def mark_as_read(current_user, notification_id):
        """
        Mark a notification as read.
        
        Headers:
            Authorization: Bearer <access_token>
        
        URL Parameters:
            notification_id (int): Notification ID
        
        Returns:
            JSON response confirming mark as read
        """
        success, error = NotificationService.mark_notification_as_read(
            notification_id=notification_id,
            user_id=current_user.id
        )
        
        if error:
            return format_response(
                success=False,
                message='Mark as read failed',
                error=error,
                status_code=400
            )
        
        return format_response(
            success=True,
            message='Notification marked as read'
        )
    
    @staticmethod
    @token_required
    def mark_all_as_read(current_user):
        """
        Mark all notifications as read.
        
        Headers:
            Authorization: Bearer <access_token>
        
        Returns:
            JSON response confirming mark all as read
        """
        success, error = NotificationService.mark_all_as_read(current_user.id)
        
        if error:
            return format_response(
                success=False,
                message='Mark all as read failed',
                error=error,
                status_code=500
            )
        
        return format_response(
            success=True,
            message='All notifications marked as read'
        )
    
    @staticmethod
    @token_required
    def get_unread_count(current_user):
        """
        Get unread notification count.
        
        Headers:
            Authorization: Bearer <access_token>
        
        Returns:
            JSON response with unread count
        """
        count = NotificationService.get_unread_count(current_user.id)
        
        return format_response(
            success=True,
            data={'unread_count': count}
        )
