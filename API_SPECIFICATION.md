# API Specification - Gondar Fuel Management System

## API Overview

- **Base URL**: `https://api.gondarfuel.et/v1`
- **Authentication**: JWT Bearer tokens
- **Rate Limiting**: 100 requests/minute for authenticated users, 20/minute for unauthenticated
- **Response Format**: JSON
- **CORS**: Enabled for authorized origins only

---

## Authentication Endpoints

### POST /auth/register

Register a new user account.

**Request Body:**
```json
{
  "phone": "+251912345678",
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "full_name": "Abebe Kebede",
  "vehicle_type": "car",
  "vehicle_plate": "AB-12345"
}
```

**Response (201 Created):**
```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "phone": "+251912345678",
    "email": "user@example.com",
    "full_name": "Abebe Kebede",
    "role": "driver",
    "created_at": "2026-04-22T10:30:00Z"
  },
  "tokens": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
    "expires_in": 3600
  }
}
```

---

### POST /auth/login

Authenticate user and receive tokens.

**Request Body:**
```json
{
  "phone": "+251912345678",
  "password": "SecurePassword123!"
}
```

**Response (200 OK):**
```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "phone": "+251912345678",
    "full_name": "Abebe Kebede",
    "role": "driver",
    "last_login": "2026-04-22T10:30:00Z"
  },
  "tokens": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
    "expires_in": 3600
  }
}
```

---

### POST /auth/login/oauth

Authenticate via OAuth provider.

**Request Body:**
```json
{
  "provider": "google",
  "id_token": "eyJhbGciOiJSUzI1NiIs..."
}
```

**Response (200 OK):**
```json
{
  "user": { ... },
  "tokens": { ... },
  "is_new_user": true
}
```

---

### POST /auth/refresh

Refresh access token.

**Request Body:**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response (200 OK):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "expires_in": 3600
}
```

---

### POST /auth/logout

Invalidate current session.

**Headers:** `Authorization: Bearer <token>`

**Response (204 No Content)**

---

### GET /auth/me

Get current user profile.

**Headers:** `Authorization: Bearer <token>`

**Response (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "phone": "+251912345678",
  "email": "user@example.com",
  "full_name": "Abebe Kebede",
  "vehicle_type": "car",
  "vehicle_plate": "AB-12345",
  "role": "driver",
  "preferences": { ... },
  "created_at": "2026-01-15T08:00:00Z",
  "last_login": "2026-04-22T10:30:00Z"
}
```

---

### PATCH /auth/me

