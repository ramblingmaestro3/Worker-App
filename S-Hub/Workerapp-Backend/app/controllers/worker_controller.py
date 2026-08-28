"""
Worker controller for WorkerApp.
Handles worker-related API endpoints.
"""

from flask import request
from app.services import WorkerService
from app.utils.helpers import format_response
from app.utils.auth import token_required, worker_required


class WorkerController:
    """Controller for worker endpoints."""
    
    @staticmethod
    @token_required
    def create_worker_profile(current_user):
        """
        Create worker profile for current user.
        
        Headers:
            Authorization: Bearer <access_token>
        
        Request Body:
            occupation (str): Worker's occupation
            hourly_rate (float): Hourly rate
            skills (list): List of skills
            bio (str): Worker bio
            years_of_experience (int): Years of experience
            service_category_id (int): Service category ID
        
        Returns:
            JSON response with worker profile data
        """
        data = request.get_json() or {}
        if 'rate' in data and 'hourly_rate' not in data:
            data['hourly_rate'] = data.get('rate')
        if 'skill' in data and 'skills' not in data:
            data['skills'] = [data.get('skill')]
        if 'occupation' not in data and data.get('skills'):
            data['occupation'] = data['skills'][0]
        if 'idUploaded' in data and 'id_uploaded' not in data:
            data['id_uploaded'] = data.get('idUploaded')
        
        # Validate required fields
        if 'occupation' not in data or 'hourly_rate' not in data:
            return format_response(
                success=False,
                message='Occupation and hourly rate are required',
                status_code=400
            )
        
        worker, error = WorkerService.create_worker_profile(
            user_id=current_user.id,
            occupation=data['occupation'],
            hourly_rate=data['hourly_rate'],
            skills=data.get('skills'),
            bio=data.get('bio'),
            years_of_experience=data.get('years_of_experience', 0),
            service_category_id=data.get('service_category_id')
        )
        
        if error:
            return format_response(
                success=False,
                message='Worker profile creation failed',
                error=error,
                status_code=400
            )
        
        return format_response(
            success=True,
            message='Worker profile created successfully',
            data={'worker': worker.to_dict()},
            status_code=201
        )
    
    @staticmethod
    def get_worker(worker_id):
        """
        Get worker profile by ID.
        
        URL Parameters:
            worker_id (int): Worker ID
        
        Returns:
            JSON response with worker profile data
        """
        worker = WorkerService.get_worker_by_id(worker_id)
        
        if not worker:
            return format_response(
                success=False,
                message='Worker not found',
                status_code=404
            )
        
        return format_response(
            success=True,
            data={'worker': worker.to_dict()}
        )
    
    @staticmethod
    @token_required
    def get_my_worker_profile(current_user):
        """
        Get current user's worker profile.
        
        Headers:
            Authorization: Bearer <access_token>
        
        Returns:
            JSON response with worker profile data
        """
        worker = WorkerService.get_worker_by_user_id(current_user.id)
        
        if not worker:
            return format_response(
                success=False,
                message='Worker profile not found',
                status_code=404
            )
        
        return format_response(
            success=True,
            data={'worker': worker.to_dict(include_sensitive=True)}
        )
    
    @staticmethod
    @worker_required
    def update_worker_profile(current_user):
        """
        Update worker profile.
        
        Headers:
            Authorization: Bearer <access_token>
        
        Request Body:
            Any worker fields to update
        
        Returns:
            JSON response with updated worker data
        """
        data = request.get_json() or {}
        if 'rate' in data and 'hourly_rate' not in data:
            data['hourly_rate'] = data.get('rate')
        if 'idUploaded' in data and 'id_uploaded' not in data:
            data['id_uploaded'] = data.get('idUploaded')
        
        worker = WorkerService.get_worker_by_user_id(current_user.id)
        if not worker:
            return format_response(
                success=False,
                message='Worker profile not found',
                status_code=404
            )
        
        updated_worker, error = WorkerService.update_worker_profile(
            worker_id=worker.id,
            **data
        )
        
        if error:
            return format_response(
                success=False,
                message='Worker profile update failed',
                error=error,
                status_code=400
            )
        
        return format_response(
            success=True,
            message='Worker profile updated successfully',
            data={'worker': updated_worker.to_dict(include_sensitive=True)}
        )
    
    @staticmethod
    @worker_required
    def update_availability(current_user):
        """
        Update worker availability status.
        
        Headers:
            Authorization: Bearer <access_token>
        
        Request Body:
            is_available (bool): Availability status
        
        Returns:
            JSON response confirming update
        """
        data = request.get_json()
        
        if 'is_available' not in data:
            return format_response(
                success=False,
                message='is_available field is required',
                status_code=400
            )
        
        worker = WorkerService.get_worker_by_user_id(current_user.id)
        if not worker:
            return format_response(
                success=False,
                message='Worker profile not found',
                status_code=404
            )
        
        success, error = WorkerService.update_worker_availability(
            worker_id=worker.id,
            is_available=data['is_available']
        )
        
        if error:
            return format_response(
                success=False,
                message='Availability update failed',
                error=error,
                status_code=500
            )
        
        return format_response(
            success=True,
            message='Availability updated successfully'
        )
    
    @staticmethod
    def search_workers():
        """
        Search workers with filters.
        
        Query Parameters:
            category (str): Service category
            skills (str): Comma-separated skills
            location (str): Location string
            latitude (float): User latitude
            longitude (float): User longitude
            max_distance (float): Maximum distance in km
            is_available (bool): Filter by availability
            emergency_only (bool): Only emergency service workers
            min_rating (float): Minimum rating
            page (int): Page number (default: 1)
            per_page (int): Items per page (default: 20)
        
        Returns:
            JSON response with search results
        """
        category = request.args.get('category')
        skills = request.args.get('skills', '').split(',') if request.args.get('skills') else None
        location = request.args.get('location')
        latitude = request.args.get('latitude', type=float)
        longitude = request.args.get('longitude', type=float)
        max_distance = request.args.get('max_distance', type=float)
        is_available = request.args.get('is_available', type=bool)
        emergency_only = request.args.get('emergency_only', type=bool)
        min_rating = request.args.get('min_rating', type=float)
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        result = WorkerService.search_workers(
            category=category,
            skills=skills,
            location=location,
            latitude=latitude,
            longitude=longitude,
            max_distance=max_distance,
            is_available=is_available,
            emergency_only=emergency_only,
            min_rating=min_rating,
            page=page,
            per_page=per_page
        )
        
        return format_response(
            success=True,
            data=result
        )
    
    @staticmethod
    def get_top_workers():
        """
        Get top workers by rating.
        
        Query Parameters:
            limit (int): Number of workers to return (default: 10)
            category (str): Service category filter
        
        Returns:
            JSON response with top workers
        """
        limit = request.args.get('limit', 10, type=int)
        category = request.args.get('category')
        
        workers = WorkerService.get_top_workers(limit=limit, category=category)
        
        return format_response(
            success=True,
            data={'workers': workers}
        )
    
    @staticmethod
    @worker_required
    def get_earnings(current_user):
        """
        Get worker earnings summary.
        
        Headers:
            Authorization: Bearer <access_token>
        
        Returns:
            JSON response with earnings data
        """
        worker = WorkerService.get_worker_by_user_id(current_user.id)
        if not worker:
            return format_response(
                success=False,
                message='Worker profile not found',
                status_code=404
            )
        
        earnings = WorkerService.get_worker_earnings(worker.id)
        
        return format_response(
            success=True,
            data={'earnings': earnings}
        )
