-- Detailed debugging for global knowledge base issue
-- This will help us identify exactly why the entries are not being found

-- 1. Check if the thread exists and get its account_id
SELECT 
    'Thread Info' as test_type,
    thread_id,
    account_id,
    account_id::VARCHAR(255) as account_id_as_varchar,
    created_at
FROM threads 
WHERE thread_id = 'b2f7ceb0-d5e6-4e87-9f7a-1ee8acb38f90';

-- 2. Check if there are any global knowledge base entries at all
SELECT 
    'Global KB Summary' as test_type,
    COUNT(*) as total_entries,
    COUNT(CASE WHEN is_active = TRUE THEN 1 END) as active_entries,
    COUNT(CASE WHEN usage_context IN ('always', 'contextual') THEN 1 END) as contextual_entries
FROM global_knowledge_base_entries;

-- 3. Check what account_ids exist in global_knowledge_base_entries
SELECT 
    'Global KB Account IDs' as test_type,
    account_id,
    COUNT(*) as entry_count,
    MIN(created_at) as first_entry,
    MAX(created_at) as last_entry
FROM global_knowledge_base_entries
GROUP BY account_id
ORDER BY entry_count DESC;

-- 4. Check for Dash CRM entries specifically
SELECT 
    'Dash CRM Entries' as test_type,
    entry_id,
    name,
    description,
    account_id,
    usage_context,
    is_active,
    created_at,
    LENGTH(content) as content_length
FROM global_knowledge_base_entries
WHERE name ILIKE '%dash%' OR name ILIKE '%crm%' OR description ILIKE '%dash%' OR description ILIKE '%crm%'
ORDER BY created_at DESC;

-- 5. Test the account_id conversion logic manually
-- First, get the thread account_id
WITH thread_info AS (
    SELECT account_id, account_id::VARCHAR(255) as account_id_varchar
    FROM threads 
    WHERE thread_id = 'b2f7ceb0-d5e6-4e87-9f7a-1ee8acb38f90'
)
SELECT 
    'Account ID Conversion Test' as test_type,
    t.account_id,
    t.account_id_varchar,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM global_knowledge_base_entries 
            WHERE account_id = t.account_id_varchar 
            AND is_active = TRUE 
            AND usage_context IN ('always', 'contextual')
        ) THEN '✅ Found entries with VARCHAR conversion'
        ELSE '❌ No entries found with VARCHAR conversion'
    END as varchar_test,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM global_knowledge_base_entries 
            WHERE account_id = t.account_id::VARCHAR(255)
            AND is_active = TRUE 
            AND usage_context IN ('always', 'contextual')
        ) THEN '✅ Found entries with direct cast'
        ELSE '❌ No entries found with direct cast'
    END as direct_cast_test
FROM thread_info t;

-- 6. Check if there are any entries for the specific account (using the actual account_id from step 1)
-- This will be populated based on the account_id found in step 1
-- SELECT 
--     'Entries for Specific Account' as test_type,
--     entry_id,
--     name,
--     description,
--     usage_context,
--     is_active,
--     created_at
-- FROM global_knowledge_base_entries
-- WHERE account_id = 'REPLACE_WITH_ACTUAL_ACCOUNT_ID_FROM_STEP_1'
-- AND is_active = TRUE
-- AND usage_context IN ('always', 'contextual')
-- ORDER BY created_at DESC;

-- 7. Test the function step by step
SELECT 
    'Function Step Test' as test_type,
    CASE 
        WHEN get_combined_knowledge_base_context('b2f7ceb0-d5e6-4e87-9f7a-1ee8acb38f90'::UUID, NULL, 4000) IS NULL 
        THEN '❌ Function returned NULL'
        WHEN get_combined_knowledge_base_context('b2f7ceb0-d5e6-4e87-9f7a-1ee8acb38f90'::UUID, NULL, 4000) = '' 
        THEN '❌ Function returned empty string'
        ELSE '✅ Function returned content'
    END as function_result,
    LENGTH(get_combined_knowledge_base_context('b2f7ceb0-d5e6-4e87-9f7a-1ee8acb38f90'::UUID, NULL, 4000)) as content_length; 