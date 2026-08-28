"""
WorkerApp - Main Entry Point
Run the Flask application server.
"""

import os
from app import create_app
from app.config import get_config
from app.socket_handlers import socketio

# Create application instance
app = create_app()

# Get configuration
config = get_config()

if __name__ == '__main__':
    # Run development server
    socketio.run(
        app,
        host='0.0.0.0',
        port=5000,
        debug=config.DEBUG,
        allow_unsafe_werkzeug=True
    )

