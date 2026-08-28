"""
Booking model for WorkerApp.
This model represents job bookings between customers and workers.
"""

from datetime import datetime
from app.models import db


class Booking(db.Model):
    """
    Booking model representing job bookings.
    Links customers with workers for specific services.
    """
    
    __tablename__ = 'bookings'
    
    # Primary Key
    id = db.Column(db.Integer, primary_key=True)
    
    # Foreign Keys
    customer_id = db.Column(
        db.Integer,
        db.ForeignKey('users.id', ondelete='CASCADE'),
        nullable=False,
        index=True
    )
    worker_id = db.Column(
        db.Integer,
        db.ForeignKey('users.id', ondelete='CASCADE'),
        nullable=True,
        index=True
    )
    service_id = db.Column(
        db.Integer,
        db.ForeignKey('services.id', ondelete='SET NULL'),
        nullable=True
    )
    
    # Booking Details
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=False)
    image_urls = db.Column(db.JSON, nullable=False, default=list)
    
    # Scheduling
    scheduled_date = db.Column(db.Date, nullable=False)
    scheduled_time = db.Column(db.Time, nullable=True)
    estimated_duration = db.Column(db.Integer, nullable=True)  # Duration in hours
    is_emergency = db.Column(db.Boolean, default=False, nullable=False)
    
    # Pricing
    estimated_cost = db.Column(db.Numeric(12, 2), nullable=True)
    final_cost = db.Column(db.Numeric(12, 2), nullable=True)
    hourly_rate = db.Column(db.Numeric(10, 2), nullable=True)
    
    # Location
    location_address = db.Column(db.String(255), nullable=True)
    location_city = db.Column(db.String(100), nullable=True)
    location_region = db.Column(db.String(100), nullable=True)
    latitude = db.Column(db.Float, nullable=True)
    longitude = db.Column(db.Float, nullable=True)
    
    # Status
    status = db.Column(
        db.String(20),
        nullable=False,
        default='pending',
        index=True
    )  # 'open', 'pending', 'accepted', 'rejected', 'in_progress', 'completed', 'cancelled'
    
    # Worker Response
    worker_response_time = db.Column(db.Integer, nullable=True)  # Response time in minutes
    worker_notes = db.Column(db.Text, nullable=True)
    
    # Completion
    actual_start_time = db.Column(db.DateTime, nullable=True)
    actual_end_time = db.Column(db.DateTime, nullable=True)
    actual_duration = db.Column(db.Integer, nullable=True)  # Actual duration in hours
    
    # Cancellation
    cancelled_by = db.Column(db.String(20), nullable=True)  # 'customer', 'worker', 'admin'
    cancellation_reason = db.Column(db.Text, nullable=True)
    cancelled_at = db.Column(db.DateTime, nullable=True)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    customer = db.relationship('User', foreign_keys=[customer_id], back_populates='bookings_as_customer')
    worker = db.relationship('User', foreign_keys=[worker_id])
    service = db.relationship('Service')
    review = db.relationship(
        'Review',
        back_populates='booking',
        uselist=False,
        cascade='all, delete-orphan'
    )
    payment = db.relationship(
        'Payment',
        back_populates='booking',
        uselist=False,
        cascade='all, delete-orphan'
    )
    
    def __init__(self, customer_id, worker_id, title, description, scheduled_date, **kwargs):
        """
        Initialize a new booking.
        
        Args:
            customer_id (int): Customer user ID
            worker_id (int): Worker user ID
            title (str): Booking title
            description (str): Job description
            scheduled_date (date): Scheduled date for the job
            **kwargs: Additional booking attributes
        """
        self.customer_id = customer_id
        self.worker_id = worker_id
        self.title = title
        self.description = description
        self.scheduled_date = scheduled_date
        
        # Set additional attributes
        for key, value in kwargs.items():
            if hasattr(self, key):
                setattr(self, key, value)
    
    def accept_booking(self):
        """Accept the booking."""
        self.status = 'accepted'
        self.updated_at = datetime.utcnow()

    def assign_worker(self, worker_id):
        """Assign the booking request to the worker who accepted it."""
        self.worker_id = worker_id
        self.accept_booking()
    
    def reject_booking(self, reason=None):
        """
        Reject the booking.
        
        Args:
            reason (str): Rejection reason
        """
        self.status = 'rejected'
        self.worker_notes = reason
        self.updated_at = datetime.utcnow()
    
    def start_job(self):
        """Mark the job as in progress."""
        self.status = 'in_progress'
        self.actual_start_time = datetime.utcnow()
        self.updated_at = datetime.utcnow()
    
    def complete_job(self, final_cost=None):
        """
        Complete the job.
        
        Args:
            final_cost (Decimal): Final cost of the job
        """
        self.status = 'completed'
        self.actual_end_time = datetime.utcnow()
        if final_cost:
            self.final_cost = final_cost
        if self.actual_start_time:
            duration = self.actual_end_time - self.actual_start_time
            self.actual_duration = duration.total_seconds() / 3600  # Convert to hours
        self.updated_at = datetime.utcnow()
    
    def cancel_booking(self, cancelled_by, reason=None):
        """
        Cancel the booking.
        
        Args:
            cancelled_by (str): Who cancelled ('customer', 'worker', 'admin')
            reason (str): Cancellation reason
        """
        self.status = 'cancelled'
        self.cancelled_by = cancelled_by
        self.cancellation_reason = reason
        self.cancelled_at = datetime.utcnow()
        self.updated_at = datetime.utcnow()
    
    def calculate_estimated_cost(self):
        """Calculate estimated cost based on duration and hourly rate."""
        if self.estimated_duration and self.hourly_rate:
            self.estimated_cost = self.estimated_duration * self.hourly_rate
            if self.is_emergency:
                # Add emergency surcharge (e.g., 50%)
                from app.config.config import get_config
                config = get_config()
                surcharge = self.estimated_cost * config.EMERGENCY_SERVICE_SURCHARGE
                self.estimated_cost += surcharge
    
    def to_dict(self):
        """
        Convert booking object to dictionary.
        
        Returns:
            dict: Booking data as dictionary
        """
        return {
            'id': self.id,
            'customer_id': self.customer_id,
            'worker_id': self.worker_id,
            'service_id': self.service_id,
            'service': self.service.to_dict() if self.service else None,
            'title': self.title,
            'description': self.description,
            'image_urls': self.image_urls or [],
            'scheduled_date': self.scheduled_date.isoformat() if self.scheduled_date else None,
            'scheduled_time': self.scheduled_time.isoformat() if self.scheduled_time else None,
            'estimated_duration': self.estimated_duration,
            'is_emergency': self.is_emergency,
            'estimated_cost': float(self.estimated_cost) if self.estimated_cost else None,
            'final_cost': float(self.final_cost) if self.final_cost else None,
            'hourly_rate': float(self.hourly_rate) if self.hourly_rate else None,
            'location_address': self.location_address,
            'location_city': self.location_city,
            'location_region': self.location_region,
            'latitude': self.latitude,
            'longitude': self.longitude,
            'status': self.status,
            'worker_response_time': self.worker_response_time,
            'worker_notes': self.worker_notes,
            'actual_start_time': self.actual_start_time.isoformat() if self.actual_start_time else None,
            'actual_end_time': self.actual_end_time.isoformat() if self.actual_end_time else None,
            'actual_duration': self.actual_duration,
            'cancelled_by': self.cancelled_by,
            'cancellation_reason': self.cancellation_reason,
            'cancelled_at': self.cancelled_at.isoformat() if self.cancelled_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'customer': self.customer.to_dict() if self.customer else None,
            'worker': self.worker.to_dict() if self.worker else None,
        }
    
    def __repr__(self):
        """String representation of the booking."""
        return f'<Booking {self.title} - Status: {self.status}>'
