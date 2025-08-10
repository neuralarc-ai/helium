-- Increase default max_tokens for context functions to 16000 (16k tokens)
-- Thread, Agent, and Combined functions are updated; they still accept explicit params

BEGIN;

-- Thread context default
CREATE OR REPLACE FUNCTION get_knowledge_base_context(
    p_thread_id UUID,
    p_max_tokens INTEGER DEFAULT 16000
)
RETURNS TEXT
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
    context_text TEXT := '';
    entry_record RECORD;
    current_tokens INTEGER := 0;
    estimated_tokens INTEGER;
BEGIN
    FOR entry_record IN
        SELECT name, description, content, content_tokens
        FROM knowledge_base_entries
        WHERE thread_id = p_thread_id
          AND is_active = TRUE
          AND usage_context IN ('always', 'contextual')
        ORDER BY created_at DESC
    LOOP
        estimated_tokens := COALESCE(entry_record.content_tokens, LENGTH(entry_record.content) / 4);
        IF estimated_tokens > p_max_tokens THEN CONTINUE; END IF;
        IF current_tokens + estimated_tokens > p_max_tokens THEN CONTINUE; END IF;
        context_text := context_text || E'\n\n## Knowledge Base: ' || entry_record.name || E'\n';
        IF entry_record.description IS NOT NULL AND entry_record.description <> '' THEN
            context_text := context_text || entry_record.description || E'\n\n';
        END IF;
        context_text := context_text || entry_record.content;
        current_tokens := current_tokens + estimated_tokens;
    END LOOP;
    RETURN CASE WHEN context_text = '' THEN NULL
        ELSE E'# KNOWLEDGE BASE CONTEXT\n\nThe following information is from your knowledge base and should be used as reference when responding to the user:' || context_text END;
END;
$$;

-- Agent context default
CREATE OR REPLACE FUNCTION get_agent_knowledge_base_context(
    p_agent_id UUID,
    p_max_tokens INTEGER DEFAULT 16000
)
RETURNS TEXT
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
    context_text TEXT := '';
    entry_record RECORD;
    current_tokens INTEGER := 0;
    estimated_tokens INTEGER;
    agent_name TEXT;
BEGIN
    SELECT name INTO agent_name FROM agents WHERE agent_id = p_agent_id;
    FOR entry_record IN
        SELECT entry_id, name, description, content, content_tokens
        FROM agent_knowledge_base_entries
        WHERE agent_id = p_agent_id AND is_active = TRUE AND usage_context IN ('always','contextual')
        ORDER BY created_at DESC
    LOOP
        estimated_tokens := COALESCE(entry_record.content_tokens, LENGTH(entry_record.content) / 4);
        IF estimated_tokens > p_max_tokens THEN CONTINUE; END IF;
        IF current_tokens + estimated_tokens > p_max_tokens THEN CONTINUE; END IF;
        context_text := context_text || E'\n\n## ' || entry_record.name || E'\n';
        IF entry_record.description IS NOT NULL AND entry_record.description <> '' THEN
            context_text := context_text || entry_record.description || E'\n\n';
        END IF;
        context_text := context_text || entry_record.content;
        current_tokens := current_tokens + estimated_tokens;
    END LOOP;
    RETURN CASE WHEN context_text = '' THEN NULL
        ELSE E'# AGENT KNOWLEDGE BASE\n\nThe following is your specialized knowledge base. Use this information as context when responding:' || context_text END;
END;
$$;

-- Combined context default
CREATE OR REPLACE FUNCTION get_combined_knowledge_base_context(
    p_thread_id UUID,
    p_agent_id UUID DEFAULT NULL,
    p_max_tokens INTEGER DEFAULT 16000
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
    IF p_agent_id IS NOT NULL THEN
        agent_context := get_agent_knowledge_base_context(p_agent_id, p_max_tokens / 3);
        IF agent_context IS NOT NULL THEN
            agent_tokens := LENGTH(agent_context) / 4;
            total_tokens := agent_tokens;
        END IF;
    END IF;
    remaining_tokens := p_max_tokens - total_tokens;
    IF remaining_tokens > 0 THEN
        thread_context := get_knowledge_base_context(p_thread_id, remaining_tokens);
        IF thread_context IS NOT NULL THEN
            thread_tokens := LENGTH(thread_context) / 4;
            total_tokens := total_tokens + thread_tokens;
        END IF;
    END IF;
    remaining_tokens := p_max_tokens - total_tokens;
    IF remaining_tokens > 0 THEN
        SELECT account_id INTO thread_account_id FROM threads WHERE thread_id = p_thread_id;
        IF thread_account_id IS NOT NULL THEN
            BEGIN
                SELECT id::VARCHAR(255) INTO user_account_id FROM basejump.accounts 
                WHERE id = thread_account_id AND personal_account = TRUE LIMIT 1;
            EXCEPTION WHEN OTHERS THEN user_account_id := thread_account_id::VARCHAR(255);
            END;
            IF user_account_id IS NULL THEN user_account_id := thread_account_id::VARCHAR(255); END IF;
            FOR entry_record IN
                SELECT name, description, content, content_tokens
                FROM global_knowledge_base_entries
                WHERE account_id = user_account_id AND is_active = TRUE AND usage_context IN ('always','contextual')
                ORDER BY created_at DESC
            LOOP
                estimated_tokens := COALESCE(entry_record.content_tokens, LENGTH(entry_record.content) / 4);
                IF estimated_tokens > remaining_tokens THEN CONTINUE; END IF;
                IF global_tokens + estimated_tokens > remaining_tokens THEN CONTINUE; END IF;
                global_context := global_context || E'\n\n## Global Knowledge: ' || entry_record.name || E'\n';
                IF entry_record.description IS NOT NULL AND entry_record.description <> '' THEN
                    global_context := global_context || entry_record.description || E'\n\n';
                END IF;
                global_context := global_context || entry_record.content;
                global_tokens := global_tokens + estimated_tokens;
            END LOOP;
            IF global_context <> '' THEN
                global_context := E'# GLOBAL KNOWLEDGE BASE\n\nThe following is your global knowledge base. Use this information as context when responding:' || global_context;
            END IF;
        END IF;
    END IF;
    IF agent_context IS NOT NULL AND thread_context IS NOT NULL AND global_context <> '' THEN
        context_text := agent_context || E'\n\n' || thread_context || E'\n\n' || global_context;
    ELSIF agent_context IS NOT NULL AND global_context <> '' THEN
        context_text := agent_context || E'\n\n' || global_context;
    ELSIF thread_context IS NOT NULL AND global_context <> '' THEN
        context_text := thread_context || E'\n\n' || global_context;
    ELSIF agent_context IS NOT NULL AND thread_context IS NOT NULL THEN
        context_text := agent_context || E'\n\n' || thread_context;
    ELSIF agent_context IS NOT NULL THEN
        context_text := agent_context;
    ELSIF thread_context IS NOT NULL THEN
        context_text := thread_context;
    ELSIF global_context <> '' THEN
        context_text := global_context;
    END IF;
    RETURN context_text;
END;
$$;

COMMIT;


