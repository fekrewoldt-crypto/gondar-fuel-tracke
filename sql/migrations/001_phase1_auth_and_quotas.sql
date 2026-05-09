-- =============================================================================
-- Gondar Fuel Management System - Phase 1 Migration
-- Auth, User Verification, Vehicle Profiles, and Daily Quotas
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- A. USERS TABLE UPDATE
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'driver'
    CHECK (role IN ('driver', 'provider', 'admin', 'moderator'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) DEFAULT 'pending'
    CHECK (verification_status IN ('pending', 'verified', 'rejected'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS national_id_number VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_notes TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES users(id);

-- B. VEHICLES TABLE
CREATE TABLE IF NOT EXISTS vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    vehicle_type VARCHAR(20) NOT NULL CHECK (vehicle_type IN ('car', 'truck', 'bus', 'motorcycle')),
    plate_number VARCHAR(20) NOT NULL UNIQUE,
    fuel_type VARCHAR(20) CHECK (fuel_type IN ('diesel', 'petrol', NULL)),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- C. DOCUMENT UPLOADS TABLE
CREATE TABLE IF NOT EXISTS document_uploads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL CHECK (document_type IN ('national_id_front', 'national_id_back', 'driving_license', 'business_permit')),
    file_url TEXT NOT NULL,
    file_name VARCHAR(255),
    file_size INTEGER,
    mime_type VARCHAR(100),
    upload_status VARCHAR(20) DEFAULT 'uploaded' CHECK (upload_status IN ('uploaded', 'processing', 'stored')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- D. DAILY QUOTAS TABLE
CREATE TABLE IF NOT EXISTS daily_quotas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    fuel_type VARCHAR(20) NOT NULL CHECK (fuel_type IN ('diesel', 'petrol')),
    daily_limit DECIMAL(10,2) NOT NULL,
    used_today DECIMAL(10,2) DEFAULT 0,
    last_reset_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, fuel_type)
);

-- E. FUEL TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS fuel_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    station_id UUID NOT NULL,
    vehicle_id UUID REFERENCES vehicles(id),
    fuel_type VARCHAR(20) NOT NULL CHECK (fuel_type IN ('diesel', 'petrol')),
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    price_per_liter DECIMAL(10,2),
    total_cost DECIMAL(10,2),
    transaction_reference VARCHAR(100),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
    purchased_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- F. OTP ATTEMPTS TABLE
CREATE TABLE IF NOT EXISTS otp_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone VARCHAR(20) NOT NULL,
    attempt_count INTEGER DEFAULT 0,
    last_attempt_at TIMESTAMPTZ DEFAULT NOW(),
    blocked_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- G. SESSIONS TABLE
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    device_info TEXT,
    ip_address VARCHAR(45),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- H. AUDIT LOG TABLE
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- I. INDEXES
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_verification_status ON users(verification_status);
CREATE INDEX IF NOT EXISTS idx_vehicles_user_id ON vehicles(user_id);
CREATE INDEX IF NOT EXISTS idx_document_uploads_user_type ON document_uploads(user_id, document_type);
CREATE INDEX IF NOT EXISTS idx_daily_quotas_user_fuel ON daily_quotas(user_id, fuel_type);
CREATE INDEX IF NOT EXISTS idx_daily_quotas_user_date ON daily_quotas(user_id, last_reset_date);
CREATE INDEX IF NOT EXISTS idx_fuel_transactions_user_date ON fuel_transactions(user_id, purchased_at);
CREATE INDEX IF NOT EXISTS idx_fuel_transactions_station_date ON fuel_transactions(station_id, purchased_at);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_otp_attempts_phone ON otp_attempts(phone);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_date ON audit_log(user_id, created_at);

-- J. FUNCTIONS AND TRIGGERS
CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;
CREATE TRIGGER update_daily_quotas_updated_at BEFORE UPDATE ON daily_quotas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE FUNCTION reset_daily_quotas() RETURNS void AS $$
BEGIN UPDATE daily_quotas SET used_today = 0, last_reset_date = CURRENT_DATE, updated_at = NOW() WHERE last_reset_date < CURRENT_DATE; END; $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION create_user_quotas() RETURNS TRIGGER AS $$
DECLARE v_vehicle_type VARCHAR(20); v_diesel_limit DECIMAL(10,2); v_petrol_limit DECIMAL(10,2);
BEGIN
    SELECT vehicle_type INTO v_vehicle_type FROM vehicles WHERE user_id = NEW.id LIMIT 1;
    IF v_vehicle_type IS NULL THEN v_vehicle_type := 'car'; END IF;
    v_diesel_limit := CASE v_vehicle_type WHEN 'car' THEN 5.0 WHEN 'truck' THEN 20.0 WHEN 'bus' THEN 15.0 WHEN 'motorcycle' THEN 0.0 ELSE 5.0 END;
    v_petrol_limit := CASE v_vehicle_type WHEN 'car' THEN 2.0 WHEN 'truck' THEN 5.0 WHEN 'bus' THEN 3.0 WHEN 'motorcycle' THEN 1.0 ELSE 2.0 END;
    INSERT INTO daily_quotas (user_id, fuel_type, daily_limit, last_reset_date) VALUES (NEW.id, 'diesel', v_diesel_limit, CURRENT_DATE) ON CONFLICT DO NOTHING;
    INSERT INTO daily_quotas (user_id, fuel_type, daily_limit, last_reset_date) VALUES (NEW.id, 'petrol', v_petrol_limit, CURRENT_DATE) ON CONFLICT DO NOTHING;
    RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER create_quotas_on_user_verified AFTER UPDATE ON users FOR EACH ROW WHEN (NEW.verification_status = 'verified' AND OLD.verification_status != 'verified') EXECUTE FUNCTION create_user_quotas();

-- K. SEED DATA
CREATE TABLE IF NOT EXISTS quota_defaults (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), vehicle_type VARCHAR(20) NOT NULL UNIQUE, diesel_limit DECIMAL(10,2) NOT NULL, petrol_limit DECIMAL(10,2) NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW());
INSERT INTO quota_defaults (vehicle_type, diesel_limit, petrol_limit) VALUES ('car', 5.0, 2.0), ('truck', 20.0, 5.0), ('bus', 15.0, 3.0), ('motorcycle', 0.0, 1.0) ON CONFLICT (vehicle_type) DO NOTHING;
