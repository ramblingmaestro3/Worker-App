"""
Payment controller for WorkerApp.
Handles payment-related API endpoints.
"""

from flask import request
from app.services import PaymentService
from app.utils.helpers import format_response
from app.utils.auth import token_required


class PaymentController:
    """Controller for payment endpoints."""
    
    @staticmethod
    @token_required
    def create_payment(current_user, booking_id):
        """
        Create a payment for a booking.
        
        Headers:
            Authorization: Bearer <access_token>
        
        URL Parameters:
            booking_id (int): Booking ID
        
        Request Body:
            provider (str): Payment provider (stripe, mobile_money, cash)
            payment_method_id (str): Payment method ID (for stripe)
        
        Returns:
            JSON response with payment data
        """
        data = request.get_json()
        
        if 'provider' not in data:
            return format_response(
                success=False,
                message='Provider field is required',
                status_code=400
            )
        
        # Verify user owns the booking
        from app.services import BookingService
        booking = BookingService.get_booking_by_id(booking_id)
        if not booking or booking.customer_id != current_user.id:
            return format_response(
                success=False,
                message='Booking not found or unauthorized',
                status_code=404
            )
        
        payment, error = PaymentService.create_payment(
            booking_id=booking_id,
            provider=data['provider'],
            payment_method_id=data.get('payment_method_id')
        )
        
        if error:
            return format_response(
                success=False,
                message='Payment creation failed',
                error=error,
                status_code=400
            )
        
        # TODO: Integrate with actual payment provider (Stripe, Mobile Money, etc.)
        # This is a placeholder for actual payment processing
        
        # For now, mark as completed
        PaymentService.complete_payment(payment.id)
        
        return format_response(
            success=True,
            message='Payment created successfully',
            data={'payment': payment.to_dict()},
            status_code=201
        )
    
    @staticmethod
    def get_payment(payment_id):
        """
        Get payment by ID.
        
        URL Parameters:
            payment_id (int): Payment ID
        
        Returns:
            JSON response with payment data
        """
        payment = PaymentService.get_payment_by_id(payment_id)
        
        if not payment:
            return format_response(
                success=False,
                message='Payment not found',
                status_code=404
            )
        
        return format_response(
            success=True,
            data={'payment': payment.to_dict()}
        )
    
    @staticmethod
    @token_required
    def get_my_payments(current_user):
        """
        Get current user's payment history.
        
        Headers:
            Authorization: Bearer <access_token>
        
        Query Parameters:
            role (str): User role (customer or worker)
            page (int): Page number (default: 1)
            per_page (int): Items per page (default: 20)
        
        Returns:
            JSON response with paginated payments
        """
        role = request.args.get('role', current_user.role)
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        result = PaymentService.get_payment_history(
            user_id=current_user.id,
            role=role,
            page=page,
            per_page=per_page
        )
        
        return format_response(
            success=True,
            data=result
        )
    
    @staticmethod
    @token_required
    def process_refund(current_user, payment_id):
        """
        Process a refund (customer only).
        
        Headers:
            Authorization: Bearer <access_token>
        
        URL Parameters:
            payment_id (int): Payment ID
        
        Request Body:
            refund_amount (float): Refund amount (optional)
            reason (str): Refund reason (optional)
        
        Returns:
            JSON response confirming refund
        """
        data = request.get_json() or {}
        
        # Verify user owns the payment
        from app.services import BookingService
        payment = PaymentService.get_payment_by_id(payment_id)
        if not payment:
            return format_response(
                success=False,
                message='Payment not found',
                status_code=404
            )
        
        booking = BookingService.get_booking_by_id(payment.booking_id)
        if not booking or booking.customer_id != current_user.id:
            return format_response(
                success=False,
                message='Unauthorized',
                status_code=403
            )
        
        success, error = PaymentService.process_refund(
            payment_id=payment_id,
            refund_amount=data.get('refund_amount'),
            reason=data.get('reason')
        )
        
        if error:
            return format_response(
                success=False,
                message='Refund processing failed',
                error=error,
                status_code=400
            )
        
        return format_response(
            success=True,
            message='Refund processed successfully'
        )
    
    @staticmethod
    @token_required
    def process_worker_payout(current_user, payment_id):
        """
        Process worker payout (admin only).
        
        Headers:
            Authorization: Bearer <access_token>
        
        URL Parameters:
            payment_id (int): Payment ID
        
        Returns:
            JSON response confirming payout
        """
        from app.utils.auth import admin_required
        
        @admin_required
        def _process_payout(current_user):
            success, error = PaymentService.process_worker_payout(payment_id)
            
            if error:
                return format_response(
                    success=False,
                    message='Payout processing failed',
                    error=error,
                    status_code=400
                )
            
            return format_response(
                success=True,
                message='Payout processed successfully'
            )
        
        return _process_payout()
