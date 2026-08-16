"""
Authentication controller for WorkerApp.
Handles authentication-related API endpoints.
"""

from flask import request
from app.services import AuthService
from app.utils.helpers import format_response
from app.utils.auth import token_required


def _split_name(data):
    """Accept frontend full-name fields and return first/last names."""
    full_name = (data.get('name') or data.get('full_name') or '').strip()
    first_name = (data.get('first_name') or '').strip()
    last_name = (data.get('last_name') or '').strip()

    if full_name and not first_name and not last_name:
        parts = full_name.split()
        first_name = parts[0]
        last_name = ' '.join(parts[1:]) or parts[0]

    return first_name, last_name


def _normalize_role(role):
    if role == 'client':
        return 'customer'
    return role or 'customer'


class AuthController:
    """Controller for authentication endpoints."""
    
    @staticmethod
    def register():
        """
        Register a new user.
        
        Request Body:
            email (str): User email
            password (str): User password
            first_name (str): User first name
            last_name (str): User last name
            role (str): User role (optional, default: customer)
            phone_number (str): Phone number (optional)
        
        Returns:
            JSON response with user data and tokens
        """
        data = request.get_json()
        
        first_name, last_name = _split_name(data)
        email = data.get('email') or data.get('credential')
        phone_number = data.get('phone_number') or data.get('phone')

        # Validate required fields
        required_fields = ['email', 'password']
        for field in required_fields:
            if field == 'email' and not email:
                return format_response(
                    success=False,
                    message='Missing required field: email',
                    status_code=400
                )
            if field != 'email' and field not in data:
                return format_response(
                    success=False,
                    message=f'Missing required field: {field}',
                    status_code=400
                )

        if not first_name or not last_name:
            return format_response(
                success=False,
                message='Missing required field: name',
                status_code=400
            )
        
        # Register user
        user, error = AuthService.register_user(
            email=email,
            password=data['password'],
            first_name=first_name,
            last_name=last_name,
            role=_normalize_role(data.get('role')),
            phone_number=phone_number
        )
        
        if error:
            return format_response(
                success=False,
                message='Registration failed',
                error=error,
                status_code=400
            )
        
        # Generate tokens
        from app.utils.auth import generate_tokens
        tokens = generate_tokens(user.id)
        
        return format_response(
            success=True,
            message='Registration successful',
            data={
                'user': user.to_dict(),
                'tokens': tokens
            },
            status_code=201
        )
    
    @staticmethod
    def login():
        """
        Login user.
        
        Request Body:
            email (str): User email
            password (str): User password
        
        Returns:
            JSON response with user data and tokens
        """
        data = request.get_json()
        
        credential = data.get('credential') or data.get('email') or data.get('phone_number') or data.get('phone')

        # Validate required fields
        if not credential or 'password' not in data:
            return format_response(
                success=False,
                message='Credential and password are required',
                status_code=400
            )
        
        # Login user
        user_data, tokens, error = AuthService.login_user(
            credential=credential,
            password=data['password']
        )
        
        if error:
            return format_response(
                success=False,
                message='Login failed',
                error=error,
                status_code=401
            )
        
        return format_response(
            success=True,
            message='Login successful',
            data={
                'user': user_data,
                'tokens': tokens
            }
        )
    
    @staticmethod
    @token_required
    def logout(current_user):
        """
        Logout user.
        
        Headers:
            Authorization: Bearer <access_token>
        
        Returns:
            JSON response confirming logout
        """
        from flask_jwt_extended import get_jwt
        jti = get_jwt()['jti']
        
        success, error = AuthService.logout_user(jti)
        
        if error:
            return format_response(
                success=False,
                message='Logout failed',
                error=error,
                status_code=500
            )
        
        return format_response(
            success=True,
            message='Logout successful'
        )
    
    @staticmethod
    @token_required
    def refresh(current_user):
        """
        Refresh access token.
        
        Headers:
            Authorization: Bearer <refresh_token>
        
        Returns:
            JSON response with new tokens
        """
        from flask_jwt_extended import get_jwt_identity
        user_id = get_jwt_identity()
        
        tokens, error = AuthService.refresh_token(user_id)
        
        if error:
            return format_response(
                success=False,
                message='Token refresh failed',
                error=error,
                status_code=401
            )
        
        return format_response(
            success=True,
            message='Token refreshed successfully',
            data={'tokens': tokens}
        )
    
    @staticmethod
    @token_required
    def change_password(current_user):
        """
        Change user password.
        
        Headers:
            Authorization: Bearer <access_token>
        
        Request Body:
            current_password (str): Current password
            new_password (str): New password
        
        Returns:
            JSON response confirming password change
        """
        data = request.get_json()
        
        # Validate required fields
        if 'current_password' not in data or 'new_password' not in data:
            return format_response(
                success=False,
                message='Current password and new password are required',
                status_code=400
            )
        
        success, error = AuthService.change_password(
            user_id=current_user.id,
            current_password=data['current_password'],
            new_password=data['new_password']
        )
        
        if error:
            return format_response(
                success=False,
                message='Password change failed',
                error=error,
                status_code=400
            )
        
        return format_response(
            success=True,
            message='Password changed successfully'
        )
    
    @staticmethod
    def reset_password_request():
        """
        Request password reset.
        
        Request Body:
            email (str): User email
        
        Returns:
            JSON response confirming reset request
        """
        data = request.get_json()
        
        if 'email' not in data:
            return format_response(
                success=False,
                message='Email is required',
                status_code=400
            )
        
        success, error = AuthService.reset_password_request(data['email'])
        
        if error:
            return format_response(
                success=False,
                message='Reset request failed',
                error=error,
                status_code=500
            )
        
        return format_response(
            success=True,
            message='If the email exists, a reset link will be sent'
        )
