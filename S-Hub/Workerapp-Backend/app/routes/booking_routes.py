"""
Booking routes for WorkerApp.
"""

from flask import Blueprint
from app.controllers import BookingController

booking_bp = Blueprint('bookings', __name__, url_prefix='/api/bookings')


# Booking Management
booking_bp.add_url_rule('', view_func=BookingController.create_booking, methods=['POST'])
booking_bp.add_url_rule('/request', view_func=BookingController.create_job_request, methods=['POST'])
booking_bp.add_url_rule('/uploads', view_func=BookingController.upload_job_image, methods=['POST'])
booking_bp.add_url_rule('/uploads/<path:filename>', view_func=BookingController.get_job_image, methods=['GET'])
booking_bp.add_url_rule('/open', view_func=BookingController.get_open_requests, methods=['GET'])
booking_bp.add_url_rule('/my', view_func=BookingController.get_my_bookings, methods=['GET'])
booking_bp.add_url_rule('/<int:booking_id>', view_func=BookingController.get_booking, methods=['GET'])


# Booking Actions
booking_bp.add_url_rule('/<int:booking_id>/accept', view_func=BookingController.accept_booking, methods=['POST'])
booking_bp.add_url_rule('/<int:booking_id>/reject', view_func=BookingController.reject_booking, methods=['POST'])
booking_bp.add_url_rule('/<int:booking_id>/start', view_func=BookingController.start_job, methods=['POST'])
booking_bp.add_url_rule('/<int:booking_id>/complete', view_func=BookingController.complete_job, methods=['POST'])
booking_bp.add_url_rule('/<int:booking_id>/cancel', view_func=BookingController.cancel_booking, methods=['POST'])
