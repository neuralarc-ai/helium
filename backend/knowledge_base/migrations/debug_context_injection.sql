-- Debug context injection for specific thread
-- This will help us identify why the context is not being injected

-- 1. Check if the thread exists and get its account_id
SELECT 
    'Thread Info' as check_type,
    thread_id,
    account_id,
    account_id::VARCHAR(255) as account_id_varchar,
    created_at
FROM threads 
WHERE thread_id = 'd8d6b94b-4c78-4ea4-a646-8abe650d46a7';

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
    LENGTH(content) as content_length,
    LEFT(content, 200) as content_preview
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

-- 4. Test the function directly with the specific thread ID
SELECT 
    'Function Test - Dash CRM Context' as test_type,
    CASE 
        WHEN get_combined_knowledge_base_context('d8d6b94b-4c78-4ea4-a646-8abe650d46a7'::UUID, NULL, 4000) LIKE '%dash%' 
        OR get_combined_knowledge_base_context('d8d6b94b-4c78-4ea4-a646-8abe650d46a7'::UUID, NULL, 4000) LIKE '%crm%'
        OR get_combined_knowledge_base_context('d8d6b94b-4c78-4ea4-a646-8abe650d46a7'::UUID, NULL, 4000) LIKE '%Global Knowledge%'
        THEN '✅ SUCCESS: Dash CRM content found in context'
        ELSE '❌ FAILED: No Dash CRM content found in context'
    END as result;

-- 5. Get a preview of the actual context (first 1000 characters)
SELECT 
    'Context Preview' as test_type,
    LEFT(get_combined_knowledge_base_context('d8d6b94b-4c78-4ea4-a646-8abe650d46a7'::UUID, NULL, 4000), 1000) as context_preview;

-- 6. Check if there are any global knowledge base entries for the account
WITH thread_info AS (
    SELECT account_id, account_id::VARCHAR(255) as account_id_varchar
    FROM threads 
    WHERE thread_id = 'd8d6b94b-4c78-4ea4-a646-8abe650d46a7'
)
SELECT 
    'Global KB Entries for Account' as test_type,
    t.account_id,
    t.account_id_varchar,
    COUNT(g.entry_id) as total_entries,
    COUNT(CASE WHEN g.is_active = TRUE THEN 1 END) as active_entries,
    COUNT(CASE WHEN g.usage_context IN ('always', 'contextual') THEN 1 END) as contextual_entries
FROM thread_info t
LEFT JOIN global_knowledge_base_entries g ON (
    g.account_id = t.account_id_varchar 
    OR g.account_id = t.account_id::VARCHAR(255)
)
GROUP BY t.account_id, t.account_id_varchar; 