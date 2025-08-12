BEGIN;

-- Create function to calculate runtime in milliseconds for an agent run
CREATE OR REPLACE FUNCTION calculate_runtime_ms(run_id UUID)
RETURNS BIGINT AS $$
DECLARE
    start_time TIMESTAMP WITH TIME ZONE;
    end_time TIMESTAMP WITH TIME ZONE;
    runtime_ms BIGINT;
BEGIN
    -- Get start time
    SELECT started_at INTO start_time
    FROM agent_runs
    WHERE id = run_id;
    
    IF start_time IS NULL THEN
        RETURN 0;
    END IF;
    
    -- Get end time (completed_at if finished, otherwise current time)
    SELECT COALESCE(completed_at, NOW()) INTO end_time
    FROM agent_runs
    WHERE id = run_id;
    
    -- Calculate runtime in milliseconds
    runtime_ms := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
    
    RETURN runtime_ms;
END;
$$ LANGUAGE plpgsql;

-- Create function to get total runtime for a thread
CREATE OR REPLACE FUNCTION get_thread_total_runtime(thread_uuid UUID)
RETURNS BIGINT AS $$
DECLARE
    total_runtime BIGINT := 0;
    run_record RECORD;
BEGIN
    FOR run_record IN 
        SELECT started_at, completed_at, status, total_runtime_ms
        FROM agent_runs
        WHERE thread_id = thread_uuid
    LOOP
        IF run_record.status = 'running' THEN
            -- For running agents, calculate current runtime
            total_runtime := total_runtime + EXTRACT(EPOCH FROM (NOW() - run_record.started_at)) * 1000;
        ELSE
            -- For completed agents, use stored runtime
            total_runtime := total_runtime + COALESCE(run_record.total_runtime_ms, 0);
        END IF;
    END LOOP;
    
    RETURN total_runtime;
END;
$$ LANGUAGE plpgsql;

COMMIT;

