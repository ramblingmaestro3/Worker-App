"""
Booking service for WorkerApp.
Handles booking-related business logic.
"""

from datetime import datetime, date
from sqlalchemy import or_
from app.models import db, Booking, User, Worker, Service
from app.utils.validators import validate_date, validate_amount, validate_time


class BookingService:
    """Service for booking operations."""
    
    @staticmethod
    def create_booking(customer_id, worker_id, title, description, scheduled_date, **kwargs):
        """
        Create a new booking.
        
        Args:
            customer_id (int): Customer user ID
            worker_id (int): Worker user ID
            title (str): Booking title
            description (str): Job description
            scheduled_date (str): Scheduled date (YYYY-MM-DD)
            **kwargs: Additional booking attributes
        
        Returns:
            tuple: (booking, error_message)
        """
        # Validate users exist
        customer = User.query.get(customer_id)
        worker_user = User.query.get(worker_id)
        
        if not customer:
            return None, 'Customer not found'
        if not worker_user:
            return None, 'Worker not found'
        
        # Validate worker has a worker profile
        worker = Worker.query.filter_by(user_id=worker_id).first()
        if not worker:
            return None, 'Worker profile not found'
        
        # Validate scheduled date
        is_valid, error, date_obj = validate_date(scheduled_date)
        if not is_valid:
            return None, error
        
        # Check if date is in the future
        if date_obj < date.today():
            return None, 'Scheduled date must be in the future'

        scheduled_time = kwargs.get('scheduled_time')
        if scheduled_time:
            is_valid, error, time_obj = validate_time(scheduled_time)
            if not is_valid:
                return None, error
            kwargs['scheduled_time'] = time_obj
        
        try:
            # Get worker's hourly rate
            hourly_rate = kwargs.get('hourly_rate', worker.hourly_rate)
            estimated_duration = kwargs.get('estimated_duration', 1)
            
            # Create booking
            booking = Booking(
                customer_id=customer_id,
                worker_id=worker_id,
                title=title,
                description=description,
                scheduled_date=date_obj,
                hourly_rate=hourly_rate,
                estimated_duration=estimated_duration,
                **kwargs
            )
            
            # Calculate estimated cost
            booking.calculate_estimated_cost()
            
            db.session.add(booking)
            db.session.commit()
            
            return booking, None
        
        except Exception as e:
            db.session.rollback()
            return None, f'Booking creation failed: {str(e)}'

    @staticmethod
    def create_job_request(customer_id, title, description, scheduled_date, **kwargs):
        """
        Create an open job request visible to available workers.

        The request starts without a worker_id. The first worker to accept it
        becomes the assigned worker and the request is no longer open.
        """
        customer = User.query.get(customer_id)
        if not customer:
            return None, 'Customer not found'

        is_valid, error, date_obj = validate_date(scheduled_date)
        if not is_valid:
            return None, error

        if date_obj < date.today():
            return None, 'Scheduled date must be today or in the future'

        scheduled_time = kwargs.get('scheduled_time')
        if scheduled_time:
            is_valid, error, time_obj = validate_time(scheduled_time)
            if not is_valid:
                return None, error
            kwargs['scheduled_time'] = time_obj

        service_id = kwargs.pop('service_id', None)
        category = kwargs.pop('category', None)
        if not service_id and category:
            service = Service.query.filter_by(slug=category).first()
            if service:
                service_id = service.id

        try:
            booking = Booking(
                customer_id=customer_id,
                worker_id=None,
                title=title,
                description=description,
                scheduled_date=date_obj,
                service_id=service_id,
                status='open',
                **kwargs
            )

            db.session.add(booking)
            db.session.commit()
            return booking, None

        except Exception as e:
            db.session.rollback()
            return None, f'Job request creation failed: {str(e)}'
    
    @staticmethod
    def get_booking_by_id(booking_id):
        """
        Get booking by ID.
        
        Args:
            booking_id (int): Booking ID
        
        Returns:
            Booking: Booking object or None
        """
        return Booking.query.get(booking_id)
    
    @staticmethod
    def get_user_bookings(user_id, role='customer', status=None, page=1, per_page=20):
        """
        Get bookings for a user.
        
        Args:
            user_id (int): User ID
            role (str): User role (customer or worker)
            status (str): Filter by status
            page (int): Page number
            per_page (int): Items per page
        
        Returns:
            dict: Paginated bookings
        """
        if role == 'customer':
            query = Booking.query.filter_by(customer_id=user_id)
        else:
            query = Booking.query.filter_by(worker_id=user_id)
        
        if status:
            query = query.filter_by(status=status)
        
        query = query.order_by(Booking.created_at.desc())
        
        from app.utils.helpers import paginate_results
        return paginate_results(query, page, per_page)

    @staticmethod
    def get_open_job_requests(worker_id=None, status='open', page=1, per_page=20):
        """
        Get unassigned job requests available for workers to accept.

        Restricted to the requesting worker's trade when they have one set,
        so a painter doesn't see plumbing requests and vice versa. Requests
        with no recognized service category still show to everyone, since
        those can't be matched to any trade.
        """
        worker = None
        if worker_id:
            worker = Worker.query.filter_by(user_id=worker_id).first()
            if not worker:
                return None, 'Worker profile not found'

        query = Booking.query.filter(
            Booking.worker_id.is_(None),
            Booking.status == status
        )

        if worker and worker.service_category_id:
            query = query.filter(
                or_(
                    Booking.service_id == worker.service_category_id,
                    Booking.service_id.is_(None)
                )
            )

        query = query.order_by(Booking.created_at.desc())

        from app.utils.helpers import paginate_results
        return paginate_results(query, page, per_page), None
    
    @staticmethod
    def accept_booking(booking_id, worker_id):
        """
        Accept a booking.
        
        Args:
            booking_id (int): Booking ID
            worker_id (int): Worker user ID
        
        Returns:
            tuple: (success, error_message)
        """
        booking = Booking.query.get(booking_id)
        
        if not booking:
            return False, 'Booking not found'
        
        worker = Worker.query.filter_by(user_id=worker_id).first()
        if not worker:
            return False, 'Worker profile not found'

        if booking.customer_id == worker_id:
            return False, 'Customers cannot accept their own requests'

        if booking.worker_id is not None and booking.worker_id != worker_id:
            return False, 'This booking has already been assigned to another worker'
        
        # Check if booking can be accepted
        if booking.status not in ['pending', 'open']:
            return False, f'Booking cannot be accepted (current status: {booking.status})'
        
        try:
            if booking.worker_id is None:
                claimed = Booking.query.filter(
                    Booking.id == booking_id,
                    Booking.worker_id.is_(None),
                    Booking.status == 'open'
                ).update({
                    'worker_id': worker_id,
                    'status': 'accepted',
                    'updated_at': datetime.utcnow()
                }, synchronize_session=False)

                if claimed == 0:
                    db.session.rollback()
                    return False, 'This request has already been accepted'

                booking = Booking.query.get(booking_id)
            else:
                # Same atomic guard as the open-pool claim above, so two rapid
                # double-taps of Accept on a direct hire can't both fire the
                # notification/system-message side effects in the controller.
                claimed = Booking.query.filter(
                    Booking.id == booking_id,
                    Booking.worker_id == worker_id,
                    Booking.status == 'pending'
                ).update({
                    'status': 'accepted',
                    'updated_at': datetime.utcnow()
                }, synchronize_session=False)

                if claimed == 0:
                    db.session.rollback()
                    return False, 'This request has already been accepted'

                booking = Booking.query.get(booking_id)

            # Calculate response time
            if booking.created_at:
                response_time = (datetime.utcnow() - booking.created_at).total_seconds() / 60
                booking.worker_response_time = int(response_time)
                
                # Update worker's average response time
                if not worker.response_time:
                    worker.response_time = response_time
                else:
                    worker.response_time = (worker.response_time + response_time) / 2
            
            db.session.commit()
            
            return True, None
        
        except Exception as e:
            db.session.rollback()
            return False, f'Booking acceptance failed: {str(e)}'
    
    @staticmethod
    def reject_booking(booking_id, worker_id, reason=None):
        """
        Reject a booking.
        
        Args:
            booking_id (int): Booking ID
            worker_id (int): Worker user ID
            reason (str): Rejection reason
        
        Returns:
            tuple: (success, error_message)
        """
        booking = Booking.query.get(booking_id)
        
        if not booking:
            return False, 'Booking not found'
        
        if booking.worker_id != worker_id:
            return False, 'Unauthorized: You do not own this booking'
        
        if booking.status != 'pending':
            return False, f'Booking cannot be rejected (current status: {booking.status})'
        
        try:
            booking.reject_booking(reason)
            db.session.commit()
            
            return True, None
        
        except Exception as e:
            db.session.rollback()
            return False, f'Booking rejection failed: {str(e)}'
    
    @staticmethod
    def start_job(booking_id, worker_id):
        """
        Start a job.
        
        Args:
            booking_id (int): Booking ID
            worker_id (int): Worker user ID
        
        Returns:
            tuple: (success, error_message)
        """
        booking = Booking.query.get(booking_id)
        
        if not booking:
            return False, 'Booking not found'
        
        if booking.worker_id != worker_id:
            return False, 'Unauthorized: You do not own this booking'
        
        if booking.status != 'accepted':
            return False, f'Job cannot be started (current status: {booking.status})'
        
        try:
            booking.start_job()
            db.session.commit()
            
            return True, None
        
        except Exception as e:
            db.session.rollback()
            return False, f'Job start failed: {str(e)}'
    
    @staticmethod
    def complete_job(booking_id, worker_id, final_cost=None):
        """
        Complete a job.
        
        Args:
            booking_id (int): Booking ID
            worker_id (int): Worker user ID
            final_cost (float): Final cost of the job
        
        Returns:
            tuple: (success, error_message)
        """
        booking = Booking.query.get(booking_id)
        
        if not booking:
            return False, 'Booking not found'
        
        if booking.worker_id != worker_id:
            return False, 'Unauthorized: You do not own this booking'
        
        if booking.status not in ['accepted', 'in_progress']:
            return False, f'Job cannot be completed (current status: {booking.status})'
        
        try:
            booking.complete_job(final_cost)
            
            # Update worker's completed jobs count
            worker = Worker.query.filter_by(user_id=worker_id).first()
            if worker:
                worker.increment_completed_jobs()
                worker.calculate_rank_score()
            
            db.session.commit()
            
            return True, None
        
        except Exception as e:
            db.session.rollback()
            return False, f'Job completion failed: {str(e)}'
    
    @staticmethod
    def cancel_booking(booking_id, user_id, role, reason=None):
        """
        Cancel a booking.
        
        Args:
            booking_id (int): Booking ID
            user_id (int): User ID
            role (str): User role (customer or worker)
            reason (str): Cancellation reason
        
        Returns:
            tuple: (success, error_message)
        """
        booking = Booking.query.get(booking_id)
        
        if not booking:
            return False, 'Booking not found'
        
        # Verify ownership
        if role == 'customer' and booking.customer_id != user_id:
            return False, 'Unauthorized: You do not own this booking'
        elif role == 'worker' and booking.worker_id != user_id:
            return False, 'Unauthorized: You do not own this booking'
        
        # Check if booking can be cancelled
        if booking.status in ['completed', 'cancelled']:
            return False, f'Booking cannot be cancelled (current status: {booking.status})'
        
        try:
            booking.cancel_booking(role, reason)
            db.session.commit()
            
            return True, None
        
        except Exception as e:
            db.session.rollback()
            return False, f'Booking cancellation failed: {str(e)}'
