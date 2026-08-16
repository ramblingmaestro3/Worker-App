"""
Worker routes for WorkerApp.
"""

from flask import Blueprint
from app.controllers import WorkerController

worker_bp = Blueprint('workers', __name__, url_prefix='/api/workers')


# Worker Profile Management
worker_bp.add_url_rule('/profile', view_func=WorkerController.create_worker_profile, methods=['POST'])
worker_bp.add_url_rule('/me', view_func=WorkerController.get_my_worker_profile, methods=['GET'])
worker_bp.add_url_rule('/me', view_func=WorkerController.update_worker_profile, methods=['PUT'])
worker_bp.add_url_rule('/me/availability', view_func=WorkerController.update_availability, methods=['PUT'])
worker_bp.add_url_rule('/me/earnings', view_func=WorkerController.get_earnings, methods=['GET'])


# Worker Lookup
worker_bp.add_url_rule('/<int:worker_id>', view_func=WorkerController.get_worker, methods=['GET'])
worker_bp.add_url_rule('/search', view_func=WorkerController.search_workers, methods=['GET'])
worker_bp.add_url_rule('/top', view_func=WorkerController.get_top_workers, methods=['GET'])
