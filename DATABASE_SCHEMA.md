# Database Schema Design

## PostgreSQL Database Schema

### Entity Relationship Diagram

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│     users       │       │  fuel_stations  │       │    reports      │
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ id (PK)         │       │ id (PK)         │       │ id (PK)         │
│ email           │◄──────│ owner_user_id   │       │ user_id (FK)    │───┐
│ phone           │       │ name            │       │ station_id (FK) │───┤
│ password_hash   │       │ latitude        │       │ price           │   │
│ oauth_provider  │       │ longitude       │       │ availability    │   │
│ oauth_id        │       │ address         │       │ latitude        │   │
│ role            │       │ phone           │       │ longitude       │   │
│ created_at      │       │ operating_hours │       │ reported_at     │   │
│ updated_at      │       │ fuel_types      │       │ created_at      │   │
│ last_login      │       │ created_at      │       │ updated_at      │   │
│ preferences     │       │ updated_at      │       │ verified        │   │
│ fcm_token       │       │ status          │       │ notes           │   │
└─────────────────┘       └─────────────────┘       └─────────────────┘
         │                         │                         │
         │                         │                         │
         ▼                         ▼                         ▼
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│   sessions      │       │  station_stats  │       │  notifications  │
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ id (PK)         │       │ station_id (FK) │       │ id (PK)         │
│ user_id (FK)    │       │ date            │       │ user_id (FK)    │
│ token_hash      │       │ avg_price       │       │ type            │
│ expires_at      │       │ min_price       │       │ title           │
│ created_at      │       │ max_price       │       │ message         │
│ ip_address      │       │ avg_availability│       │ data            │
│ user_agent      │       │ report_count    │       │ read            │
└─────────────────┘       │ created_at      │       │ created_at      │
                          └─────────────────┘       │ sent_at         │
                                                    └─────────────────┘
```

---

## Table Definitions

### 1. Users Table

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(20) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    
    -- OAuth fields (nullable for email/password auth)
    oauth_provider VARCHAR(50),
    oauth_id VARCHAR(255),
    
    -- User profile
    full_name VARCHAR(100) NOT NULL,
    vehicle_type VARCHAR(50), -- 'car', 'truck', 'motorcycle', 'bus'
    vehicle_plate VARCHAR(20),
    
    -- Role-based access
    role VARCHAR(20) NOT NULL DEFAULT 'driver' 
        CHECK (role IN ('driver', 'station_owner', 'admin', 'moderator')),
    
    -- Preferences stored as JSONB
    preferences JSONB DEFAULT '{
        "language": "am",
        "notifications": {
            "price_drop": true,
            "restock": true,
            "shortage_alert": true,
            "predictive": true
        },
        "quiet_hours": {
            "enabled": false,
            "start": "22:00",
            "end": "07:00"
        },
        "favorite_stations": [],
        "fuel_type_preference": "diesel"
    }',
    
    -- Firebase Cloud Messaging token for push notifications
    fcm_token TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login TIMESTAMPTZ,
    email_verified_at TIMESTAMPTZ,
    phone_verified_at TIMESTAMPTZ,
    
    -- Soft delete support
    deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_oauth ON users(oauth_provider, oauth_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_fcm ON users(fcm_token) WHERE fcm_token IS NOT NULL;
```

### 2. Fuel Stations Table

