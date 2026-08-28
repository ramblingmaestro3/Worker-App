"""
WorkerApp - Flask Application Factory
Main application initialization and configuration.
"""

from flask import Flask, jsonify
from flask_cors import CORS
from flask_migrate import Migrate
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

# Import configuration
from app.config import get_config

# Import database
from app.models import db

# Import JWT
from app.utils.auth import jwt
from app.socket_handlers import socketio

# Import middleware
from app.middleware import register_error_handlers, log_request

# Import routes
from app.routes import (
    auth_bp,
    user_bp,
    worker_bp,
    booking_bp,
    review_bp,
    payment_bp,
    message_bp,
    notification_bp,
    service_bp,
    ai_bp
)


def create_app(config_name=None):
    """
    Application factory function.
    
    Args:
        config_name (str): Configuration name (development, production, testing)
    
    Returns:
        Flask: Configured Flask application instance
    """
    # Create Flask app
    app = Flask(__name__)
    
    # Load configuration
    config = get_config(config_name)
    app.config.from_object(config)
    _guard_against_default_production_secrets(app)

    # Initialize extensions
    init_extensions(app)
    
    # Register blueprints
    register_blueprints(app)
    
    # Register middleware
    register_middleware(app)
    
    # Register error handlers
    register_error_handlers(app)
    
    # Register root endpoint
    register_root_endpoint(app)

    # Seed default data
    from app.utils.seed import ensure_default_service_categories
    ensure_default_service_categories(app)

    return app


def _guard_against_default_production_secrets(app):
    """
    Config.SECRET_KEY / JWT_SECRET_KEY fall back to well-known placeholder
    strings when the env vars aren't set, so a production deploy that
    forgets to set them would silently sign sessions/JWTs with a secret
    visible in source control. Fail startup instead of failing silently.
    """
    if app.config.get('FLASK_ENV') != 'production':
        return
    placeholders = {
        'SECRET_KEY': 'dev-secret-key-change-in-production',
        'JWT_SECRET_KEY': 'jwt-secret-key-change-in-production',
    }
    for key, placeholder in placeholders.items():
        if app.config.get(key) == placeholder:
            raise RuntimeError(
                f'{key} is still set to its development placeholder. '
                f'Set the {key} environment variable before running in production.'
            )


def init_extensions(app):
    """
    Initialize Flask extensions.
    
    Args:
        app: Flask application instance
    """
    # Initialize SQLAlchemy
    db.init_app(app)
    
    # Initialize Flask-Migrate
    migrate = Migrate(app, db)
    
    # Initialize JWT
    jwt.init_app(app)
    # Socket.IO shares the Flask app and authenticates each connection with the same JWT.
    socketio.init_app(app, cors_allowed_origins=app.config['CORS_ORIGINS'])
    
    # Initialize CORS
    CORS(app, resources={
        r"/api/*": {
            "origins": app.config['CORS_ORIGINS'],
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"]
        }
    })
    
    # Initialize Rate Limiter
    limiter = Limiter(
        app=app,
        key_func=get_remote_address,
        default_limits=["200 per day", "50 per hour"]
    )


def register_blueprints(app):
    """
    Register Flask blueprints.
    
    Args:
        app: Flask application instance
    """
    app.register_blueprint(auth_bp)
    app.register_blueprint(user_bp)
    app.register_blueprint(worker_bp)
    app.register_blueprint(booking_bp)
    app.register_blueprint(review_bp)
    app.register_blueprint(payment_bp)
    app.register_blueprint(message_bp)
    app.register_blueprint(notification_bp)
    app.register_blueprint(service_bp)
    app.register_blueprint(ai_bp)


def register_middleware(app):
    """
    Register middleware.
    
    Args:
        app: Flask application instance
    """
    # Register request logger
    app.after_request(log_request)


def register_root_endpoint(app):
    """
    Register root endpoint.
    
    Args:
        app: Flask application instance
    """
    
    @app.route('/')
    def index():
        """Root endpoint."""
        return jsonify({
            'name': app.config['APP_NAME'],
            'version': app.config['APP_VERSION'],
            'status': 'running',
            'message': 'WorkerApp API - Blue-collar worker marketplace backend'
        }), 200
    
    @app.route('/health')
    def health():
        """Health check endpoint."""
        return jsonify({
            'status': 'healthy',
            'service': app.config['APP_NAME']
        }), 200
    
    @app.route('/api')
    def api_info():
        """API information endpoint."""
        return jsonify({
            'name': app.config['APP_NAME'],
            'version': app.config['APP_VERSION'],
            'endpoints': {
                'auth': '/api/auth',
                'users': '/api/users',
                'workers': '/api/workers',
                'bookings': '/api/bookings',
                'reviews': '/api/reviews',
                'payments': '/api/payments',
                'messages': '/api/messages',
                'notifications': '/api/notifications',
                'services': '/api/services'
            }
        }), 200
