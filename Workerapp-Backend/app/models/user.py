"""
User model for WorkerApp.
This model represents both customers and workers in the system.
"""

from datetime import datetime
from app.models import db
from werkzeug.security import generate_password_hash, check_password_hash


class User(db.Model):
    """
    User model representing all users in the system.
    Users can be customers, workers, or admins.
    """
    
    __tablename__ = 'users'
    
    # Primary Key
    id = db.Column(db.Integer, primary_key=True)
    
    # Basic Information
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    phone_number = db.Column(db.String(20), unique=True, nullable=True, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    first_name = db.Column(db.String(50), nullable=False)
    last_name = db.Column(db.String(50), nullable=False)
    full_name = db.Column(db.String(100), nullable=False)
    
    # Profile Information
    profile_picture = db.Column(db.String(255), nullable=True)
    bio = db.Column(db.Text, nullable=True)
    date_of_birth = db.Column(db.Date, nullable=True)
    
    # Location Information
    address = db.Column(db.String(255), nullable=True)
    city = db.Column(db.String(100), nullable=True)
    region = db.Column(db.String(100), nullable=True)
    country = db.Column(db.String(100), default='Ghana')  # Default to Ghana for African market
    latitude = db.Column(db.Float, nullable=True)
    longitude = db.Column(db.Float, nullable=True)
    
    # User Role and Status
    role = db.Column(
        db.String(20), 
        nullable=False, 
        default='customer',
        index=True
    )  # 'customer', 'worker', 'admin'
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    is_verified = db.Column(db.Boolean, default=False, nullable=False)
    is_email_verified = db.Column(db.Boolean, default=False, nullable=False)
    is_phone_verified = db.Column(db.Boolean, default=False, nullable=False)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login = db.Column(db.DateTime, nullable=True)
    
    # Relationships
    worker_profile = db.relationship(
        'Worker',
        back_populates='user',
        uselist=False,
        cascade='all, delete-orphan'
    )
    bookings_as_customer = db.relationship(
        'Booking',
        foreign_keys='Booking.customer_id',
        back_populates='customer',
        cascade='all, delete-orphan'
    )
    reviews_given = db.relationship(
        'Review',
        foreign_keys='Review.customer_id',
        back_populates='customer',
        cascade='all, delete-orphan'
    )
    messages_sent = db.relationship(
        'Message',
        foreign_keys='Message.sender_id',
        back_populates='sender',
        cascade='all, delete-orphan'
    )
    messages_received = db.relationship(
        'Message',
        foreign_keys='Message.receiver_id',
        back_populates='receiver',
        cascade='all, delete-orphan'
    )
    notifications = db.relationship(
        'Notification',
        back_populates='user',
        cascade='all, delete-orphan'
    )
    
    def __init__(self, email, password, first_name, last_name, role='customer', **kwargs):
        """
        Initialize a new user.
        
        Args:
            email (str): User email address
            password (str): User password (will be hashed)
            first_name (str): User first name
            last_name (str): User last name
            role (str): User role (customer, worker, admin)
            **kwargs: Additional user attributes
        """
        self.email = email.lower()
        self.set_password(password)
        self.first_name = first_name.capitalize()
        self.last_name = last_name.capitalize()
        self.full_name = f"{self.first_name} {self.last_name}"
        self.role = role
        
        # Set additional attributes
        for key, value in kwargs.items():
            if hasattr(self, key):
                setattr(self, key, value)
    
    def set_password(self, password):
        """
        Hash and set the user's password.
        
        Args:
            password (str): Plain text password
        """
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        """
        Check if the provided password matches the stored hash.
        
        Args:
            password (str): Plain text password to check
        
        Returns:
            bool: True if password matches, False otherwise
        """
        return check_password_hash(self.password_hash, password)
    
    def update_last_login(self):
        """Update the last login timestamp."""
        self.last_login = datetime.utcnow()
        db.session.commit()
    
    def to_dict(self, include_sensitive=False):
        """
        Convert user object to dictionary.
        
        Args:
            include_sensitive (bool): Whether to include sensitive fields
        
        Returns:
            dict: User data as dictionary
        """
        data = {
            'id': self.id,
            'email': self.email,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'full_name': self.full_name,
            'role': self.role,
            'is_active': self.is_active,
            'is_verified': self.is_verified,
            'profile_picture': self.profile_picture,
            'bio': self.bio,
            'address': self.address,
            'city': self.city,
            'region': self.region,
            'country': self.country,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
        
        if include_sensitive:
            data['phone_number'] = self.phone_number
            data['latitude'] = self.latitude
            data['longitude'] = self.longitude
            data['last_login'] = self.last_login.isoformat() if self.last_login else None
        
        return data
    
    def __repr__(self):
        """String representation of the user."""
        return f'<User {self.email} - {self.role}>'
