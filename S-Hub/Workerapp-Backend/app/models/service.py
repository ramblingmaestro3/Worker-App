"""
Service model for WorkerApp.
This model represents service categories available on the platform.
"""

from datetime import datetime
from app.models import db


class Service(db.Model):
    """
    Service model representing different service categories.
    Examples: Electrician, Plumber, Carpenter, etc.
    """
    
    __tablename__ = 'services'
    
    # Primary Key
    id = db.Column(db.Integer, primary_key=True)
    
    # Service Information
    name = db.Column(db.String(100), unique=True, nullable=False, index=True)
    slug = db.Column(db.String(100), unique=True, nullable=False, index=True)
    description = db.Column(db.Text, nullable=True)
    icon = db.Column(db.String(50), nullable=True)  # Icon name or emoji
    
    # Category Information
    parent_category_id = db.Column(
        db.Integer,
        db.ForeignKey('services.id', ondelete='SET NULL'),
        nullable=True
    )  # For sub-categories
    
    # Service Details
    base_hourly_rate = db.Column(db.Numeric(10, 2), nullable=True)  # Suggested base rate
    min_hourly_rate = db.Column(db.Numeric(10, 2), nullable=True)
    max_hourly_rate = db.Column(db.Numeric(10, 2), nullable=True)
    
    # Service Settings
    is_active = db.Column(db.Boolean, default=True, nullable=False, index=True)
    requires_certification = db.Column(db.Boolean, default=False, nullable=False)
    emergency_service_available = db.Column(db.Boolean, default=False, nullable=False)
    
    # Display and Ordering
    display_order = db.Column(db.Integer, default=0, nullable=False)
    is_featured = db.Column(db.Boolean, default=False, nullable=False)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    workers = db.relationship('Worker', back_populates='service_category')
    parent_category = db.relationship(
        'Service',
        remote_side=[id],
        backref='sub_categories'
    )
    
    def __init__(self, name, slug, **kwargs):
        """
        Initialize a new service category.
        
        Args:
            name (str): Service name
            slug (str): URL-friendly slug
            **kwargs: Additional service attributes
        """
        self.name = name
        self.slug = slug.lower()
        
        # Set additional attributes
        for key, value in kwargs.items():
            if hasattr(self, key):
                setattr(self, key, value)
    
    def to_dict(self):
        """
        Convert service object to dictionary.
        
        Returns:
            dict: Service data as dictionary
        """
        return {
            'id': self.id,
            'name': self.name,
            'slug': self.slug,
            'description': self.description,
            'icon': self.icon,
            'parent_category_id': self.parent_category_id,
            'base_hourly_rate': float(self.base_hourly_rate) if self.base_hourly_rate else None,
            'min_hourly_rate': float(self.min_hourly_rate) if self.min_hourly_rate else None,
            'max_hourly_rate': float(self.max_hourly_rate) if self.max_hourly_rate else None,
            'is_active': self.is_active,
            'requires_certification': self.requires_certification,
            'emergency_service_available': self.emergency_service_available,
            'display_order': self.display_order,
            'is_featured': self.is_featured,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
    
    def __repr__(self):
        """String representation of the service."""
        return f'<Service {self.name}>'
