-- Tasks feature: reusable task templates linked across events

-- Up Migration

-- Organization-level task templates
CREATE TABLE tasks (
    id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    recurring BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tasks_organization_id ON tasks(organization_id);
CREATE INDEX idx_tasks_recurring ON tasks(recurring);

-- Per-event task instances
CREATE TABLE event_tasks (
    id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    name VARCHAR(255),
    notes TEXT,
    assigned_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    due_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(task_id, event_id)   
);

CREATE INDEX idx_event_tasks_event_id ON event_tasks(event_id);
CREATE INDEX idx_event_tasks_task_id ON event_tasks(task_id);
CREATE INDEX idx_event_tasks_assigned_user_id ON event_tasks(assigned_user_id);

-- Contacts associated with an event task
CREATE TABLE task_contacts (
    id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    event_task_id INTEGER NOT NULL REFERENCES event_tasks(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    business VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_task_contacts_event_task_id ON task_contacts(event_task_id);

CREATE TRIGGER update_tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_event_tasks_updated_at
    BEFORE UPDATE ON event_tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Down Migration

DROP TRIGGER IF EXISTS update_event_tasks_updated_at ON event_tasks;
DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
DROP TABLE IF EXISTS task_contacts;
DROP TABLE IF EXISTS event_tasks;
DROP TABLE IF EXISTS tasks;
