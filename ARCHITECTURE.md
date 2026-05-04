# Gondar Fuel Management System - Architecture Documentation

## Executive Summary

A real-time fuel management system for vehicle drivers in Gondar, Ethiopia, addressing the global fuel crisis by providing:
- Real-time fuel station status and pricing
- Community-driven fuel availability reports
- Predictive analytics for fuel demand
- Route optimization suggestions

---

## 1. System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                        │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                       │
│  │   Web App    │    │  Mobile Web  │    │  PWA (Offline)│                      │
│  │   (React)    │    │   (Responsive)│   │               │                       │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘                       │
│         │                   │                   │                                │
│         └───────────────────┼───────────────────┘                                │
│                             │                                                    │
└─────────────────────────────┼────────────────────────────────────────────────────┘
                              │ HTTPS/WSS
                              ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              API GATEWAY LAYER                                   │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                    AWS API Gateway / Azure API Management                │    │
│  │  - Rate Limiting     - Request Validation     - SSL Termination          │    │
│  │  - CORS              - Authentication         - Logging/Monitoring       │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                                                                  │
└─────────────────────────────────┬───────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           APPLICATION LAYER                                      │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐          │
│  │   Node.js        │    │   Python         │    │   WebSocket      │          │
│  │   REST API       │    │   Analytics      │    │   Server         │          │
│  │   (Express)      │    │   (FastAPI)      │    │   (Socket.io)    │          │
│  └────────┬─────────┘    └────────┬─────────┘    └────────┬─────────┘          │
│           │                      │                       │                      │
│           └──────────────────────┼───────────────────────┘                      │
│                                  │                                              │
└──────────────────────────────────┼──────────────────────────────────────────────┘
                                   │
         ┌─────────────────────────┼─────────────────────────┐
         │                         │                         │
         ▼                         ▼                         ▼
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│   PostgreSQL     │    │   Redis          │    │   Firebase       │
│   (Primary DB)   │    │   (Cache)        │    │   (Push Notif.)  │
│                  │    │                  │    │                  │
│ - Users          │    │ - Sessions       │    │ - FCM Tokens     │
│ - Fuel Stations  │    │ - Rate Limits    │    │ - Subscriptions  │
│ - Reports        │    │ - Hot Data       │    │                  │
│ - Analytics      │    │ - Geo Data       │    │                  │
└──────────────────┘    └──────────────────┘    └──────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         EXTERNAL SERVICES                                        │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │  Google      │    │  Twilio      │    │  Auth0       │    │  Mapbox      │  │
│  │  Maps API    │    │  (SMS)       │    │  (OAuth)     │    │  (Maps)      │  │
│  └──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘  │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Technology Stack Recommendations

### Backend Stack

| Component | Technology | Justification |
|-----------|------------|---------------|
| **Runtime** | Node.js 20 LTS | High performance, large ecosystem, real-time capabilities |
| **Framework** | Express.js + FastAPI | Express for REST, FastAPI for ML/analytics |
| **Database** | PostgreSQL 15 + PostGIS | Relational data + geospatial queries |
| **Cache** | Redis 7 | Session management, rate limiting, real-time data |
| **Message Queue** | RabbitMQ | Async processing for analytics and notifications |
| **Auth** | Auth0 / JWT | Enterprise-grade authentication |
| **File Storage** | AWS S3 / Azure Blob | Report attachments, profile images |

### Frontend Stack

| Component | Technology | Justification |
|-----------|------------|---------------|
| **Framework** | React 18 + TypeScript | Component-based, type safety, large ecosystem |
| **State Management** | Zustand + TanStack Query | Lightweight, excellent server state management |
| **UI Library** | Tailwind CSS + Headless UI | Utility-first, mobile-responsive |
| **Maps** | Mapbox GL JS | Better performance, custom styling, cost-effective |
| **Charts** | Chart.js + react-chartjs-2 | Easy integration, good mobile support |
| **Forms** | React Hook Form + Zod | Performance, validation |
| **PWA** | Workbox | Offline support, push notifications |

### DevOps & Infrastructure

| Component | Technology | Justification |
|-----------|------------|---------------|
| **Cloud Provider** | AWS / Azure | Scalability, Ethiopian data center proximity |
| **Container** | Docker + Kubernetes | Portability, scaling |
| **CI/CD** | GitHub Actions | Integrated with code repository |
| **Monitoring** | Prometheus + Grafana | Real-time metrics, alerting |
| **Logging** | ELK Stack | Centralized logging |
| **CDN** | CloudFront / Azure CDN | Fast asset delivery |

### ML/Analytics Stack

| Component | Technology | Justification |
|-----------|------------|---------------|
| **ML Framework** | scikit-learn + Prophet | Time-series forecasting for fuel demand |
| **Data Processing** | Pandas + NumPy | Data manipulation |
| **Visualization** | Plotly + Dash | Interactive analytics dashboards |

---

## 3. High-Level Component Interaction

### Data Flow: Driver Reports Fuel Status

