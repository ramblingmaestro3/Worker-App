"""
Authentication routes for WorkerApp.
"""

from flask import Blueprint
from app.controllers import AuthController

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')


# Registration and Authentication
auth_bp.add_url_rule('/register', view_func=AuthController.register, methods=['POST'])
auth_bp.add_url_rule('/login', view_func=AuthController.login, methods=['POST'])
auth_bp.add_url_rule('/logout', view_func=AuthController.logout, methods=['POST'])
auth_bp.add_url_rule('/refresh', view_func=AuthController.refresh, methods=['POST'])


# Password Management
auth_bp.add_url_rule('/change-password', view_func=AuthController.change_password, methods=['POST'])
auth_bp.add_url_rule('/reset-password', view_func=AuthController.reset_password_request, methods=['POST'])
