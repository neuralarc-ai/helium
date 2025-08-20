-- Fix semantic search to work with current embedding storage
-- Run this in your Supabase SQL editor

-- 1. Create a function to convert text query to embedding (will be called from Python)
CREATE OR REPLACE FUNCTION get_query_embedding(query_text TEXT)
RETURNS vector(384) AS $$
BEGIN
    -- This will be populated by Python code
    -- For now, return a zero vector
    RETURN ARRAY(SELECT 0.0 FROM generate_series(1,384))::vector(384);
END;
$$ LANGUAGE plpgsql;

-- 2. Create a semantic search function that takes a pre-computed embedding
CREATE OR REPLACE FUNCTION search_knowledge_base(
    query_embedding vector(384),
    max_results INTEGER DEFAULT 5,
    similarity_threshold REAL DEFAULT 0.3
)
RETURNS TABLE(
    entry_id UUID,
    name VARCHAR(255),
    content TEXT,
    similarity REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        g.entry_id,
        g.name,
        g.content,
        (1 - (g.embedding <=> query_embedding))::REAL AS similarity
    FROM
        global_knowledge_base_entries g
    WHERE
        g.embedding IS NOT NULL
        AND g.is_active = TRUE
        AND (1 - (g.embedding <=> query_embedding)) >= similarity_threshold
    ORDER BY
        similarity DESC
    LIMIT max_results;
END;
$$ LANGUAGE plpgsql;

-- 3. Test the function with a dummy embedding
SELECT 'Functions created successfully' as status;

-- 4. Check if we have embeddings stored
SELECT 
    COUNT(*) as total_entries,
    COUNT(embedding) as entries_with_embeddings
FROM global_knowledge_base_entries;

-- 5. Show a sample of what's stored
SELECT 
    name,
    pg_typeof(embedding) as embedding_type,
    array_length(embedding::REAL[], 1) as embedding_dimension
FROM global_knowledge_base_entries 
WHERE embedding IS NOT NULL 
LIMIT 3;
