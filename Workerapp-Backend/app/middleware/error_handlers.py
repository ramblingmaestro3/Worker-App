"""
Error handlers for WorkerApp.
Handles various HTTP errors and exceptions.
"""

from flask import jsonify
from werkzeug.exceptions import HTTPException
from sqlalchemy.exc import IntegrityError, OperationalError
from app.utils.helpers import format_response


def register_error_handlers(app):
    """
    Register error handlers with the Flask application.
    
    Args:
        app: Flask application instance
    """
    
    @app.errorhandler(400)
    def bad_request(error):
        """Handle 400 Bad Request errors."""
        return format_response(
            success=False,
            message='Bad Request',
            error=str(error.description) if hasattr(error, 'description') else str(error),
            status_code=400
        )
    
    @app.errorhandler(401)
    def unauthorized(error):
        """Handle 401 Unauthorized errors."""
        return format_response(
            success=False,
            message='Unauthorized',
            error='Authentication required',
            status_code=401
        )
    
    @app.errorhandler(403)
    def forbidden(error):
        """Handle 403 Forbidden errors."""
        return format_response(
            success=False,
            message='Forbidden',
            error='You do not have permission to access this resource',
            status_code=403
        )
    
    @app.errorhandler(404)
    def not_found(error):
        """Handle 404 Not Found errors."""
        return format_response(
            success=False,
            message='Not Found',
            error='The requested resource was not found',
            status_code=404
        )
    
    @app.errorhandler(405)
    def method_not_allowed(error):
        """Handle 405 Method Not Allowed errors."""
        return format_response(
            success=False,
            message='Method Not Allowed',
            error='The method is not allowed for the requested URL',
            status_code=405
        )
    
    @app.errorhandler(409)
    def conflict(error):
        """Handle 409 Conflict errors."""
        return format_response(
            success=False,
            message='Conflict',
            error=str(error.description) if hasattr(error, 'description') else 'Resource conflict',
            status_code=409
        )
    
    @app.errorhandler(422)
    def unprocessable_entity(error):
        """Handle 422 Unprocessable Entity errors."""
        return format_response(
            success=False,
            message='Unprocessable Entity',
            error=str(error.description) if hasattr(error, 'description') else 'Invalid request data',
            status_code=422
        )
    
    @app.errorhandler(429)
    def too_many_requests(error):
        """Handle 429 Too Many Requests errors."""
        return format_response(
            success=False,
            message='Too Many Requests',
            error='Rate limit exceeded. Please try again later.',
            status_code=429
        )
    
    @app.errorhandler(500)
    def internal_server_error(error):
        """Handle 500 Internal Server Error."""
        return format_response(
            success=False,
            message='Internal Server Error',
            error='An unexpected error occurred. Please try again later.',
            status_code=500
        )
    
    @app.errorhandler(IntegrityError)
    def handle_integrity_error(error):
        """Handle database integrity errors."""
        error_message = str(error.orig)
        
        # Check for duplicate entry
        if 'duplicate key' in error_message.lower() or 'unique constraint' in error_message.lower():
            return format_response(
                success=False,
                message='Duplicate Entry',
                error='A record with this information already exists',
                status_code=409
            )
        
        # Check for foreign key violation
        if 'foreign key constraint' in error_message.lower():
            return format_response(
                success=False,
                message='Foreign Key Violation',
                error='Referenced record does not exist',
                status_code=400
            )
        
        return format_response(
            success=False,
            message='Database Error',
            error='A database error occurred',
            status_code=500
        )
    
    @app.errorhandler(OperationalError)
    def handle_operational_error(error):
        """Handle database operational errors."""
        return format_response(
            success=False,
            message='Database Error',
            error='Unable to connect to the database',
            status_code=503
        )
    
    @app.errorhandler(Exception)
    def handle_generic_error(error):
        """Handle all other exceptions."""
        # Log the error for debugging
        import traceback
        app.logger.error(f'Unhandled exception: {str(error)}')
        app.logger.error(f'Traceback: {traceback.format_exc()}')
        
        return format_response(
            success=False,
            message='Internal Server Error',
            error=str(error),
            status_code=500
        )
