"""
Service routes for WorkerApp.
"""

from flask import Blueprint
from app.controllers import ServiceController

service_bp = Blueprint('services', __name__, url_prefix='/api/services')


# Service Lookup
service_bp.add_url_rule('', view_func=ServiceController.get_all_services, methods=['GET'])
service_bp.add_url_rule('/featured', view_func=ServiceController.get_featured_services, methods=['GET'])
service_bp.add_url_rule('/<int:service_id>', view_func=ServiceController.get_service, methods=['GET'])
service_bp.add_url_rule('/slug/<slug>', view_func=ServiceController.get_service_by_slug, methods=['GET'])


# Service Management (Admin)
service_bp.add_url_rule('', view_func=ServiceController.create_service, methods=['POST'])
service_bp.add_url_rule('/<int:service_id>', view_func=ServiceController.update_service, methods=['PUT'])
service_bp.add_url_rule('/<int:service_id>', view_func=ServiceController.delete_service, methods=['DELETE'])
