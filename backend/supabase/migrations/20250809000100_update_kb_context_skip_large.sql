-- Update get_knowledge_base_context to SKIP oversized entries instead of exiting the loop
-- This prevents a single large PDF from blocking all context injection

BEGIN;

CREATE OR REPLACE FUNCTION get_knowledge_base_context(
    p_thread_id UUID,
    p_max_tokens INTEGER DEFAULT 4000
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
        SELECT 
            name,
            description,
            content,
            content_tokens
        FROM knowledge_base_entries
        WHERE thread_id = p_thread_id
          AND is_active = TRUE
          AND usage_context IN ('always', 'contextual')
        ORDER BY created_at DESC
    LOOP
        -- Estimate tokens (fallback to rough char/4)
        estimated_tokens := COALESCE(entry_record.content_tokens, LENGTH(entry_record.content) / 4);

        -- If this single entry is bigger than the entire budget, skip instead of exiting
        IF estimated_tokens > p_max_tokens THEN
            CONTINUE;
        END IF;

        -- If adding this would overflow, skip and try the next entry
        IF current_tokens + estimated_tokens > p_max_tokens THEN
            CONTINUE;
        END IF;

        -- Append entry content
        context_text := context_text || E'\n\n## Knowledge Base: ' || entry_record.name || E'\n';
        IF entry_record.description IS NOT NULL AND entry_record.description <> '' THEN
            context_text := context_text || entry_record.description || E'\n\n';
        END IF;
        context_text := context_text || entry_record.content;

        current_tokens := current_tokens + estimated_tokens;

        -- Log usage (best-effort)
        BEGIN
            INSERT INTO knowledge_base_usage_log (entry_id, thread_id, usage_type, tokens_used)
            SELECT entry_id, p_thread_id, 'context_injection', estimated_tokens
            FROM knowledge_base_entries
            WHERE thread_id = p_thread_id AND name = entry_record.name
            ORDER BY created_at DESC
            LIMIT 1;
        EXCEPTION WHEN OTHERS THEN
            -- Ignore logging errors
            NULL;
        END;
    END LOOP;

    RETURN CASE 
        WHEN context_text = '' THEN NULL
        ELSE E'# KNOWLEDGE BASE CONTEXT\n\nThe following information is from your knowledge base and should be used as reference when responding to the user:' || context_text
    END;
END;
$$;

COMMIT;


