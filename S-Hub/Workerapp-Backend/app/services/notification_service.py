"""
Notification service for WorkerApp.
Handles notification business logic.
"""

from app.models import db, Notification, User
from datetime import datetime, timedelta


class NotificationService:
    """Service for notification operations."""
    
    @staticmethod
    def create_notification(user_id, title, message, notification_type, **kwargs):
        """
        Create a new notification.
        
        Args:
            user_id (int): User ID
            title (str): Notification title
            message (str): Notification message
            notification_type (str): Type of notification
            **kwargs: Additional notification attributes
        
        Returns:
            tuple: (notification, error_message)
        """
        user = User.query.get(user_id)
        
        if not user:
            return None, 'User not found'
        
        try:
            notification = Notification(
                user_id=user_id,
                title=title,
                message=message,
                notification_type=notification_type,
                **kwargs
            )
            
            db.session.add(notification)
            db.session.commit()

            # Push live so the recipient doesn't have to reopen the
            # Notifications/Home screen to discover it. Lazy-imported to
            # avoid a circular import with app.socket_handlers, which
            # itself imports from app.services.
            try:
                from app.socket_handlers import socketio
                socketio.emit('notification:new', notification.to_dict(), room=f'user:{user_id}')
            except Exception:
                pass

            return notification, None

        except Exception as e:
            db.session.rollback()
            return None, f'Notification creation failed: {str(e)}'
    
    @staticmethod
    def get_notification_by_id(notification_id):
        """
        Get notification by ID.
        
        Args:
            notification_id (int): Notification ID
        
        Returns:
            Notification: Notification object or None
        """
        return Notification.query.get(notification_id)
    
    @staticmethod
    def get_user_notifications(user_id, unread_only=False, page=1, per_page=20):
        """
        Get notifications for a user.
        
        Args:
            user_id (int): User ID
            unread_only (bool): Only get unread notifications
            page (int): Page number
            per_page (int): Items per page
        
        Returns:
            dict: Paginated notifications
        """
        query = Notification.query.filter_by(user_id=user_id)
        
        if unread_only:
            query = query.filter_by(is_read=False)
        
        # Filter out expired notifications
        query = query.filter(
            (Notification.expires_at.is_(None)) |
            (Notification.expires_at > datetime.utcnow())
        )
        
        query = query.order_by(Notification.created_at.desc())
        
        from app.utils.helpers import paginate_results
        return paginate_results(query, page, per_page)
    
    @staticmethod
    def mark_notification_as_read(notification_id, user_id):
        """
        Mark a notification as read.
        
        Args:
            notification_id (int): Notification ID
            user_id (int): User ID
        
        Returns:
            tuple: (success, error_message)
        """
        notification = Notification.query.get(notification_id)
        
        if not notification:
            return False, 'Notification not found'
        
        if notification.user_id != user_id:
            return False, 'Unauthorized: You do not own this notification'
        
        try:
            notification.mark_as_read()
            db.session.commit()
            
            return True, None
        
        except Exception as e:
            db.session.rollback()
            return False, f'Notification marking failed: {str(e)}'
    
    @staticmethod
    def mark_all_as_read(user_id):
        """
        Mark all notifications as read for a user.
        
        Args:
            user_id (int): User ID
        
        Returns:
            tuple: (success, error_message)
        """
        try:
            notifications = Notification.query.filter_by(
                user_id=user_id,
                is_read=False
            ).all()
            
            for notification in notifications:
                notification.mark_as_read()
            
            db.session.commit()
            
            return True, None
        
        except Exception as e:
            db.session.rollback()
            return False, f'Batch marking failed: {str(e)}'
    
    @staticmethod
    def get_unread_count(user_id):
        """
        Get unread notification count for a user.
        
        Args:
            user_id (int): User ID
        
        Returns:
            int: Unread notification count
        """
        return Notification.query.filter(
            Notification.user_id == user_id,
            Notification.is_read == False
        ).filter(
            (Notification.expires_at.is_(None)) |
            (Notification.expires_at > datetime.utcnow())
        ).count()
    
    @staticmethod
    def delete_old_notifications(days=30):
        """
        Delete old read notifications.
        
        Args:
            days (int): Number of days to keep
        
        Returns:
            int: Number of deleted notifications
        """
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        
        deleted = Notification.query.filter(
            Notification.is_read == True,
            Notification.created_at < cutoff_date
        ).delete()
        
        db.session.commit()
        
        return deleted
    
    # Convenience methods for common notification types
    
    @staticmethod
    def notify_booking_created(user_id, booking_id):
        """Notify user about new booking."""
        return NotificationService.create_notification(
            user_id=user_id,
            title='New Booking Request',
            message='You have received a new booking request',
            notification_type='booking',
            related_entity_type='booking',
            related_entity_id=booking_id,
            priority='high'
        )

    @staticmethod
    def notify_job_request_available(user_id, booking_id):
        """Notify worker about an open job request they can accept."""
        return NotificationService.create_notification(
            user_id=user_id,
            title='New Job Request',
            message='A customer posted a job request near you',
            notification_type='booking',
            related_entity_type='booking',
            related_entity_id=booking_id,
            action_url=f'/bookings/{booking_id}',
            priority='high'
        )
    
    @staticmethod
    def notify_booking_accepted(user_id, booking_id):
        """Notify user about booking acceptance."""
        return NotificationService.create_notification(
            user_id=user_id,
            title='Booking Accepted',
            message='Your booking has been accepted by the worker',
            notification_type='booking',
            related_entity_type='booking',
            related_entity_id=booking_id,
            priority='high'
        )

    @staticmethod
    def notify_booking_cancelled(user_id, booking_id):
        """Notify user about booking cancellation."""
        return NotificationService.create_notification(
            user_id=user_id,
            title='Booking Cancelled',
            message='A booking request has been cancelled',
            notification_type='booking',
            related_entity_type='booking',
            related_entity_id=booking_id,
            priority='normal'
        )
    
    @staticmethod
    def notify_booking_completed(user_id, booking_id):
        """Notify user about booking completion."""
        return NotificationService.create_notification(
            user_id=user_id,
            title='Booking Completed',
            message='Your booking has been completed. Please leave a review.',
            notification_type='booking',
            related_entity_type='booking',
            related_entity_id=booking_id,
            action_url=f'/bookings/{booking_id}/review'
        )
    
    @staticmethod
    def notify_new_message(user_id, message_id, sender_name):
        """Notify user about new message."""
        return NotificationService.create_notification(
            user_id=user_id,
            title='New Message',
            message=f'You have a new message from {sender_name}',
            notification_type='message',
            related_entity_type='message',
            related_entity_id=message_id,
            action_url=f'/messages/{message_id}'
        )
    
    @staticmethod
    def notify_payment_received(user_id, payment_id):
        """Notify worker about payment received."""
        return NotificationService.create_notification(
            user_id=user_id,
            title='Payment Received',
            message='A payment has been processed for your completed job',
            notification_type='payment',
            related_entity_type='payment',
            related_entity_id=payment_id,
            priority='high'
        )