Update user profile.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "full_name": "Abebe Kebede Updated",
  "vehicle_plate": "AB-67890",
  "preferences": {
    "language": "en",
    "notifications": {
      "price_drop": true
    }
  }
}
```

**Response (200 OK):**
```json
{
  "id": "...",
  "full_name": "Abebe Kebede Updated",
  ...
}
```

---

### POST /auth/password-reset/request

Request password reset.

**Request Body:**
```json
{
  "phone": "+251912345678"
}
```

**Response (200 OK):**
```json
{
  "message": "Password reset code sent via SMS"
}
```

---

### POST /auth/password-reset/verify

Verify reset code and set new password.

**Request Body:**
```json
{
  "phone": "+251912345678",
  "code": "123456",
  "new_password": "NewSecurePassword123!"
}
```

**Response (200 OK):**
```json
{
  "message": "Password reset successful"
}
```

---

## Fuel Station Endpoints

### GET /stations

Get all fuel stations (with filtering and pagination).

**Query Parameters:**
- `bounds` - Bounding box: `north,south,east,west`
- `status` - Filter by status: `operational`, `limited`, `out_of_stock`, `closed`
- `fuel_type` - Filter by fuel type availability
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20, max: 100)
- `sort` - Sort field: `distance`, `last_report`, `name`

**Headers:** `Authorization: Bearer <token>` (optional for public data)

**Response (200 OK):**
```json
{
  "stations": [
    {
      "id": "station-uuid",
      "name": "Total Gondar Station",
      "brand": "Total",
      "latitude": 12.6089,
      "longitude": 37.4671,
      "address": "Piazza Area, Gondar",
      "phone": "+251-58-111-1234",
      "status": "operational",
      "fuel_types": [
        {"type": "diesel", "available": true, "price": 65.50},
        {"type": "gasoline_95", "available": true, "price": 72.00}
      ],
      "operating_hours": { ... },
      "distance_meters": 450,
      "last_report": {
        "reported_at": "2026-04-22T09:15:00Z",
        "availability": "full"
      },
      "today_stats": {
        "report_count": 15,
        "avg_price": 65.50
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "total_pages": 3
  }
}
```

---

### GET /stations/:id

Get details of a specific fuel station.

**Headers:** `Authorization: Bearer <token>` (optional)

**Response (200 OK):**
```json
{
  "id": "station-uuid",
  "name": "Total Gondar Station",
  "brand": "Total",
  "latitude": 12.6089,
  "longitude": 37.4671,
  "address": "Piazza Area, Gondar",
  "phone": "+251-58-111-1234",
  "email": "gondar@total.et",
  "website": "https://total.et",
  "status": "operational",
  "fuel_types": [
    {"type": "diesel", "available": true},
    {"type": "gasoline_95", "available": true},
    {"type": "gasoline_92", "available": false}
  ],
  "operating_hours": { ... },
  "amenities": ["parking", "restroom", "shop", "atm"],
  "is_verified": true,
  "photos": ["https://storage.../photo1.jpg"],
  "recent_reports": [
    {
      "id": "report-uuid",
      "price": 65.50,
      "fuel_type": "diesel",
      "availability": "full",
      "reported_at": "2026-04-22T09:15:00Z",
      "verified": true,
      "verification_count": 3
    }
  ],
  "price_history": [
    {"date": "2026-04-21", "avg_price": 65.00, "fuel_type": "diesel"},
    {"date": "2026-04-22", "avg_price": 65.50, "fuel_type": "diesel"}
  ],
  "predictions": {
    "demand": "high",
    "shortage_risk": "low",
    "next_restock_estimate": "2026-04-23T08:00:00Z"
  }
}
```

---

### POST /stations

Register a new fuel station (station owners/admins only).

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "name": "New Fuel Station",
  "brand": "National",
  "latitude": 12.6100,
  "longitude": 37.4680,
  "address": "Street Address, Gondar",
  "phone": "+251-58-111-9999",
  "fuel_types": [
    {"type": "diesel", "available": true},
    {"type": "gasoline_95", "available": true}
  ],
  "operating_hours": { ... },
  "amenities": ["parking", "restroom"]
}
```

**Response (201 Created):**
```json
{
  "id": "station-uuid",
  "name": "New Fuel Station",
  ...
}
```

---

### PATCH /stations/:id

Update fuel station details.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "status": "operational",
  "fuel_types": [
    {"type": "diesel", "available": true},
    {"type": "gasoline_95", "available": false}
  ],
  "phone": "+251-58-111-9999"
}
```

**Response (200 OK):**
```json
{
  "id": "station-uuid",
  ...
}
```

---

### GET /stations/:id/reports

Get reports for a specific station.

**Query Parameters:**
- `fuel_type` - Filter by fuel type
- `days` - Number of days of history (default: 7, max: 90)
- `page` - Page number
- `limit` - Items per page

**Headers:** `Authorization: Bearer <token>` (optional)

**Response (200 OK):**
```json
{
  "reports": [
    {
      "id": "report-uuid",
      "user_id": "user-uuid",
      "price": 65.50,
      "fuel_type": "diesel",
      "availability": "full",
      "quantity_available_liters": 5000,
      "notes": "Full tank available",
      "photos": [],
      "verified": true,
      "verification_count": 5,
      "reported_at": "2026-04-22T09:15:00Z"
    }
  ],
  "pagination": { ... }
}
```

---

## Fuel Report Endpoints

### POST /reports

Submit a new fuel status report.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "station_id": "station-uuid",
  "fuel_type": "diesel",
  "price": 65.50,
  "availability": "full",
  "quantity_available_liters": 5000,
  "notes": "Just refilled, plenty available",
  "photos": ["https://storage.../photo.jpg"],
  "location": {
    "latitude": 12.6089,
    "longitude": 37.4671
  }
}
```

**Response (201 Created):**
```json
{
  "id": "report-uuid",
  "station_id": "station-uuid",
  "user_id": "user-uuid",
  "fuel_type": "diesel",
  "price": 65.50,
  "availability": "full",
  "verified": false,
  "verification_count": 0,
  "reported_at": "2026-04-22T10:30:00Z",
  "created_at": "2026-04-22T10:30:00Z"
}
```

**Error Responses:**
- `400 Bad Request` - Location outside Gondar bounds
- `400 Bad Request` - Price seems unrealistic
- `429 Too Many Requests` - Rate limit exceeded (max 5 reports/hour/user)

---

### GET /reports

Get reports with filtering (for analytics).

**Query Parameters:**
- `station_id` - Filter by station
- `user_id` - Filter by user (own reports only unless admin)
- `fuel_type` - Filter by fuel type
- `availability` - Filter by availability status
- `verified` - Filter by verification status
- `date_from` - Start date
- `date_to` - End date
- `bounds` - Geographic bounds
- `page` - Page number
- `limit` - Items per page

**Headers:** `Authorization: Bearer <token>`

**Response (200 OK):**
```json
{
  "reports": [...],
  "pagination": { ... },
  "summary": {
    "total_count": 150,
    "avg_price": 65.25,
    "availability_distribution": {
      "full": 45,
      "limited": 80,
      "very_limited": 20,
      "out_of_stock": 5
    }
  }
}
```

---

### GET /reports/my-reports

Get current user's reports.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `page` - Page number
- `limit` - Items per page
- `include_station` - Include station details (boolean)

**Response (200 OK):**
```json
{
  "reports": [
    {
      "id": "report-uuid",
      "station_id": "station-uuid",
      "station": {
        "name": "Total Gondar Station",
        "brand": "Total"
      },
      "fuel_type": "diesel",
      "price": 65.50,
      "availability": "full",
      "verified": true,
      "verification_count": 3,
      "reported_at": "2026-04-22T10:30:00Z"
    }
  ],
  "pagination": { ... },
  "stats": {
    "total_reports": 25,
    "verified_reports": 18,
    "this_month": 8
  }
}
```

---

### POST /reports/:id/verify

Verify a report (confirm accuracy).

**Headers:** `Authorization: Bearer <token>`

**Response (200 OK):**
```json
{
  "report_id": "report-uuid",
  "verified": true,
  "verification_count": 4,
  "user_has_verified": true
}
```

---

### POST /reports/:id/flag

Flag a report as inaccurate.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "reason": "price_incorrect",
  "notes": "Price is actually 70 Birr"
}
```

**Response (200 OK):**
```json
{
  "report_id": "report-uuid",
  "flagged": true,
  "flag_count": 2
}
```

---

### DELETE /reports/:id

Delete a report (own reports only, within 1 hour of creation).

**Headers:** `Authorization: Bearer <token>`

**Response (204 No Content)**

---

## Analytics Endpoints

### GET /analytics/price-trends

Get price trends over time.

**Query Parameters:**
- `station_id` - Specific station (optional)
- `fuel_type` - Fuel type (default: diesel)
- `days` - Number of days (default: 30, max: 365)
- `aggregate` - Aggregation level: `daily`, `weekly`, `monthly`

**Headers:** `Authorization: Bearer <token>`

**Response (200 OK):**
```json
{
  "fuel_type": "diesel",
  "period": {
    "start": "2026-03-23",
    "end": "2026-04-22"
  },
  "trends": [
    {
      "date": "2026-04-16",
      "avg_price": 64.50,
      "min_price": 63.00,
      "max_price": 66.00,
      "report_count": 45
    },
    {
      "date": "2026-04-22",
      "avg_price": 65.50,
      "min_price": 64.00,
      "max_price": 67.00,
      "report_count": 52
    }
  ],
  "summary": {
    "overall_change_percent": 1.55,
    "volatility_score": 0.15,
    "trend_direction": "increasing"
  }
}
```

---

### GET /analytics/availability-map

Get availability data for map visualization.

**Query Parameters:**
- `bounds` - Bounding box (required)
- `fuel_type` - Filter by fuel type

**Headers:** `Authorization: Bearer <token>`

**Response (200 OK):**
```json
{
  "stations": [
    {
      "id": "station-uuid",
      "latitude": 12.6089,
      "longitude": 37.4671,
      "availability_score": 85,
      "status": "operational",
      "last_updated": "2026-04-22T09:15:00Z",
      "color_code": "green"
    },
    {
      "id": "station-uuid-2",
      "latitude": 12.6025,
      "longitude": 37.4650,
      "availability_score": 20,
      "status": "limited",
      "last_updated": "2026-04-22T08:30:00Z",
      "color_code": "orange"
    }
  ],
  "heatmap_data": [
    {"lat": 12.6089, "lng": 37.4671, "intensity": 0.85},
    {"lat": 12.6025, "lng": 37.4650, "intensity": 0.20}
  ]
}
```

---

### GET /analytics/shortage-alerts

Get current shortage alerts.

**Query Parameters:**
- `severity` - Filter by severity: `low`, `medium`, `high`, `critical`
- `area` - Specific area within Gondar

**Headers:** `Authorization: Bearer <token>`

**Response (200 OK):**
```json
{
  "alerts": [
    {
      "id": "alert-uuid",
      "type": "shortage",
      "severity": "high",
      "area": "Maraki",
      "fuel_type": "diesel",
      "affected_stations": 3,
      "description": "Multiple stations reporting limited diesel availability",
      "created_at": "2026-04-22T07:00:00Z",
      "updated_at": "2026-04-22T10:00:00Z"
    }
  ],
  "summary": {
    "total_active_alerts": 2,
    "critical_count": 0,
    "high_count": 1,
    "medium_count": 1
  }
}
```

---

### GET /analytics/predictions

Get fuel demand and price predictions.

**Query Parameters:**
- `station_id` - Specific station
- `fuel_type` - Fuel type
- `horizon` - Prediction horizon: `1_day`, `3_day`, `7_day`

**Headers:** `Authorization: Bearer <token>`

**Response (200 OK):**
```json
{
  "predictions": [
    {
      "station_id": "station-uuid",
      "station_name": "Total Gondar Station",
      "fuel_type": "diesel",
      "prediction_type": "demand",
      "predicted_value": "high",
      "confidence": 0.85,
      "prediction_date": "2026-04-23",
      "details": {
        "expected_wait_time_minutes": 15,
        "recommended_visit_time": "06:00-08:00",
        "shortage_risk": "low"
      }
    },
    {
      "station_id": "station-uuid",
      "fuel_type": "diesel",
      "prediction_type": "price",
      "predicted_change_percent": 2.5,
      "predicted_price": 67.15,
      "confidence": 0.72,
      "prediction_date": "2026-04-25"
    }
  ],
  "generated_at": "2026-04-22T10:30:00Z",
  "model_version": "v2.1.0"
}
```

---

### GET /analytics/dashboard

Get dashboard statistics for admin/users.

**Headers:** `Authorization: Bearer <token>`

**Response (200 OK):**
```json
{
  "overview": {
    "total_stations": 45,
    "operational_stations": 38,
    "total_reports_today": 234,
    "active_users_today": 89,
    "avg_price_diesel": 65.50,
    "price_change_24h": 0.75
  },
  "availability_distribution": {
    "full": 15,
    "limited": 20,
    "very_limited": 8,
    "out_of_stock": 2
  },
  "top_contributors": [
    {"user_id": "...", "full_name": "Abebe K.", "reports_count": 45},
    {"user_id": "...", "full_name": "Kebede M.", "reports_count": 38}
  ],
  "recent_activity": [...],
  "alerts_summary": {
    "active_alerts": 2,
    "resolved_today": 1
  }
}
```

---

## Notification Endpoints

### GET /notifications

Get user notifications.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `unread_only` - Boolean (default: false)
- `type` - Filter by type
- `page` - Page number
- `limit` - Items per page

**Response (200 OK):**
```json
{
  "notifications": [
    {
      "id": "notif-uuid",
      "type": "price_drop",
      "title": "Price Drop Alert",
      "message": "Diesel price dropped by 3 Birr at Total Gondar Station",
      "station_id": "station-uuid",
      "station_name": "Total Gondar Station",
      "data": {
        "old_price": 68.50,
        "new_price": 65.50,
        "drop_percent": 4.38
      },
      "read": false,
      "created_at": "2026-04-22T09:00:00Z"
    }
  ],
  "unread_count": 3,
  "pagination": { ... }
}
```

---

### PATCH /notifications/:id/read

Mark notification as read.

**Headers:** `Authorization: Bearer <token>`

**Response (200 OK):**
```json
{
  "id": "notif-uuid",
  "read": true,
  "read_at": "2026-04-22T10:30:00Z"
}
```

---

### POST /notifications/read-all

Mark all notifications as read.

**Headers:** `Authorization: Bearer <token>`

**Response (200 OK):**
```json
{
  "marked_count": 5,
  "timestamp": "2026-04-22T10:30:00Z"
}
```

---

## Subscription Endpoints

### GET /subscriptions

Get user's notification subscriptions.

**Headers:** `Authorization: Bearer <token>`

**Response (200 OK):**
```json
{
  "subscriptions": [
    {
      "id": "sub-uuid",
      "station_id": "station-uuid",
      "station_name": "Total Gondar Station",
      "subscription_type": "price_alert",
      "conditions": {
        "price_drop_percent": 10,
        "fuel_types": ["diesel"]
      },
      "is_active": true,
      "created_at": "2026-04-15T08:00:00Z"
    }
  ]
}
```

---

### POST /subscriptions

Create a new notification subscription.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "station_id": "station-uuid",
  "subscription_type": "price_alert",
  "conditions": {
    "price_drop_percent": 10,
    "fuel_types": ["diesel", "gasoline_95"]
  }
}
```