```sql
CREATE TABLE fuel_stations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_user_id UUID REFERENCES users(id),
    
    -- Basic info
    name VARCHAR(255) NOT NULL,
    brand VARCHAR(100), -- 'Total', 'Oilibya', 'National', etc.
    
    -- Location with PostGIS
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    address TEXT,
    city VARCHAR(100) NOT NULL DEFAULT 'Gondar',
    region VARCHAR(100) NOT NULL DEFAULT 'Amhara',
    
    -- Contact
    phone VARCHAR(20),
    email VARCHAR(255),
    website VARCHAR(255),
    
    -- Operating hours (JSONB for flexible scheduling)
    operating_hours JSONB DEFAULT '{
        "monday": {"open": "06:00", "close": "22:00", "open_all_day": false},
        "tuesday": {"open": "06:00", "close": "22:00", "open_all_day": false},
        "wednesday": {"open": "06:00", "close": "22:00", "open_all_day": false},
        "thursday": {"open": "06:00", "close": "22:00", "open_all_day": false},
        "friday": {"open": "06:00", "close": "22:00", "open_all_day": false},
        "saturday": {"open": "06:00", "close": "22:00", "open_all_day": false},
        "sunday": {"open": "08:00", "close": "20:00", "open_all_day": false}
    }',
    
    -- Fuel types available
    fuel_types JSONB NOT NULL DEFAULT '[
        {"type": "diesel", "available": true},
        {"type": "gasoline_95", "available": true},
        {"type": "gasoline_92", "available": false}
    ]',
    
    -- Current status
    status VARCHAR(20) NOT NULL DEFAULT 'operational'
        CHECK (status IN ('operational', 'limited', 'out_of_stock', 'closed', 'temporarily_closed')),
    
    -- Amenities
    amenities JSONB DEFAULT '[]', -- 'parking', 'restroom', 'shop', 'atm', 'air_pump'
    
    -- Verification
    is_verified BOOLEAN DEFAULT FALSE,
    verified_by UUID REFERENCES users(id),
    verified_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Soft delete
    deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_stations_location ON fuel_stations USING GIST(location);
CREATE INDEX idx_stations_lat_lng ON fuel_stations(latitude, longitude);
CREATE INDEX idx_stations_status ON fuel_stations(status);
CREATE INDEX idx_stations_brand ON fuel_stations(brand);
CREATE INDEX idx_stations_owner ON fuel_stations(owner_user_id);
CREATE INDEX idx_stations_city ON fuel_stations(city);

-- GIN index for JSONB queries
CREATE INDEX idx_stations_fuel_types ON fuel_stations USING GIN(fuel_types);
```

### 3. Fuel Reports Table (Core Data)

```sql
CREATE TABLE fuel_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    station_id UUID NOT NULL REFERENCES fuel_stations(id) ON DELETE CASCADE,
    
    -- Fuel pricing (in Ethiopian Birr per liter)
    price DECIMAL(10, 2) NOT NULL CHECK (price > 0),
    fuel_type VARCHAR(20) NOT NULL 
        CHECK (fuel_type IN ('diesel', 'gasoline_95', 'gasoline_92', 'kerosene')),
    
    -- Availability status
    availability VARCHAR(20) NOT NULL 
        CHECK (availability IN ('full', 'limited', 'very_limited', 'out_of_stock')),
    quantity_available_liters INTEGER, -- Optional estimate
    
    -- Location at time of report (for verification)
    reported_location GEOGRAPHY(POINT, 4326),
    reported_latitude DOUBLE PRECISION NOT NULL,
    reported_longitude DOUBLE PRECISION NOT NULL,
    
    -- Report metadata
    notes TEXT,
    photos JSONB DEFAULT '[]', -- Array of S3 URLs
    
    -- Verification by other users
    verified BOOLEAN DEFAULT FALSE,
    verification_count INTEGER DEFAULT 0,
    verified_by JSONB DEFAULT '[]', -- Array of user IDs who verified
    
    -- Quality flags
    is_accurate BOOLEAN,
    flags JSONB DEFAULT '[]', -- User-reported issues
    
    -- Timestamps
    reported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_reports_user ON fuel_reports(user_id);
CREATE INDEX idx_reports_station ON fuel_reports(station_id);
CREATE INDEX idx_reports_location ON fuel_reports USING GIST(reported_location);
CREATE INDEX idx_reports_lat_lng ON fuel_reports(reported_latitude, reported_longitude);
CREATE INDEX idx_reports_time ON fuel_reports(reported_at DESC);
CREATE INDEX idx_reports_fuel_type ON fuel_reports(fuel_type);
CREATE INDEX idx_reports_availability ON fuel_reports(availability);
CREATE INDEX idx_reports_station_time ON fuel_reports(station_id, reported_at DESC);

-- Composite index for common queries
CREATE INDEX idx_reports_station_fuel_recent 
    ON fuel_reports(station_id, fuel_type, reported_at DESC);
```

### 4. Station Statistics Table (Aggregated Data)

