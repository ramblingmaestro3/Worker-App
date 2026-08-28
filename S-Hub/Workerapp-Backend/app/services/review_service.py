"""
Review service for WorkerApp.
Handles review and rating business logic.
"""

from app.models import db, Review, Booking, Worker, User


class ReviewService:
    """Service for review operations."""
    
    @staticmethod
    def create_review(customer_id, worker_id, booking_id, rating, **kwargs):
        """
        Create a new review.
        
        Args:
            customer_id (int): Customer user ID
            worker_id (int): Worker user ID
            booking_id (int): Booking ID
            rating (int): Rating (1-5)
            **kwargs: Additional review attributes
        
        Returns:
            tuple: (review, error_message)
        """
        # Validate booking exists and belongs to customer
        booking = Booking.query.get(booking_id)
        if not booking:
            return None, 'Booking not found'
        
        if booking.customer_id != customer_id:
            return None, 'Unauthorized: You do not own this booking'
        
        if booking.worker_id != worker_id:
            return None, 'Booking does not belong to this worker'
        
        # Check if booking is completed
        if booking.status != 'completed':
            return None, 'Can only review completed bookings'
        
        # Check if review already exists
        existing_review = Review.query.filter_by(booking_id=booking_id).first()
        if existing_review:
            return None, 'Review already exists for this booking'
        
        # Validate rating
        from app.utils.validators import validate_rating
        is_valid, error = validate_rating(rating)
        if not is_valid:
            return None, error
        
        try:
            # Create review
            review = Review(
                customer_id=customer_id,
                worker_id=worker_id,
                booking_id=booking_id,
                rating=rating,
                is_verified=True,
                **kwargs
            )
            
            db.session.add(review)
            
            # Update worker's rating
            worker = Worker.query.filter_by(user_id=worker_id).first()
            if worker:
                worker.update_rating(rating)
                worker.calculate_rank_score()
            
            db.session.commit()
            
            return review, None
        
        except Exception as e:
            db.session.rollback()
            return None, f'Review creation failed: {str(e)}'
    
    @staticmethod
    def get_review_by_id(review_id):
        """
        Get review by ID.
        
        Args:
            review_id (int): Review ID
        
        Returns:
            Review: Review object or None
        """
        return Review.query.get(review_id)
    
    @staticmethod
    def get_worker_reviews(worker_id, page=1, per_page=20):
        """
        Get reviews for a worker.
        
        Args:
            worker_id (int): Worker user ID
            page (int): Page number
            per_page (int): Items per page
        
        Returns:
            dict: Paginated reviews
        """
        query = Review.query.filter_by(worker_id=worker_id)
        query = query.order_by(Review.created_at.desc())
        
        from app.utils.helpers import paginate_results
        return paginate_results(query, page, per_page)
    
    @staticmethod
    def add_worker_response(review_id, worker_id, response):
        """
        Add worker response to a review.
        
        Args:
            review_id (int): Review ID
            worker_id (int): Worker user ID
            response (str): Worker's response
        
        Returns:
            tuple: (success, error_message)
        """
        review = Review.query.get(review_id)
        
        if not review:
            return False, 'Review not found'
        
        if review.worker_id != worker_id:
            return False, 'Unauthorized: You do not own this review'
        
        try:
            review.add_worker_response(response)
            db.session.commit()
            
            return True, None
        
        except Exception as e:
            db.session.rollback()
            return False, f'Response addition failed: {str(e)}'
    
    @staticmethod
    def flag_review(review_id, reason):
        """
        Flag a review for moderation.
        
        Args:
            review_id (int): Review ID
            reason (str): Flag reason
        
        Returns:
            tuple: (success, error_message)
        """
        review = Review.query.get(review_id)
        
        if not review:
            return False, 'Review not found'
        
        try:
            review.flag_review(reason)
            db.session.commit()
            
            return True, None
        
        except Exception as e:
            db.session.rollback()
            return False, f'Review flagging failed: {str(e)}'
    
    @staticmethod
    def get_worker_rating_summary(worker_id):
        """
        Get rating summary for a worker.
        
        Args:
            worker_id (int): Worker user ID
        
        Returns:
            dict: Rating summary
        """
        worker = Worker.query.filter_by(user_id=worker_id).first()
        
        if not worker:
            return None
        
        # Get rating distribution
        reviews = Review.query.filter_by(worker_id=worker_id).all()
        
        rating_distribution = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
        for review in reviews:
            rating_distribution[review.rating] += 1
        
        return {
            'average_rating': worker.rating,
            'total_reviews': worker.total_reviews,
            'rating_distribution': rating_distribution
        }
