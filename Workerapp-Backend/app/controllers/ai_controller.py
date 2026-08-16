"""
AI controller for WorkerApp.
Handles the customer "AI Help" problem-photo analysis endpoint.
"""

from flask import current_app, request

from app.services.ai_service import AIService, AIServiceError
from app.utils.helpers import format_response
from app.utils.auth import token_required


class AIController:
    """Controller for AI vision endpoints."""

    @staticmethod
    @token_required
    def analyze_problem(current_user):
        """
        Analyze a customer-submitted problem photo and return an identified
        problem plus ranked worker-category recommendations.

        Headers:
            Authorization: Bearer <access_token>

        Request (multipart/form-data):
            image (file): Problem photo
            description (str, optional): Customer-provided description

        Returns:
            JSON response with {'problem': dict|None, 'recommendations': list}
        """
        image = request.files.get('image')
        if not image or not image.filename:
            return format_response(success=False, message='An image file is required', status_code=400)

        extension = image.filename.rsplit('.', 1)[-1].lower() if '.' in image.filename else ''
        if extension not in current_app.config['ALLOWED_EXTENSIONS'] - {'pdf'}:
            return format_response(success=False, message='Only JPG and PNG images are allowed', status_code=400)

        image_bytes = image.read()
        max_bytes = current_app.config.get('AI_VISION_MAX_IMAGE_BYTES', 8388608)
        if len(image_bytes) > max_bytes:
            return format_response(
                success=False,
                message='This photo is too large. Please choose a smaller image.',
                status_code=400
            )
        if not image_bytes:
            return format_response(success=False, message='The uploaded image is empty or unavailable', status_code=400)

        mime_type = image.mimetype or f'image/{"jpeg" if extension == "jpg" else extension}'
        description = (request.form.get('description') or '').strip() or None

        try:
            result = AIService.analyze_problem_image(image_bytes, mime_type, description)
        except AIServiceError as error:
            return format_response(success=False, message=error.message, status_code=error.status_code)

        return format_response(success=True, data=result)
