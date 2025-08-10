-- Apply the fix for global knowledge base context issue
-- This will update the function with the correct account_id handling

BEGIN;

-- Drop the existing function
DROP FUNCTION IF EXISTS get_combined_knowledge_base_context(UUID, UUID, INTEGER);

-- Create the updated function with better account_id handling
CREATE OR REPLACE FUNCTION get_combined_knowledge_base_context(
    p_thread_id UUID,
    p_agent_id UUID DEFAULT NULL,
    p_max_tokens INTEGER DEFAULT 4000
)
RETURNS TEXT
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
    context_text TEXT := '';
    agent_context TEXT := '';
    thread_context TEXT := '';
    global_context TEXT := '';
    total_tokens INTEGER := 0;
    agent_tokens INTEGER := 0;
    thread_tokens INTEGER := 0;
    global_tokens INTEGER := 0;
    remaining_tokens INTEGER;
    entry_record RECORD;
    estimated_tokens INTEGER;
    thread_account_id UUID;
    user_account_id VARCHAR(255);
BEGIN
    -- Get agent-specific context if agent_id is provided
    IF p_agent_id IS NOT NULL THEN
        agent_context := get_agent_knowledge_base_context(p_agent_id, p_max_tokens / 3);
        IF agent_context IS NOT NULL THEN
            agent_tokens := LENGTH(agent_context) / 4;
            total_tokens := agent_tokens;
        END IF;
    END IF;
    
    -- Get thread-specific context with remaining tokens
    remaining_tokens := p_max_tokens - total_tokens;
    thread_context := get_knowledge_base_context(p_thread_id, remaining_tokens);
    IF thread_context IS NOT NULL THEN
        thread_tokens := LENGTH(thread_context) / 4;
        total_tokens := total_tokens + thread_tokens;
    END IF;
    
    -- Get global knowledge base context with remaining tokens
    remaining_tokens := p_max_tokens - total_tokens;
    IF remaining_tokens > 0 THEN
        -- Get account_id from thread
        SELECT account_id INTO thread_account_id FROM threads WHERE thread_id = p_thread_id;
        
        IF thread_account_id IS NOT NULL THEN
            -- Try multiple approaches to handle the account_id conversion
            BEGIN
                -- First, try to get the user's account_id from basejump.accounts table
                SELECT id::VARCHAR(255) INTO user_account_id 
                FROM basejump.accounts 
                WHERE id = thread_account_id 
                AND personal_account = TRUE 
                LIMIT 1;
            EXCEPTION
                WHEN OTHERS THEN
                    -- If that fails, use the thread_account_id as string
                    user_account_id := thread_account_id::VARCHAR(255);
            END;
            
            -- If we still don't have a user_account_id, use the thread_account_id
            IF user_account_id IS NULL THEN
                user_account_id := thread_account_id::VARCHAR(255);
            END IF;
            
            -- Try to find global knowledge base entries with multiple account_id formats
            FOR entry_record IN
                SELECT 
                    name,
                    description,
                    content,
                    content_tokens
                FROM global_knowledge_base_entries
                WHERE (account_id = user_account_id OR account_id = thread_account_id::VARCHAR(255))
                AND is_active = TRUE
                AND usage_context IN ('always', 'contextual')
                ORDER BY created_at DESC
            LOOP
                estimated_tokens := COALESCE(entry_record.content_tokens, LENGTH(entry_record.content) / 4);
                
                IF global_tokens + estimated_tokens > remaining_tokens THEN
                    EXIT;
                END IF;
                
                global_context := global_context || E'\n\n## Global Knowledge: ' || entry_record.name || E'\n';
                
                IF entry_record.description IS NOT NULL AND entry_record.description != '' THEN
                    global_context := global_context || entry_record.description || E'\n\n';
                END IF;
                
                global_context := global_context || entry_record.content;
                
                global_tokens := global_tokens + estimated_tokens;
            END LOOP;
            
            IF global_context != '' THEN
                global_context := E'# GLOBAL KNOWLEDGE BASE\n\nThe following is your global knowledge base. Use this information as context when responding:' || global_context;
            END IF;
        END IF;
    END IF;
    
    -- Combine contexts
    IF agent_context IS NOT NULL AND thread_context IS NOT NULL AND global_context != '' THEN
        context_text := agent_context || E'\n\n' || thread_context || E'\n\n' || global_context;
    ELSIF agent_context IS NOT NULL AND global_context != '' THEN
        context_text := agent_context || E'\n\n' || global_context;
    ELSIF thread_context IS NOT NULL AND global_context != '' THEN
        context_text := thread_context || E'\n\n' || global_context;
    ELSIF agent_context IS NOT NULL AND thread_context IS NOT NULL THEN
        context_text := agent_context || E'\n\n' || thread_context;
    ELSIF agent_context IS NOT NULL THEN
        context_text := agent_context;
    ELSIF thread_context IS NOT NULL THEN
        context_text := thread_context;
    ELSIF global_context != '' THEN
        context_text := global_context;
    END IF;
    
    RETURN context_text;
END;
$$;

-- Update the comment
COMMENT ON FUNCTION get_combined_knowledge_base_context IS 'Generates combined agent, thread, and global knowledge base context';

COMMIT; 