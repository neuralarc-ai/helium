BEGIN;

-- Add runtime tracking fields to agent_runs table
ALTER TABLE agent_runs 
ADD COLUMN IF NOT EXISTS total_runtime_ms BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_heartbeat TIMESTAMP WITH TIME ZONE;

-- Add comment explaining the new fields
COMMENT ON COLUMN agent_runs.total_runtime_ms IS 'Total runtime in milliseconds from start to completion or current time if still running';
COMMENT ON COLUMN agent_runs.last_heartbeat IS 'Last heartbeat timestamp for active runs to track current runtime';

-- Create index for runtime queries
CREATE INDEX IF NOT EXISTS idx_agent_runs_total_runtime ON agent_runs(total_runtime_ms);
CREATE INDEX IF NOT EXISTS idx_agent_runs_last_heartbeat ON agent_runs(last_heartbeat);

-- Update existing completed agent_runs to have calculated runtime
UPDATE agent_runs 
SET total_runtime_ms = EXTRACT(EPOCH FROM (COALESCE(completed_at, NOW()) - started_at)) * 1000
WHERE completed_at IS NOT NULL AND total_runtime_ms IS NULL;

-- Update running agent_runs to have current runtime
UPDATE agent_runs 
SET total_runtime_ms = EXTRACT(EPOCH FROM (NOW() - started_at)) * 1000,
    last_heartbeat = NOW()
WHERE status = 'running' AND completed_at IS NULL;

COMMIT;

