"""
Request logging middleware for WorkerApp.
Logs incoming requests for debugging and monitoring.
"""

from flask import request
import logging
from datetime import datetime


def log_request(response):
    """
    Log request details.
    
    Args:
        response: Flask response object
    
    Returns:
        response: Flask response object
    """
    # Get request details
    method = request.method
    path = request.path
    ip = request.remote_addr
    user_agent = request.headers.get('User-Agent', 'Unknown')
    status_code = response.status_code
    
    # Log the request
    logger = logging.getLogger(__name__)
    
    log_message = (
        f'{datetime.utcnow().isoformat()} | '
        f'{method} {path} | '
        f'Status: {status_code} | '
        f'IP: {ip} | '
        f'User-Agent: {user_agent}'
    )
    
    # Log at different levels based on status code
    if status_code >= 500:
        logger.error(log_message)
    elif status_code >= 400:
        logger.warning(log_message)
    else:
        logger.info(log_message)
    
    return response
