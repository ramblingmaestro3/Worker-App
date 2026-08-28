"""
Payment model for WorkerApp.
This model represents payment transactions for bookings.
"""

from datetime import datetime
from app.models import db


class Payment(db.Model):
    """
    Payment model representing payment transactions.
    Handles payments between customers and workers.
    """
    
    __tablename__ = 'payments'
    
    # Primary Key
    id = db.Column(db.Integer, primary_key=True)
    
    # Foreign Key
    booking_id = db.Column(
        db.Integer,
        db.ForeignKey('bookings.id', ondelete='CASCADE'),
        nullable=False,
        unique=True,
        index=True
    )
    
    # Payment Details
    amount = db.Column(db.Numeric(12, 2), nullable=False)
    currency = db.Column(db.String(3), default='GHS', nullable=False)  # Default to Ghana Cedis
    
    # Payment Provider
    provider = db.Column(db.String(50), nullable=False)  # 'stripe', 'mobile_money', 'cash'
    provider_transaction_id = db.Column(db.String(255), nullable=True, unique=True)
    provider_payment_method_id = db.Column(db.String(255), nullable=True)
    
    # Payment Status
    status = db.Column(
        db.String(20),
        nullable=False,
        default='pending',
        index=True
    )  # 'pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled'
    
    # Payment Flow
    payment_type = db.Column(
        db.String(20),
        nullable=False,
        default='full'
    )  # 'full', 'deposit', 'milestone'
    
    # Platform Fees
    platform_fee = db.Column(db.Numeric(10, 2), nullable=False)
    platform_fee_percentage = db.Column(db.Float, default=10.0, nullable=False)  # 10% platform fee
    
    # Worker Payout
    worker_payout_amount = db.Column(db.Numeric(12, 2), nullable=False)
    worker_payout_status = db.Column(
        db.String(20),
        default='pending'
    )  # 'pending', 'processing', 'paid', 'failed'
    
    # Refund Information
    refund_amount = db.Column(db.Numeric(12, 2), nullable=True)
    refund_reason = db.Column(db.Text, nullable=True)
    refund_date = db.Column(db.DateTime, nullable=True)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    completed_at = db.Column(db.DateTime, nullable=True)
    
    # Relationships
    booking = db.relationship('Booking', back_populates='payment')
    
    def __init__(self, booking_id, amount, provider, **kwargs):
        """
        Initialize a new payment.
        
        Args:
            booking_id (int): Booking ID
            amount (Decimal): Payment amount
            provider (str): Payment provider
            **kwargs: Additional payment attributes
        """
        self.booking_id = booking_id
        self.amount = amount
        self.provider = provider
        
        # Calculate platform fee (default 10%)
        self.platform_fee_percentage = kwargs.get('platform_fee_percentage', 10.0)
        self.platform_fee = amount * (self.platform_fee_percentage / 100)
        
        # Calculate worker payout amount
        self.worker_payout_amount = amount - self.platform_fee
        
        # Set additional attributes
        for key, value in kwargs.items():
            if hasattr(self, key):
                setattr(self, key, value)
    
    def complete_payment(self, transaction_id=None):
        """
        Mark payment as completed.
        
        Args:
            transaction_id (str): Provider transaction ID
        """
        self.status = 'completed'
        self.completed_at = datetime.utcnow()
        if transaction_id:
            self.provider_transaction_id = transaction_id
        self.updated_at = datetime.utcnow()
    
    def fail_payment(self, reason=None):
        """
        Mark payment as failed.
        
        Args:
            reason (str): Failure reason
        """
        self.status = 'failed'
        self.updated_at = datetime.utcnow()
    
    def refund_payment(self, refund_amount=None, reason=None):
        """
        Process a refund.
        
        Args:
            refund_amount (Decimal): Refund amount
            reason (str): Refund reason
        """
        self.status = 'refunded'
        self.refund_amount = refund_amount if refund_amount else self.amount
        self.refund_reason = reason
        self.refund_date = datetime.utcnow()
        self.updated_at = datetime.utcnow()
    
    def process_worker_payout(self):
        """Mark worker payout as processing."""
        self.worker_payout_status = 'processing'
        self.updated_at = datetime.utcnow()
    
    def complete_worker_payout(self):
        """Mark worker payout as completed."""
        self.worker_payout_status = 'paid'
        self.updated_at = datetime.utcnow()
    
    def to_dict(self):
        """
        Convert payment object to dictionary.
        
        Returns:
            dict: Payment data as dictionary
        """
        return {
            'id': self.id,
            'booking_id': self.booking_id,
            'amount': float(self.amount),
            'currency': self.currency,
            'provider': self.provider,
            'provider_transaction_id': self.provider_transaction_id,
            'provider_payment_method_id': self.provider_payment_method_id,
            'status': self.status,
            'payment_type': self.payment_type,
            'platform_fee': float(self.platform_fee),
            'platform_fee_percentage': self.platform_fee_percentage,
            'worker_payout_amount': float(self.worker_payout_amount),
            'worker_payout_status': self.worker_payout_status,
            'refund_amount': float(self.refund_amount) if self.refund_amount else None,
            'refund_reason': self.refund_reason,
            'refund_date': self.refund_date.isoformat() if self.refund_date else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
        }
    
    def __repr__(self):
        """String representation of the payment."""
        return f'<Payment {self.amount} {self.currency} - Status: {self.status}>'
