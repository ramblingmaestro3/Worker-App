"""
AI vision service for WorkerApp.
Analyzes a customer-submitted problem photo via the Google Gemini API and
returns an identified problem plus ranked worker-category recommendations.
"""

import json
import logging

from flask import current_app

logger = logging.getLogger(__name__)

WORKER_CATEGORIES = [
    'Plumbing', 'Electrical', 'Carpentry', 'Painting', 'Cleaning', 'Masonry',
    'HVAC & Air Conditioning', 'Roofing', 'Appliance Repair', 'Landscaping',
    'General Maintenance', 'Other',
]


class AIServiceError(Exception):
    """Base error for AI vision failures. Carries an HTTP status code."""
    status_code = 502

    def __init__(self, message):
        super().__init__(message)
        self.message = message


class AIServiceUnavailable(AIServiceError):
    """Raised when the AI provider isn't configured or unreachable."""
    status_code = 503


class AIServiceTimeout(AIServiceError):
    status_code = 504


class AIResponseInvalid(AIServiceError):
    """Raised when the AI returned something that isn't the expected JSON shape."""
    status_code = 502


def _build_prompt(description):
    categories = ', '.join(WORKER_CATEGORIES)
    extra = f'\nThe customer also provided this description: "{description}"' if description else ''
    return f"""You are analyzing a photo submitted by a customer of a home-services marketplace \
who needs to hire a blue-collar tradesperson (plumber, electrician, carpenter, etc.).{extra}

Look at the image and identify the most likely problem shown. Then recommend which type(s) of \
worker are best suited to fix it.

Respond with ONLY a single JSON object (no markdown fences, no prose before or after) matching \
exactly this shape:
{{
  "problem": {{
    "title": "short problem title, e.g. 'Possible leaking water pipe'",
    "description": "1-2 sentence plain-language explanation of what the image appears to show",
    "confidence": 0.0-1.0,
    "is_hazard": true/false,
    "hazard_warning": "short safety warning if is_hazard is true (electrical, gas, fire, structural danger), otherwise null",
    "quality_issue": "short note if the photo is too blurry, dark, or unclear to analyze well, otherwise null"
  }},
  "recommendations": [
    {{
      "category": "one of: {categories}",
      "confidence": 0.0-1.0,
      "reason": "short reason this worker type fits, 1 sentence"
    }}
  ]
}}

Rules:
- "category" must be exactly one of the listed values.
- List "recommendations" from highest to lowest confidence, at most 4 items.
- If you cannot confidently identify a problem in the image at all, set "problem" to null and \
"recommendations" to an empty array.
- Never invent details you cannot see in the image."""


def _extract_json(text):
    text = text.strip()
    if text.startswith('```'):
        text = text.strip('`')
        if text.lower().startswith('json'):
            text = text[4:]
    text = text.strip()
    start = text.find('{')
    end = text.rfind('}')
    if start == -1 or end == -1 or end < start:
        raise AIResponseInvalid('AI response did not contain a JSON object')
    return text[start:end + 1]


def _validate_shape(payload):
    if not isinstance(payload, dict) or 'recommendations' not in payload:
        raise AIResponseInvalid('AI response was missing expected fields')

    problem = payload.get('problem')
    if problem is not None:
        if not isinstance(problem, dict) or 'title' not in problem or 'confidence' not in problem:
            raise AIResponseInvalid('AI response "problem" field was malformed')

    recommendations = payload.get('recommendations')
    if not isinstance(recommendations, list):
        raise AIResponseInvalid('AI response "recommendations" field was malformed')

    return {
        'problem': problem,
        'recommendations': recommendations,
    }


class AIService:
    """Service for AI-powered problem identification from a photo."""

    @staticmethod
    def analyze_problem_image(image_bytes, mime_type, description=None):
        """
        Analyze a problem photo via Gemini vision and return identified
        problem + ranked worker-category recommendations.

        Args:
            image_bytes (bytes): Raw image file bytes
            mime_type (str): Image MIME type (e.g. 'image/jpeg')
            description (str): Optional customer-provided description

        Returns:
            dict: {'problem': dict|None, 'recommendations': list}

        Raises:
            AIServiceUnavailable, AIServiceTimeout, AIResponseInvalid, AIServiceError
        """
        api_key = current_app.config.get('GOOGLE_API_KEY')
        if not api_key:
            raise AIServiceUnavailable('AI service is not configured yet')

        try:
            from google import genai
            from google.genai import types
            from google.genai import errors as genai_errors
        except ImportError:
            logger.error('google-genai package is not installed')
            raise AIServiceUnavailable('AI service is not configured yet')

        client = genai.Client(api_key=api_key)
        model = current_app.config.get('GEMINI_MODEL', 'gemini-3.5-flash')

        try:
            response = client.models.generate_content(
                model=model,
                contents=[
                    _build_prompt(description),
                    types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
                ],
                config=types.GenerateContentConfig(response_mime_type='application/json'),
            )
        except genai_errors.APIError as exc:
            code = getattr(exc, 'code', None)
            logger.error('Gemini API error (code=%s): %s', code, exc)
            if code in (401, 403):
                raise AIServiceUnavailable('AI service is misconfigured')
            if code == 429:
                raise AIServiceTimeout('AI service is busy right now, please try again')
            if code and code >= 500:
                raise AIServiceError('The AI service returned an error')
            raise AIServiceError('The AI service rejected the request')
        except Exception as exc:
            logger.error('Unexpected error calling Gemini: %s', exc)
            raise AIServiceUnavailable('Could not reach the AI service')

        text = getattr(response, 'text', None)
        if not text:
            raise AIResponseInvalid('AI response was empty')

        raw_json = _extract_json(text)

        try:
            payload = json.loads(raw_json)
        except json.JSONDecodeError as exc:
            logger.error('Failed to parse AI JSON response: %s', exc)
            raise AIResponseInvalid('AI response could not be parsed')

        return _validate_shape(payload)