```sql
CREATE TABLE station_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_id UUID NOT NULL REFERENCES fuel_stations(id) ON DELETE CASCADE,
    fuel_type VARCHAR(20) NOT NULL,
    
    -- Date for this统计
    stat_date DATE NOT NULL,
    
    -- Price statistics
    avg_price DECIMAL(10, 2),
    min_price DECIMAL(10, 2),
    max_price DECIMAL(10, 2),
    price_change DECIMAL(10, 2), -- Change from previous day
    
    -- Availability statistics (0-100 scale)
    avg_availability_score DECIMAL(5, 2),
    
    -- Report counts
    total_reports INTEGER NOT NULL DEFAULT 0,
    verified_reports INTEGER NOT NULL DEFAULT 0,
    
    -- Queue/wait time (if reported)
    avg_wait_time_minutes INTEGER,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(station_id, fuel_type, stat_date)
);

-- Indexes
CREATE INDEX idx_stats_station ON station_stats(station_id);
CREATE INDEX idx_stats_date ON station_stats(stat_date DESC);
CREATE INDEX idx_stats_station_fuel ON station_stats(station_id, fuel_type);
CREATE INDEX idx_stats_station_date ON station_stats(station_id, stat_date DESC);
```

### 5. User Sessions Table

```sql
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Token management
    token_hash VARCHAR(64) NOT NULL,
    refresh_token_hash VARCHAR(64),
    
    -- Session metadata
    device_name VARCHAR(100),
    device_type VARCHAR(20), -- 'mobile', 'desktop', 'tablet'
    ip_address INET,
    user_agent TEXT,
    
    -- Geo information
    country VARCHAR(50),
    city VARCHAR(100),
    
    -- Session status
    is_active BOOLEAN DEFAULT TRUE,
    is_revoked BOOLEAN DEFAULT FALSE,
    revoked_at TIMESTAMPTZ,
    revoke_reason VARCHAR(255),
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_sessions_user ON user_sessions(user_id);
CREATE INDEX idx_sessions_token ON user_sessions(token_hash);
CREATE INDEX idx_sessions_active ON user_sessions(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_sessions_expires ON user_sessions(expires_at);
```

### 6. Notifications Table

```sql
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Notification content
    type VARCHAR(50) NOT NULL 
        CHECK (type IN ('price_drop', 'restock', 'shortage_alert', 'predictive', 'system', 'verification')),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    
    -- Related entities
    station_id UUID REFERENCES fuel_stations(id),
    report_id UUID REFERENCES fuel_reports(id),
    
    -- Additional data
    data JSONB DEFAULT '{}',
    
    -- Delivery status
    read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    sent_via JSONB DEFAULT '{"push": false, "sms": false, "email": false}',
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sent_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, read) WHERE read = FALSE;
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);
```

### 7. Notification Subscriptions Table

```sql
CREATE TABLE notification_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    station_id UUID REFERENCES fuel_stations(id) ON DELETE CASCADE,
    
    -- Subscription type
    subscription_type VARCHAR(50) NOT NULL 
        CHECK (subscription_type IN ('price_alert', 'restock_alert', 'all_updates')),
    
    -- Alert conditions
    conditions JSONB DEFAULT '{
        "price_drop_percent": 10,
        "fuel_types": ["diesel", "gasoline_95"]
    }',
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(user_id, station_id, subscription_type)
);

-- Indexes
CREATE INDEX idx_subs_user ON notification_subscriptions(user_id);
CREATE INDEX idx_subs_station ON notification_subscriptions(station_id);
CREATE INDEX idx_subs_active ON notification_subscriptions(is_active) WHERE is_active = TRUE;
```

### 8. Predictive Models Table

```sql
CREATE TABLE predictive_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_name VARCHAR(100) NOT NULL,
    model_type VARCHAR(50) NOT NULL 
        CHECK (model_type IN ('demand_forecast', 'price_prediction', 'shortage_prediction')),
    
    -- Model metadata
    version VARCHAR(20) NOT NULL,
    training_data_end_date DATE NOT NULL,
    
    -- Model performance
    metrics JSONB NOT NULL, -- MAE, RMSE, MAPE, etc.
    
    -- Model artifacts (stored in S3, reference here)
    artifact_url TEXT NOT NULL,
    
    -- Deployment status
    is_active BOOLEAN DEFAULT FALSE,
    deployed_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_models_name ON predictive_models(model_name);
CREATE INDEX idx_models_type ON predictive_models(model_type);
CREATE INDEX idx_models_active ON predictive_models(is_active) WHERE is_active = TRUE;
```

### 9. Predictions Cache Table

