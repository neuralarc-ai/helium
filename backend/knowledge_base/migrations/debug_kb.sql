-- Debug script for knowledge base issue
-- This script helps identify why global knowledge base entries aren't being injected

-- 1. Check if global_knowledge_base_entries table exists and has data
SELECT 
    'global_knowledge_base_entries' as table_name,
    COUNT(*) as total_entries,
    COUNT(CASE WHEN is_active = TRUE THEN 1 END) as active_entries,
    COUNT(CASE WHEN usage_context IN ('always', 'contextual') THEN 1 END) as contextual_entries
FROM global_knowledge_base_entries;

-- 2. Check the structure of global_knowledge_base_entries table
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'global_knowledge_base_entries' 
ORDER BY ordinal_position;

-- 3. Check sample global knowledge base entries
SELECT 
    entry_id,
    account_id,
    name,
    usage_context,
    is_active,
    created_at
FROM global_knowledge_base_entries 
WHERE is_active = TRUE 
AND usage_context IN ('always', 'contextual')
LIMIT 5;

-- 4. Check threads table structure
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'threads' 
AND column_name = 'account_id';

-- 5. Check sample threads
SELECT 
    thread_id,
    account_id,
    created_at
FROM threads 
LIMIT 5;

-- 6. Test the function with a sample thread_id (replace with actual thread_id)
-- SELECT get_combined_knowledge_base_context('your-thread-id-here'::UUID, NULL, 4000);

-- 7. Check if there are any global entries for a specific account
-- Replace 'your-account-id' with an actual account_id from the threads table
-- SELECT * FROM global_knowledge_base_entries WHERE account_id = 'your-account-id' AND is_active = TRUE; 