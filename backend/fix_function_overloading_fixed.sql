-- Fix function overloading for get_smart_kb_context (FIXED VERSION)
-- Run this in your Supabase SQL editor

-- 1. First, let's see what functions exist with this name
SELECT 
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments,
    pg_get_function_result(p.oid) as return_type,
    p.oid
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'get_smart_kb_context'
AND n.nspname = 'public';

-- 2. Drop ALL existing functions with this name (regardless of signature)
-- FIXED: Use p.oid to be specific about which table's oid we want
DO $$
DECLARE
    func_record RECORD;
BEGIN
    FOR func_record IN
        SELECT p.oid::regprocedure AS funcsig
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE p.proname = 'get_smart_kb_context'
        AND n.nspname = 'public'
    LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || func_record.funcsig || ' CASCADE';
        RAISE NOTICE 'Dropped function: %', func_record.funcsig;
    END LOOP;
END $$;

-- 3. Also drop any other related functions that might cause conflicts
DROP FUNCTION IF EXISTS get_relevant_kb_context(TEXT, vector, INTEGER, FLOAT) CASCADE;
DROP FUNCTION IF EXISTS get_relevant_kb_context(TEXT, vector(1536), INTEGER, FLOAT) CASCADE;
DROP FUNCTION IF EXISTS get_relevant_kb_context(TEXT, vector(384), INTEGER, FLOAT) CASCADE;
DROP FUNCTION IF EXISTS generate_embedding(TEXT) CASCADE;

-- 4. Now create the clean, single function with clear signature
CREATE OR REPLACE FUNCTION get_smart_kb_context(
    query_text TEXT,
    max_results INTEGER DEFAULT 5,
    similarity_threshold REAL DEFAULT 0.3
)
RETURNS TABLE(
    entry_id UUID,
    name TEXT,
    content TEXT,
    similarity REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        g.entry_id,
        g.name,
        g.content,
        (g.embedding <=> query_embedding.embedding) AS similarity
    FROM 
        global_knowledge_base_entries g,
        (SELECT embedding FROM generate_embedding(query_text)) AS query_embedding
    WHERE 
        g.embedding IS NOT NULL
        AND (g.embedding <=> query_embedding.embedding) < similarity_threshold
    ORDER BY 
        similarity ASC
    LIMIT max_results;
END;
$$ LANGUAGE plpgsql;

-- 5. Create the generate_embedding function
CREATE OR REPLACE FUNCTION generate_embedding(text_content TEXT)
RETURNS TABLE(embedding vector(384)) AS $$
BEGIN
    -- This function will be called by the application to generate embeddings
    -- The actual embedding generation happens in Python using Sentence Transformers
    -- This is just a placeholder for the database function
    RETURN QUERY SELECT NULL::vector(384);
END;
$$ LANGUAGE plpgsql;

-- 6. Grant permissions
GRANT EXECUTE ON FUNCTION get_smart_kb_context(TEXT, INTEGER, REAL) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION generate_embedding(TEXT) TO authenticated, service_role;

-- 7. Verify the fix - should only show one function now
SELECT 
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments,
    pg_get_function_result(p.oid) as return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'get_smart_kb_context'
AND n.nspname = 'public';

-- 8. Test the function (this will return empty results until embeddings are generated)
SELECT * FROM get_smart_kb_context('test query', 5, 0.3);