```sql
CREATE TABLE predictions_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_id UUID NOT NULL REFERENCES fuel_stations(id) ON DELETE CASCADE,
    fuel_type VARCHAR(20) NOT NULL,
    
    -- Prediction type
    prediction_type VARCHAR(50) NOT NULL 
        CHECK (prediction_type IN ('demand', 'price', 'availability', 'shortage_risk')),
    
    -- Prediction data
    predicted_value DECIMAL(10, 2),
    confidence_score DECIMAL(5, 2), -- 0-100
    prediction_range JSONB, -- {"min": x, "max": y}
    
    -- Time period
    prediction_date DATE NOT NULL,
    prediction_horizon VARCHAR(20), -- '1_day', '3_day', '7_day'
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    
    UNIQUE(station_id, fuel_type, prediction_type, prediction_date)
);

-- Indexes
CREATE INDEX idx_predictions_station ON predictions_cache(station_id);
CREATE INDEX idx_predictions_date ON predictions_cache(prediction_date);
CREATE INDEX idx_predictions_expires ON predictions_cache(expires_at);
```

### 10. Audit Log Table

```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Actor
    user_id UUID REFERENCES users(id),
    
    -- Action
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID,
    
    -- Details
    old_values JSONB,
    new_values JSONB,
    
    -- Context
    ip_address INET,
    user_agent TEXT,
    
    -- Timestamp
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_time ON audit_logs(created_at DESC);
```

---

## Views for Common Queries

### 1. Current Station Status View

```sql
CREATE VIEW v_current_station_status AS
SELECT 
    fs.id AS station_id,
    fs.name AS station_name,
    fs.brand,
    fs.latitude,
    fs.longitude,
    fs.status,
    fs.fuel_types,
    fr.reported_at AS last_report_time,
    fr.price AS last_reported_price,
    fr.availability AS last_availability,
    fr.fuel_type AS last_report_fuel_type,
    ss.avg_price AS today_avg_price,
    ss.total_reports AS today_report_count
FROM fuel_stations fs
LEFT JOIN LATERAL (
    SELECT * FROM fuel_reports 
    WHERE station_id = fs.id 
    ORDER BY reported_at DESC 
    LIMIT 1
) fr ON true
LEFT JOIN LATERAL (
    SELECT * FROM station_stats 
    WHERE station_id = fs.id 
    AND stat_date = CURRENT_DATE
) ss ON true
WHERE fs.deleted_at IS NULL;
```

### 2. Price Trends View

```sql
CREATE VIEW v_price_trends AS
SELECT 
    fs.id AS station_id,
    fs.name AS station_name,
    ss.fuel_type,
    ss.stat_date,
    ss.avg_price,
    ss.price_change,
    LAG(ss.avg_price) OVER (
        PARTITION BY fs.id, ss.fuel_type 
        ORDER BY ss.stat_date
    ) AS prev_day_price,
    AVG(ss.avg_price) OVER (
        PARTITION BY fs.id, ss.fuel_type 
        ORDER BY ss.stat_date 
        ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
    ) AS seven_day_avg
FROM station_stats ss
JOIN fuel_stations fs ON fs.id = ss.station_id
WHERE fs.deleted_at IS NULL;
```

### 3. User Activity Dashboard View

```sql
CREATE VIEW v_user_dashboard AS
SELECT 
    u.id AS user_id,
    u.full_name,
    u.role,
    COUNT(DISTINCT fr.id) AS total_reports,
    COUNT(DISTINCT fr.id) FILTER (WHERE fr.verified = TRUE) AS verified_reports,
    COUNT(DISTINCT fs.id) FILTER (WHERE fs.owner_user_id = u.id) AS owned_stations,
    (SELECT COUNT(*) FROM notifications n WHERE n.user_id = u.id AND n.read = FALSE) AS unread_notifications,
    MAX(fr.reported_at) AS last_report_date
FROM users u
LEFT JOIN fuel_reports fr ON fr.user_id = u.id
LEFT JOIN fuel_stations fs ON fs.owner_user_id = u.id
WHERE u.deleted_at IS NULL
GROUP BY u.id, u.full_name, u.role;
```

---

## Database Functions

### 1. Function to Update Timestamps

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### 2. Function to Validate Gondar Bounds

