-- Test script to check current state of global knowledge base
-- Run these queries to debug the issue

-- 1. Check if the thread exists and get its account_id
SELECT 
    'Thread Info' as test_type,
    thread_id,
    account_id,
    created_at
FROM threads 
WHERE thread_id = 'b2f7ceb0-d5e6-4e87-9f7a-1ee8acb38f90';

-- 2. Check if there are any global knowledge base entries at all
SELECT 
    'Global KB Count' as test_type,
    COUNT(*) as total_entries,
    COUNT(CASE WHEN is_active = TRUE THEN 1 END) as active_entries,
    COUNT(CASE WHEN usage_context IN ('always', 'contextual') THEN 1 END) as contextual_entries
FROM global_knowledge_base_entries;

-- 3. Check what account_ids exist in global_knowledge_base_entries
SELECT 
    'Global KB Account IDs' as test_type,
    account_id,
    COUNT(*) as entry_count
FROM global_knowledge_base_entries
GROUP BY account_id;

-- 4. Check if there are any entries for the specific account (assuming we know the account_id from step 1)
-- Replace 'YOUR_ACCOUNT_ID' with the actual account_id from step 1
-- SELECT 
--     'Global KB Entries for Account' as test_type,
--     entry_id,
--     name,
--     description,
--     usage_context,
--     is_active,
--     created_at
-- FROM global_knowledge_base_entries
-- WHERE account_id = 'YOUR_ACCOUNT_ID'
-- AND is_active = TRUE
-- AND usage_context IN ('always', 'contextual');

-- 5. Test the function directly
SELECT 
    'Function Test' as test_type,
    get_combined_knowledge_base_context('b2f7ceb0-d5e6-4e87-9f7a-1ee8acb38f90'::UUID, NULL, 4000) as result; 