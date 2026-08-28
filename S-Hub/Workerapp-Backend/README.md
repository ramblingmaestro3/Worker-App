# WorkerApp - Blue-Collar Worker Marketplace Backend

A professional, scalable Flask-based REST API backend for connecting users with blue-collar workers (electricians, carpenters, plumbers, painters, tailors, etc.) in African/local markets.

## Features

### Core Functionality
- **User Authentication**: JWT-based authentication with role-based access control
- **User Management**: Customer, Worker, and Admin roles with profile management
- **Worker Profiles**: Comprehensive worker profiles with skills, certifications, and ratings
- **Booking System**: Job scheduling, acceptance, rejection, and completion workflow
- **Reviews & Ratings**: Customer reviews with detailed rating categories
- **Payment Processing**: Integration-ready payment system with platform fees
- **In-App Messaging**: Real-time chat between customers and workers
- **Notifications**: In-app notifications for booking updates and messages
- **AI-Powered Matching**: Smart worker recommendation system
- **Location Services**: GPS-based worker search and distance calculation

### Advanced Features
- **Emergency Service Mode**: Urgent job requests with priority matching
- **Transparent Pricing**: Dynamic pricing engine with emergency surcharges
- **Worker Verification**: Admin verification system for worker profiles
- **Earnings Dashboard**: Worker earnings and payout tracking
- **Service Categories**: Flexible service category management
- **Rate Limiting**: API rate limiting to prevent abuse
- **Comprehensive Logging**: Request logging for monitoring and debugging

## Technology Stack

- **Framework**: Flask 3.0.0
- **Database**: PostgreSQL (with MySQL support)
- **ORM**: SQLAlchemy 2.0.23
- **Authentication**: Flask-JWT-Extended 4.6.0
- **Password Hashing**: Bcrypt
- **Migrations**: Flask-Migrate 4.0.5
- **CORS**: Flask-CORS 4.0.0
- **Rate Limiting**: Flask-Limiter 3.5.0
- **Validation**: Marshmallow 3.20.1
- **Payment**: Stripe (placeholder integration)
- **SMS**: Twilio (placeholder integration)

## Project Structure

```
Workerapp - Backend/
├── app/
│   ├── __init__.py              # Application factory
│   ├── config/                  # Configuration settings
│   │   ├── __init__.py
│   │   └── config.py           # Environment-based configuration
│   ├── models/                  # SQLAlchemy ORM models
│   │   ├── __init__.py
│   │   ├── user.py             # User model
│   │   ├── worker.py           # Worker model
│   │   ├── service.py          # Service category model
│   │   ├── booking.py          # Booking model
│   │   ├── review.py           # Review model
│   │   ├── payment.py          # Payment model
│   │   ├── message.py          # Message model
│   │   ├── notification.py     # Notification model
│   │   ├── certification.py    # Certification model
│   │   └── availability.py     # Worker availability model
│   ├── controllers/             # Request controllers
│   │   ├── __init__.py
│   │   ├── auth_controller.py
│   │   ├── user_controller.py
│   │   ├── worker_controller.py
│   │   ├── booking_controller.py
│   │   ├── review_controller.py
│   │   ├── payment_controller.py
│   │   ├── message_controller.py
│   │   ├── notification_controller.py
│   │   └── service_controller.py
│   ├── routes/                  # Flask blueprints (API endpoints)
│   │   ├── __init__.py
│   │   ├── auth_routes.py
│   │   ├── user_routes.py
│   │   ├── worker_routes.py
│   │   ├── booking_routes.py
│   │   ├── review_routes.py
│   │   ├── payment_routes.py
│   │   ├── message_routes.py
│   │   ├── notification_routes.py
│   │   └── service_routes.py
│   ├── services/                # Business logic layer
│   │   ├── __init__.py
│   │   ├── auth_service.py
│   │   ├── user_service.py
│   │   ├── worker_service.py
│   │   ├── booking_service.py
│   │   ├── review_service.py
│   │   ├── payment_service.py
│   │   ├── message_service.py
│   │   ├── notification_service.py
│   │   └── matching_service.py  # AI-powered matching
│   ├── utils/                   # Utility functions
│   │   ├── __init__.py
│   │   ├── auth.py              # JWT authentication utilities
│   │   ├── validators.py        # Input validation
│   │   └── helpers.py           # Helper functions
│   └── middleware/              # Request/response middleware
│       ├── __init__.py
│       ├── error_handlers.py    # Error handling
│       ├── rate_limiter.py      # Rate limiting
│       └── request_logger.py    # Request logging
├── database/                    # Database files (SQLite for dev)
├── migrations/                  # Database migration files
├── uploads/                     # File upload directory
├── venv/                        # Virtual environment
├── requirements.txt             # Python dependencies
├── .env.example                 # Environment variables template
├── .gitignore                   # Git ignore rules
├── run.py                       # Development server entry point
├── wsgi.py                      # Production WSGI entry point
└── README.md                    # This file
```

## Installation

### Prerequisites
- Python 3.8 or higher
- PostgreSQL 12 or higher (or MySQL)
- pip (Python package manager)