```sql
CREATE OR REPLACE FUNCTION is_within_gondar(lat DOUBLE PRECISION, lng DOUBLE PRECISION)
RETURNS BOOLEAN AS $$
DECLARE
    gondar_north CONSTANT DOUBLE PRECISION := 12.6500;
    gondar_south CONSTANT DOUBLE PRECISION := 12.5500;
    gondar_east CONSTANT DOUBLE PRECISION := 37.5000;
    gondar_west CONSTANT DOUBLE PRECISION := 37.4200;
BEGIN
    RETURN lat >= gondar_south 
       AND lat <= gondar_north 
       AND lng >= gondar_west 
       AND lng <= gondar_east;
END;
$$ LANGUAGE plpgsql;
```

### 3. Function to Calculate Station Availability Score

```sql
CREATE OR REPLACE FUNCTION calculate_availability_score(
    p_station_id UUID,
    p_fuel_type VARCHAR
)
RETURNS DECIMAL AS $$
DECLARE
    v_score DECIMAL;
BEGIN
    -- Score based on recent reports (last 24 hours)
    SELECT 
        CASE 
            WHEN COUNT(*) = 0 THEN NULL
            ELSE AVG(
                CASE availability
                    WHEN 'full' THEN 100
                    WHEN 'limited' THEN 50
                    WHEN 'very_limited' THEN 20
                    WHEN 'out_of_stock' THEN 0
                END
            )
        END INTO v_score
    FROM fuel_reports
    WHERE station_id = p_station_id
      AND fuel_type = p_fuel_type
      AND reported_at >= NOW() - INTERVAL '24 hours';
    
    RETURN v_score;
END;
$$ LANGUAGE plpgsql;
```

### 4. Function to Find Nearest Stations

```sql
CREATE OR REPLACE FUNCTION find_nearest_stations(
    p_latitude DOUBLE PRECISION,
    p_longitude DOUBLE PRECISION,
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    station_id UUID,
    station_name VARCHAR,
    brand VARCHAR,
    distance_meters DOUBLE PRECISION,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    status VARCHAR,
    last_report_time TIMESTAMPTZ,
    last_availability VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        fs.id,
        fs.name,
        fs.brand,
        ST_Distance(
            fs.location,
            ST_MakePoint(p_longitude, p_latitude)::geography
        ) AS distance_meters,
        fs.latitude,
        fs.longitude,
        fs.status,
        fr.reported_at,
        fr.availability
    FROM fuel_stations fs
    LEFT JOIN LATERAL (
        SELECT reported_at, availability FROM fuel_reports 
        WHERE station_id = fs.id 
        ORDER BY reported_at DESC LIMIT 1
    ) fr ON true
    WHERE fs.deleted_at IS NULL
      AND is_within_gondar(fs.latitude, fs.longitude)
    ORDER BY distance_meters
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;
```

---

## Triggers

```sql
-- Auto-update updated_at
CREATE TRIGGER trigger_update_users_timestamp
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_stations_timestamp
    BEFORE UPDATE ON fuel_stations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_reports_timestamp
    BEFORE UPDATE ON fuel_reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Validate location on insert
CREATE TRIGGER trigger_validate_report_location
    BEFORE INSERT OR UPDATE ON fuel_reports
    FOR EACH ROW
    WHEN (NEW.reported_latitude IS NOT NULL AND NEW.reported_longitude IS NOT NULL)
    EXECUTE FUNCTION 
    CASE 
        WHEN NOT is_within_gondar(NEW.reported_latitude, NEW.reported_longitude)
        THEN RAISE EXCEPTION 'Report location must be within Gondar city bounds'
    END;
```

---

## Initial Data Seeding

### Fuel Stations in Gondar (Sample Data)

```sql
INSERT INTO fuel_stations (name, brand, latitude, longitude, address, phone, fuel_types) VALUES
('Total Gondar Station', 'Total', 12.6089, 37.4671, 'Piazza Area, Gondar', '+251-58-111-1234', 
 '[{"type": "diesel", "available": true}, {"type": "gasoline_95", "available": true}]'),
('Oilibya Fasil', 'Oilibya', 12.6025, 37.4650, 'Near Fasilides Castle, Gondar', '+251-58-111-2345',
 '[{"type": "diesel", "available": true}, {"type": "gasoline_92", "available": false}]'),
('National Fuel Station', 'National', 12.6150, 37.4700, 'Maraki Area, Gondar', '+251-58-111-3456',
 '[{"type": "diesel", "available": false}, {"type": "gasoline_95", "available": true}]');
```
