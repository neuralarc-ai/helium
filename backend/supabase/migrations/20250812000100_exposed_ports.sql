BEGIN;

CREATE TABLE IF NOT EXISTS exposed_ports (
  slug TEXT PRIMARY KEY,
  project_id UUID,
  port INTEGER NOT NULL,
  current_url TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exposed_ports_project ON exposed_ports(project_id);

COMMIT;