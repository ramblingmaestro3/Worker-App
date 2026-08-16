"""
Worker service for WorkerApp.
Handles worker-related business logic.
"""

from app.models import db, User, Worker, Service
from app.utils.helpers import calculate_distance, filter_by_distance, worker_category_filter


class WorkerService:
    """Service for worker operations."""
    
    @staticmethod
    def create_worker_profile(user_id, occupation, hourly_rate, **kwargs):
        """
        Create worker profile for a user.
        
        Args:
            user_id (int): User ID
            occupation (str): Worker's occupation
            hourly_rate (float): Hourly rate
            **kwargs: Additional worker attributes
        
        Returns:
            tuple: (worker, error_message)
        """
        user = User.query.get(user_id)
        
        if not user:
            return None, 'User not found'
        
        # Check if user already has a worker profile
        if Worker.query.filter_by(user_id=user_id).first():
            return None, 'Worker profile already exists'
        
        try:
            # Create worker profile
            worker = Worker(
                user_id=user_id,
                occupation=occupation,
                hourly_rate=hourly_rate,
                **kwargs
            )
            
            db.session.add(worker)
            db.session.commit()
            
            return worker, None
        
        except Exception as e:
            db.session.rollback()
            return None, f'Worker profile creation failed: {str(e)}'
    
    @staticmethod
    def get_worker_by_id(worker_id):
        """
        Get worker by ID.
        
        Args:
            worker_id (int): Worker ID
        
        Returns:
            Worker: Worker object or None
        """
        return Worker.query.get(worker_id)
    
    @staticmethod
    def get_worker_by_user_id(user_id):
        """
        Get worker by user ID.
        
        Args:
            user_id (int): User ID
        
        Returns:
            Worker: Worker object or None
        """
        return Worker.query.filter_by(user_id=user_id).first()
    
    @staticmethod
    def update_worker_profile(worker_id, **kwargs):
        """
        Update worker profile.
        
        Args:
            worker_id (int): Worker ID
            **kwargs: Worker attributes to update
        
        Returns:
            tuple: (worker, error_message)
        """
        worker = Worker.query.get(worker_id)
        
        if not worker:
            return None, 'Worker not found'
        
        try:
            # Update fields
            updatable_fields = [
                'occupation', 'years_of_experience', 'skills', 'hourly_rate',
                'bio', 'is_available', 'emergency_service_available',
                'service_area_radius', 'preferred_locations',
                'service_category_id'
            ]
            
            for field in updatable_fields:
                if field in kwargs:
                    setattr(worker, field, kwargs[field])
            
            # Recalculate profile completion
            worker.calculate_profile_completion()
            
            db.session.commit()
            
            return worker, None
        
        except Exception as e:
            db.session.rollback()
            return None, f'Worker profile update failed: {str(e)}'
    
    @staticmethod
    def search_workers(
        category=None,
        skills=None,
        location=None,
        latitude=None,
        longitude=None,
        max_distance=None,
        is_available=None,
        emergency_only=False,
        min_rating=None,
        page=1,
        per_page=20
    ):
        """
        Search workers with various filters.
        
        Args:
            category (str): Service category
            skills (list): List of skills
            location (str): Location string
            latitude (float): User latitude
            longitude (float): User longitude
            max_distance (float): Maximum distance in km
            is_available (bool): Filter by availability
            emergency_only (bool): Only emergency service workers
            min_rating (float): Minimum rating
            page (int): Page number
            per_page (int): Items per page
        
        Returns:
            dict: Search results
        """
        query = Worker.query.join(User).filter(User.is_active == True)
        
        # Filter by category — accepts either a slug (e.g. 'plumbing') or a
        # human-readable service name (e.g. 'Plumbing'), so callers passing
        # an AI-recommended category label don't need to slugify it first.
        if category:
            service = Service.query.filter(
                db.or_(
                    Service.slug == category.lower().replace(' ', '-'),
                    Service.name.ilike(category),
                )
            ).first()
            if service:
                query = query.filter(worker_category_filter(service))

        # Filter by skills
        if skills:
            for skill in skills:
                query = query.filter(Worker.skills.contains(skill))
        
        # Filter by availability
        if is_available is not None:
            query = query.filter(Worker.is_available == is_available)
        
        # Filter by emergency service
        if emergency_only:
            query = query.filter(Worker.emergency_service_available == True)
        
        # Filter by minimum rating
        if min_rating:
            query = query.filter(Worker.rating >= min_rating)
        
        # Filter by location
        if location:
            query = query.filter(
                (User.city.ilike(f'%{location}%')) |
                (User.region.ilike(f'%{location}%'))
            )
        
        # Sort by rank score (AI ranking)
        query = query.order_by(Worker.rank_score.desc())
        
        from app.utils.helpers import paginate_results
        results = paginate_results(query, page, per_page)
        
        # Filter by distance if coordinates provided
        if latitude and longitude:
            workers = Worker.query.join(User).filter(User.is_active == True).all()
            filtered = filter_by_distance(
                Worker.query.join(User).filter(User.is_active == True),
                Worker,
                latitude,
                longitude,
                max_distance
            )
            results['items'] = filtered[:per_page]
        
        return results
    
    @staticmethod
    def get_top_workers(limit=10, category=None):
        """
        Get top workers by rating and rank score.
        
        Args:
            limit (int): Number of workers to return
            category (str): Service category filter
        
        Returns:
            list: Top workers
        """
        query = Worker.query.join(User).filter(
            User.is_active == True,
            Worker.is_verified == True
        )
        
        if category:
            service = Service.query.filter_by(slug=category).first()
            if service:
                query = query.filter(worker_category_filter(service))

        query = query.order_by(Worker.rank_score.desc()).limit(limit)
        
        return [worker.to_dict() for worker in query.all()]
    
    @staticmethod
    def update_worker_availability(worker_id, is_available):
        """
        Update worker availability status.
        
        Args:
            worker_id (int): Worker ID
            is_available (bool): Availability status
        
        Returns:
            tuple: (success, error_message)
        """
        worker = Worker.query.get(worker_id)
        
        if not worker:
            return False, 'Worker not found'
        
        try:
            worker.is_available = is_available
            db.session.commit()
            
            return True, None
        
        except Exception as e:
            db.session.rollback()
            return False, f'Availability update failed: {str(e)}'
    
    @staticmethod
    def verify_worker(worker_id, verified_by):
        """
        Verify worker profile.
        
        Args:
            worker_id (int): Worker ID
            verified_by (int): Admin user ID
        
        Returns:
            tuple: (success, error_message)
        """
        worker = Worker.query.get(worker_id)
        
        if not worker:
            return False, 'Worker not found'
        
        try:
            worker.is_verified = True
            worker.verification_date = db.func.current_timestamp()
            
            # Also verify user
            user = User.query.get(worker.user_id)
            if user:
                user.is_verified = True
            
            db.session.commit()
            
            return True, None
        
        except Exception as e:
            db.session.rollback()
            return False, f'Worker verification failed: {str(e)}'
    
    @staticmethod
    def get_worker_earnings(worker_id):
        """
        Get worker earnings summary.
        
        Args:
            worker_id (int): Worker ID
        
        Returns:
            dict: Earnings summary
        """
        worker = Worker.query.get(worker_id)
        
        if not worker:
            return None
        
        return {
            'total_earnings': float(worker.total_earnings),
            'available_balance': float(worker.available_balance),
            'completed_jobs': worker.completed_jobs,
            'average_rating': worker.rating,
            'total_reviews': worker.total_reviews
        }
