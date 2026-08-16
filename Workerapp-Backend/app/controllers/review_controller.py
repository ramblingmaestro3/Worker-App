"""
Review controller for WorkerApp.
Handles review-related API endpoints.
"""

from flask import request
from app.services import ReviewService
from app.utils.helpers import format_response
from app.utils.auth import token_required


class ReviewController:
    """Controller for review endpoints."""
    
    @staticmethod
    @token_required
    def create_review(current_user):
        """
        Create a new review.
        
        Headers:
            Authorization: Bearer <access_token>
        
        Request Body:
            worker_id (int): Worker user ID
            booking_id (int): Booking ID
            rating (int): Rating (1-5)
            title (str): Review title (optional)
            comment (str): Review comment (optional)
            rating_categories (dict): Detailed ratings (optional)
        
        Returns:
            JSON response with review data
        """
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['worker_id', 'booking_id', 'rating']
        for field in required_fields:
            if field not in data:
                return format_response(
                    success=False,
                    message=f'Missing required field: {field}',
                    status_code=400
                )
        
        review, error = ReviewService.create_review(
            customer_id=current_user.id,
            worker_id=data['worker_id'],
            booking_id=data['booking_id'],
            rating=data['rating'],
            title=data.get('title'),
            comment=data.get('comment'),
            rating_categories=data.get('rating_categories')
        )
        
        if error:
            return format_response(
                success=False,
                message='Review creation failed',
                error=error,
                status_code=400
            )
        
        return format_response(
            success=True,
            message='Review created successfully',
            data={'review': review.to_dict()},
            status_code=201
        )
    
    @staticmethod
    def get_review(review_id):
        """
        Get review by ID.
        
        URL Parameters:
            review_id (int): Review ID
        
        Returns:
            JSON response with review data
        """
        review = ReviewService.get_review_by_id(review_id)
        
        if not review:
            return format_response(
                success=False,
                message='Review not found',
                status_code=404
            )
        
        return format_response(
            success=True,
            data={'review': review.to_dict()}
        )
    
    @staticmethod
    def get_worker_reviews(worker_id):
        """
        Get reviews for a worker.
        
        URL Parameters:
            worker_id (int): Worker user ID
        
        Query Parameters:
            page (int): Page number (default: 1)
            per_page (int): Items per page (default: 20)
        
        Returns:
            JSON response with paginated reviews
        """
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        result = ReviewService.get_worker_reviews(
            worker_id=worker_id,
            page=page,
            per_page=per_page
        )
        
        return format_response(
            success=True,
            data=result
        )
    
    @staticmethod
    def get_worker_rating_summary(worker_id):
        """
        Get rating summary for a worker.
        
        URL Parameters:
            worker_id (int): Worker user ID
        
        Returns:
            JSON response with rating summary
        """
        summary = ReviewService.get_worker_rating_summary(worker_id)
        
        if not summary:
            return format_response(
                success=False,
                message='Worker not found',
                status_code=404
            )
        
        return format_response(
            success=True,
            data={'summary': summary}
        )
    
    @staticmethod
    @token_required
    def add_worker_response(current_user, review_id):
        """
        Add worker response to a review.
        
        Headers:
            Authorization: Bearer <access_token>
        
        URL Parameters:
            review_id (int): Review ID
        
        Request Body:
            response (str): Worker's response
        
        Returns:
            JSON response confirming response addition
        """
        data = request.get_json()
        
        if 'response' not in data:
            return format_response(
                success=False,
                message='Response field is required',
                status_code=400
            )
        
        success, error = ReviewService.add_worker_response(
            review_id=review_id,
            worker_id=current_user.id,
            response=data['response']
        )
        
        if error:
            return format_response(
                success=False,
                message='Response addition failed',
                error=error,
                status_code=400
            )
        
        return format_response(
            success=True,
            message='Response added successfully'
        )
    
    @staticmethod
    def flag_review(review_id):
        """
        Flag a review for moderation (admin only).
        
        URL Parameters:
            review_id (int): Review ID
        
        Request Body:
            reason (str): Flag reason
        
        Returns:
            JSON response confirming flag
        """
        from app.utils.auth import admin_required
        
        @admin_required
        def _flag_review(current_user):
            data = request.get_json()
            
            if 'reason' not in data:
                return format_response(
                    success=False,
                    message='Reason field is required',
                    status_code=400
                )
            
            success, error = ReviewService.flag_review(
                review_id=review_id,
                reason=data['reason']
            )
            
            if error:
                return format_response(
                    success=False,
                    message='Review flagging failed',
                    error=error,
                    status_code=500
                )
            
            return format_response(
                success=True,
                message='Review flagged successfully'
            )
        
        return _flag_review()
