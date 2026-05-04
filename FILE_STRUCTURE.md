# Project File Structure

## Overview

The Gondar Fuel Management System is organized as a monorepo with separate frontend and backend applications.

```
gondar-fuel-system/
├── README.md
├── LICENSE
├── .gitignore
├── .env.example
├── docker-compose.yml
├── docker-compose.dev.yml
├── Makefile
├── docs/
│   ├── ARCHITECTURE.md
│   ├── DATABASE_SCHEMA.md
│   ├── API_SPECIFICATION.md
│   ├── SECURITY.md
│   └── IMPLEMENTATION_ROADMAP.md
│
├── backend/                      # Node.js + Express API Server
│   ├── package.json
│   ├── tsconfig.json
│   ├── Dockerfile
│   ├── .env.example
│   ├── jest.config.js
│   ├── nest-cli.json
│   ├── src/
│   │   ├── main.ts              # Application entry point
│   │   ├── app.module.ts        # Root module
│   │   ├── app.filter.ts        # Global exception filter
│   │   ├── app.guard.ts         # Global auth guard
│   │   │
│   │   ├── common/              # Shared utilities
│   │   │   ├── decorators/
│   │   │   │   ├── auth.decorator.ts
│   │   │   │   ├── roles.decorator.ts
│   │   │   │   └── validate-location.decorator.ts
│   │   │   ├── filters/
│   │   │   │   ├── http-exception.filter.ts
│   │   │   │   └── validation-exception.filter.ts
│   │   │   ├── guards/
│   │   │   │   ├── jwt-auth.guard.ts
│   │   │   │   ├── roles.guard.ts
│   │   │   │   └── throttler.guard.ts
│   │   │   ├── interceptors/
│   │   │   │   ├── response.interceptor.ts
│   │   │   │   └── logging.interceptor.ts
│   │   │   ├── pipes/
│   │   │   │   ├── validation.pipe.ts
│   │   │   │   └── parse-location.pipe.ts
│   │   │   └── utils/
│   │   │       ├── location.validator.ts
│   │   │       ├── password.util.ts
│   │   │       ├── token.util.ts
│   │   │       └── gondar-bounds.ts
│   │   │
│   │   ├── config/              # Configuration
│   │   │   ├── config.module.ts
│   │   │   ├── config.service.ts
│   │   │   ├── database.config.ts
│   │   │   ├── jwt.config.ts
│   │   │   ├── redis.config.ts
│   │   │   └── twilio.config.ts
│   │   │
│   │   ├── database/            # Database layer
│   │   │   ├── database.module.ts
│   │   │   ├── database.service.ts
│   │   │   ├── migrations/
│   │   │   │   ├── 001_create_users.ts
│   │   │   │   ├── 002_create_fuel_stations.ts
│   │   │   │   ├── 003_create_fuel_reports.ts
│   │   │   │   ├── 004_create_station_stats.ts
│   │   │   │   ├── 005_create_notifications.ts
│   │   │   │   └── 006_seed_initial_data.ts
│   │   │   └── seeds/
│   │   │       └── gondar-stations.seed.ts
│   │   │
│   │   ├── modules/             # Feature modules
│   │   │   ├── auth/
│   │   │   │   ├── auth.module.ts
│   │   │   │   ├── auth.controller.ts
│   │   │   │   ├── auth.service.ts
│   │   │   │   ├── auth.strategy.ts
│   │   │   │   ├── dto/
│   │   │   │   │   ├── register.dto.ts
│   │   │   │   │   ├── login.dto.ts
│   │   │   │   │   ├── refresh.dto.ts
│   │   │   │   │   └── password-reset.dto.ts
│   │   │   │   └── entities/
│   │   │   │       └── token.entity.ts
│   │   │   │
│   │   │   ├── users/
│   │   │   │   ├── users.module.ts
│   │   │   │   ├── users.controller.ts
│   │   │   │   ├── users.service.ts
│   │   │   │   ├── dto/
│   │   │   │   │   ├── update-user.dto.ts
│   │   │   │   │   └── user-response.dto.ts
│   │   │   │   └── entities/
│   │   │   │       └── user.entity.ts
│   │   │   │
│   │   │   ├── stations/
│   │   │   │   ├── stations.module.ts
│   │   │   │   ├── stations.controller.ts
│   │   │   │   ├── stations.service.ts
│   │   │   │   ├── dto/
│   │   │   │   │   ├── create-station.dto.ts
│   │   │   │   │   ├── update-station.dto.ts
│   │   │   │   │   └── station-query.dto.ts
│   │   │   │   └── entities/
│   │   │   │       └── station.entity.ts
│   │   │   │
│   │   │   ├── reports/
│   │   │   │   ├── reports.module.ts
│   │   │   │   ├── reports.controller.ts
│   │   │   │   ├── reports.service.ts
│   │   │   │   ├── dto/
│   │   │   │   │   ├── create-report.dto.ts
│   │   │   │   │   ├── verify-report.dto.ts
│   │   │   │   │   └── report-query.dto.ts
│   │   │   │   └── entities/
│   │   │   │       └── report.entity.ts
│   │   │   │
│   │   │   ├── analytics/
│   │   │   │   ├── analytics.module.ts
│   │   │   │   ├── analytics.controller.ts
│   │   │   │   ├── analytics.service.ts
│   │   │   │   └── dto/
│   │   │   │       ├── price-trends.dto.ts
│   │   │   │       └── predictions.dto.ts
│   │   │   │
│   │   │   ├── notifications/
│   │   │   │   ├── notifications.module.ts
│   │   │   │   ├── notifications.controller.ts
│   │   │   │   ├── notifications.service.ts
│   │   │   │   ├── dto/
│   │   │   │   │   └── create-notification.dto.ts
│   │   │   │   └── entities/
│   │   │   │       └── notification.entity.ts
│   │   │   │
│   │   │   ├── subscriptions/
│   │   │   │   ├── subscriptions.module.ts
│   │   │   │   ├── subscriptions.controller.ts
│   │   │   │   └── subscriptions.service.ts
│   │   │   │
│   │   │   └── predictions/
│   │   │       ├── predictions.module.ts
│   │   │       ├── predictions.service.ts
│   │   │       └── ml/
│   │   │           ├── demand-forecaster.ts
│   │   │           └── price-predictor.ts
│   │   │
│   │   ├── websocket/           # WebSocket gateway
│   │   │   ├── websocket.module.ts
│   │   │   ├── websocket.gateway.ts
│   │   │   └── websocket.adapter.ts
│   │   │
│   │   ├── cache/               # Redis caching
│   │   │   ├── cache.module.ts
│   │   │   ├── cache.service.ts
│   │   │   └── cache.keys.ts
│   │   │
│   │   ├── queue/               # Message queue
│   │   │   ├── queue.module.ts
│   │   │   ├── queue.service.ts
│   │   │   └── processors/
│   │   │       ├── notification.processor.ts
│   │   │       ├── analytics.processor.ts
│   │   │       └── ml.processor.ts
│   │   │
│   │   └── storage/             # File storage (S3)
│   │       ├── storage.module.ts
│   │       ├── storage.service.ts
│   │       └── storage.config.ts
│   │
│   ├── test/
│   │   ├── jest-e2e.json
│   │   ├── auth/
│   │   │   └── auth.e2e-spec.ts
│   │   ├── stations/
│   │   │   └── stations.e2e-spec.ts
│   │   └── reports/
│   │       └── reports.e2e-spec.ts
│   └── scripts/
│       ├── seed-db.ts
│       └── generate-docs.ts
│
├── frontend/                    # React + TypeScript Frontend
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── index.html
│   ├── Dockerfile
│   ├── .env.example
│   ├── public/
│   │   ├── favicon.ico
│   │   ├── manifest.json
│   │   ├── locales/
│   │   │   ├── en/
│   │   │   │   └── translation.json
│   │   │   └── am/
│   │   │       └── translation.json
│   │   └── icons/
│   │       └── fuel-station.svg
│   │
│   ├── src/
│   │   ├── main.tsx            # Application entry
│   │   ├── App.tsx             # Root component
│   │   ├── vite-env.d.ts
│   │   │
│   │   ├── assets/             # Static assets
│   │   │   ├── images/
│   │   │   ├── fonts/
│   │   │   └── styles/
│   │   │       └── global.css
│   │   │
│   │   ├── components/         # Reusable components
│   │   │   ├── ui/             # Base UI components
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Input.tsx
│   │   │   │   ├── Select.tsx
│   │   │   │   ├── Modal.tsx
│   │   │   │   ├── Toast.tsx
│   │   │   │   ├── Skeleton.tsx
│   │   │   │   ├── Avatar.tsx
│   │   │   │   └── Badge.tsx
│   │   │   │
│   │   │   ├── layout/         # Layout components
│   │   │   │   ├── Header.tsx
│   │   │   │   ├── Footer.tsx
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   ├── MobileNav.tsx
│   │   │   │   └── ProtectedRoute.tsx
│   │   │   │
│   │   │   ├── map/            # Map components
│   │   │   │   ├── FuelMap.tsx
│   │   │   │   ├── StationMarker.tsx
│   │   │   │   ├── MapControls.tsx
│   │   │   │   ├── StationPopup.tsx
│   │   │   │   └── HeatmapLayer.tsx
│   │   │   │
│   │   │   ├── stations/       # Station components
│   │   │   │   ├── StationCard.tsx
│   │   │   │   ├── StationList.tsx
│   │   │   │   ├── StationFilters.tsx
│   │   │   │   ├── StationDetails.tsx
│   │   │   │   └── StationHours.tsx
│   │   │   │
│   │   │   ├── reports/        # Report components
│   │   │   │   ├── ReportForm.tsx
│   │   │   │   ├── ReportCard.tsx
│   │   │   │   ├── ReportList.tsx
│   │   │   │   ├── AvailabilitySelector.tsx
│   │   │   │   └── PhotoUpload.tsx
│   │   │   │
│   │   │   ├── analytics/      # Analytics components
│   │   │   │   ├── PriceChart.tsx
│   │   │   │   ├── AvailabilityChart.tsx
│   │   │   │   ├── TrendGraph.tsx
│   │   │   │   └── StatsCard.tsx
│   │   │   │
│   │   │   ├── notifications/  # Notification components
│   │   │   │   ├── NotificationBell.tsx
│   │   │   │   ├── NotificationList.tsx
│   │   │   │   └── NotificationItem.tsx
│   │   │   │
│   │   │   └── auth/           # Auth components
│   │   │       ├── LoginForm.tsx
│   │   │       ├── RegisterForm.tsx
│   │   │       ├── PasswordReset.tsx
│   │   │       └── OAuthButton.tsx
│   │   │
│   │   ├── hooks/              # Custom React hooks
│   │   │   ├── useAuth.ts
│   │   │   ├── useStations.ts
│   │   │   ├── useReports.ts
│   │   │   ├── useNotifications.ts
│   │   │   ├── useWebSocket.ts
│   │   │   ├── useGeolocation.ts
│   │   │   ├── useDebounce.ts
│   │   │   └── useLocalStorage.ts
│   │   │
│   │   ├── pages/              # Page components
│   │   │   ├── HomePage.tsx
│   │   │   ├── LoginPage.tsx
│   │   │   ├── RegisterPage.tsx
│   │   │   ├── MapPage.tsx
│   │   │   ├── StationsPage.tsx
│   │   │   ├── ReportPage.tsx
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── AnalyticsPage.tsx
│   │   │   ├── ProfilePage.tsx
│   │   │   ├── SettingsPage.tsx
│   │   │   └── NotFoundPage.tsx
│   │   │
│   │   ├── services/           # API services
│   │   │   ├── api.ts          # Axios instance
│   │   │   ├── auth.service.ts
│   │   │   ├── stations.service.ts
│   │   │   ├── reports.service.ts
│   │   │   ├── analytics.service.ts
│   │   │   ├── notifications.service.ts
│   │   │   └── websocket.service.ts
│   │   │
│   │   ├── store/              # State management
│   │   │   ├── index.ts
│   │   │   ├── slices/
│   │   │   │   ├── auth.slice.ts
│   │   │   │   ├── stations.slice.ts
│   │   │   │   ├── reports.slice.ts
│   │   │   │   ├── notifications.slice.ts
│   │   │   │   └── ui.slice.ts
│   │   │   └── middleware/
│   │   │       └── auth.middleware.ts
│   │   │
│   │   ├── utils/              # Utility functions
│   │   │   ├── formatters.ts
│   │   │   ├── validators.ts
│   │   │   ├── constants.ts
│   │   │   ├── gondar-bounds.ts
│   │   │   └── helpers.ts
│   │   │
│   │   ├── types/              # TypeScript types
│   │   │   ├── user.types.ts
│   │   │   ├── station.types.ts
│   │   │   ├── report.types.ts
│   │   │   ├── api.types.ts
│   │   │   └── map.types.ts
│   │   │
│   │   └── config/             # App configuration
│   │       ├── index.ts
│   │       ├── routes.tsx
│   │       └── i18n.ts
│   │
│   ├── tests/
│   │   ├── setup.ts
│   │   ├── components/
│   │   ├── pages/
│   │   └── services/
│   │
│   └── scripts/
│       └── generate-pwa-icons.ts
│
├── analytics-service/          # Python ML Service
│   ├── pyproject.toml
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── main.py
│   ├── config.py
│   ├── app/
│   │   ├── __init__.py
│   │   ├── api/
│   │   │   ├── routes.py
│   │   │   └── endpoints/
│   │   │       ├── predictions.py
│   │   │       └── analytics.py
│   │   ├── models/
│   │   │   ├── demand_forecast.py
│   │   │   ├── price_prediction.py
│   │   │   └── shortage_detection.py
│   │   ├── services/
│   │   │   ├── data_loader.py
│   │   │   ├── feature_engineering.py
│   │   │   └── model_trainer.py
│   │   └── utils/
│   │       ├── database.py
│   │       └── preprocessing.py
│   └── notebooks/
│       ├── data_exploration.ipynb
│       └── model_training.ipynb
│
├── notification-service/       # Go Notification Service (optional)
│   ├── main.go
│   ├── go.mod
│   ├── internal/
│   │   ├── handlers/
│   │   ├── services/
│   │   └── models/
│   └── Dockerfile
│
├── infrastructure/             # Infrastructure as Code
│   ├── terraform/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   ├── outputs.tf
│   │   ├── modules/
│   │   │   ├── database/
│   │   │   ├── compute/
│   │   │   ├── networking/
│   │   │   └── storage/
│   │   └── environments/
│   │       ├── dev.tfvars
│   │       ├── staging.tfvars
│   │       └── prod.tfvars
│   │
│   ├── kubernetes/
│   │   ├── base/
│   │   │   ├── namespace.yaml
│   │   │   ├── configmap.yaml
│   │   │   ├── secrets.yaml
│   │   │   ├── backend-deployment.yaml
│   │   │   ├── backend-service.yaml
│   │   │   ├── frontend-deployment.yaml
│   │   │   └── frontend-service.yaml
│   │   └── overlays/
│   │       ├── dev/
│   │       ├── staging/
│   │       └── prod/
│   │
│   └── docker/
│       ├── backend.Dockerfile
│       ├── frontend.Dockerfile
│       └── analytics.Dockerfile
│
└── scripts/                    # Utility scripts
    ├── setup.sh
    ├── dev-start.sh
    ├── prod-deploy.sh
    ├── backup-db.sh
    └── run-tests.sh
```

