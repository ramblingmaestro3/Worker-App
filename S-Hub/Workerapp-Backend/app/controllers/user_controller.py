"""
User controller for WorkerApp.
Handles user-related API endpoints.
"""

from flask import request
from app.services import UserService
from app.utils.helpers import format_response
from app.utils.auth import token_required


def _normalize_profile_payload(data):
    normalized = dict(data or {})

    name = (normalized.pop('name', None) or normalized.pop('full_name', None) or '').strip()
    if name:
        parts = name.split()
        normalized.setdefault('first_name', parts[0])
        normalized.setdefault('last_name', ' '.join(parts[1:]) or parts[0])

    if 'phone' in normalized and 'phone_number' not in normalized:
        normalized['phone_number'] = normalized.pop('phone')

    location = normalized.pop('location', None)
    if location and 'city' not in normalized:
        normalized['city'] = location

    return normalized


class UserController:
    """Controller for user endpoints."""
    
    @staticmethod
    @token_required
    def get_profile(current_user):
        """
        Get current user profile.
        
        Headers:
            Authorization: Bearer <access_token>
        
        Returns:
            JSON response with user profile data
        """
        return format_response(
            success=True,
            data={'user': current_user.to_dict(include_sensitive=True)}
        )
    
    @staticmethod
    @token_required
    def update_profile(current_user):
        """
        Update current user profile.
        
        Headers:
            Authorization: Bearer <access_token>
        
        Request Body:
            Any user fields to update
        
        Returns:
            JSON response with updated user data
        """
        data = _normalize_profile_payload(request.get_json())
        
        user, error = UserService.update_user_profile(
            user_id=current_user.id,
            **data
        )
        
        if error:
            return format_response(
                success=False,
                message='Profile update failed',
                error=error,
                status_code=400
            )
        
        return format_response(
            success=True,
            message='Profile updated successfully',
            data={'user': user.to_dict(include_sensitive=True)}
        )
    
    @staticmethod
    @token_required
    def deactivate_account(current_user):
        """
        Deactivate current user account.
        
        Headers:
            Authorization: Bearer <access_token>
        
        Returns:
            JSON response confirming deactivation
        """
        success, error = UserService.deactivate_user(current_user.id)
        
        if error:
            return format_response(
                success=False,
                message='Account deactivation failed',
                error=error,
                status_code=500
            )
        
        return format_response(
            success=True,
            message='Account deactivated successfully'
        )
    
    @staticmethod
    def get_user(user_id):
        """
        Get public user profile by ID.
        
        URL Parameters:
            user_id (int): User ID
        
        Returns:
            JSON response with public user data
        """
        user = UserService.get_user_by_id(user_id)
        
        if not user:
            return format_response(
                success=False,
                message='User not found',
                status_code=404
            )
        
        return format_response(
            success=True,
            data={'user': user.to_dict(include_sensitive=False)}
        )
    
    @staticmethod
    def get_all_users():
        """
        Get all users (admin only).
        
        Query Parameters:
            page (int): Page number (default: 1)
            per_page (int): Items per page (default: 20)
            role (str): Filter by role
            is_active (bool): Filter by active status
        
        Returns:
            JSON response with paginated users
        """
        from app.utils.auth import admin_required
        
        # Check admin access
        @admin_required
        def _get_all_users(current_user):
            page = request.args.get('page', 1, type=int)
            per_page = request.args.get('per_page', 20, type=int)
            role = request.args.get('role')
            is_active = request.args.get('is_active', type=bool)
            
            result = UserService.get_all_users(
                page=page,
                per_page=per_page,
                role=role,
                is_active=is_active
            )
            
            return format_response(
                success=True,
                data=result
            )
        
        return _get_all_users()
    
    @staticmethod
    def search_users():
        """
        Search users by name or email.
        
        Query Parameters:
            q (str): Search query
            page (int): Page number (default: 1)
            per_page (int): Items per page (default: 20)
        
        Returns:
            JSON response with search results
        """
        query_string = request.args.get('q', '')
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        if not query_string:
            return format_response(
                success=False,
                message='Search query is required',
                status_code=400
            )
        
        result = UserService.search_users(
            query_string=query_string,
            page=page,
            per_page=per_page
        )
        
        return format_response(
            success=True,
            data=result
        )
