"""
Validation utilities for WorkerApp.
Contains input validation functions.
"""

import re
from flask import jsonify


def validate_email(email):
    """
    Validate email format.
    
    Args:
        email (str): Email address to validate
    
    Returns:
        tuple: (is_valid, error_message)
    """
    if not email:
        return False, 'Email is required'
    
    email_regex = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(email_regex, email):
        return False, 'Invalid email format'
    
    return True, None


def validate_phone(phone):
    """
    Validate phone number format.
    Supports international formats.
    
    Args:
        phone (str): Phone number to validate
    
    Returns:
        tuple: (is_valid, error_message)
    """
    if not phone:
        return True, None  # Phone is optional
    
    # Remove spaces, dashes, and parentheses
    phone_clean = re.sub(r'[\s\-\(\)]', '', phone)
    
    # Check if it's a valid phone number (10-15 digits)
    phone_regex = r'^\+?[0-9]{10,15}$'
    if not re.match(phone_regex, phone_clean):
        return False, 'Invalid phone number format'
    
    return True, None


def validate_password(password):
    """
    Validate password strength.
    
    Requirements:
    - At least 8 characters
    - At least one uppercase letter
    - At least one lowercase letter
    - At least one number
    - At least one special character
    
    Args:
        password (str): Password to validate
    
    Returns:
        tuple: (is_valid, error_message)
    """
    if not password:
        return False, 'Password is required'
    
    if len(password) < 8:
        return False, 'Password must be at least 8 characters long'
    
    if not re.search(r'[A-Z]', password):
        return False, 'Password must contain at least one uppercase letter'
    
    if not re.search(r'[a-z]', password):
        return False, 'Password must contain at least one lowercase letter'
    
    if not re.search(r'[0-9]', password):
        return False, 'Password must contain at least one number'
    
    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        return False, 'Password must contain at least one special character'
    
    return True, None


def validate_rating(rating):
    """
    Validate rating value.
    
    Args:
        rating (int): Rating to validate
    
    Returns:
        tuple: (is_valid, error_message)
    """
    if not isinstance(rating, int):
        return False, 'Rating must be an integer'
    
    if rating < 1 or rating > 5:
        return False, 'Rating must be between 1 and 5'
    
    return True, None


def validate_coordinates(latitude, longitude):
    """
    Validate GPS coordinates.
    
    Args:
        latitude (float): Latitude
        longitude (float): Longitude
    
    Returns:
        tuple: (is_valid, error_message)
    """
    if latitude is not None:
        try:
            lat = float(latitude)
            if lat < -90 or lat > 90:
                return False, 'Latitude must be between -90 and 90'
        except (ValueError, TypeError):
            return False, 'Invalid latitude format'
    
    if longitude is not None:
        try:
            lon = float(longitude)
            if lon < -180 or lon > 180:
                return False, 'Longitude must be between -180 and 180'
        except (ValueError, TypeError):
            return False, 'Invalid longitude format'
    
    return True, None


def validate_date(date_string):
    """
    Validate date format (YYYY-MM-DD).
    
    Args:
        date_string (str): Date string to validate
    
    Returns:
        tuple: (is_valid, error_message, date_object)
    """
    if not date_string:
        return False, 'Date is required', None
    
    try:
        from datetime import datetime
        date_obj = datetime.strptime(date_string, '%Y-%m-%d').date()
        return True, None, date_obj
    except ValueError:
        return False, 'Invalid date format. Use YYYY-MM-DD', None


def validate_time(time_string):
    """
    Validate time format (HH:MM).
    
    Args:
        time_string (str): Time string to validate
    
    Returns:
        tuple: (is_valid, error_message, time_object)
    """
    if not time_string:
        return True, None, None  # Time is optional
    
    try:
        from datetime import datetime
        time_obj = datetime.strptime(time_string, '%H:%M').time()
        return True, None, time_obj
    except ValueError:
        return False, 'Invalid time format. Use HH:MM', None


def validate_amount(amount):
    """
    Validate monetary amount.
    
    Args:
        amount: Amount to validate
    
    Returns:
        tuple: (is_valid, error_message, amount_value)
    """
    if amount is None:
        return False, 'Amount is required', None
    
    try:
        amount_value = float(amount)
        if amount_value <= 0:
            return False, 'Amount must be greater than 0', None
        return True, None, amount_value
    except (ValueError, TypeError):
        return False, 'Invalid amount format', None
