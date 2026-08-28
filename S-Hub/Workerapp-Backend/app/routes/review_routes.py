"""
Review routes for WorkerApp.
"""

from flask import Blueprint
from app.controllers import ReviewController

review_bp = Blueprint('reviews', __name__, url_prefix='/api/reviews')


# Review Management
review_bp.add_url_rule('', view_func=ReviewController.create_review, methods=['POST'])
review_bp.add_url_rule('/<int:review_id>', view_func=ReviewController.get_review, methods=['GET'])
review_bp.add_url_rule('/worker/<int:worker_id>', view_func=ReviewController.get_worker_reviews, methods=['GET'])
review_bp.add_url_rule('/worker/<int:worker_id>/summary', view_func=ReviewController.get_worker_rating_summary, methods=['GET'])


# Review Actions
review_bp.add_url_rule('/<int:review_id>/respond', view_func=ReviewController.add_worker_response, methods=['POST'])
review_bp.add_url_rule('/<int:review_id>/flag', view_func=ReviewController.flag_review, methods=['POST'])
