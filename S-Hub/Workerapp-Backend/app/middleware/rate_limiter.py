"""
Rate limiting middleware for WorkerApp.
Implements rate limiting to prevent API abuse.
"""

from flask import request, jsonify
from functools import wraps
from datetime import datetime, timedelta
from app.config.config import get_config


# In-memory rate limit storage (use Redis in production)
rate_limit_storage = {}


def get_client_identifier():
    """
    Get a unique identifier for the client.
    
    Returns:
        str: Client identifier (IP address or user ID)
    """
    # Try to get user ID from JWT token
    try:
        from flask_jwt_extended import get_jwt_identity
        user_id = get_jwt_identity()
        if user_id:
            return f'user:{user_id}'
    except:
        pass
    
    # Fall back to IP address
    return f'ip:{request.remote_addr}'


def rate_limit_middleware(f):
    """
    Rate limiting middleware decorator.
    
    Args:
        f: Function to decorate
    
    Returns:
        function: Decorated function
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        config = get_config()
        
        if not config.RATE_LIMIT_ENABLED:
            return f(*args, **kwargs)
        
        client_id = get_client_identifier()
        current_time = datetime.utcnow()
        
        # Clean up old entries (older than 1 minute)
        rate_limit_storage[client_id] = [
            timestamp for timestamp in rate_limit_storage.get(client_id, [])
            if current_time - timestamp < timedelta(minutes=1)
        ]
        
        # Check if rate limit exceeded
        request_count = len(rate_limit_storage.get(client_id, []))
        if request_count >= config.RATE_LIMIT_PER_MINUTE:
            return jsonify({
                'success': False,
                'error': 'Rate limit exceeded',
                'message': f'Maximum {config.RATE_LIMIT_PER_MINUTE} requests per minute allowed'
            }), 429
        
        # Add current request timestamp
        if client_id not in rate_limit_storage:
            rate_limit_storage[client_id] = []
        rate_limit_storage[client_id].append(current_time)
        
        return f(*args, **kwargs)
    
    return decorated


def get_rate_limit_headers(client_id):
    """
    Get rate limit headers for response.
    
    Args:
        client_id (str): Client identifier
    
    Returns:
        dict: Rate limit headers
    """
    config = get_config()
    current_time = datetime.utcnow()
    
    # Clean up old entries
    rate_limit_storage[client_id] = [
        timestamp for timestamp in rate_limit_storage.get(client_id, [])
        if current_time - timestamp < timedelta(minutes=1)
    ]
    
    request_count = len(rate_limit_storage.get(client_id, []))
    remaining = max(0, config.RATE_LIMIT_PER_MINUTE - request_count)
    
    return {
        'X-RateLimit-Limit': str(config.RATE_LIMIT_PER_MINUTE),
        'X-RateLimit-Remaining': str(remaining),
        'X-RateLimit-Reset': str((current_time + timedelta(minutes=1)).isoformat())
    }
