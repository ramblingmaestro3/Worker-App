"""
Certification model for WorkerApp.
This model represents worker certifications and credentials.
"""

from datetime import datetime
from app.models import db


class Certification(db.Model):
    """
    Certification model representing worker certifications.
    Stores professional certifications and credentials.
    """
    
    __tablename__ = 'certifications'
    
    # Primary Key
    id = db.Column(db.Integer, primary_key=True)
    
    # Foreign Key
    worker_id = db.Column(
        db.Integer,
        db.ForeignKey('workers.id', ondelete='CASCADE'),
        nullable=False,
        index=True
    )
    
    # Certification Details
    name = db.Column(db.String(200), nullable=False)
    issuing_organization = db.Column(db.String(200), nullable=False)
    certificate_number = db.Column(db.String(100), nullable=True, unique=True)
    
    # Dates
    issue_date = db.Column(db.Date, nullable=True)
    expiry_date = db.Column(db.Date, nullable=True)
    
    # Documents
    document_url = db.Column(db.String(255), nullable=True)  # URL to uploaded certificate
    document_type = db.Column(db.String(50), nullable=True)  # 'pdf', 'image'
    
    # Verification
    is_verified = db.Column(db.Boolean, default=False, nullable=False, index=True)
    verified_by = db.Column(db.Integer, nullable=True)  # Admin user ID
    verified_at = db.Column(db.DateTime, nullable=True)
    verification_notes = db.Column(db.Text, nullable=True)
    
    # Display
    is_public = db.Column(db.Boolean, default=True, nullable=False)
    display_order = db.Column(db.Integer, default=0, nullable=False)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    worker = db.relationship('Worker', back_populates='certifications')
    
    def __init__(self, worker_id, name, issuing_organization, **kwargs):
        """
        Initialize a new certification.
        
        Args:
            worker_id (int): Worker ID
            name (str): Certification name
            issuing_organization (str): Issuing organization
            **kwargs: Additional certification attributes
        """
        self.worker_id = worker_id
        self.name = name
        self.issuing_organization = issuing_organization
        
        # Set additional attributes
        for key, value in kwargs.items():
            if hasattr(self, key):
                setattr(self, key, value)
    
    def verify_certification(self, verified_by, notes=None):
        """
        Verify the certification.
        
        Args:
            verified_by (int): Admin user ID who verified
            notes (str): Verification notes
        """
        self.is_verified = True
        self.verified_by = verified_by
        self.verified_at = datetime.utcnow()
        self.verification_notes = notes
        self.updated_at = datetime.utcnow()
    
    def is_expired(self):
        """
        Check if certification is expired.
        
        Returns:
            bool: True if expired, False otherwise
        """
        if self.expiry_date:
            return datetime.utcnow().date() > self.expiry_date
        return False
    
    def to_dict(self):
        """
        Convert certification object to dictionary.
        
        Returns:
            dict: Certification data as dictionary
        """
        return {
            'id': self.id,
            'worker_id': self.worker_id,
            'name': self.name,
            'issuing_organization': self.issuing_organization,
            'certificate_number': self.certificate_number,
            'issue_date': self.issue_date.isoformat() if self.issue_date else None,
            'expiry_date': self.expiry_date.isoformat() if self.expiry_date else None,
            'document_url': self.document_url,
            'document_type': self.document_type,
            'is_verified': self.is_verified,
            'verified_by': self.verified_by,
            'verified_at': self.verified_at.isoformat() if self.verified_at else None,
            'verification_notes': self.verification_notes,
            'is_public': self.is_public,
            'display_order': self.display_order,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
    
    def __repr__(self):
        """String representation of the certification."""
        return f'<Certification {self.name} - Verified: {self.is_verified}>'
