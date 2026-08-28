"""
Payment service for WorkerApp.
Handles payment-related business logic.
"""

from app.models import db, Payment, Booking, Worker
from app.utils.validators import validate_amount


class PaymentService:
    """Service for payment operations."""
    
    @staticmethod
    def create_payment(booking_id, provider, **kwargs):
        """
        Create a new payment.
        
        Args:
            booking_id (int): Booking ID
            provider (str): Payment provider
            **kwargs: Additional payment attributes
        
        Returns:
            tuple: (payment, error_message)
        """
        booking = Booking.query.get(booking_id)
        
        if not booking:
            return None, 'Booking not found'
        
        # Check if payment already exists
        if Payment.query.filter_by(booking_id=booking_id).first():
            return None, 'Payment already exists for this booking'
        
        # Use final cost if available, otherwise estimated cost
        amount = booking.final_cost if booking.final_cost else booking.estimated_cost
        
        if not amount:
            return None, 'No cost associated with this booking'
        
        try:
            # Create payment
            payment = Payment(
                booking_id=booking_id,
                amount=amount,
                provider=provider,
                **kwargs
            )
            
            db.session.add(payment)
            db.session.commit()
            
            return payment, None
        
        except Exception as e:
            db.session.rollback()
            return None, f'Payment creation failed: {str(e)}'
    
    @staticmethod
    def get_payment_by_id(payment_id):
        """
        Get payment by ID.
        
        Args:
            payment_id (int): Payment ID
        
        Returns:
            Payment: Payment object or None
        """
        return Payment.query.get(payment_id)
    
    @staticmethod
    def get_payment_by_booking(booking_id):
        """
        Get payment by booking ID.
        
        Args:
            booking_id (int): Booking ID
        
        Returns:
            Payment: Payment object or None
        """
        return Payment.query.filter_by(booking_id=booking_id).first()
    
    @staticmethod
    def complete_payment(payment_id, transaction_id=None):
        """
        Mark payment as completed.
        
        Args:
            payment_id (int): Payment ID
            transaction_id (str): Provider transaction ID
        
        Returns:
            tuple: (success, error_message)
        """
        payment = Payment.query.get(payment_id)
        
        if not payment:
            return False, 'Payment not found'
        
        if payment.status == 'completed':
            return False, 'Payment is already completed'
        
        try:
            payment.complete_payment(transaction_id)
            db.session.commit()
            
            return True, None
        
        except Exception as e:
            db.session.rollback()
            return False, f'Payment completion failed: {str(e)}'
    
    @staticmethod
    def process_refund(payment_id, refund_amount=None, reason=None):
        """
        Process a refund.
        
        Args:
            payment_id (int): Payment ID
            refund_amount (float): Refund amount
            reason (str): Refund reason
        
        Returns:
            tuple: (success, error_message)
        """
        payment = Payment.query.get(payment_id)
        
        if not payment:
            return False, 'Payment not found'
        
        if payment.status != 'completed':
            return False, 'Can only refund completed payments'
        
        try:
            payment.refund_payment(refund_amount, reason)
            db.session.commit()
            
            return True, None
        
        except Exception as e:
            db.session.rollback()
            return False, f'Refund processing failed: {str(e)}'
    
    @staticmethod
    def process_worker_payout(payment_id):
        """
        Process worker payout.
        
        Args:
            payment_id (int): Payment ID
        
        Returns:
            tuple: (success, error_message)
        """
        payment = Payment.query.get(payment_id)
        
        if not payment:
            return False, 'Payment not found'
        
        if payment.status != 'completed':
            return False, 'Can only payout completed payments'
        
        if payment.worker_payout_status == 'paid':
            return False, 'Worker payout already processed'
        
        try:
            # Mark payout as processing
            payment.process_worker_payout()
            
            # TODO: Integrate with actual payment provider (Stripe, Mobile Money, etc.)
            # This is a placeholder for actual payout processing
            
            # For now, mark as paid
            payment.complete_worker_payout()
            
            # Update worker's earnings
            booking = Booking.query.get(payment.booking_id)
            if booking:
                worker = Worker.query.filter_by(user_id=booking.worker_id).first()
                if worker:
                    worker.total_earnings += payment.worker_payout_amount
                    worker.available_balance += payment.worker_payout_amount
            
            db.session.commit()
            
            return True, None
        
        except Exception as e:
            db.session.rollback()
            return False, f'Payout processing failed: {str(e)}'
    
    @staticmethod
    def get_payment_history(user_id, role='customer', page=1, per_page=20):
        """
        Get payment history for a user.
        
        Args:
            user_id (int): User ID
            role (str): User role (customer or worker)
            page (int): Page number
            per_page (int): Items per page
        
        Returns:
            dict: Paginated payments
        """
        if role == 'customer':
            query = Payment.query.join(Booking).filter(Booking.customer_id == user_id)
        else:
            query = Payment.query.join(Booking).filter(Booking.worker_id == user_id)
        
        query = query.order_by(Payment.created_at.desc())
        
        from app.utils.helpers import paginate_results
        return paginate_results(query, page, per_page)
