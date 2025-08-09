-- Check current status of global knowledge base and function
-- This will help us identify the exact issue

-- 1. Check if the thread exists
SELECT 
    'Thread exists' as check_type, 
    thread_id,
    account_id,
    account_id::VARCHAR(255) as account_id_varchar
FROM threads 
WHERE thread_id = 'fc7f8e42-0208-49a0-b8ba-93bd587057ae';

-- 2. Check if there are Dash CRM entries in global knowledge base
SELECT 
    'Dash CRM Global KB Entries' as check_type,
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

-- 3. Check if the function has the correct OR condition
SELECT 
    'Function Version Check' as test_type,
    CASE 
        WHEN pg_get_functiondef(oid) LIKE '%account_id = user_account_id OR account_id = thread_account_id::VARCHAR(255)%' 
        THEN '✅ NEW VERSION: Function has the OR condition (fix applied)'
        WHEN pg_get_functiondef(oid) LIKE '%account_id = user_account_id%' 
        THEN '❌ OLD VERSION: Function only has single condition (fix NOT applied)'
        ELSE '❓ UNKNOWN: Function structure unclear'
    END as version_status
FROM pg_proc 
WHERE proname = 'get_combined_knowledge_base_context'
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- 4. Test the function directly
SELECT 
    'Function Test' as test_type,
    CASE 
        WHEN get_combined_knowledge_base_context('fc7f8e42-0208-49a0-b8ba-93bd587057ae'::UUID, NULL, 4000) LIKE '%dash%' 
        OR get_combined_knowledge_base_context('fc7f8e42-0208-49a0-b8ba-93bd587057ae'::UUID, NULL, 4000) LIKE '%crm%'
        OR get_combined_knowledge_base_context('fc7f8e42-0208-49a0-b8ba-93bd587057ae'::UUID, NULL, 4000) LIKE '%Global Knowledge%'
        THEN '✅ SUCCESS: Dash CRM content found in context'
        ELSE '❌ FAILED: No Dash CRM content found in context'
    END as result; 