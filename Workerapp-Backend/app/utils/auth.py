"""
Authentication utilities for WorkerApp.
Handles JWT token generation, validation, and authentication decorators.
"""

from datetime import datetime, timedelta
from functools import wraps
from flask import jsonify, request, current_app
from flask_jwt_extended import (
    JWTManager,
    create_access_token,
    create_refresh_token,
    get_jwt_identity,
    get_jwt,
    verify_jwt_in_request
)
from app.models import db, User

# Initialize JWT Manager
jwt = JWTManager()


# Token Blacklist (for logout functionality)
# In production, use Redis or database for token blacklist
token_blacklist = set()


@jwt.token_in_blocklist_loader
def check_if_token_revoked(jwt_header, jwt_payload):
    """
    Check if a token is in the blacklist (revoked).
    
    Args:
        jwt_header: JWT header
        jwt_payload: JWT payload
    
    Returns:
        bool: True if token is revoked, False otherwise
    """
    jti = jwt_payload['jti']
    return jti in token_blacklist


@jwt.expired_token_loader
def expired_token_callback(jwt_header, jwt_payload):
    """
    Handle expired tokens.
    
    Args:
        jwt_header: JWT header
        jwt_payload: JWT payload
    
    Returns:
        tuple: JSON response and status code
    """
    return jsonify({
        'error': 'token_expired',
        'message': 'The token has expired'
    }), 401


@jwt.invalid_token_loader
def invalid_token_callback(error):
    """
    Handle invalid tokens.
    
    Args:
        error: Error message
    
    Returns:
        tuple: JSON response and status code
    """
    return jsonify({
        'error': 'invalid_token',
        'message': 'Token verification failed'
    }), 401


@jwt.unauthorized_loader
def missing_token_callback(error):
    """
    Handle missing tokens.
    
    Args:
        error: Error message
    
    Returns:
        tuple: JSON response and status code
    """
    return jsonify({
        'error': 'authorization_required',
        'message': 'Authorization token is required'
    }), 401


def generate_tokens(user_identity):
    """
    Generate access and refresh tokens for a user.
    
    Args:
        user_identity: User identity (usually user ID)
    
    Returns:
        dict: Dictionary containing access_token and refresh_token
    """
    # Create access token
    access_token = create_access_token(
        identity=user_identity,
        additional_claims={
            'type': 'access',
            'created_at': datetime.utcnow().isoformat()
        }
    )
    
    # Create refresh token
    refresh_token = create_refresh_token(
        identity=user_identity,
        additional_claims={
            'type': 'refresh',
            'created_at': datetime.utcnow().isoformat()
        }
    )
    
    return {
        'access_token': access_token,
        'refresh_token': refresh_token
    }


def decode_token(token):
    """
    Decode a JWT token (without verification).
    For debugging purposes only.
    
    Args:
        token (str): JWT token
    
    Returns:
        dict: Decoded token payload
    """
    import jwt as pyjwt
    try:
        return pyjwt.decode(
            token,
            current_app.config['JWT_SECRET_KEY'],
            algorithms=['HS256']
        )
    except Exception as e:
        return None


def token_required(f):
    """
    Decorator to require JWT authentication for a route.
    
    Args:
        f: Function to decorate
    
    Returns:
        function: Decorated function
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        try:
            verify_jwt_in_request()
            current_user_id = get_jwt_identity()
            current_user = User.query.get(current_user_id)
            
            if not current_user:
                return jsonify({
                    'error': 'user_not_found',
                    'message': 'User not found'
                }), 404
            
            if not current_user.is_active:
                return jsonify({
                    'error': 'account_inactive',
                    'message': 'Account is inactive'
                }), 403
            
            # Add current user to kwargs
            return f(current_user=current_user, *args, **kwargs)
        
        except Exception as e:
            return jsonify({
                'error': 'authentication_failed',
                'message': str(e)
            }), 401
    
    return decorated


def admin_required(f):
    """
    Decorator to require admin role for a route.
    
    Args:
        f: Function to decorate
    
    Returns:
        function: Decorated function
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        try:
            verify_jwt_in_request()
            current_user_id = get_jwt_identity()
            current_user = User.query.get(current_user_id)
            
            if not current_user:
                return jsonify({
                    'error': 'user_not_found',
                    'message': 'User not found'
                }), 404
            
            if current_user.role != 'admin':
                return jsonify({
                    'error': 'access_denied',
                    'message': 'Admin access required'
                }), 403
            
            return f(current_user=current_user, *args, **kwargs)
        
        except Exception as e:
            return jsonify({
                'error': 'authentication_failed',
                'message': str(e)
            }), 401
    
    return decorated


def worker_required(f):
    """
    Decorator to require worker role for a route.
    
    Args:
        f: Function to decorate
    
    Returns:
        function: Decorated function
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        try:
            verify_jwt_in_request()
            current_user_id = get_jwt_identity()
            current_user = User.query.get(current_user_id)
            
            if not current_user:
                return jsonify({
                    'error': 'user_not_found',
                    'message': 'User not found'
                }), 404
            
            if current_user.role != 'worker':
                return jsonify({
                    'error': 'access_denied',
                    'message': 'Worker access required'
                }), 403
            
            return f(current_user=current_user, *args, **kwargs)
        
        except Exception as e:
            return jsonify({
                'error': 'authentication_failed',
                'message': str(e)
            }), 401
    
    return decorated


def customer_required(f):
    """
    Decorator to require customer role for a route.
    
    Args:
        f: Function to decorate
    
    Returns:
        function: Decorated function
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        try:
            verify_jwt_in_request()
            current_user_id = get_jwt_identity()
            current_user = User.query.get(current_user_id)
            
            if not current_user:
                return jsonify({
                    'error': 'user_not_found',
                    'message': 'User not found'
                }), 404
            
            if current_user.role != 'customer':
                return jsonify({
                    'error': 'access_denied',
                    'message': 'Customer access required'
                }), 403
            
            return f(current_user=current_user, *args, **kwargs)
        
        except Exception as e:
            return jsonify({
                'error': 'authentication_failed',
                'message': str(e)
            }), 401
    
    return decorated


def revoke_token(jti):
    """
    Revoke a token by adding it to the blacklist.
    
    Args:
        jti (str): JWT ID
    """
    token_blacklist.add(jti)
