"""
Helper functions for WorkerApp.
Contains utility functions for common operations.
"""

from math import radians, sin, cos, sqrt, asin
from flask import jsonify
from datetime import datetime


def calculate_distance(lat1, lon1, lat2, lon2):
    """
    Calculate distance between two coordinates using Haversine formula.
    
    Args:
        lat1 (float): Latitude of point 1
        lon1 (float): Longitude of point 1
        lat2 (float): Latitude of point 2
        lon2 (float): Longitude of point 2
    
    Returns:
        float: Distance in kilometers
    """
    if None in [lat1, lon1, lat2, lon2]:
        return None
    
    # Convert latitude and longitude from degrees to radians
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
    
    # Haversine formula
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * asin(sqrt(a))
    
    # Radius of Earth in kilometers
    r = 6371
    
    return c * r


def format_response(success=True, message=None, data=None, error=None, status_code=200):
    """
    Format API response in a consistent structure.
    
    Args:
        success (bool): Whether the request was successful
        message (str): Response message
        data (dict): Response data
        error (str): Error message
        status_code (int): HTTP status code
    
    Returns:
        tuple: JSON response and status code
    """
    response = {
        'success': success,
        'timestamp': datetime.utcnow().isoformat()
    }
    
    if message:
        response['message'] = message
    
    if data is not None:
        response['data'] = data
    
    if error:
        response['error'] = error
    
    return jsonify(response), status_code


def paginate_results(query, page=1, per_page=20):
    """
    Paginate database query results.
    
    Args:
        query: SQLAlchemy query object
        page (int): Page number (1-indexed)
        per_page (int): Items per page
    
    Returns:
        dict: Paginated results with metadata
    """
    try:
        page = max(1, int(page))
        per_page = max(1, min(100, int(per_page)))  # Limit to 100 per page
    except (ValueError, TypeError):
        page = 1
        per_page = 20
    
    paginated_query = query.paginate(
        page=page,
        per_page=per_page,
        error_out=False
    )
    
    return {
        'items': [item.to_dict() for item in paginated_query.items],
        'pagination': {
            'page': page,
            'per_page': per_page,
            'total_pages': paginated_query.pages,
            'total_items': paginated_query.total,
            'has_next': paginated_query.has_next,
            'has_prev': paginated_query.has_prev
        }
    }


def filter_by_distance(query, model, user_lat, user_lon, max_distance_km=None):
    """
    Filter query results by distance from user location.
    
    Args:
        query: SQLAlchemy query object
        model: Model class with latitude and longitude fields
        user_lat (float): User's latitude
        user_lon (float): User's longitude
        max_distance_km (float): Maximum distance in kilometers
    
    Returns:
        list: Filtered results with distance added
    """
    results = query.all()
    filtered_results = []
    
    for item in results:
        if item.latitude and item.longitude:
            distance = calculate_distance(
                user_lat, user_lon,
                item.latitude, item.longitude
            )
            
            if max_distance_km is None or distance <= max_distance_km:
                item_dict = item.to_dict()
                item_dict['distance'] = round(distance, 2)
                filtered_results.append(item_dict)
    
    # Sort by distance
    filtered_results.sort(key=lambda x: x['distance'])
    
    return filtered_results


def worker_category_filter(service):
    """
    Build a filter matching workers for a service category.

    Prefers the worker's explicit service_category_id, but falls back to
    matching occupation/skills text when that field is null — onboarding
    profiles that never got a category linked (abandoned setup, data seeded
    outside the normal flow) would otherwise be invisible to search and
    matching even with a fully filled-out occupation/skills.

    Args:
        service: Service model instance to match against

    Returns:
        SQLAlchemy filter expression usable in .filter()
    """
    from sqlalchemy import or_, and_
    from app.models import Worker

    return or_(
        Worker.service_category_id == service.id,
        and_(
            Worker.service_category_id.is_(None),
            or_(
                Worker.occupation.ilike(service.name),
                Worker.skills.contains(service.name),
            )
        )
    )


def sort_by_rating(query, descending=True):
    """
    Sort query results by rating.
    
    Args:
        query: SQLAlchemy query object
        descending (bool): Sort order
    
    Returns:
        query: Sorted query
    """
    if descending:
        return query.order_by('rating DESC')
    return query.order_by('rating ASC')


def sort_by_rank_score(query, descending=True):
    """
    Sort query results by rank score.
    
    Args:
        query: SQLAlchemy query object
        descending (bool): Sort order
    
    Returns:
        query: Sorted query
    """
    if descending:
        return query.order_by('rank_score DESC')
    return query.order_by('rank_score ASC')


def generate_slug(text):
    """
    Generate URL-friendly slug from text.
    
    Args:
        text (str): Text to convert to slug
    
    Returns:
        str: URL-friendly slug
    """
    import re
    # Convert to lowercase and replace spaces with hyphens
    slug = text.lower()
    # Remove special characters
    slug = re.sub(r'[^a-z0-9\s-]', '', slug)
    # Replace spaces with hyphens
    slug = re.sub(r'[\s-]+', '-', slug)
    # Remove leading/trailing hyphens
    slug = slug.strip('-')
    return slug


def sanitize_input(text):
    """
    Sanitize user input to prevent XSS attacks.
    
    Args:
        text (str): Text to sanitize
    
    Returns:
        str: Sanitized text
    """
    if not text:
        return text
    
    # Remove HTML tags
    import re
    text = re.sub(r'<[^>]+>', '', text)
    
    # Remove dangerous JavaScript patterns
    dangerous_patterns = [
        r'javascript:',
        r'on\w+\s*=',
        r'data:',
    ]
    
    for pattern in dangerous_patterns:
        text = re.sub(pattern, '', text, flags=re.IGNORECASE)
    
    return text.strip()


def format_currency(amount, currency='GHS'):
    """
    Format monetary amount.
    
    Args:
        amount (float): Amount to format
        currency (str): Currency code
    
    Returns:
        str: Formatted currency string
    """
    return f'{currency} {amount:,.2f}'


def get_client_ip():
    """
    Get client IP address from request.
    
    Returns:
        str: Client IP address
    """
    from flask import request
    if request.headers.getlist('X-Forwarded-For'):
        return request.headers.getlist('X-Forwarded-For')[0]
    return request.remote_addr