---

## Key Files Explained

### Root Level

| File | Purpose |
|------|---------|
| `docker-compose.yml` | Local development environment |
| `docker-compose.dev.yml` | Development overrides |
| `.env.example` | Environment variable template |
| `Makefile` | Common development commands |

### Backend (`/backend`)

| Directory | Purpose |
|-----------|---------|
| `src/modules/` | Feature modules (auth, stations, reports) |
| `src/common/` | Shared utilities, guards, filters |
| `src/database/` | Migrations and seeds |
| `src/websocket/` | Real-time communication |
| `src/queue/` | Background job processing |

### Frontend (`/frontend`)

| Directory | Purpose |
|-----------|---------|
| `src/components/` | Reusable UI components |
| `src/pages/` | Route-level components |
| `src/hooks/` | Custom React hooks |
| `src/services/` | API client services |
| `src/store/` | State management |
| `src/utils/` | Helper functions |

### Analytics Service (`/analytics-service`)

| File | Purpose |
|------|---------|
| `models/` | ML models (Prophet, scikit-learn) |
| `services/` | Data processing pipelines |
| `notebooks/` | Jupyter notebooks for experimentation |

---

## Module Dependencies

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (React)                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP/WebSocket
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   API Gateway / Backend                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │   Auth   │  │ Stations │  │ Reports  │  │Analytics │    │
│  │  Module  │  │  Module  │  │  Module  │  │  Module  │    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │   User   │  │   Notif  │  │   Sub    │  │   Pred   │    │
│  │  Module  │  │  Module  │  │  Module  │  │  Module  │    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │
└─────────────────────────────────────────────────────────────┘
         │                   │                    │
         │                   │                    │
         ▼                   ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   PostgreSQL    │  │     Redis       │  │   Analytics     │
