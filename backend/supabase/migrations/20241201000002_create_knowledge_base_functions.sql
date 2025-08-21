-- Migration: Create Knowledge Base Functions and Triggers
-- This migration creates the functions and triggers for the knowledge base system

BEGIN;

-- 1. TRIGGER FUNCTIONS (Automatic token calculation and timestamp updates)
CREATE OR REPLACE FUNCTION calculate_kb_entry_tokens()
RETURNS TRIGGER AS $$
BEGIN
    NEW.content_tokens = LENGTH(NEW.content) / 4;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_kb_entry_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    IF NEW.content != OLD.content THEN
        NEW.content_tokens = LENGTH(NEW.content) / 4;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. APPLY TRIGGERS to all KB tables
CREATE TRIGGER trigger_global_kb_entries_calculate_tokens 
    BEFORE INSERT ON global_knowledge_base_entries 
    FOR EACH ROW EXECUTE FUNCTION calculate_kb_entry_tokens();

CREATE TRIGGER trigger_global_kb_entries_updated_at 
    BEFORE UPDATE ON global_knowledge_base_entries 
    FOR EACH ROW EXECUTE FUNCTION update_kb_entry_timestamp();

CREATE TRIGGER trigger_kb_entries_calculate_tokens 
    BEFORE INSERT ON knowledge_base_entries 
    FOR EACH ROW EXECUTE FUNCTION calculate_kb_entry_tokens();

CREATE TRIGGER trigger_kb_entries_updated_at 
    BEFORE UPDATE ON knowledge_base_entries 
    FOR EACH ROW EXECUTE FUNCTION update_kb_entry_timestamp();

CREATE TRIGGER trigger_agent_kb_entries_calculate_tokens 
    BEFORE INSERT ON agent_knowledge_base_entries 
    FOR EACH ROW EXECUTE FUNCTION calculate_kb_entry_tokens();

CREATE TRIGGER trigger_agent_kb_entries_updated_at 
    BEFORE UPDATE ON agent_knowledge_base_entries 
    FOR EACH ROW EXECUTE FUNCTION update_kb_entry_timestamp();