**Response (201 Created):**
```json
{
  "id": "sub-uuid",
  "station_id": "station-uuid",
  "subscription_type": "price_alert",
  "conditions": { ... },
  "is_active": true
}
```

---

### DELETE /subscriptions/:id

Delete a subscription.

**Headers:** `Authorization: Bearer <token>`

**Response (204 No Content)**

---

### POST /subscriptions/fcm-token

Register FCM token for push notifications.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "fcm_token": "eXwHj...",
  "device_id": "device-uuid"
}
```

**Response (200 OK):**
```json
{
  "registered": true,
  "token_id": "token-uuid"
}
```

---

## WebSocket Events

### Connection

```
wss://api.gondarfuel.et/v1/ws
```

**Query Parameters:**
- `token` - JWT access token

### Client -> Server Events

```json
// Subscribe to station updates
{
  "type": "subscribe",
  "channel": "station_updates",
  "station_ids": ["station-uuid-1", "station-uuid-2"]
}

// Subscribe to area updates (bounding box)
{
  "type": "subscribe",
  "channel": "area_updates",
  "bounds": {"north": x, "south": y, "east": z, "west": w}
}

// Heartbeat
{
  "type": "heartbeat",
  "timestamp": "2026-04-22T10:30:00Z"
}
```

### Server -> Client Events

```json
// New report in subscribed area
{
  "type": "new_report",
  "data": {
    "report_id": "report-uuid",
    "station_id": "station-uuid",
    "station_name": "Total Gondar Station",
    "fuel_type": "diesel",
    "price": 65.50,
    "availability": "full",
    "reported_at": "2026-04-22T10:30:00Z"
  }
}

