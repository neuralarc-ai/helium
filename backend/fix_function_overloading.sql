-- Fix function overloading issue for get_smart_kb_context
-- Drop both versions and recreate with a single, clear signature

BEGIN;

-- Drop both versions of the function
DROP FUNCTION IF EXISTS get_smart_kb_context(p_thread_id UUID, p_query TEXT, p_max_tokens INTEGER);
DROP FUNCTION IF EXISTS get_smart_kb_context(p_thread_id UUID, p_query TEXT, p_max_tokens INTEGER, p_thread_kb_tokens INTEGER, p_global_kb_tokens INTEGER);

-- Recreate with a single, clear signature
CREATE OR REPLACE FUNCTION get_smart_kb_context(
    p_thread_id UUID,
    p_query TEXT,
    p_max_tokens INTEGER DEFAULT 6000,
    p_thread_kb_tokens INTEGER DEFAULT 2000,
    p_global_kb_tokens INTEGER DEFAULT 4000
)
RETURNS TEXT
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
    combined_context TEXT := '';
    thread_context TEXT := '';
    global_context TEXT := '';
    total_tokens_used INTEGER := 0;
BEGIN
    -- Get thread-specific knowledge base context
    thread_context := get_thread_kb_context(p_thread_id, p_query, p_thread_kb_tokens);
    
    -- Get global knowledge base context
    global_context := get_relevant_kb_context(p_query, p_global_kb_tokens, 0.1);
    
    -- Combine the contexts intelligently
    IF thread_context <> '' AND global_context <> '' THEN
        combined_context := E'# COMBINED KNOWLEDGE BASE CONTEXT\n\n';
        combined_context := combined_context || E'## Thread-Specific Knowledge\n';
        combined_context := combined_context || thread_context;
        combined_context := combined_context || E'\n\n## Global Knowledge\n';
        combined_context := combined_context || global_context;
        
        -- Add combined instructions
        combined_context := combined_context || E'\n\n🚨 KNOWLEDGE BASE PRIORITY 🚨\n';
        combined_context := combined_context || E'1. Thread-specific knowledge takes PRIORITY for this conversation\n';
        combined_context := combined_context || E'2. Global knowledge provides additional context and background\n';
        combined_context := combined_context || E'3. Use BOTH sources when they complement each other\n';
        combined_context := combined_context || E'4. Do NOT create new files - use the existing data from your knowledge base\n';
        
    ELSIF thread_context <> '' THEN
        combined_context := thread_context;
        combined_context := combined_context || E'\n\n🚨 INSTRUCTIONS 🚨\n';
        combined_context := combined_context || E'Use the thread-specific knowledge above. Do NOT create new files.\n';
        
    ELSIF global_context <> '' THEN
        combined_context := global_context;
        combined_context := combined_context || E'\n\n🚨 INSTRUCTIONS 🚨\n';
        combined_context := combined_context || E'Use the global knowledge above. Do NOT create new files.\n';
        
    ELSE
        combined_context := E'# KNOWLEDGE BASE STATUS\n\n';
        combined_context := combined_context || E'No relevant knowledge base content found for your query: "' || p_query || E'"\n';
        combined_context := combined_context || E'You may proceed with web search or other tools as needed.\n';
    END IF;
    
    RETURN combined_context;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_smart_kb_context TO authenticated, service_role;

-- Add comment
COMMENT ON FUNCTION get_smart_kb_context IS 'Intelligently combines thread-specific and global knowledge base context with clear instructions';

COMMIT;
