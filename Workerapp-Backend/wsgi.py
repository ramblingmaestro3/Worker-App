"""
WorkerApp - WSGI Entry Point
Production WSGI configuration for Gunicorn/uWSGI.
"""

import os
from app import create_app

# Create application instance
app = create_app()

if __name__ == '__main__':
    app.run()
