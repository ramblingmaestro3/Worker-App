"""
Authentication service for WorkerApp.
Handles user authentication and authorization logic.
"""

from app.models import db, User, Worker
from app.utils.auth import generate_tokens, revoke_token
from app.utils.validators import validate_email, validate_password


class AuthService:
    """Service for authentication operations."""
    
    @staticmethod
    def register_user(email, password, first_name, last_name, role='customer', **kwargs):
        """
        Register a new user.
        
        Args:
            email (str): User email
            password (str): User password
            first_name (str): User first name
            last_name (str): User last name
            role (str): User role (customer, worker, admin)
            **kwargs: Additional user attributes
        
        Returns:
            tuple: (user, error_message)
        """
        # Validate email
        is_valid, error = validate_email(email)
        if not is_valid:
            return None, error
        
        # Validate password
        is_valid, error = validate_password(password)
        if not is_valid:
            return None, error
        
        # Check if email already exists
        if User.query.filter_by(email=email.lower()).first():
            return None, 'Email already registered'
        
        # Check if phone number already exists (if provided)
        phone_number = kwargs.get('phone_number')
        if phone_number and User.query.filter_by(phone_number=phone_number).first():
            return None, 'Phone number already registered'
        
        try:
            # Create new user
            user = User(
                email=email,
                password=password,
                first_name=first_name,
                last_name=last_name,
                role=role,
                **kwargs
            )
            
            db.session.add(user)
            db.session.commit()

            # Workers need a Worker profile row to appear in worker-facing
            # queries (e.g. the open job feed). Create a minimal placeholder
            # here so the account is functional immediately; the worker can
            # fill in real details later via the worker profile setup flow.
            if role == 'worker':
                worker = Worker(
                    user_id=user.id,
                    occupation='General Services',
                    hourly_rate=0
                )
                db.session.add(worker)
                db.session.commit()

            return user, None
        
        except Exception as e:
            db.session.rollback()
            return None, f'Registration failed: {str(e)}'
    
    @staticmethod
    def login_user(email=None, password=None, credential=None):
        """
        Authenticate user and generate tokens.
        
        Args:
            email (str): User email
            credential (str): User email or phone number
            password (str): User password
        
        Returns:
            tuple: (user_data, tokens, error_message)
        """
        login_value = (credential or email or '').strip()
        if not login_value:
            return None, None, 'Email or phone number is required'

        # Find user by email or phone number.
        if '@' in login_value:
            user = User.query.filter_by(email=login_value.lower()).first()
        else:
            user = User.query.filter_by(phone_number=login_value).first()
        
        if not user:
            return None, None, 'Invalid email or password'
        
        # Check password
        if not user.check_password(password):
            return None, None, 'Invalid email or password'
        
        # Check if account is active
        if not user.is_active:
            return None, None, 'Account is inactive. Please contact support.'
        
        # Update last login
        user.update_last_login()
        
        # Generate tokens
        tokens = generate_tokens(user.id)
        
        # Return user data and tokens
        return user.to_dict(), tokens, None
    
    @staticmethod
    def refresh_token(user_id):
        """
        Refresh access token.
        
        Args:
            user_id (int): User ID
        
        Returns:
            tuple: (tokens, error_message)
        """
        user = User.query.get(user_id)
        
        if not user:
            return None, 'User not found'
        
        if not user.is_active:
            return None, 'Account is inactive'
        
        # Generate new tokens
        tokens = generate_tokens(user_id)
        
        return tokens, None
    
    @staticmethod
    def logout_user(jti):
        """
        Logout user by revoking token.
        
        Args:
            jti (str): JWT token ID
        
        Returns:
            tuple: (success, error_message)
        """
        try:
            revoke_token(jti)
            return True, None
        except Exception as e:
            return False, str(e)
    
    @staticmethod
    def change_password(user_id, current_password, new_password):
        """
        Change user password.
        
        Args:
            user_id (int): User ID
            current_password (str): Current password
            new_password (str): New password
        
        Returns:
            tuple: (success, error_message)
        """
        user = User.query.get(user_id)
        
        if not user:
            return False, 'User not found'
        
        # Verify current password
        if not user.check_password(current_password):
            return False, 'Current password is incorrect'
        
        # Validate new password
        is_valid, error = validate_password(new_password)
        if not is_valid:
            return False, error
        
        try:
            # Set new password
            user.set_password(new_password)
            db.session.commit()
            
            return True, None
        
        except Exception as e:
            db.session.rollback()
            return False, f'Password change failed: {str(e)}'
    
    @staticmethod
    def reset_password_request(email):
        """
        Request password reset (placeholder for email sending).
        
        Args:
            email (str): User email
        
        Returns:
            tuple: (success, error_message)
        """
        user = User.query.filter_by(email=email.lower()).first()
        
        if not user:
            # Return success even if user doesn't exist (security best practice)
            return True, 'If the email exists, a reset link will be sent'
        
        # TODO: Generate reset token and send email
        # This is a placeholder for email functionality
        
        return True, 'If the email exists, a reset link will be sent'
    
    @staticmethod
    def verify_email(user_id):
        """
        Verify user email.
        
        Args:
            user_id (int): User ID
        
        Returns:
            tuple: (success, error_message)
        """
        user = User.query.get(user_id)
        
        if not user:
            return False, 'User not found'
        
        try:
            user.is_email_verified = True
            user.is_verified = True
            db.session.commit()
            
            return True, None
        
        except Exception as e:
            db.session.rollback()
            return False, f'Email verification failed: {str(e)}'