│   (Primary DB)  │  │    (Cache)      │  │   Service       │
└─────────────────┘  └─────────────────┘  └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  ML Processor   │
                    │  (Predictions)  │
                    └─────────────────┘
```

---

## Environment Variables

### Backend (`.env`)

```bash
# Server
NODE_ENV=development
PORT=3000
API_VERSION=v1

# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=gondar_fuel
DATABASE_USER=postgres
DATABASE_PASSWORD=secret

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT
JWT_SECRET=your-super-secret-key
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=

# SMS (Twilio)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# Storage (S3)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=us-east-1
AWS_BUCKET=gondar-fuel-uploads

# Frontend URL (CORS)
FRONTEND_URL=http://localhost:5173

# Analytics Service
ANALYTICS_SERVICE_URL=http://localhost:8000
```

### Frontend (`.env`)

```bash
# API
VITE_API_URL=http://localhost:3000/api/v1
VITE_WS_URL=ws://localhost:3000

# Maps
VITE_MAPBOX_TOKEN=pk.eyJ1...

# Auth
VITE_OAUTH_GOOGLE_CLIENT_ID=

# Features
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_NOTIFICATIONS=true
```

---

## Development Workflow

```bash
# Start all services (dev)
make dev

# Start backend only
make backend

# Start frontend only
make frontend

# Run tests
make test

# Run linting
make lint

# Database migrations
make migrate

# Seed database
make seed

# Build for production
make build

# Deploy to staging
make deploy-staging
```
