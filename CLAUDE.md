# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Gondar Fuel Management System - a community-driven fuel availability tracking platform for Gondar, Ethiopia. The system allows drivers to report and view real-time fuel station status, pricing, and find related auto services (mechanics, tire shops, car washes).

## Quick Start

```bash
# Start the demo server (Node.js required)
node server.js

# Then open in browser
http://localhost:3000
```

## Architecture

The project exists in two states:

### 1. Demo Mode (Current - Production)
Single-file Node.js server (`server.js`) serving a static HTML/JS frontend (`index.html`):
- **server.js**: In-memory data store with 28 service locations, REST API endpoints
- **index.html**: Vanilla JS frontend with Leaflet.js map, modern dark theme UI

### 2. Full System (Planned - See ARCHITECTURE.md)
Multi-service architecture documented in separate files:
- **Backend**: NestJS/Node.js with PostgreSQL + PostGIS
- **Frontend**: React 18 + TypeScript + Mapbox GL
- **Analytics**: Python/FastAPI with Prophet for demand forecasting
- **Cache**: Redis for sessions and hot data

## Key Files

| File | Purpose |
|------|---------|
| `server.js` | Demo backend with 28 locations (12 fuel, 7 mechanic, 6 tire, 3 car wash) |
| `index.html` | Demo frontend - Leaflet map, filter buttons, report form, dark theme dashboard |
| `START-DEMO.command` | Mac launcher script |
| `LOCATIONS.md` | All 28 service locations with coordinates and details |

## API Endpoints (Demo)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/services` | GET | Get all services (optionally filter by `?type=`) |
| `/api/services/:id` | GET | Get single service by ID |
| `/api/report` | POST | Submit status update `{serviceId, status, price?}` |
| `/api/stats` | GET | Get aggregated statistics |

Service types: `fuel_station`, `mechanic`, `tire_shop`, `car_wash`

Status values:
- Fuel stations: `available`, `low`, `empty`
- Other services: `open`, `busy`, `closed`

## Geographic Constraints

All locations are validated against Gondar city bounds:
- Latitude: 12.50 to 12.70 (extended to include Azezo corridor)
- Longitude: 37.38 to 37.54

The Azezo area (south of Gondar on the Bahir Dar highway) is a key fuel corridor with 5 fuel stations plus associated mechanics and tire shops.

## Documentation Reference

| Document | Description |
|----------|-------------|
| `README.md` | System overview, features, technology stack |
| `ARCHITECTURE.md` | Full system architecture, component diagrams, scalability |
| `DATABASE_SCHEMA.md` | PostgreSQL schema (10 tables, views, triggers) |
| `API_SPECIFICATION.md` | Complete REST API docs (40+ endpoints) |
| `SECURITY.md` | Authentication, fraud prevention, rate limiting |
| `IMPLEMENTATION_ROADMAP.md` | 16-20 week phased development plan |
| `LOCATIONS.md` | All 28 service locations with coordinates |

## Common Operations

```bash
# Test API is running
curl http://localhost:3000/api/services

# Get only fuel stations
curl http://localhost:3000/api/services?type=fuel_station

# Submit a report
curl -X POST http://localhost:3000/api/report \
  -H "Content-Type: application/json" \
  -d '{"serviceId": 1, "status": "available", "price": 54.50}'
```

## Code Style

- **server.js**: Plain Node.js, no external dependencies, callback-style HTTP handling
- **index.html**: Vanilla JS, no frameworks, Leaflet.js via CDN, Inter font, dark theme
- **Planned full system**: TypeScript throughout, ESLint + Prettier

## Important Notes

- The demo uses in-memory storage; data resets on server restart
- Demo data includes realistic Ethiopian phone formats (+251 58 for landlines, +251 91 for mobiles)
- The frontend has embedded fallback data if the server API is unavailable
- Map is restricted to pan within Gondar bounds using Leaflet's `setMaxBounds`
- Frontend uses modern dark theme with gradient header, colored stat cards, and pill-shaped filter buttons