// Station status change
{
  "type": "station_status_changed",
  "data": {
    "station_id": "station-uuid",
    "old_status": "operational",
    "new_status": "limited",
    "fuel_type": "diesel",
    "changed_at": "2026-04-22T10:30:00Z"
  }
}

// Shortage alert
{
  "type": "shortage_alert",
  "data": {
    "alert_id": "alert-uuid",
    "severity": "high",
    "area": "Maraki",
    "fuel_type": "diesel",
    "message": "Multiple stations reporting shortages"
  }
}

// Heartbeat acknowledgment
{
  "type": "heartbeat_ack",
  "timestamp": "2026-04-22T10:30:00Z",
  "server_time": "2026-04-22T10:30:00.123Z"
}
```

---

## Error Response Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request data",
    "details": [
      {
        "field": "price",
        "message": "Price must be a positive number"
      }
    ],
    "timestamp": "2026-04-22T10:30:00Z",
    "path": "/api/v1/reports"
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `AUTH_REQUIRED` | 401 | Authentication required |
| `INVALID_TOKEN` | 401 | Token expired or invalid |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `LOCATION_OUT_OF_BOUNDS` | 400 | Location outside Gondar |
| `DUPLICATE_REPORT` | 409 | Recent report already submitted |
| `INTERNAL_ERROR` | 500 | Server error |

---

## Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| POST /auth/login | 5 | 15 minutes |
| POST /reports | 5 | 1 hour |
| GET /stations | 100 | 1 minute |
| GET /analytics/* | 30 | 1 minute |
| WebSocket connections | 3 | per user |

Rate limit headers included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1682164800
```
