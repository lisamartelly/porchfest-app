-- Porchfest Database Schema
-- PostgreSQL - compatible with any Postgres (Docker, RDS, etc.)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- USERS TABLE
-- ============================================================================
CREATE TABLE users (
    id VARCHAR(50) PRIMARY KEY DEFAULT 'user-' || substr(uuid_generate_v4()::text, 1, 8),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'reviewer')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);

-- ============================================================================
-- EVENTS TABLE
-- ============================================================================
CREATE TABLE events (
    id VARCHAR(50) PRIMARY KEY DEFAULT 'event-' || substr(uuid_generate_v4()::text, 1, 8),
    name VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    band_applications_open DATE,
    band_applications_close DATE,
    porch_applications_open DATE,
    porch_applications_close DATE,
    reviewer_emails TEXT[] DEFAULT '{}',
    reviewers_assigned BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_events_is_active ON events(is_active);
CREATE INDEX idx_events_date ON events(date);

-- ============================================================================
-- PORCHES TABLE
-- ============================================================================
CREATE TABLE porches (
    id VARCHAR(50) PRIMARY KEY DEFAULT 'porch-' || substr(uuid_generate_v4()::text, 1, 8),
    owner_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    address VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    lat DECIMAL(10, 7),
    lng DECIMAL(10, 7),
    capacity INTEGER,
    has_power BOOLEAN DEFAULT false,
    parking_notes TEXT,
    accessibility_notes TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'approved', 'rejected')),
    admin_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_porches_status ON porches(status);
CREATE INDEX idx_porches_email ON porches(email);

-- ============================================================================
-- BANDS TABLE
-- ============================================================================
CREATE TABLE bands (
    id VARCHAR(50) PRIMARY KEY DEFAULT 'band-' || substr(uuid_generate_v4()::text, 1, 8),
    band_name VARCHAR(255) NOT NULL,
    contact_name VARCHAR(255) NOT NULL,
    contact_email VARCHAR(255) NOT NULL,
    contact_phone VARCHAR(50),
    genre VARCHAR(100),
    member_count VARCHAR(20),
    music_sample_link TEXT,
    bio TEXT,
    set_length VARCHAR(20),
    
    -- Social links
    venmo_handle VARCHAR(100),
    instagram VARCHAR(100),
    spotify VARCHAR(100),
    soundcloud VARCHAR(100),
    bandcamp VARCHAR(100),
    facebook VARCHAR(100),
    website TEXT,
    
    -- Application details
    scheduling_notes TEXT,
    equipment_consent VARCHAR(20),
    payment_consent VARCHAR(20),
    timeline_consent VARCHAR(20),
    has_photo BOOLEAN DEFAULT false,
    photo_filename VARCHAR(255),
    questions_comments TEXT,
    
    -- Status and admin
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'approved', 'rejected')),
    admin_notes TEXT,
    
    -- Scheduling (assigned by admin)
    assigned_porch_id VARCHAR(50) REFERENCES porches(id) ON DELETE SET NULL,
    set_start_time TIME,
    set_end_time TIME,
    
    -- Reviewer assignment
    assigned_reviewer_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
    assigned_reviewer_email VARCHAR(255),
    reviewer_rating INTEGER CHECK (reviewer_rating >= 1 AND reviewer_rating <= 5),
    reviewer_notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bands_status ON bands(status);
CREATE INDEX idx_bands_contact_email ON bands(contact_email);
CREATE INDEX idx_bands_assigned_porch_id ON bands(assigned_porch_id);
CREATE INDEX idx_bands_assigned_reviewer_id ON bands(assigned_reviewer_id);

-- ============================================================================
-- TIME SLOTS TABLE
-- ============================================================================
CREATE TABLE time_slots (
    id VARCHAR(50) PRIMARY KEY DEFAULT 'slot-' || substr(uuid_generate_v4()::text, 1, 8),
    event_id VARCHAR(50) NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_time_slots_event_id ON time_slots(event_id);

-- ============================================================================
-- TRIGGERS FOR updated_at
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_events_updated_at
    BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_porches_updated_at
    BEFORE UPDATE ON porches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_bands_updated_at
    BEFORE UPDATE ON bands
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
