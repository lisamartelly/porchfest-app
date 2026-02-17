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
-- ORGANIZATIONS TABLE
-- ============================================================================
CREATE TABLE organizations (
    id VARCHAR(50) PRIMARY KEY DEFAULT 'org-' || substr(uuid_generate_v4()::text, 1, 8),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    website TEXT,
    contact_email VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(50),
    logo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_organizations_slug ON organizations(slug);

-- ============================================================================
-- USER_ORGANIZATIONS JUNCTION TABLE (many-to-many: users <-> organizations)
-- ============================================================================
CREATE TABLE user_organizations (
    id VARCHAR(50) PRIMARY KEY DEFAULT 'uo-' || substr(uuid_generate_v4()::text, 1, 8),
    user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id VARCHAR(50) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, organization_id)
);

CREATE INDEX idx_user_organizations_user_id ON user_organizations(user_id);
CREATE INDEX idx_user_organizations_organization_id ON user_organizations(organization_id);

-- ============================================================================
-- EVENTS TABLE
-- ============================================================================
CREATE TABLE events (
    id VARCHAR(50) PRIMARY KEY DEFAULT 'event-' || substr(uuid_generate_v4()::text, 1, 8),
    organization_id VARCHAR(50) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
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
CREATE INDEX idx_events_organization_id ON events(organization_id);

-- ============================================================================
-- PORCHES TABLE
-- ============================================================================
CREATE TABLE porches (
    id VARCHAR(50) PRIMARY KEY DEFAULT 'porch-' || substr(uuid_generate_v4()::text, 1, 8),
    organization_id VARCHAR(50) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
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
CREATE INDEX idx_porches_organization_id ON porches(organization_id);

-- ============================================================================
-- BANDS TABLE
-- ============================================================================
CREATE TABLE bands (
    id VARCHAR(50) PRIMARY KEY DEFAULT 'band-' || substr(uuid_generate_v4()::text, 1, 8),
    organization_id VARCHAR(50) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
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
CREATE INDEX idx_bands_organization_id ON bands(organization_id);

-- ============================================================================
-- BAND_EVENTS JUNCTION TABLE (many-to-many: bands <-> events)
-- ============================================================================
CREATE TABLE band_events (
    id VARCHAR(50) PRIMARY KEY DEFAULT 'be-' || substr(uuid_generate_v4()::text, 1, 8),
    band_id VARCHAR(50) NOT NULL REFERENCES bands(id) ON DELETE CASCADE,
    event_id VARCHAR(50) NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(band_id, event_id)
);

CREATE INDEX idx_band_events_band_id ON band_events(band_id);
CREATE INDEX idx_band_events_event_id ON band_events(event_id);

-- ============================================================================
-- PORCH_EVENTS JUNCTION TABLE (many-to-many: porches <-> events)
-- ============================================================================
CREATE TABLE porch_events (
    id VARCHAR(50) PRIMARY KEY DEFAULT 'pe-' || substr(uuid_generate_v4()::text, 1, 8),
    porch_id VARCHAR(50) NOT NULL REFERENCES porches(id) ON DELETE CASCADE,
    event_id VARCHAR(50) NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(porch_id, event_id)
);

CREATE INDEX idx_porch_events_porch_id ON porch_events(porch_id);
CREATE INDEX idx_porch_events_event_id ON porch_events(event_id);

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

CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON organizations
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
