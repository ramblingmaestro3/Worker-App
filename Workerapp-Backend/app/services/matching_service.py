"""
Matching service for WorkerApp.
Handles AI-powered worker matching logic.
"""

from app.models import db, Worker, Service, User
from app.utils.helpers import calculate_distance, worker_category_filter
import math


class MatchingService:
    """Service for AI-powered worker matching."""
    
    @staticmethod
    def find_best_workers(
        category,
        location=None,
        latitude=None,
        longitude=None,
        max_distance=50,
        required_skills=None,
        emergency=False,
        limit=10
    ):
        """
        Find the best workers for a job using AI matching algorithm.
        
        Args:
            category (str): Service category
            location (str): Location string
            latitude (float): User latitude
            longitude (float): User longitude
            max_distance (float): Maximum distance in km
            required_skills (list): Required skills
            emergency (bool): Emergency service required
            limit (int): Maximum number of results
        
        Returns:
            list: Matched workers with match scores
        """
        # Get service category
        service = Service.query.filter_by(slug=category).first()
        if not service:
            return []
        
        # Base query
        query = Worker.query.join(User).filter(
            User.is_active == True,
            Worker.is_available == True,
            worker_category_filter(service)
        )
        
        if emergency:
            query = query.filter(Worker.emergency_service_available == True)
        
        workers = query.all()
        
        # Calculate match scores for each worker
        matched_workers = []
        for worker in workers:
            match_score = MatchingService._calculate_match_score(
                worker,
                latitude,
                longitude,
                required_skills,
                emergency
            )
            
            if match_score >= 0.5:  # Minimum match threshold
                worker_dict = worker.to_dict()
                worker_dict['match_score'] = match_score
                matched_workers.append(worker_dict)
        
        # Sort by match score
        matched_workers.sort(key=lambda x: x['match_score'], reverse=True)
        
        return matched_workers[:limit]
    
    @staticmethod
    def _calculate_match_score(worker, user_lat, user_lon, required_skills, emergency):
        """
        Calculate match score for a worker.
        
        Score components:
        - Distance: 30%
        - Rating: 25%
        - Skills match: 20%
        - Availability: 15%
        - Response rate: 10%
        
        Args:
            worker: Worker object
            user_lat: User latitude
            user_lon: User longitude
            required_skills: Required skills list
            emergency: Emergency service required
        
        Returns:
            float: Match score (0-1)
        """
        score = 0.0
        
        # Distance score (30%)
        if user_lat and user_lon and worker.user.latitude and worker.user.longitude:
            distance = calculate_distance(
                user_lat, user_lon,
                worker.user.latitude, worker.user.longitude
            )
            if distance:
                # Score decreases with distance (0.5km = 1.0, 50km = 0.0)
                distance_score = max(0, 1 - (distance / 50))
                score += distance_score * 0.3
        else:
            # If no location data, give average score
            score += 0.5 * 0.3
        
        # Rating score (25%)
        rating_score = worker.rating / 5.0  # Normalize to 0-1
        score += rating_score * 0.25
        
        # Skills match score (20%)
        if required_skills and worker.skills:
            matching_skills = set(required_skills) & set(worker.skills)
            skills_score = len(matching_skills) / len(required_skills) if required_skills else 0.5
            score += skills_score * 0.2
        else:
            score += 0.5 * 0.2
        
        # Availability score (15%)
        availability_score = 1.0 if worker.is_available else 0.0
        if emergency:
            availability_score = 1.0 if worker.emergency_service_available else 0.0
        score += availability_score * 0.15
        
        # Response rate score (10%)
        response_score = worker.response_rate / 100.0 if worker.response_rate else 0.5
        score += response_score * 0.10
        
        return min(score, 1.0)  # Cap at 1.0
    
    @staticmethod
    def get_recommended_workers(user_id, limit=5):
        """
        Get recommended workers for a user based on their history.
        
        Args:
            user_id (int): User ID
            limit (int): Maximum number of recommendations
        
        Returns:
            list: Recommended workers
        """
        from app.models import Booking, User
        
        # Get user's booking history
        user = User.query.get(user_id)
        if not user:
            return []
        
        # Get user's location
        user_lat = user.latitude
        user_lon = user.longitude
        
        # Get categories user has booked before
        bookings = Booking.query.filter_by(customer_id=user_id).all()
        booked_categories = set()
        for booking in bookings:
            if booking.service:
                booked_categories.add(booking.service.id)
        
        # If no booking history, return top workers by rating
        if not booked_categories:
            return WorkerService.get_top_workers(limit)
        
        # Get workers in booked categories
        workers = Worker.query.filter(
            Worker.service_category_id.in_(booked_categories),
            Worker.is_available == True
        ).join(User).filter(User.is_active == True).all()
        
        # Score and rank workers
        scored_workers = []
        for worker in workers:
            match_score = MatchingService._calculate_match_score(
                worker,
                user_lat,
                user_lon,
                None,
                False
            )
            
            # Boost score if user has booked this category before
            if worker.service_category_id in booked_categories:
                match_score *= 1.2
            
            worker_dict = worker.to_dict()
            worker_dict['match_score'] = min(match_score, 1.0)
            scored_workers.append(worker_dict)
        
        # Sort by match score
        scored_workers.sort(key=lambda x: x['match_score'], reverse=True)
        
        return scored_workers[:limit]
    
    @staticmethod
    def calculate_pricing(worker, estimated_duration, emergency=False):
        """
        Calculate estimated pricing for a job.
        
        Args:
            worker: Worker object
            estimated_duration (float): Estimated duration in hours
            emergency (bool): Emergency service
        
        Returns:
            dict: Pricing breakdown
        """
        base_cost = float(worker.hourly_rate) * estimated_duration
        
        # Emergency surcharge
        emergency_surcharge = 0
        if emergency and worker.emergency_service_available:
            from app.config.config import get_config
            config = get_config()
            emergency_surcharge = base_cost * config.EMERGENCY_SERVICE_SURCHARGE
        
        # Platform fee (10%)
        platform_fee = (base_cost + emergency_surcharge) * 0.10
        
        total_cost = base_cost + emergency_surcharge + platform_fee
        
        return {
            'base_cost': base_cost,
            'emergency_surcharge': emergency_surcharge,
            'platform_fee': platform_fee,
            'total_cost': total_cost,
            'currency': 'GHS'
        }
