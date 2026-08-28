"""
Availability model for WorkerApp.
This model represents worker availability schedules.
"""

from datetime import datetime, time
from app.models import db


class Availability(db.Model):
    """
    Availability model representing worker availability schedules.
    Stores when workers are available for bookings.
    """
    
    __tablename__ = 'availability'
    
    # Primary Key
    id = db.Column(db.Integer, primary_key=True)
    
    # Foreign Key
    worker_id = db.Column(
        db.Integer,
        db.ForeignKey('workers.id', ondelete='CASCADE'),
        nullable=False,
        index=True
    )
    
    # Schedule Type
    schedule_type = db.Column(
        db.String(20),
        nullable=False,
        default='recurring'
    )  # 'recurring', 'specific_date', 'blocked'
    
    # Day of Week (for recurring schedules)
    day_of_week = db.Column(db.Integer, nullable=True)  # 0-6 (Monday-Sunday)
    
    # Date (for specific dates)
    specific_date = db.Column(db.Date, nullable=True)
    
    # Time Slots
    start_time = db.Column(db.Time, nullable=False)
    end_time = db.Column(db.Time, nullable=False)
    
    # Availability Status
    is_available = db.Column(db.Boolean, default=True, nullable=False)
    
    # Notes
    notes = db.Column(db.String(255), nullable=True)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    worker = db.relationship('Worker', back_populates='availabilities')
    
    def __init__(self, worker_id, start_time, end_time, **kwargs):
        """
        Initialize a new availability slot.
        
        Args:
            worker_id (int): Worker ID
            start_time (time): Start time
            end_time (time): End time
            **kwargs: Additional availability attributes
        """
        self.worker_id = worker_id
        self.start_time = start_time
        self.end_time = end_time
        
        # Set additional attributes
        for key, value in kwargs.items():
            if hasattr(self, key):
                setattr(self, key, value)
    
    def is_time_slot_available(self, check_time):
        """
        Check if a specific time is within this availability slot.
        
        Args:
            check_time (time): Time to check
        
        Returns:
            bool: True if available, False otherwise
        """
        if not self.is_available:
            return False
        
        if self.start_time <= check_time <= self.end_time:
            return True
        
        return False
    
    def to_dict(self):
        """
        Convert availability object to dictionary.
        
        Returns:
            dict: Availability data as dictionary
        """
        return {
            'id': self.id,
            'worker_id': self.worker_id,
            'schedule_type': self.schedule_type,
            'day_of_week': self.day_of_week,
            'specific_date': self.specific_date.isoformat() if self.specific_date else None,
            'start_time': self.start_time.isoformat() if self.start_time else None,
            'end_time': self.end_time.isoformat() if self.end_time else None,
            'is_available': self.is_available,
            'notes': self.notes,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
    
    def __repr__(self):
        """String representation of the availability."""
        return f'<Availability Worker {self.worker_id} - {self.start_time} to {self.end_time}>'
