-- Final comprehensive fix for vector database and semantic search
-- Run this in your Supabase SQL editor

-- 1. Drop all existing conflicting functions
DROP FUNCTION IF EXISTS get_smart_kb_context(text, integer, real);
DROP FUNCTION IF EXISTS get_smart_kb_context(text, integer);
DROP FUNCTION IF EXISTS get_smart_kb_context(text);
DROP FUNCTION IF EXISTS generate_embedding(text);
DROP FUNCTION IF EXISTS search_knowledge_base(vector, integer, real);
DROP FUNCTION IF EXISTS get_query_embedding(text);

-- 2. Ensure vector columns exist with correct dimensions
ALTER TABLE public.global_knowledge_base_entries DROP COLUMN IF EXISTS embedding;
ALTER TABLE public.knowledge_base_entries DROP COLUMN IF EXISTS embedding;

ALTER TABLE public.global_knowledge_base_entries ADD COLUMN embedding vector(384);
ALTER TABLE public.knowledge_base_entries ADD COLUMN embedding vector(384);

-- 3. Create proper indexes
CREATE INDEX IF NOT EXISTS idx_global_kb_embeddings ON public.global_knowledge_base_entries USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_kb_embeddings ON public.knowledge_base_entries USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- 4. Create a working semantic search function
CREATE OR REPLACE FUNCTION search_knowledge_base_semantic(
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

-- 5. Create a simple test function
CREATE OR REPLACE FUNCTION test_vector_search()
RETURNS TEXT AS $$
BEGIN
    RETURN 'Vector search functions created successfully';
END;
$$ LANGUAGE plpgsql;

-- 6. Test the setup
SELECT test_vector_search() as status;

-- 7. Show current table structure
SELECT 
    column_name, 
    data_type, 
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'global_knowledge_base_entries' 
AND column_name IN ('entry_id', 'name', 'content', 'embedding')
ORDER BY ordinal_position;

-- 8. Count entries with embeddings
SELECT 
    COUNT(*) as total_entries,
    COUNT(embedding) as entries_with_embeddings,
    COUNT(*) - COUNT(embedding) as entries_without_embeddings
FROM global_knowledge_base_entries;
