CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'project_status') THEN
    CREATE TYPE project_status AS ENUM ('ongoing', 'completed', 'pending', 'cancelled');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_status') THEN
    CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'completed', 'cancelled');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'priority_level') THEN
    CREATE TYPE priority_level AS ENUM ('low', 'medium', 'high', 'urgent');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('admin', 'technician', 'client');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'report_status') THEN
    CREATE TYPE report_status AS ENUM ('pending', 'approved', 'rejected');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'booking_status') THEN
    CREATE TYPE booking_status AS ENUM ('confirmed', 'pending', 'completed', 'cancelled', 'in_progress');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'service_type') THEN
    CREATE TYPE service_type AS ENUM ('site_inspection', 'solar_panel_installation', 'inverter_battery_setup', 'maintenance_repair', 'commissioning', 'cleaning');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
    CREATE TYPE payment_status AS ENUM ('paid', 'pending', 'overdue', 'refunded');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method') THEN
    CREATE TYPE payment_method AS ENUM ('gcash', 'bank_transfer', 'credit_card', 'cash');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'document_type') THEN
    CREATE TYPE document_type AS ENUM ('contract', 'invoice', 'warranty', 'permit', 'report');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'document_approval_status') THEN
    CREATE TYPE document_approval_status AS ENUM ('pending', 'approved', 'rejected');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'inventory_status') THEN
    CREATE TYPE inventory_status AS ENUM ('in_stock', 'low_stock', 'out_of_stock');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'inventory_category') THEN
    CREATE TYPE inventory_category AS ENUM ('solar_panels', 'inverters', 'batteries', 'mounting', 'wiring', 'tools', 'accessories');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'inventory_movement_type') THEN
    CREATE TYPE inventory_movement_type AS ENUM ('deduction', 'return', 'adjustment');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL DEFAULT '',
  role user_role NOT NULL,
  avatar TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'inactive')),
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS password_hash TEXT NOT NULL DEFAULT '';

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS contact_number TEXT;

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_contact_number_check;
ALTER TABLE users
  ADD CONSTRAINT users_contact_number_check
  CHECK (contact_number IS NULL OR contact_number ~ '^\d{10}$');

ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_secret TEXT;

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_password_reset_user ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_expires ON password_reset_tokens(expires_at);

CREATE TABLE IF NOT EXISTS login_activity (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_login_activity_user ON login_activity(user_id);

CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource TEXT NOT NULL,
  resource_id TEXT,
  old_value JSONB,
  new_value JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_resource ON audit_log(resource, resource_id);

CREATE TABLE IF NOT EXISTS technicians (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT NOT NULL,
  avatar TEXT NOT NULL,
  specialization TEXT NOT NULL,
  rating NUMERIC(3,2) NOT NULL DEFAULT 0,
  projects_completed INTEGER NOT NULL DEFAULT 0,
  active_projects INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('available', 'busy', 'on_leave')),
  join_date DATE NOT NULL
);

CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  company TEXT,
  email TEXT,
  phone TEXT
);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  client TEXT NOT NULL,
  location TEXT NOT NULL,
  status project_status NOT NULL DEFAULT 'pending',
  priority priority_level NOT NULL DEFAULT 'medium',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  budget NUMERIC(14,2) NOT NULL DEFAULT 0,
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  description TEXT NOT NULL,
  project_lead TEXT REFERENCES technicians(id) ON DELETE SET NULL,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE projects ADD COLUMN IF NOT EXISTS user_id TEXT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS warranty_start_date DATE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS warranty_end_date DATE;

CREATE TABLE IF NOT EXISTS project_technicians (
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  technician_id TEXT NOT NULL REFERENCES technicians(id) ON DELETE CASCADE,
  PRIMARY KEY (project_id, technician_id)
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status task_status NOT NULL DEFAULT 'todo',
  priority priority_level NOT NULL DEFAULT 'medium',
  assigned_to TEXT REFERENCES technicians(id) ON DELETE SET NULL,
  due_date DATE NOT NULL,
  created_at DATE NOT NULL
);

CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('service', 'quotation', 'revenue')),
  status report_status NOT NULL DEFAULT 'pending',
  submitted_by TEXT NOT NULL,
  submitted_at DATE NOT NULL,
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  project_name TEXT,
  amount NUMERIC(14,2),
  description TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS calendar_events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  date DATE NOT NULL,
  end_date DATE,
  type TEXT NOT NULL,
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  project_name TEXT,
  color TEXT NOT NULL
);

-- Align existing data to the updated event type set before enforcing constraint.
UPDATE calendar_events SET type = 'cleaning' WHERE type = 'meeting';
UPDATE calendar_events SET type = 'inverter_battery_setup' WHERE type = 'deadline';
UPDATE calendar_events SET type = 'maintenance_repair' WHERE type = 'maintenance';

ALTER TABLE calendar_events DROP CONSTRAINT IF EXISTS calendar_events_type_check;
ALTER TABLE calendar_events
  ADD CONSTRAINT calendar_events_type_check
  CHECK (type IN ('installation', 'inspection', 'maintenance_repair', 'cleaning', 'inverter_battery_setup'));

