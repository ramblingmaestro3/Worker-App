"""
Booking controller for WorkerApp.
Handles booking-related API endpoints.
"""

from datetime import date, datetime, timedelta
import os
import uuid
from flask import current_app, request, url_for
from werkzeug.utils import secure_filename
from app.services import BookingService
from app.services import WorkerService
from app.utils.helpers import format_response
from app.utils.auth import token_required, worker_required


def _normalize_frontend_job(data):
    normalized = dict(data or {})

    if 'desc' in normalized and 'description' not in normalized:
        normalized['description'] = normalized.get('desc')
    if 'jobTitle' in normalized and 'title' not in normalized:
        normalized['title'] = normalized.get('jobTitle')
    if 'service' in normalized and 'category' not in normalized:
        normalized['category'] = str(normalized.get('service')).lower().replace(' ', '-')
    if 'location' in normalized and 'location_address' not in normalized:
        normalized['location_address'] = normalized.get('location')

    scheduled_date = normalized.get('scheduled_date') or normalized.get('date')
    if scheduled_date:
        normalized['scheduled_date'] = _parse_frontend_date(scheduled_date)

    scheduled_time = normalized.get('scheduled_time') or normalized.get('time')
    if scheduled_time:
        normalized['scheduled_time'] = _parse_frontend_time(scheduled_time)

    urgency = str(normalized.get('urgency', '')).lower()
    normalized['is_emergency'] = normalized.get('is_emergency', 'emergency' in urgency)

    if not normalized.get('title'):
        service = normalized.get('service') or normalized.get('category') or 'Service'
        normalized['title'] = f'{service} job'

    return normalized


def _parse_frontend_date(value):
    if isinstance(value, str):
        text = value.strip().lower()
        if text == 'today':
            return date.today().isoformat()
        if text == 'tomorrow':
            return (date.today() + timedelta(days=1)).isoformat()
        if text == 'in 3 days':
            return (date.today() + timedelta(days=3)).isoformat()
        if text == 'in 1 week':
            return (date.today() + timedelta(days=7)).isoformat()
    return value


def _parse_frontend_time(value):
    if isinstance(value, str):
        for fmt in ('%I:%M %p', '%H:%M'):
            try:
                return datetime.strptime(value.strip(), fmt).strftime('%H:%M')
            except ValueError:
                pass
    return value


