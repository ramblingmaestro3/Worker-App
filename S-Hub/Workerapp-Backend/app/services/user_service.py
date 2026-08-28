"""
User service for WorkerApp.
Handles user-related business logic.
"""

from app.models import db, User
from app.utils.validators import validate_email, validate_phone


class UserService:
    """Service for user operations."""
    
    @staticmethod
    def get_user_by_id(user_id):
        """
        Get user by ID.
        
        Args:
            user_id (int): User ID
        
        Returns:
            User: User object or None
        """
        return User.query.get(user_id)
    
    @staticmethod
    def get_user_by_email(email):
        """
        Get user by email.
        
        Args:
            email (str): User email
        
        Returns:
            User: User object or None
        """
        return User.query.filter_by(email=email.lower()).first()
    
    @staticmethod
    def update_user_profile(user_id, **kwargs):
        """
        Update user profile.
        
        Args:
            user_id (int): User ID
            **kwargs: User attributes to update
        
        Returns:
            tuple: (user, error_message)
        """
        user = User.query.get(user_id)
        
        if not user:
            return None, 'User not found'
        
        try:
            # Validate email if provided
            if 'email' in kwargs:
                is_valid, error = validate_email(kwargs['email'])
                if not is_valid:
                    return None, error
                
                # Check if email is already taken by another user
                existing_user = User.query.filter_by(email=kwargs['email'].lower()).first()
                if existing_user and existing_user.id != user_id:
                    return None, 'Email already in use'
                
                user.email = kwargs['email']
            
            # Validate phone if provided
            if 'phone_number' in kwargs:
                is_valid, error = validate_phone(kwargs['phone_number'])
                if not is_valid:
                    return None, error
                
                # Check if phone is already taken by another user
                if kwargs['phone_number']:
                    existing_user = User.query.filter_by(phone_number=kwargs['phone_number']).first()
                    if existing_user and existing_user.id != user_id:
                        return None, 'Phone number already in use'
                
                user.phone_number = kwargs['phone_number']
            
            # Update other fields
            updatable_fields = [
                'first_name', 'last_name', 'profile_picture', 'bio',
                'date_of_birth', 'address', 'city', 'region', 'country',
                'latitude', 'longitude'
            ]
            
            for field in updatable_fields:
                if field in kwargs:
                    setattr(user, field, kwargs[field])
            
            # Update full name if first or last name changed
            if 'first_name' in kwargs or 'last_name' in kwargs:
                user.full_name = f"{user.first_name} {user.last_name}"
            
            db.session.commit()
            
            return user, None
        
        except Exception as e:
            db.session.rollback()
            return None, f'Profile update failed: {str(e)}'
    
    @staticmethod
    def deactivate_user(user_id):
        """
        Deactivate user account.
        
        Args:
            user_id (int): User ID
        
        Returns:
            tuple: (success, error_message)
        """
        user = User.query.get(user_id)
        
        if not user:
            return False, 'User not found'
        
        try:
            user.is_active = False
            db.session.commit()
            
            return True, None
        
        except Exception as e:
            db.session.rollback()
            return False, f'Account deactivation failed: {str(e)}'
    
    @staticmethod
    def activate_user(user_id):
        """
        Activate user account.
        
        Args:
            user_id (int): User ID
        
        Returns:
            tuple: (success, error_message)
        """
        user = User.query.get(user_id)
        
        if not user:
            return False, 'User not found'
        
        try:
            user.is_active = True
            db.session.commit()
            
            return True, None
        
        except Exception as e:
            db.session.rollback()
            return False, f'Account activation failed: {str(e)}'
    
    @staticmethod
    def get_all_users(page=1, per_page=20, role=None, is_active=None):
        """
        Get all users with optional filters.
        
        Args:
            page (int): Page number
            per_page (int): Items per page
            role (str): Filter by role
            is_active (bool): Filter by active status
        
        Returns:
            dict: Paginated users
        """
        query = User.query
        
        if role:
            query = query.filter_by(role=role)
        
        if is_active is not None:
            query = query.filter_by(is_active=is_active)
        
        query = query.order_by(User.created_at.desc())
        
        from app.utils.helpers import paginate_results
        return paginate_results(query, page, per_page)
    
    @staticmethod
    def search_users(query_string, page=1, per_page=20):
        """
        Search users by name or email.
        
        Args:
            query_string (str): Search query
            page (int): Page number
            per_page (int): Items per page
        
        Returns:
            dict: Paginated search results
        """
        search_pattern = f'%{query_string}%'
        
        query = User.query.filter(
            (User.first_name.ilike(search_pattern)) |
            (User.last_name.ilike(search_pattern)) |
            (User.full_name.ilike(search_pattern)) |
            (User.email.ilike(search_pattern))
        )
        
        query = query.order_by(User.created_at.desc())
        
        from app.utils.helpers import paginate_results
        return paginate_results(query, page, per_page)