CREATE TABLE IF NOT EXISTS inventory_items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  sku TEXT UNIQUE NOT NULL,
  category inventory_category NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  min_stock INTEGER NOT NULL DEFAULT 0,
  unit TEXT NOT NULL,
  unit_price NUMERIC(14,2) NOT NULL DEFAULT 0,
  location TEXT NOT NULL,
  supplier TEXT NOT NULL,
  status inventory_status NOT NULL DEFAULT 'in_stock',
  last_restocked DATE NOT NULL,
  description TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  reference_no TEXT UNIQUE NOT NULL,
  service_type service_type NOT NULL,
  date DATE NOT NULL,
  time TEXT NOT NULL,
  status booking_status NOT NULL DEFAULT 'pending',
  technician TEXT NOT NULL,
  address TEXT NOT NULL,
  notes TEXT NOT NULL,
  amount NUMERIC(14,2) NOT NULL DEFAULT 0
);

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS user_id TEXT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION;

CREATE SEQUENCE IF NOT EXISTS bookings_ref_seq;
DO $$
DECLARE max_ref BIGINT;
BEGIN
  SELECT COALESCE(MAX(CAST(TRIM(LEADING '0' FROM SUBSTRING(b.reference_no FROM 5)) AS BIGINT)), 0) INTO max_ref
  FROM bookings b WHERE b.reference_no ~ '^BK-[0-9]+$';
  IF max_ref > 0 THEN
    PERFORM setval('bookings_ref_seq', max_ref);
  END IF;
END $$;

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS booking_id TEXT REFERENCES bookings(id) ON DELETE SET NULL;

UPDATE bookings b
SET technician = t.name
FROM projects p
JOIN technicians t ON p.project_lead = t.id
WHERE p.booking_id = b.id AND p.project_lead IS NOT NULL;

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  reference_no TEXT UNIQUE NOT NULL,
  booking_ref TEXT NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  status payment_status NOT NULL DEFAULT 'pending',
  method payment_method NOT NULL,
  date DATE NOT NULL,
  due_date DATE
);

ALTER TABLE payments ADD COLUMN IF NOT EXISTS user_id TEXT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS service_type TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_instructions TEXT;

CREATE SEQUENCE IF NOT EXISTS payments_ref_seq;

CREATE TABLE IF NOT EXISTS saved_addresses (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  full_address TEXT NOT NULL,
  city TEXT NOT NULL,
  province TEXT NOT NULL,
  zip_code TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  monthly_bill NUMERIC(14,2) NOT NULL DEFAULT 0
);

ALTER TABLE saved_addresses ADD COLUMN IF NOT EXISTS user_id TEXT REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS address_id TEXT REFERENCES saved_addresses(id) ON DELETE SET NULL;
UPDATE bookings b SET address_id = sa.id
FROM saved_addresses sa
WHERE b.address_id IS NULL AND TRIM(b.address) = TRIM(sa.full_address);

CREATE TABLE IF NOT EXISTS appliances (
  id TEXT PRIMARY KEY,
  address_id TEXT NOT NULL REFERENCES saved_addresses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  wattage INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  type document_type NOT NULL,
  file_size TEXT NOT NULL,
  uploaded_at DATE NOT NULL,
  project_name TEXT,
  status TEXT NOT NULL CHECK (status IN ('active', 'expired', 'draft')),
  approval_status document_approval_status,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  report_id TEXT REFERENCES reports(id) ON DELETE SET NULL
);

ALTER TABLE documents ADD COLUMN IF NOT EXISTS user_id TEXT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS report_id TEXT REFERENCES reports(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS idempotency_keys (
  key TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK (status IN ('in_progress', 'completed', 'failed')),
  http_status INT NOT NULL,
  response_body JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_idempotency_expires ON idempotency_keys(expires_at);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
    CREATE TYPE notification_type AS ENUM (
      'booking_submitted', 'booking_cancelled', 'booking_confirmed', 'booking_completed',
      'task_assigned', 'task_rescheduled', 'task_completed',
      'report_submitted', 'report_approved', 'report_rejected',
      'payment_received', 'payment_confirmed',
      'document_available', 'system_alert'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  link TEXT,
  read_at TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC);

DROP TABLE IF EXISTS support_tickets;
CREATE TABLE IF NOT EXISTS support_tickets (
  id TEXT PRIMARY KEY,
  project_id TEXT,
  client_name TEXT NOT NULL,
  client_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project_inventory (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  inventory_item_id TEXT NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(14,2) NOT NULL DEFAULT 0,
  allocated_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, inventory_item_id)
);
CREATE INDEX IF NOT EXISTS idx_project_inventory_project ON project_inventory(project_id);
CREATE INDEX IF NOT EXISTS idx_project_inventory_item ON project_inventory(inventory_item_id);

CREATE TABLE IF NOT EXISTS inventory_movements (
  id TEXT PRIMARY KEY,
  inventory_item_id TEXT NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  movement_type inventory_movement_type NOT NULL,
  quantity INTEGER NOT NULL,
  reason TEXT NOT NULL,
  performed_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_item ON inventory_movements(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_project ON inventory_movements(project_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_created ON inventory_movements(created_at DESC);