### Setup Steps

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Workerapp-Backend
   ```

2. **Create virtual environment**
   ```bash
   python -m venv venv
   
   # On Windows
   venv\Scripts\activate
   
   # On Unix/macOS
   source venv/bin/activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` file with your configuration:
   ```env
   FLASK_ENV=development
   FLASK_DEBUG=True
   SECRET_KEY=your-secret-key-here
   DATABASE_URL=postgresql://username:password@localhost:5432/workerapp_db
   JWT_SECRET_KEY=your-jwt-secret-key-here
   ```

5. **Initialize database**
   ```bash
   # Initialize Flask-Migrate
   flask db init
   
   # Create initial migration
   flask db migrate -m "Initial migration"
   
   # Apply migration
   flask db upgrade
   ```

6. **Run the application**
   ```bash
   python run.py
   ```

The API will be available at `http://localhost:5000`

## Database Schema

### Core Tables

#### Users
- User accounts for customers, workers, and admins
- Authentication and profile information
- Location data for GPS-based services

#### Workers
- Extended user profiles for workers
- Skills, certifications, and availability
- Ratings, earnings, and performance metrics

#### Services
- Service categories (electrician, plumber, etc.)
- Pricing guidelines and requirements
- Hierarchical category structure

#### Bookings
- Job bookings between customers and workers
- Scheduling, status tracking, and pricing
- Emergency service support

#### Reviews
- Customer reviews and ratings
- Detailed rating categories
- Worker response functionality

#### Payments
- Payment transactions and processing
- Platform fee calculation
- Worker payout management

#### Messages
- In-app messaging system
- Conversation tracking
- Read status management

#### Notifications
- User notifications
- Multiple delivery channels (push, email, SMS)
- Priority-based delivery

#### Certifications
- Worker professional certifications
- Verification workflow
- Document storage

#### Availability
- Worker availability schedules
- Recurring and specific date slots
- Time slot management

## API Documentation

### Base URL
- Development: `http://localhost:5000/api`
- Production: `https://your-domain.com/api`

### Authentication

All protected endpoints require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer <access_token>
```

### Endpoints

#### Authentication (`/api/auth`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/register` | Register new user | No |
| POST | `/login` | Login user | No |
| POST | `/logout` | Logout user | Yes |
| POST | `/refresh` | Refresh access token | Yes |
| POST | `/change-password` | Change password | Yes |
| POST | `/reset-password` | Request password reset | No |

**Register Example:**
```json
POST /api/auth/register
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "first_name": "John",
  "last_name": "Doe",
  "role": "customer",
  "phone_number": "+233123456789"
}
```

**Login Example:**
```json
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

#### Users (`/api/users`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/me` | Get current user profile | Yes |
| PUT | `/me` | Update current user profile | Yes |
| POST | `/me/deactivate` | Deactivate account | Yes |
| GET | `/<user_id>` | Get user by ID | No |
| GET | `/search` | Search users | No |
| GET | `/all` | Get all users (admin) | Admin |

#### Workers (`/api/workers`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/profile` | Create worker profile | Yes |
| GET | `/me` | Get my worker profile | Worker |
| PUT | `/me` | Update worker profile | Worker |
| PUT | `/me/availability` | Update availability | Worker |
| GET | `/me/earnings` | Get earnings summary | Worker |
| GET | `/<worker_id>` | Get worker by ID | No |
| GET | `/search` | Search workers | No |
| GET | `/top` | Get top workers | No |

**Search Workers Example:**
```
GET /api/workers/search?category=electrician&location=Accra&min_rating=4.0&page=1&per_page=20
```

#### Bookings (`/api/bookings`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `` | Create booking | Yes |
| GET | `/my` | Get my bookings | Yes |
| GET | `/<booking_id>` | Get booking by ID | Yes |
| POST | `/<booking_id>/accept` | Accept booking | Worker |
| POST | `/<booking_id>/reject` | Reject booking | Worker |
| POST | `/<booking_id>/start` | Start job | Worker |
| POST | `/<booking_id>/complete` | Complete job | Worker |
| POST | `/<booking_id>/cancel` | Cancel booking | Yes |

**Create Booking Example:**
```json
POST /api/bookings
{
  "worker_id": 5,
  "title": "Electrical repair",
  "description": "Fix broken outlet in kitchen",
  "scheduled_date": "2024-06-15",
  "scheduled_time": "14:00",
  "estimated_duration": 2,
  "is_emergency": false,
  "location_address": "123 Main St, Accra",
  "latitude": 5.6037,
  "longitude": -0.1870
}
```

#### Reviews (`/api/reviews`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `` | Create review | Customer |
| GET | `/<review_id>` | Get review by ID | No |
| GET | `/worker/<worker_id>` | Get worker reviews | No |
| GET | `/worker/<worker_id>/summary` | Get rating summary | No |
| POST | `/<review_id>/respond` | Add worker response | Worker |
| POST | `/<review_id>/flag` | Flag review | Admin |

