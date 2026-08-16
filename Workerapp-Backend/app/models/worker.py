"""
Worker model for WorkerApp.
This model extends the User model with worker-specific fields.
"""

from datetime import datetime
from app.models import db


class Worker(db.Model):
    """
    Worker model representing skilled workers in the system.
    Extends the User model with worker-specific attributes.
    """
    
    __tablename__ = 'workers'
    
    # Primary Key
    id = db.Column(db.Integer, primary_key=True)
    
    # Foreign Key to User
    user_id = db.Column(
        db.Integer, 
        db.ForeignKey('users.id', ondelete='CASCADE'),
        nullable=False,
        unique=True,
        index=True
    )
    
    # Service Category
    service_category_id = db.Column(
        db.Integer,
        db.ForeignKey('services.id', ondelete='SET NULL'),
        nullable=True,
        index=True
    )
    
    # Professional Information
    occupation = db.Column(db.String(100), nullable=False)
    years_of_experience = db.Column(db.Integer, default=0, nullable=False)
    skills = db.Column(db.JSON, nullable=True)  # List of skills as JSON
    hourly_rate = db.Column(db.Numeric(10, 2), nullable=False)  # Hourly rate in local currency
    bio = db.Column(db.Text, nullable=True)
    
    # Availability
    is_available = db.Column(db.Boolean, default=True, nullable=False, index=True)
    emergency_service_available = db.Column(db.Boolean, default=False, nullable=False)
    
    # Location Service Area
    service_area_radius = db.Column(db.Integer, default=10)  # Radius in km
    preferred_locations = db.Column(db.JSON, nullable=True)  # List of preferred locations
    
    # Verification and Rating
    is_verified = db.Column(db.Boolean, default=False, nullable=False, index=True)
    verification_date = db.Column(db.DateTime, nullable=True)
    rating = db.Column(db.Float, default=0.0, nullable=False)  # Average rating (0-5)
    total_reviews = db.Column(db.Integer, default=0, nullable=False)
    completed_jobs = db.Column(db.Integer, default=0, nullable=False)
    
    # Earnings
    total_earnings = db.Column(db.Numeric(12, 2), default=0.00, nullable=False)
    available_balance = db.Column(db.Numeric(12, 2), default=0.00, nullable=False)
    
    # Ranking and Performance
    rank_score = db.Column(db.Float, default=0.0, nullable=False)  # AI-calculated rank
    response_rate = db.Column(db.Float, default=0.0, nullable=False)  # Percentage
    response_time = db.Column(db.Integer, default=0)  # Average response time in minutes
    completion_rate = db.Column(db.Float, default=0.0, nullable=False)  # Percentage
    
    # Profile Completion
    profile_completion_percentage = db.Column(db.Integer, default=0, nullable=False)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = db.relationship('User', back_populates='worker_profile')
    service_category = db.relationship('Service', back_populates='workers')
    certifications = db.relationship(
        'Certification',
        back_populates='worker',
        cascade='all, delete-orphan'
    )
    availabilities = db.relationship(
        'Availability',
        back_populates='worker',
        cascade='all, delete-orphan'
    )
    # Note: bookings_as_worker relationship removed because Booking.worker_id references User, not Worker
    # Access bookings through user.bookings_as_worker instead
    # Note: reviews_received relationship removed because Review.worker_id references User, not Worker
    # Access reviews through user.reviews_received instead
    
    def __init__(self, user_id, occupation, hourly_rate, **kwargs):
        """
        Initialize a new worker profile.
        
        Args:
            user_id (int): User ID
            occupation (str): Worker's occupation
            hourly_rate (Decimal): Hourly rate
            **kwargs: Additional worker attributes
        """
        self.user_id = user_id
        self.occupation = occupation
        self.hourly_rate = hourly_rate
        
        # Set additional attributes
        for key, value in kwargs.items():
            if hasattr(self, key):
                setattr(self, key, value)
        
        # Calculate initial profile completion
        self.calculate_profile_completion()
    
    def calculate_profile_completion(self):
        """Calculate profile completion percentage."""
        required_fields = [
            'occupation',
            'hourly_rate',
            'skills',
            'bio',
            'years_of_experience'
        ]
        
        completed = sum(1 for field in required_fields if getattr(self, field, None))
        self.profile_completion_percentage = int((completed / len(required_fields)) * 100)
    
    def update_rating(self, new_rating):
        """
        Update worker's average rating.
        
        Args:
            new_rating (float): New rating to add
        """
        total_rating = self.rating * self.total_reviews
        self.total_reviews += 1
        self.rating = (total_rating + new_rating) / self.total_reviews
    
    def increment_completed_jobs(self):
        """Increment completed jobs counter."""
        self.completed_jobs += 1
        self.calculate_completion_rate()
    
    def calculate_completion_rate(self):
        """Calculate job completion rate."""
        if self.completed_jobs == 0:
            self.completion_rate = 0.0
        else:
            total_bookings = len(self.bookings_as_worker)
            if total_bookings > 0:
                self.completion_rate = (self.completed_jobs / total_bookings) * 100
    
    def calculate_rank_score(self):
        """
        Calculate worker rank score using AI-weighted factors.
        This is a placeholder for AI-powered ranking system.
        
        Rank Score Formula (placeholder):
        - Rating: 40%
        - Completion Rate: 25%
        - Response Rate: 20%
        - Experience: 10%
        - Verification: 5%
        """
        rating_score = self.rating * 0.4
        completion_score = (self.completion_rate / 100) * 0.25
        response_score = (self.response_rate / 100) * 0.2
        experience_score = min(self.years_of_experience / 20, 1) * 0.1
        verification_score = 1.0 if self.is_verified else 0.0 * 0.05
        
        self.rank_score = (
            rating_score + 
            completion_score + 
            response_score + 
            experience_score + 
            verification_score
        ) * 100  # Scale to 0-100
    
    def to_dict(self, include_sensitive=False):
        """
        Convert worker object to dictionary.
        
        Args:
            include_sensitive (bool): Whether to include sensitive fields
        
        Returns:
            dict: Worker data as dictionary
        """
        data = {
            'id': self.id,
            'user_id': self.user_id,
            'occupation': self.occupation,
            'service_category_id': self.service_category_id,
            'years_of_experience': self.years_of_experience,
            'skills': self.skills,
            'hourly_rate': float(self.hourly_rate) if self.hourly_rate else 0,
            'bio': self.bio,
            'is_available': self.is_available,
            'emergency_service_available': self.emergency_service_available,
            'service_area_radius': self.service_area_radius,
            'is_verified': self.is_verified,
            'rating': self.rating,
            'total_reviews': self.total_reviews,
            'completed_jobs': self.completed_jobs,
            'profile_completion_percentage': self.profile_completion_percentage,
            'rank_score': self.rank_score,
            'response_rate': self.response_rate,
            'response_time': self.response_time,
            'completion_rate': self.completion_rate,
            'user': self.user.to_dict(include_sensitive=False) if self.user else None,
            'display_name': self.user.full_name if self.user else None,
            'city': self.user.city if self.user else None,
            'region': self.user.region if self.user else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
        
        if include_sensitive:
            data['total_earnings'] = float(self.total_earnings) if self.total_earnings else 0
            data['available_balance'] = float(self.available_balance) if self.available_balance else 0
            data['preferred_locations'] = self.preferred_locations
        
        return data
    
    def __repr__(self):
        """String representation of the worker."""
        return f'<Worker {self.occupation} - Rating: {self.rating}>'