-- 3. CORE FUNCTIONS (Essential knowledge base retrieval)
-- Main RAG-based retrieval function
CREATE OR REPLACE FUNCTION get_relevant_kb_context(
    p_query TEXT,
    p_max_tokens INTEGER DEFAULT 4000,
    p_similarity_threshold FLOAT DEFAULT 0.1
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
    similarity_score FLOAT;
    relevant_entries TEXT := '';
    total_entries_found INTEGER := 0;
BEGIN
    -- Find entries with high similarity to the query
    FOR entry_record IN
        SELECT
            name, description, content, content_tokens,
            similarity(p_query, name) as name_similarity,
            similarity(p_query, COALESCE(description, '')) as desc_similarity,
            similarity(p_query, content) as content_similarity
        FROM global_knowledge_base_entries
        WHERE is_active = TRUE
        AND usage_context IN ('always', 'contextual')
        ORDER BY
            GREATEST(
                similarity(p_query, name),
                similarity(p_query, COALESCE(description, '')),
                similarity(p_query, content)
            ) DESC,
            created_at DESC
    LOOP
        -- Calculate overall similarity score
        similarity_score = GREATEST(
            entry_record.name_similarity,
            entry_record.desc_similarity,
            entry_record.content_similarity
        );
        
        -- Only include entries that meet the similarity threshold
        IF similarity_score >= p_similarity_threshold THEN
            total_entries_found := total_entries_found + 1;
            
            -- Estimate tokens for this entry
            estimated_tokens := COALESCE(entry_record.content_tokens, LENGTH(entry_record.content) / 4);
            
            -- Check if adding this entry would exceed the token limit
            IF current_tokens + estimated_tokens <= p_max_tokens THEN
                -- Add entry to context with similarity score
                relevant_entries := relevant_entries || E'\n\n## Relevant Knowledge: ' || entry_record.name || E' (Relevance: ' || ROUND(similarity_score * 100, 1) || '%)';
                
                IF entry_record.description IS NOT NULL AND entry_record.description != '' THEN
                    relevant_entries := relevant_entries || E'\n\n' || entry_record.description;
                END IF;
                
                relevant_entries := relevant_entries || E'\n\n' || entry_record.content;
                current_tokens := current_tokens + estimated_tokens;
            ELSE
                EXIT;
            END IF;
        END IF;
    END LOOP;
    
    -- Format the final context
    IF relevant_entries != '' THEN
        context_text := E'# RELEVANT KNOWLEDGE BASE CONTENT\n\n';
        context_text := context_text || E'Based on your query: "' || p_query || E'"\n';
        context_text := context_text || E'Found ' || total_entries_found || E' relevant entries from your knowledge base.\n';
        context_text := context_text || E'Use this information as context when responding:\n\n';
        context_text := context_text || relevant_entries;
        
        -- Add instructions for the agent
        context_text := context_text || E'\n\n🚨 KNOWLEDGE BASE INSTRUCTIONS 🚨\n';
        context_text := context_text || E'1. Use the above knowledge base content as your PRIMARY source of information\n';
        context_text := context_text || E'2. Reference the specific knowledge base entries in your response\n';
        context_text := context_text || E'3. Only search the web if the knowledge base doesn\'t contain the specific information needed\n';
        context_text := context_text || E'4. Do NOT create new files - use the existing data from your knowledge base\n';
    ELSE
        context_text := E'# KNOWLEDGE BASE STATUS\n\n';
        context_text := context_text || E'No relevant knowledge base content found for your query: "' || p_query || E'"\n';
        context_text := context_text || E'You may proceed with web search or other tools as needed.\n';
    END IF;
    
    RETURN context_text;
END;
$$;

-- Thread-specific knowledge base context
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
        IF entry_record.description IS NOT NULL AND entry_record.description != '' THEN
            context_text := context_text || entry_record.description || E'\n\n';
        END IF;
        context_text := context_text || entry_record.content;
        current_tokens := current_tokens + estimated_tokens;
    END LOOP;
    
    RETURN CASE WHEN context_text = '' THEN NULL
        ELSE E'# KNOWLEDGE BASE CONTEXT\n\nThe following information is from your knowledge base and should be used as reference when responding to the user:' || context_text 
    END;
END;
$$;

-- Agent knowledge base context
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
BEGIN
    FOR entry_record IN
        SELECT name, description, content, content_tokens
        FROM agent_knowledge_base_entries
        WHERE agent_id = p_agent_id
        AND is_active = TRUE
        AND usage_context IN ('always', 'contextual')
        ORDER BY created_at DESC
    LOOP
        estimated_tokens := COALESCE(entry_record.content_tokens, LENGTH(entry_record.content) / 4);
        IF estimated_tokens > p_max_tokens THEN CONTINUE; END IF;
        IF current_tokens + estimated_tokens > p_max_tokens THEN CONTINUE; END IF;
        
        context_text := context_text || E'\n\n## Agent Knowledge Base: ' || entry_record.name || E'\n';
        IF entry_record.description IS NOT NULL AND entry_record.description != '' THEN
            context_text := context_text || entry_record.description || E'\n\n';
        END IF;
        context_text := context_text || entry_record.content;
        current_tokens := current_tokens + estimated_tokens;
    END LOOP;
    
    RETURN CASE WHEN context_text = '' THEN NULL
        ELSE E'# AGENT KNOWLEDGE BASE CONTEXT\n\nThe following information is from your agent\'s knowledge base and should be used as reference when responding to the user:' || context_text 
    END;
END;
$$;

-- Combined knowledge base context
CREATE OR REPLACE FUNCTION get_combined_knowledge_base_context(
    p_query TEXT,
    p_thread_id UUID,
    p_agent_id UUID,
    p_max_tokens INTEGER DEFAULT 16000
)
RETURNS TEXT
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
    global_kb_context TEXT;
    thread_kb_context TEXT;
    agent_kb_context TEXT;
    combined_context TEXT := '';
    current_tokens INTEGER := 0;
    global_kb_tokens INTEGER := 0;
    thread_kb_tokens INTEGER := 0;
    agent_kb_tokens INTEGER := 0;
BEGIN
    -- Get global KB context
    global_kb_context := get_relevant_kb_context(p_query, p_max_tokens);
    IF global_kb_context IS NOT NULL THEN
        global_kb_tokens := LENGTH(global_kb_context) / 4;
        combined_context := combined_context || global_kb_context;
        current_tokens := current_tokens + global_kb_tokens;
    END IF;

    -- Get thread-specific KB context if tokens allow
    IF current_tokens < p_max_tokens THEN
        thread_kb_context := get_knowledge_base_context(p_thread_id, p_max_tokens - current_tokens);
        IF thread_kb_context IS NOT NULL THEN
            thread_kb_tokens := LENGTH(thread_kb_context) / 4;
            combined_context := combined_context || E'\n\n' || thread_kb_context;
            current_tokens := current_tokens + thread_kb_tokens;
        END IF;
    END IF;

    -- Get agent-specific KB context if tokens allow
    IF current_tokens < p_max_tokens THEN
        agent_kb_context := get_agent_knowledge_base_context(p_agent_id, p_max_tokens - current_tokens);
        IF agent_kb_context IS NOT NULL THEN
            agent_kb_tokens := LENGTH(agent_kb_context) / 4;
            combined_context := combined_context || E'\n\n' || agent_kb_context;
            current_tokens := current_tokens + agent_kb_tokens;
        END IF;
    END IF;

    RETURN combined_context;
END;
$$;

COMMIT;