```
1. Driver opens mobile app
2. App fetches current location (GPS)
3. Driver enters fuel status (station, price, availability)
4. App validates data locally (Zod schema)
5. POST /api/reports with JWT token
6. API Gateway validates rate limits
7. Express validates JWT, sanitizes input
8. PostgreSQL stores report with PostGIS coordinates
9. Redis cache invalidated for station data
10. WebSocket broadcasts update to nearby users
11. Analytics queue triggered for trend updates
12. Push notification sent if price drop threshold met
```

### Data Flow: Driver Views Fuel Stations

```
1. Driver opens map view
2. App requests stations within Gondar bounds
3. GET /api/stations?bounds=... with JWT
4. Redis cache checked first (5-min TTL)
5. PostgreSQL queries with PostGIS spatial filter
6. Response includes color-coded availability
7. Mapbox renders markers with popup info
8. Driver clicks station for details
9. Real-time status shown via WebSocket
```

---

## 4. System Boundaries (Gondar Restriction)

The system restricts operations to Gondar city boundaries:

```javascript
// Gondar City Boundaries (approximate)
const GONDAR_BOUNDS = {
  north: 12.6500,
  south: 12.5500,
  east: 37.5000,
  west: 37.4200
};

// All location data validated against these bounds
// Reports outside bounds are rejected
```

---

## 5. Scalability Considerations

### Horizontal Scaling
- Stateless API servers behind load balancer
- Database read replicas for analytics queries
- Redis cluster for distributed caching
- Kubernetes HPA based on CPU/memory metrics

### Data Partitioning
- Reports partitioned by date (monthly)
- Geographic sharding for location queries
- User data isolated by region

### Performance Targets
- API response time: < 200ms (p95)
- Map load time: < 2 seconds
- WebSocket latency: < 100ms
- 99.9% uptime SLA

---

## 6. Offline-First Design (PWA)

```
┌─────────────────────────────────────────────────────────────┐
│                    Progressive Web App                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐      │
│  │  Service    │    │   Indexed   │    │   Local     │      │
│  │  Worker     │    │   DB        │    │   Storage   │      │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘      │
│         │                  │                  │              │
│         └──────────────────┼──────────────────┘              │
│                            │                                 │
│         ┌──────────────────┴──────────────────┐              │
│         │         Offline Queue               │              │
│         │  - Report submissions               │              │
│         │  - Favorite stations                │              │
│         │  - Route history                    │              │
│         └─────────────────────────────────────┘              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. Notification System Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    Notification Service                       │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  Event Triggers:                                              │
│  ├── Price drop > 10% at favorite station                    │
│  ├── Station restocked after being empty                     │
│  ├── Fuel shortage alert in area                             │
│  ├── Predictive: "High demand expected tomorrow"             │
│                                                               │
│  Delivery Channels:                                           │
│  ├── Push Notifications (Firebase Cloud Messaging)           │
│  ├── SMS (Twilio) - for critical alerts                      │
│  ├── In-app notifications (WebSocket)                        │
│  └── Email (SendGrid) - for weekly digests                   │
│                                                               │
│  User Preferences:                                            │
│  ├── Notification types (opt-in/out)                         │
│  ├── Quiet hours configuration                               │
│  └── Language preference (Amharic/English)                   │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

---

## 8. Predictive Analytics Pipeline

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  Historical  │    │   Feature    │    │   ML Model   │
│  Data        │───▶│  Engineering │───▶│  (Prophet)   │
│  (PostgreSQL)│    │  (Pandas)    │    │              │
└──────────────┘    └──────────────┘    └──────┬───────┘
                                               │
                                               ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Trend      │    │   Demand     │    │   Price      │
│   Visual-    │    │   Forecast   │    │   Prediction │
│   ization    │    │   (7-day)    │    │   (3-day)    │
└──────────────┘    └──────────────┘    └──────────────┘
```

### Prediction Features
- Day of week (weekday/weekend patterns)
- Time of month (salary cycle effects)
- Seasonal trends (holiday, harvest seasons)
- Local events (market days, festivals)
- Regional fuel supply announcements

---

## 9. Monitoring & Observability

### Metrics Collected
- API latency (p50, p95, p99)
- Error rates by endpoint
- Database query performance
- Cache hit/miss ratios
- WebSocket connection counts
- User activity metrics

### Alerting Rules
- API error rate > 1% (5-min window)
- Response time p95 > 500ms
- Database connection pool > 80%
- Cache miss rate > 30%
- WebSocket disconnect spike

### Dashboards
- System health overview
- User activity & engagement
- Fuel reporting trends
- Geographic heat maps
- Alert history

---

## 10. Disaster Recovery

### Backup Strategy
- PostgreSQL: Continuous WAL archiving + daily snapshots
- Redis: RDB snapshots every 5 minutes
- S3: Versioning enabled, cross-region replication

### Recovery Time Objective (RTO): 4 hours
### Recovery Point Objective (RPO): 15 minutes

### Failover Plan
1. Database failover to read replica
2. API servers redeployed to alternate region
3. DNS failover via Route53 health checks
4. Manual notification to users via SMS
