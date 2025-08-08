-- Quick test for knowledge base issue
-- Run these queries to debug the issue

-- 1. Check if the thread exists and get its account_id
SELECT 
    'Thread Info' as test_type,
    thread_id,
    account_id,
    created_at
FROM threads 
WHERE thread_id = '0756806e-8d95-4710-900e-7269a72ae4ef';

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
WHERE is_active = TRUE 
AND usage_context IN ('always', 'contextual')
GROUP BY account_id
ORDER BY entry_count DESC;

-- 4. Check if there are any entries for the specific account (try both UUID and VARCHAR)
WITH thread_info AS (
    SELECT account_id 
    FROM threads 
    WHERE thread_id = '0756806e-8d95-4710-900e-7269a72ae4ef'
)
SELECT 
    'Matching Entries' as test_type,
    gkbe.entry_id,
    gkbe.name,
    gkbe.account_id as entry_account_id,
    ti.account_id as thread_account_id,
    gkbe.usage_context,
    gkbe.is_active
FROM global_knowledge_base_entries gkbe
CROSS JOIN thread_info ti
WHERE (gkbe.account_id = ti.account_id::VARCHAR(255) OR gkbe.account_id = ti.account_id)
AND gkbe.is_active = TRUE 
AND gkbe.usage_context IN ('always', 'contextual'); 