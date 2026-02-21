-- Production seed: admin user and default organization

-- Up Migration

-- Admin user (password: "password" — change immediately in production)
INSERT INTO users (id, email, password_hash, role) VALUES
('admin-001', 'martelly.lisa@gmail.com', '$2a$10$f/u0IPAFM/4HKUqIbiUVP.bQM13eNN0ax010U6LP8/MzKQanH4i3S', 'admin');

INSERT INTO organizations (id, name, slug, description, website, contact_email, city, state, created_at) VALUES
('org-001', 'Somerville Porchfest', 'somerville-porchfest', 'Annual neighborhood music festival featuring local bands on porches throughout Somerville.', 'https://somervilleporchfest.org', 'info@somervilleporchfest.org', 'Somerville', 'MA', '2025-06-01T00:00:00.000Z');

INSERT INTO user_organizations (id, user_id, organization_id, role) VALUES
('uo-001', 'admin-001', 'org-001', 'owner');

-- Down Migration

DELETE FROM user_organizations WHERE id = 'uo-001';
DELETE FROM organizations WHERE id = 'org-001';
DELETE FROM users WHERE id = 'admin-001';
