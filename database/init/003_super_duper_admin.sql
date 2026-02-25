-- Add super-duper-admin role to users table
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'reviewer', 'super-duper-admin'));

-- Upgrade the seed admin to super-duper-admin
UPDATE users SET role = 'super-duper-admin' WHERE id = 'admin-001';
