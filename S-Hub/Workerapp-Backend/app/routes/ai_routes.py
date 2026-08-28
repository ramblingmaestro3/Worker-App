"""
AI routes for WorkerApp.
"""

from flask import Blueprint
from app.controllers import AIController

ai_bp = Blueprint('ai', __name__, url_prefix='/api/ai')

ai_bp.add_url_rule('/analyze', view_func=AIController.analyze_problem, methods=['POST'])
