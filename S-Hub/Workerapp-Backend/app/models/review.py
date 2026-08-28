"""
Review model for WorkerApp.
This model represents reviews and ratings for workers.
"""

from datetime import datetime
from app.models import db


class Review(db.Model):
    """
    Review model representing customer reviews of workers.
    """
    
    __tablename__ = 'reviews'
    
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
        nullable=False,
        index=True
    )
    booking_id = db.Column(
        db.Integer,
        db.ForeignKey('bookings.id', ondelete='CASCADE'),
        nullable=False,
        unique=True,
        index=True
    )
    
    # Rating
    rating = db.Column(db.Integer, nullable=False)  # 1-5 stars
    rating_categories = db.Column(db.JSON, nullable=True)  # Detailed ratings
    
    # Review Content
    title = db.Column(db.String(200), nullable=True)
    comment = db.Column(db.Text, nullable=True)
    
    # Review Details
    is_verified = db.Column(db.Boolean, default=False, nullable=False)  # Verified purchase
    is_flagged = db.Column(db.Boolean, default=False, nullable=False)
    flag_reason = db.Column(db.String(255), nullable=True)
    
    # Worker Response
    worker_response = db.Column(db.Text, nullable=True)
    worker_response_date = db.Column(db.DateTime, nullable=True)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    customer = db.relationship('User', foreign_keys=[customer_id], back_populates='reviews_given')
    worker = db.relationship('User', foreign_keys=[worker_id])
    booking = db.relationship('Booking', back_populates='review')
    
    def __init__(self, customer_id, worker_id, booking_id, rating, **kwargs):
        """
        Initialize a new review.
        
        Args:
            customer_id (int): Customer user ID
            worker_id (int): Worker user ID
            booking_id (int): Booking ID
            rating (int): Rating (1-5)
            **kwargs: Additional review attributes
        """
        self.customer_id = customer_id
        self.worker_id = worker_id
        self.booking_id = booking_id
        self.rating = max(1, min(5, rating))  # Ensure rating is between 1-5
        
        # Set additional attributes
        for key, value in kwargs.items():
            if hasattr(self, key):
                setattr(self, key, value)
    
    def add_worker_response(self, response):
        """
        Add worker response to the review.
        
        Args:
            response (str): Worker's response
        """
        self.worker_response = response
        self.worker_response_date = datetime.utcnow()
        self.updated_at = datetime.utcnow()
    
    def flag_review(self, reason):
        """
        Flag a review for moderation.
        
        Args:
            reason (str): Flag reason
        """
        self.is_flagged = True
        self.flag_reason = reason
        self.updated_at = datetime.utcnow()
    
    def to_dict(self):
        """
        Convert review object to dictionary.
        
        Returns:
            dict: Review data as dictionary
        """
        return {
            'id': self.id,
            'customer_id': self.customer_id,
            'worker_id': self.worker_id,
            'booking_id': self.booking_id,
            'rating': self.rating,
            'rating_categories': self.rating_categories,
            'title': self.title,
            'comment': self.comment,
            'is_verified': self.is_verified,
            'is_flagged': self.is_flagged,
            'flag_reason': self.flag_reason,
            'worker_response': self.worker_response,
            'worker_response_date': self.worker_response_date.isoformat() if self.worker_response_date else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
    
    def __repr__(self):
        """String representation of the review."""
        return f'<Review {self.rating} stars by Customer {self.customer_id}>'
