-- Detailed debugging script for knowledge base issue
-- This script helps identify why global knowledge base entries aren't being injected

-- 1. Check the specific thread
SELECT 
    'Thread Info' as info_type,
    thread_id,
    account_id,
    created_at
FROM threads 
WHERE thread_id = '0756806e-8d95-4710-900e-7269a72ae4ef';

-- 2. Check if global_knowledge_base_entries table exists and has data
SELECT 
    'Global KB Summary' as info_type,
    COUNT(*) as total_entries,
    COUNT(CASE WHEN is_active = TRUE THEN 1 END) as active_entries,
    COUNT(CASE WHEN usage_context IN ('always', 'contextual') THEN 1 END) as contextual_entries
FROM global_knowledge_base_entries;

-- 3. Check the structure of global_knowledge_base_entries table
SELECT 
    'Table Structure' as info_type,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'global_knowledge_base_entries' 
ORDER BY ordinal_position;

-- 4. Check sample global knowledge base entries
SELECT 
    'Sample Global Entries' as info_type,
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

-- 5. Check if there are any global entries for the specific account
-- First, get the account_id from the thread
WITH thread_account AS (
    SELECT account_id 
    FROM threads 
    WHERE thread_id = '0756806e-8d95-4710-900e-7269a72ae4ef'
)
SELECT 
    'Global Entries for Thread Account' as info_type,
    gkbe.entry_id,
    gkbe.account_id,
    gkbe.name,
    gkbe.usage_context,
    gkbe.is_active,
    gkbe.created_at
FROM global_knowledge_base_entries gkbe
CROSS JOIN thread_account ta
WHERE gkbe.account_id = ta.account_id::VARCHAR(255)
AND gkbe.is_active = TRUE 
AND gkbe.usage_context IN ('always', 'contextual');

-- 6. Check if there are any global entries for the account_id as UUID
WITH thread_account AS (
    SELECT account_id 
    FROM threads 
    WHERE thread_id = '0756806e-8d95-4710-900e-7269a72ae4ef'
)
SELECT 
    'Global Entries for Thread Account (UUID)' as info_type,
    gkbe.entry_id,
    gkbe.account_id,
    gkbe.name,
    gkbe.usage_context,
    gkbe.is_active,
    gkbe.created_at
FROM global_knowledge_base_entries gkbe
CROSS JOIN thread_account ta
WHERE gkbe.account_id = ta.account_id
AND gkbe.is_active = TRUE 
AND gkbe.usage_context IN ('always', 'contextual');

-- 7. Check if there are any global entries for the account_id as string
WITH thread_account AS (
    SELECT account_id 
    FROM threads 
    WHERE thread_id = '0756806e-8d95-4710-900e-7269a72ae4ef'
)
SELECT 
    'Global Entries for Thread Account (String)' as info_type,
    gkbe.entry_id,
    gkbe.account_id,
    gkbe.name,
    gkbe.usage_context,
    gkbe.is_active,
    gkbe.created_at
FROM global_knowledge_base_entries gkbe
CROSS JOIN thread_account ta
WHERE gkbe.account_id = ta.account_id::VARCHAR(255)
AND gkbe.is_active = TRUE 
AND gkbe.usage_context IN ('always', 'contextual');

-- 8. Check all global entries to see what account_ids exist
SELECT 
    'All Global Entries Account IDs' as info_type,
    account_id,
    COUNT(*) as entry_count
FROM global_knowledge_base_entries 
WHERE is_active = TRUE 
AND usage_context IN ('always', 'contextual')
GROUP BY account_id
ORDER BY entry_count DESC;

-- 9. Test the function step by step
-- First, check if the thread exists
SELECT 
    'Thread Exists' as info_type,
    CASE 
        WHEN EXISTS (SELECT 1 FROM threads WHERE thread_id = '0756806e-8d95-4710-900e-7269a72ae4ef') 
        THEN 'YES' 
        ELSE 'NO' 
    END as thread_exists;

-- 10. Check if the thread has an account_id
SELECT 
    'Thread Account ID' as info_type,
    account_id,
    CASE 
        WHEN account_id IS NOT NULL THEN 'HAS_ACCOUNT_ID'
        ELSE 'NO_ACCOUNT_ID'
    END as account_status
FROM threads 
WHERE thread_id = '0756806e-8d95-4710-900e-7269a72ae4ef'; 