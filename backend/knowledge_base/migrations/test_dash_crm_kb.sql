-- Test script to verify Dash CRM global knowledge base is working
-- Run these queries to check if the fix is working

-- 1. Check if the thread exists and get its account_id
SELECT 
    'Thread Info' as test_type,
    thread_id,
    account_id,
    created_at
FROM threads 
WHERE thread_id = 'b2f7ceb0-d5e6-4e87-9f7a-1ee8acb38f90';

-- 2. Check if there are any global knowledge base entries for Dash CRM
SELECT 
    'Dash CRM Global KB Entries' as test_type,
    entry_id,
    name,
    description,
    usage_context,
    is_active,
    created_at,
    LENGTH(content) as content_length
FROM global_knowledge_base_entries
WHERE name ILIKE '%dash%' OR name ILIKE '%crm%' OR description ILIKE '%dash%' OR description ILIKE '%crm%'
ORDER BY created_at DESC;

-- 3. Check all global knowledge base entries for the account (replace with actual account_id from step 1)
-- Uncomment and replace 'YOUR_ACCOUNT_ID' with the actual account_id from step 1
-- SELECT 
--     'All Global KB Entries for Account' as test_type,
--     entry_id,
--     name,
--     description,
--     usage_context,
--     is_active,
--     created_at
-- FROM global_knowledge_base_entries
-- WHERE account_id = 'YOUR_ACCOUNT_ID'
-- AND is_active = TRUE
-- AND usage_context IN ('always', 'contextual')
-- ORDER BY created_at DESC;

-- 4. Test the function directly with your thread ID
SELECT 
    'Function Test - Dash CRM Context' as test_type,
    CASE 
        WHEN get_combined_knowledge_base_context('b2f7ceb0-d5e6-4e87-9f7a-1ee8acb38f90'::UUID, NULL, 4000) LIKE '%dash%' 
        OR get_combined_knowledge_base_context('b2f7ceb0-d5e6-4e87-9f7a-1ee8acb38f90'::UUID, NULL, 4000) LIKE '%crm%'
        OR get_combined_knowledge_base_context('b2f7ceb0-d5e6-4e87-9f7a-1ee8acb38f90'::UUID, NULL, 4000) LIKE '%Global Knowledge%'
        THEN '✅ SUCCESS: Dash CRM content found in context'
        ELSE '❌ FAILED: No Dash CRM content found in context'
    END as result;

-- 5. Get a preview of the actual context (first 1000 characters)
SELECT 
    'Context Preview' as test_type,
    LEFT(get_combined_knowledge_base_context('b2f7ceb0-d5e6-4e87-9f7a-1ee8acb38f90'::UUID, NULL, 4000), 1000) as context_preview; 