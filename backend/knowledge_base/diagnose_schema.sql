-- Schema Diagnostic Script
-- Run this to check what's happening with your database schema

-- 1. Check if the table exists
SELECT 
    'Table exists' as check_type,
    EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'global_knowledge_base_entries'
    ) as result;

-- 2. Check table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'global_knowledge_base_entries'
ORDER BY ordinal_position;

-- 3. Check if vector extension is enabled
SELECT 
    'Vector extension' as check_type,
    extname as extension_name,
    extversion as version
FROM pg_extension 
WHERE extname = 'vector';

-- 4. Check table constraints
SELECT 
    constraint_name,
    constraint_type,
    table_name
FROM information_schema.table_constraints 
WHERE table_schema = 'public' 
AND table_name = 'global_knowledge_base_entries';

-- 5. Check for any recent schema changes
SELECT 
    n.nspname as schema_name,
    c.relname as table_name,
    a.attname as column_name,
    a.atttypid::regtype as data_type
FROM pg_attribute a
JOIN pg_class c ON a.attrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public' 
AND c.relname = 'global_knowledge_base_entries'
AND a.attnum > 0
ORDER BY a.attnum;

-- 6. Check if there are any schema cache issues
-- This might help identify Supabase-specific problems
SELECT 
    'Schema cache check' as check_type,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_proc 
            WHERE proname = 'schema_cache_clear'
        ) THEN 'schema_cache_clear function exists'
        ELSE 'schema_cache_clear function not found'
    END as result;
