"""
Payment routes for WorkerApp.
"""

from flask import Blueprint
from app.controllers import PaymentController

payment_bp = Blueprint('payments', __name__, url_prefix='/api/payments')


# Payment Management
payment_bp.add_url_rule('/booking/<int:booking_id>', view_func=PaymentController.create_payment, methods=['POST'])
payment_bp.add_url_rule('/<int:payment_id>', view_func=PaymentController.get_payment, methods=['GET'])
payment_bp.add_url_rule('/my', view_func=PaymentController.get_my_payments, methods=['GET'])


# Payment Actions
payment_bp.add_url_rule('/<int:payment_id>/refund', view_func=PaymentController.process_refund, methods=['POST'])
payment_bp.add_url_rule('/<int:payment_id>/payout', view_func=PaymentController.process_worker_payout, methods=['POST'])