class BookingController:
    @staticmethod
    @token_required
    def upload_job_image(current_user):
        image = request.files.get('image')
        if not image or not image.filename:
            return format_response(success=False, message='An image file is required', status_code=400)

        extension = image.filename.rsplit('.', 1)[-1].lower() if '.' in image.filename else ''
        if extension not in current_app.config['ALLOWED_EXTENSIONS'] - {'pdf'}:
            return format_response(success=False, message='Only JPG and PNG images are allowed', status_code=400)

        upload_directory = os.path.join(current_app.config['UPLOAD_FOLDER'], 'job-images')
        os.makedirs(upload_directory, exist_ok=True)
        filename = f"{uuid.uuid4().hex}_{secure_filename(image.filename)}"
        image.save(os.path.join(upload_directory, filename))
        image_url = url_for('bookings.get_job_image', filename=filename, _external=True)
        return format_response(success=True, data={'url': image_url}, status_code=201)

    @staticmethod
    def get_job_image(filename):
        from flask import send_from_directory
        return send_from_directory(os.path.join(current_app.config['UPLOAD_FOLDER'], 'job-images'), filename)

    """Controller for booking endpoints."""
    
    @staticmethod
    @token_required
    def create_booking(current_user):
        """
        Create a new booking.
        
        Headers:
            Authorization: Bearer <access_token>
        
        Request Body:
            worker_id (int): Worker user ID
            title (str): Booking title
            description (str): Job description
            scheduled_date (str): Scheduled date (YYYY-MM-DD)
            scheduled_time (str): Scheduled time (HH:MM)
            estimated_duration (int): Estimated duration in hours
            is_emergency (bool): Emergency service
            location_address (str): Job location address
            location_city (str): Job location city
            location_region (str): Job location region
            latitude (float): Location latitude
            longitude (float): Location longitude
        
        Returns:
            JSON response with booking data
        """
        data = _normalize_frontend_job(request.get_json())
        
        # Validate required fields
        required_fields = ['worker_id', 'title', 'description', 'scheduled_date']
        for field in required_fields:
            if field not in data:
                return format_response(
                    success=False,
                    message=f'Missing required field: {field}',
                    status_code=400
                )
        
        booking, error = BookingService.create_booking(
            customer_id=current_user.id,
            worker_id=data['worker_id'],
            title=data['title'],
            description=data['description'],
            scheduled_date=data['scheduled_date'],
            scheduled_time=data.get('scheduled_time'),
            estimated_duration=data.get('estimated_duration', 1),
            is_emergency=data.get('is_emergency', False),
            location_address=data.get('location_address'),
            location_city=data.get('location_city'),
            location_region=data.get('location_region'),
            latitude=data.get('latitude'),
            longitude=data.get('longitude')
        )
        
        if error:
            return format_response(
                success=False,
                message='Booking creation failed',
                error=error,
                status_code=400
            )
        
        # Send notification to worker
        from app.services import NotificationService
        NotificationService.notify_booking_created(data['worker_id'], booking.id)
        
        return format_response(
            success=True,
            message='Booking created successfully',
            data={'booking': booking.to_dict()},
            status_code=201
        )

    @staticmethod
    @token_required
    def create_job_request(current_user):
        """
        Accept the frontend post-job form before a worker is selected.

        Request Body:
            service (str): Selected service label or slug
            desc (str): Job description
            photos (list): Photo IDs/URLs collected by the app
            location (str): Job location label
            date (str): UI date label or YYYY-MM-DD
            time (str): UI time label or HH:MM
            urgency (str): UI urgency label

        Returns:
            JSON response with normalized request data and matching workers
        """
        data = _normalize_frontend_job(request.get_json())
        if not data.get('description'):
            return format_response(
                success=False,
                message='Description is required',
                status_code=400
            )

        scheduled_date = data.get('scheduled_date') or date.today().isoformat()

        booking, error = BookingService.create_job_request(
            customer_id=current_user.id,
            title=data.get('title'),
            description=data.get('description'),
            scheduled_date=scheduled_date,
            scheduled_time=data.get('scheduled_time'),
            estimated_duration=data.get('estimated_duration', 1),
            is_emergency=data.get('is_emergency', False),
            location_address=data.get('location_address'),
            location_city=data.get('location_city'),
            location_region=data.get('location_region'),
            latitude=data.get('latitude'),
            longitude=data.get('longitude'),
            category=data.get('category'),
            image_urls=data.get('photos', [])
        )

        if error:
            return format_response(
                success=False,
                message='Job request creation failed',
                error=error,
                status_code=400
            )

        matches = WorkerService.search_workers(
            category=data.get('category'),
            location=data.get('location_address'),
            emergency_only=data.get('is_emergency', False),
            is_available=True,
            page=1,
            per_page=10
        )

        from app.services import NotificationService
        for worker_data in matches.get('items', []):
            worker_user_id = worker_data.get('user_id') or worker_data.get('user', {}).get('id')
            if worker_user_id:
                NotificationService.notify_job_request_available(worker_user_id, booking.id)

        return format_response(
            success=True,
            message='Job request posted successfully',
            data={
                'job_request': booking.to_dict(),
                'matches': matches
            },
            status_code=201
        )

    @staticmethod
    @worker_required
    def get_open_requests(current_user):
        """
        Get open job requests workers can accept.
        """
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)

        result, error = BookingService.get_open_job_requests(
            worker_id=current_user.id,
            page=page,
            per_page=per_page
        )

        if error:
            return format_response(
                success=False,
                message='Open request lookup failed',
                error=error,
                status_code=400
            )

        return format_response(success=True, data=result)
    
    @staticmethod
    @token_required
    def get_booking(current_user, booking_id):
        """
        Get booking by ID. Restricted to the booking's customer, its worker, an admin,
        or (for still-open, unclaimed requests) any authenticated worker browsing requests.

        Headers:
            Authorization: Bearer <access_token>

        URL Parameters:
            booking_id (int): Booking ID

        Returns:
            JSON response with booking data
        """
        booking = BookingService.get_booking_by_id(booking_id)

        if not booking:
            return format_response(
                success=False,
                message='Booking not found',
                status_code=404
            )

        is_party = current_user.id in (booking.customer_id, booking.worker_id)
        is_open_request = booking.status == 'open' and current_user.role == 'worker'

        if current_user.role != 'admin' and not is_party and not is_open_request:
            return format_response(
                success=False,
                message='Unauthorized: You do not have access to this booking',
                status_code=403
            )

        return format_response(
            success=True,
            data={'booking': booking.to_dict()}
        )
    
    @staticmethod
    @token_required
    def get_my_bookings(current_user):
        """
        Get current user's bookings.
        
        Headers:
            Authorization: Bearer <access_token>
        
        Query Parameters:
            role (str): User role (customer or worker)
            status (str): Filter by status
            page (int): Page number (default: 1)
            per_page (int): Items per page (default: 20)
        
        Returns:
            JSON response with paginated bookings
        """
        role = request.args.get('role', current_user.role)
        status = request.args.get('status')
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        result = BookingService.get_user_bookings(
            user_id=current_user.id,
            role=role,
            status=status,
            page=page,
            per_page=per_page
        )
        
        return format_response(
            success=True,
            data=result
        )
    
    @staticmethod
    @worker_required
    def accept_booking(current_user, booking_id):
        """
        Accept a booking (worker only).
        
        Headers:
            Authorization: Bearer <access_token>
        
        URL Parameters:
            booking_id (int): Booking ID
        
        Returns:
            JSON response confirming acceptance
        """
        success, error = BookingService.accept_booking(
            booking_id=booking_id,
            worker_id=current_user.id
        )
        
        if error:
            return format_response(
                success=False,
                message='Booking acceptance failed',
                error=error,
                status_code=400
            )
        
        # Notify customer
        booking = BookingService.get_booking_by_id(booking_id)
        from app.services import NotificationService
        NotificationService.notify_booking_accepted(booking.customer_id, booking_id)

        from app.services import MessageService
        MessageService.send_message(
            sender_id=current_user.id,
            receiver_id=booking.customer_id,
            content=f'{current_user.full_name} accepted your job request: {booking.title}',
            booking_id=booking.id,
            message_type='system'
        )
        
        return format_response(
            success=True,
            message='Booking accepted successfully',
            data={'booking': booking.to_dict()}
        )
    
    @staticmethod
    @worker_required
    def reject_booking(current_user, booking_id):
        """
        Reject a booking (worker only).
        
        Headers:
            Authorization: Bearer <access_token>
        
        URL Parameters:
            booking_id (int): Booking ID
        
        Request Body:
            reason (str): Rejection reason (optional)
        
        Returns:
            JSON response confirming rejection
        """
        data = request.get_json() or {}
        reason = data.get('reason')
        
        success, error = BookingService.reject_booking(
            booking_id=booking_id,
            worker_id=current_user.id,
            reason=reason
        )
        
        if error:
            return format_response(
                success=False,
                message='Booking rejection failed',
                error=error,
                status_code=400
            )
        
        return format_response(
            success=True,
            message='Booking rejected successfully'
        )
    
    @staticmethod
    @token_required
    def start_job(current_user, booking_id):
        """
        Start a job (worker only).
        
        Headers:
            Authorization: Bearer <access_token>
        
        URL Parameters:
            booking_id (int): Booking ID
        
        Returns:
            JSON response confirming job start
        """
        success, error = BookingService.start_job(
            booking_id=booking_id,
            worker_id=current_user.id
        )
        
        if error:
            return format_response(
                success=False,
                message='Job start failed',
                error=error,
                status_code=400
            )
        
        return format_response(
            success=True,
            message='Job started successfully'
        )
    
    @staticmethod
    @token_required
    def complete_job(current_user, booking_id):
        """
        Complete a job (worker only).
        
        Headers:
            Authorization: Bearer <access_token>
        
        URL Parameters:
            booking_id (int): Booking ID
        
        Request Body:
            final_cost (float): Final cost of the job (optional)
        
        Returns:
            JSON response confirming job completion
        """
        data = request.get_json() or {}
        final_cost = data.get('final_cost')
        
        success, error = BookingService.complete_job(
            booking_id=booking_id,
            worker_id=current_user.id,
            final_cost=final_cost
        )
        
        if error:
            return format_response(
                success=False,
                message='Job completion failed',
                error=error,
                status_code=400
            )
        
        # Notify customer
        booking = BookingService.get_booking_by_id(booking_id)
        from app.services import NotificationService
        NotificationService.notify_booking_completed(booking.customer_id, booking_id)
        
        return format_response(
            success=True,
            message='Job completed successfully'
        )
    
    @staticmethod
    @token_required
    def cancel_booking(current_user, booking_id):
        """
        Cancel a booking.
        
        Headers:
            Authorization: Bearer <access_token>
        
        URL Parameters:
            booking_id (int): Booking ID
        
        Request Body:
            reason (str): Cancellation reason (optional)
        
        Returns:
            JSON response confirming cancellation
        """
        data = request.get_json() or {}
        reason = data.get('reason')
        
        success, error = BookingService.cancel_booking(
            booking_id=booking_id,
            user_id=current_user.id,
            role=current_user.role,
            reason=reason
        )
        
        if error:
            return format_response(
                success=False,
                message='Booking cancellation failed',
                error=error,
                status_code=400
            )
        
        booking = BookingService.get_booking_by_id(booking_id)
        from app.services import NotificationService
        if booking and booking.worker_id and booking.worker_id != current_user.id:
            NotificationService.notify_booking_cancelled(booking.worker_id, booking_id)

        return format_response(
            success=True,
            message='Booking cancelled successfully',
            data={'booking': booking.to_dict() if booking else None}
        )
