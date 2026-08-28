"""
User routes for WorkerApp.
"""

from flask import Blueprint
from app.controllers import UserController

user_bp = Blueprint('users', __name__, url_prefix='/api/users')


# Profile Management
user_bp.add_url_rule('/me', view_func=UserController.get_profile, methods=['GET'])
user_bp.add_url_rule('/me', view_func=UserController.update_profile, methods=['PUT'])
user_bp.add_url_rule('/me/deactivate', view_func=UserController.deactivate_account, methods=['POST'])


# User Lookup
user_bp.add_url_rule('/<int:user_id>', view_func=UserController.get_user, methods=['GET'])
user_bp.add_url_rule('/search', view_func=UserController.search_users, methods=['GET'])
user_bp.add_url_rule('/all', view_func=UserController.get_all_users, methods=['GET'])
