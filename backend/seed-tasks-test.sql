-- Seed script for Uptown Porchfest tasks test data
-- Run after migrations: psql $DATABASE_URL -f seed-tasks-test.sql
-- Creates: Uptown Porchfest org, 2024 (inactive) and 2025 (active) events,
-- task templates, event_tasks with status/contacts, and historical data.

BEGIN;

-- 1. Create Uptown Porchfest organization
INSERT INTO organizations (name, slug, description, city, state, contact_email)
VALUES (
  'Uptown Porchfest',
  'uptown-porchfest',
  'Annual neighborhood music festival in Uptown',
  'Uptown',
  'NY',
  'contact@uptownporchfest.org'
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  city = EXCLUDED.city,
  state = EXCLUDED.state;

-- 2. Create events (2024 inactive, 2025 active)
INSERT INTO events (organization_id, name, date, start_time, end_time, description, is_active)
SELECT id, 'Uptown Porchfest 2024', '2024-06-15', '12:00', '18:00',
  'Annual neighborhood music festival 2024.', false
FROM organizations WHERE slug = 'uptown-porchfest'
AND NOT EXISTS (SELECT 1 FROM events e JOIN organizations o ON e.organization_id = o.id WHERE o.slug = 'uptown-porchfest' AND e.name = 'Uptown Porchfest 2024');

-- Deactivate any existing active event for this org before adding 2025
UPDATE events SET is_active = false
WHERE organization_id = (SELECT id FROM organizations WHERE slug = 'uptown-porchfest')
  AND is_active = true;

INSERT INTO events (organization_id, name, date, start_time, end_time, description, is_active)
SELECT id, 'Uptown Porchfest 2025', '2025-06-14', '12:00', '18:00',
  'Annual neighborhood music festival 2025.', true
FROM organizations WHERE slug = 'uptown-porchfest'
AND NOT EXISTS (SELECT 1 FROM events e JOIN organizations o ON e.organization_id = o.id WHERE o.slug = 'uptown-porchfest' AND e.name = 'Uptown Porchfest 2025');

-- 3. Create task templates
INSERT INTO tasks (organization_id, name, recurring)
SELECT id, 'Book sound equipment', true
FROM organizations WHERE slug = 'uptown-porchfest'
AND NOT EXISTS (SELECT 1 FROM tasks t WHERE t.organization_id = (SELECT id FROM organizations WHERE slug = 'uptown-porchfest') AND t.name = 'Book sound equipment');

INSERT INTO tasks (organization_id, name, recurring)
SELECT id, 'Secure permits', true
FROM organizations WHERE slug = 'uptown-porchfest'
AND NOT EXISTS (SELECT 1 FROM tasks t WHERE t.organization_id = (SELECT id FROM organizations WHERE slug = 'uptown-porchfest') AND t.name = 'Secure permits');

INSERT INTO tasks (organization_id, name, recurring)
SELECT id, 'Print marketing materials', true
FROM organizations WHERE slug = 'uptown-porchfest'
AND NOT EXISTS (SELECT 1 FROM tasks t WHERE t.organization_id = (SELECT id FROM organizations WHERE slug = 'uptown-porchfest') AND t.name = 'Print marketing materials');

INSERT INTO tasks (organization_id, name, recurring)
SELECT id, 'Recruit volunteer coordinators', false
FROM organizations WHERE slug = 'uptown-porchfest'
AND NOT EXISTS (SELECT 1 FROM tasks t WHERE t.organization_id = (SELECT id FROM organizations WHERE slug = 'uptown-porchfest') AND t.name = 'Recruit volunteer coordinators');

-- 4. Create event_tasks for 2024 (historical)
INSERT INTO event_tasks (task_id, event_id, name, notes, due_date, status, category)
SELECT t.id, e.id, NULL, 'Booked with Acme Sound for $500', '2024-05-01', 'done', 'vendors'
FROM tasks t, events e, organizations o
WHERE t.organization_id = o.id AND o.slug = 'uptown-porchfest' AND t.name = 'Book sound equipment'
  AND e.organization_id = o.id AND e.name = 'Uptown Porchfest 2024'
  AND NOT EXISTS (SELECT 1 FROM event_tasks et WHERE et.task_id = t.id AND et.event_id = e.id);

INSERT INTO event_tasks (task_id, event_id, name, notes, due_date, status, category)
SELECT t.id, e.id, NULL, 'City permit approved', '2024-04-15', 'done', 'permits'
FROM tasks t, events e, organizations o
WHERE t.organization_id = o.id AND o.slug = 'uptown-porchfest' AND t.name = 'Secure permits'
  AND e.organization_id = o.id AND e.name = 'Uptown Porchfest 2024'
  AND NOT EXISTS (SELECT 1 FROM event_tasks et WHERE et.task_id = t.id AND et.event_id = e.id);

INSERT INTO event_tasks (task_id, event_id, name, notes, due_date, status, category)
SELECT t.id, e.id, NULL, 'Posters and flyers printed', '2024-05-20', 'done', 'merch'
FROM tasks t, events e, organizations o
WHERE t.organization_id = o.id AND o.slug = 'uptown-porchfest' AND t.name = 'Print marketing materials'
  AND e.organization_id = o.id AND e.name = 'Uptown Porchfest 2024'
  AND NOT EXISTS (SELECT 1 FROM event_tasks et WHERE et.task_id = t.id AND et.event_id = e.id);

-- 5. Add contacts to 2024 event tasks
INSERT INTO task_contacts (event_task_id, name, email, phone, business, notes)
SELECT et.id, 'Acme Sound Co', 'sales@acmesound.com', '555-1234', 'Acme Sound', 'Primary vendor'
FROM event_tasks et
JOIN tasks t ON et.task_id = t.id
JOIN events e ON et.event_id = e.id
JOIN organizations o ON t.organization_id = o.id
WHERE o.slug = 'uptown-porchfest' AND e.name = 'Uptown Porchfest 2024' AND t.name = 'Book sound equipment'
AND NOT EXISTS (SELECT 1 FROM task_contacts tc WHERE tc.event_task_id = et.id AND tc.name = 'Acme Sound Co');

INSERT INTO task_contacts (event_task_id, name, email, phone, business, notes)
SELECT et.id, 'City Permits Office', 'permits@city.gov', '555-5678', 'City Hall', 'Contact: Jane Doe'
FROM event_tasks et
JOIN tasks t ON et.task_id = t.id
JOIN events e ON et.event_id = e.id
JOIN organizations o ON t.organization_id = o.id
WHERE o.slug = 'uptown-porchfest' AND e.name = 'Uptown Porchfest 2024' AND t.name = 'Secure permits'
AND NOT EXISTS (SELECT 1 FROM task_contacts tc WHERE tc.event_task_id = et.id AND tc.name = 'City Permits Office');

-- 6. Create event_tasks for 2025 (active event)
INSERT INTO event_tasks (task_id, event_id, name, notes, due_date, status, category)
SELECT t.id, e.id, NULL, 'Need to get quotes', '2025-04-01', 'in_progress', 'vendors'
FROM tasks t, events e, organizations o
WHERE t.organization_id = o.id AND o.slug = 'uptown-porchfest' AND t.name = 'Book sound equipment'
  AND e.organization_id = o.id AND e.name = 'Uptown Porchfest 2025'
  AND NOT EXISTS (SELECT 1 FROM event_tasks et WHERE et.task_id = t.id AND et.event_id = e.id);

INSERT INTO event_tasks (task_id, event_id, name, notes, due_date, status, category)
SELECT t.id, e.id, NULL, 'Application submitted', '2025-03-15', 'to_do', 'permits'
FROM tasks t, events e, organizations o
WHERE t.organization_id = o.id AND o.slug = 'uptown-porchfest' AND t.name = 'Secure permits'
  AND e.organization_id = o.id AND e.name = 'Uptown Porchfest 2025'
  AND NOT EXISTS (SELECT 1 FROM event_tasks et WHERE et.task_id = t.id AND et.event_id = e.id);

INSERT INTO event_tasks (task_id, event_id, name, notes, due_date, status, category)
SELECT t.id, e.id, NULL, 'Waiting on final design', '2025-05-01', 'blocked', 'merch'
FROM tasks t, events e, organizations o
WHERE t.organization_id = o.id AND o.slug = 'uptown-porchfest' AND t.name = 'Print marketing materials'
  AND e.organization_id = o.id AND e.name = 'Uptown Porchfest 2025'
  AND NOT EXISTS (SELECT 1 FROM event_tasks et WHERE et.task_id = t.id AND et.event_id = e.id);

INSERT INTO event_tasks (task_id, event_id, name, notes, due_date, status, category)
SELECT t.id, e.id, NULL, 'Reach out to last year''s coordinators', '2025-02-28', 'to_do', 'volunteers'
FROM tasks t, events e, organizations o
WHERE t.organization_id = o.id AND o.slug = 'uptown-porchfest' AND t.name = 'Recruit volunteer coordinators'
  AND e.organization_id = o.id AND e.name = 'Uptown Porchfest 2025'
  AND NOT EXISTS (SELECT 1 FROM event_tasks et WHERE et.task_id = t.id AND et.event_id = e.id);

-- 7. Add a contact to one 2025 event task
INSERT INTO task_contacts (event_task_id, name, email, phone, business, notes)
SELECT et.id, 'PrintPro Inc', 'orders@printpro.com', '555-9999', 'PrintPro Inc', 'Quote pending'
FROM event_tasks et
JOIN tasks t ON et.task_id = t.id
JOIN events e ON et.event_id = e.id
JOIN organizations o ON t.organization_id = o.id
WHERE o.slug = 'uptown-porchfest' AND e.name = 'Uptown Porchfest 2025' AND t.name = 'Print marketing materials'
AND NOT EXISTS (SELECT 1 FROM task_contacts tc WHERE tc.event_task_id = et.id AND tc.name = 'PrintPro Inc');

-- 8. Add first user to Uptown Porchfest org (so they can see tasks when logged in)
INSERT INTO organization_users (user_id, organization_id, role)
SELECT u.id, o.id, 'owner'
FROM (SELECT id FROM users ORDER BY id LIMIT 1) u
CROSS JOIN (SELECT id FROM organizations WHERE slug = 'uptown-porchfest') o
WHERE NOT EXISTS (
  SELECT 1 FROM organization_users ou
  WHERE ou.user_id = u.id AND ou.organization_id = o.id
);

COMMIT;