#### Payments (`/api/payments`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/booking/<booking_id>` | Create payment | Customer |
| GET | `/<payment_id>` | Get payment by ID | Yes |
| GET | `/my` | Get payment history | Yes |
| POST | `/<payment_id>/refund` | Process refund | Customer |
| POST | `/<payment_id>/payout` | Process payout | Admin |

#### Messages (`/api/messages`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `` | Send message | Yes |
| GET | `/<message_id>` | Get message by ID | Yes |
| GET | `/conversations` | Get all conversations | Yes |
| GET | `/conversation/<user_id>` | Get conversation | Yes |
| GET | `/unread-count` | Get unread count | Yes |
| POST | `/<message_id>/read` | Mark as read | Yes |
| POST | `/conversation/<user_id>/read` | Mark conversation as read | Yes |

#### Notifications (`/api/notifications`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `` | Get notifications | Yes |
| GET | `/<notification_id>` | Get notification by ID | Yes |
| GET | `/unread-count` | Get unread count | Yes |
| POST | `/<notification_id>/read` | Mark as read | Yes |
| POST | `/read-all` | Mark all as read | Yes |

#### Services (`/api/services`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `` | Get all services | No |
| GET | `/featured` | Get featured services | No |
| GET | `/<service_id>` | Get service by ID | No |
| GET | `/slug/<slug>` | Get service by slug | No |
| POST | `` | Create service | Admin |
| PUT | `/<service_id>` | Update service | Admin |
| DELETE | `/<service_id>` | Delete service | Admin |

## Response Format

All API responses follow a consistent format:

**Success Response:**
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... },
  "timestamp": "2024-05-20T16:50:00.000000"
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Error message",
  "error": "Detailed error description",
  "timestamp": "2024-05-20T16:50:00.000000"
}
```

**Paginated Response:**
```json
{
  "success": true,
  "data": {
    "items": [ ... ],
    "pagination": {
      "page": 1,
      "per_page": 20,
      "total_pages": 5,
      "total_items": 100,
      "has_next": true,
      "has_prev": false
    }
  },
  "timestamp": "2024-05-20T16:50:00.000000"
}
```

## Design Decisions

### Architecture Pattern
- **MVC with Service Layer**: Separates concerns with Models, Views (Controllers), and Services
- **Blueprint-based Routes**: Modular route organization for scalability
- **Repository Pattern**: Service layer abstracts database operations

### Authentication
- **JWT Tokens**: Stateless authentication with access and refresh tokens
- **Token Blacklisting**: Secure logout functionality
- **Role-based Access Control**: Decorators for customer, worker, and admin roles

### Database Design
- **Relational Model**: PostgreSQL for complex relationships and transactions
- **ORM**: SQLAlchemy for type-safe database operations
- **Migrations**: Flask-Migrate for version-controlled schema changes

### Security
- **Password Hashing**: Bcrypt for secure password storage
- **Input Validation**: Comprehensive validation for all inputs
- **Rate Limiting**: Prevent API abuse
- **CORS**: Configured cross-origin resource sharing
- **SQL Injection Prevention**: ORM-based queries

### Scalability
- **Modular Structure**: Easy to add new features
- **Service Layer**: Business logic separated from controllers
- **Async-ready**: Structure supports async operations
- **Caching-ready**: Architecture supports Redis integration

### Local Market Focus
- **GPS-based Services**: Location-aware worker search
- **Local Currency**: Ghana Cedis (GHS) default
- **Emergency Services**: Priority matching for urgent jobs
- **Offline Support**: Architecture supports offline functionality
- **Local Payment Integration**: Ready for Mobile Money integration

## Deployment

### Production Setup

1. **Set environment variables**
   ```env
   FLASK_ENV=production
   FLASK_DEBUG=False
   DATABASE_URL=postgresql://user:pass@prod-host:5432/workerapp_db
   SECRET_KEY=<strong-secret-key>
   JWT_SECRET_KEY=<strong-jwt-secret>
   ```

2. **Install production dependencies**
   ```bash
   pip install gunicorn
   ```

3. **Run database migrations**
   ```bash
   flask db upgrade
   ```

4. **Start with Gunicorn**
   ```bash
   gunicorn -w 4 -b 0.0.0.0:5000 wsgi:app
   ```

### Docker Deployment (Optional)

Create `Dockerfile`:
```dockerfile
FROM python:3.9-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:5000", "wsgi:app"]
```

Build and run:
```bash
docker build -t workerapp-backend .
docker run -p 5000:5000 workerapp-backend
```

## Testing

### Run Tests
```bash
pytest
```

### Test Coverage
```bash
pytest --cov=app
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Write tests
5. Submit a pull request

## License

This project is proprietary software. All rights reserved.

## Support

For support, contact support@workerapp.com

## Roadmap

- [ ] Real-time WebSocket support for messaging
- [ ] Advanced AI matching with machine learning
- [ ] Mobile Money integration (MTN, Vodafone, AirtelTigo)
- [ ] WhatsApp Business API integration
- [ ] Image upload for problem detection
- [ ] Video call integration
- [ ] Advanced analytics dashboard
- [ ] Multi-language support
- [ ] Push notification service (Firebase)
- [ ] Redis caching for performance
- [ ] Elasticsearch for advanced search
