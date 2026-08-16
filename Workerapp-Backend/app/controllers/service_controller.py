"""
Service controller for WorkerApp.
Handles service category-related API endpoints.
"""

from flask import request
from app.models import Service
from app.utils.helpers import format_response, paginate_results


class ServiceController:
    """Controller for service category endpoints."""
    
    @staticmethod
    def get_all_services():
        """
        Get all service categories.
        
        Query Parameters:
            page (int): Page number (default: 1)
            per_page (int): Items per page (default: 20)
            is_active (bool): Filter by active status
        
        Returns:
            JSON response with paginated services
        """
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        is_active = request.args.get('is_active', type=bool)
        
        query = Service.query
        
        if is_active is not None:
            query = query.filter_by(is_active=is_active)
        
        query = query.order_by(Service.display_order.asc(), Service.name.asc())
        
        result = paginate_results(query, page, per_page)
        
        return format_response(
            success=True,
            data=result
        )
    
    @staticmethod
    def get_service(service_id):
        """
        Get service category by ID.
        
        URL Parameters:
            service_id (int): Service ID
        
        Returns:
            JSON response with service data
        """
        service = Service.query.get(service_id)
        
        if not service:
            return format_response(
                success=False,
                message='Service not found',
                status_code=404
            )
        
        return format_response(
            success=True,
            data={'service': service.to_dict()}
        )
    
    @staticmethod
    def get_service_by_slug(slug):
        """
        Get service category by slug.
        
        URL Parameters:
            slug (str): Service slug
        
        Returns:
            JSON response with service data
        """
        service = Service.query.filter_by(slug=slug).first()
        
        if not service:
            return format_response(
                success=False,
                message='Service not found',
                status_code=404
            )
        
        return format_response(
            success=True,
            data={'service': service.to_dict()}
        )
    
    @staticmethod
    def get_featured_services():
        """
        Get featured service categories.
        
        Returns:
            JSON response with featured services
        """
        services = Service.query.filter_by(
            is_active=True,
            is_featured=True
        ).order_by(Service.display_order.asc()).all()
        
        return format_response(
            success=True,
            data={'services': [service.to_dict() for service in services]}
        )
    
    @staticmethod
    def create_service():
        """
        Create a new service category (admin only).
        
        Request Body:
            name (str): Service name
            slug (str): URL-friendly slug
            description (str): Service description
            icon (str): Icon name or emoji
            parent_category_id (int): Parent category ID (optional)
            base_hourly_rate (float): Base hourly rate
            min_hourly_rate (float): Minimum hourly rate
            max_hourly_rate (float): Maximum hourly rate
            requires_certification (bool): Requires certification
            emergency_service_available (bool): Emergency service available
            display_order (int): Display order
            is_featured (bool): Is featured
        
        Returns:
            JSON response with service data
        """
        from app.utils.auth import admin_required
        from app.models import db
        
        @admin_required
        def _create_service(current_user):
            data = request.get_json()
            
            # Validate required fields
            required_fields = ['name', 'slug']
            for field in required_fields:
                if field not in data:
                    return format_response(
                        success=False,
                        message=f'Missing required field: {field}',
                        status_code=400
                    )
            
            try:
                service = Service(
                    name=data['name'],
                    slug=data['slug'],
                    description=data.get('description'),
                    icon=data.get('icon'),
                    parent_category_id=data.get('parent_category_id'),
                    base_hourly_rate=data.get('base_hourly_rate'),
                    min_hourly_rate=data.get('min_hourly_rate'),
                    max_hourly_rate=data.get('max_hourly_rate'),
                    requires_certification=data.get('requires_certification', False),
                    emergency_service_available=data.get('emergency_service_available', False),
                    display_order=data.get('display_order', 0),
                    is_featured=data.get('is_featured', False)
                )
                
                db.session.add(service)
                db.session.commit()
                
                return format_response(
                    success=True,
                    message='Service created successfully',
                    data={'service': service.to_dict()},
                    status_code=201
                )
            
            except Exception as e:
                db.session.rollback()
                return format_response(
                    success=False,
                    message='Service creation failed',
                    error=str(e),
                    status_code=500
                )
        
        return _create_service()
    
    @staticmethod
    def update_service(service_id):
        """
        Update a service category (admin only).
        
        URL Parameters:
            service_id (int): Service ID
        
        Request Body:
            Any service fields to update
        
        Returns:
            JSON response with updated service data
        """
        from app.utils.auth import admin_required
        from app.models import db
        
        @admin_required
        def _update_service(current_user):
            service = Service.query.get(service_id)
            
            if not service:
                return format_response(
                    success=False,
                    message='Service not found',
                    status_code=404
                )
            
            data = request.get_json()
            
            try:
                updatable_fields = [
                    'name', 'slug', 'description', 'icon',
                    'parent_category_id', 'base_hourly_rate',
                    'min_hourly_rate', 'max_hourly_rate',
                    'is_active', 'requires_certification',
                    'emergency_service_available', 'display_order',
                    'is_featured'
                ]
                
                for field in updatable_fields:
                    if field in data:
                        setattr(service, field, data[field])
                
                db.session.commit()
                
                return format_response(
                    success=True,
                    message='Service updated successfully',
                    data={'service': service.to_dict()}
                )
            
            except Exception as e:
                db.session.rollback()
                return format_response(
                    success=False,
                    message='Service update failed',
                    error=str(e),
                    status_code=500
                )
        
        return _update_service()
    
    @staticmethod
    def delete_service(service_id):
        """
        Delete a service category (admin only).
        
        URL Parameters:
            service_id (int): Service ID
        
        Returns:
            JSON response confirming deletion
        """
        from app.utils.auth import admin_required
        from app.models import db
        
        @admin_required
        def _delete_service(current_user):
            service = Service.query.get(service_id)
            
            if not service:
                return format_response(
                    success=False,
                    message='Service not found',
                    status_code=404
                )
            
            try:
                db.session.delete(service)
                db.session.commit()
                
                return format_response(
                    success=True,
                    message='Service deleted successfully'
                )
            
            except Exception as e:
                db.session.rollback()
                return format_response(
                    success=False,
                    message='Service deletion failed',
                    error=str(e),
                    status_code=500
                )
        
        return _delete_service()
