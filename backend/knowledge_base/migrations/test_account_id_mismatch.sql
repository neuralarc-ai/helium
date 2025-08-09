-- Test account_id mismatch issue
-- This will help us identify why the context is not being injected

-- 1. Get the thread account_id
WITH thread_info AS (
    SELECT account_id, account_id::VARCHAR(255) as account_id_varchar
    FROM threads 
    WHERE thread_id = 'd8d6b94b-4c78-4ea4-a646-8abe650d46a7'
)
SELECT 
    'Thread Account ID' as test_type,
    t.account_id,
    t.account_id_varchar,
    t.account_id::TEXT as account_id_text
FROM thread_info t;

-- 2. Check what account_ids exist in global_knowledge_base_entries
SELECT 
    'Global KB Account IDs' as test_type,
    account_id,
    COUNT(*) as entry_count,
    MIN(created_at) as first_entry,
    MAX(created_at) as last_entry
FROM global_knowledge_base_entries
GROUP BY account_id
ORDER BY entry_count DESC;

-- 3. Test the exact account_id matching that the backend uses
WITH thread_info AS (
    SELECT account_id, account_id::VARCHAR(255) as account_id_varchar
    FROM threads 
    WHERE thread_id = 'd8d6b94b-4c78-4ea4-a646-8abe650d46a7'
)
SELECT 
    'Backend Style Matching' as test_type,
    t.account_id,
    t.account_id_varchar,
    COUNT(g.entry_id) as matching_entries
FROM thread_info t
LEFT JOIN global_knowledge_base_entries g ON g.account_id = t.account_id_varchar
WHERE g.is_active = TRUE AND g.usage_context IN ('always', 'contextual')
GROUP BY t.account_id, t.account_id_varchar;

-- 4. Test the function style matching
WITH thread_info AS (
    SELECT account_id, account_id::VARCHAR(255) as account_id_varchar
    FROM threads 
    WHERE thread_id = 'd8d6b94b-4c78-4ea4-a646-8abe650d46a7'
)
SELECT 
    'Function Style Matching' as test_type,
    t.account_id,
    t.account_id_varchar,
    COUNT(g.entry_id) as matching_entries
FROM thread_info t
LEFT JOIN global_knowledge_base_entries g ON (
    g.account_id = t.account_id_varchar 
    OR g.account_id = t.account_id::VARCHAR(255)
)
WHERE g.is_active = TRUE AND g.usage_context IN ('always', 'contextual')
GROUP BY t.account_id, t.account_id_varchar;

-- 5. Check if there are any Dash CRM entries at all
SELECT 
    'All Dash CRM Entries' as test_type,
    entry_id,
    name,
    description,
    account_id,
    usage_context,
    is_active,
    created_at
FROM global_knowledge_base_entries
WHERE name ILIKE '%dash%' OR name ILIKE '%crm%' OR description ILIKE '%dash%' OR description ILIKE '%crm%'
ORDER BY created_at DESC;

-- 6. Test the function directly with detailed output
SELECT 
    'Function Detailed Test' as test_type,
    CASE 
        WHEN get_combined_knowledge_base_context('d8d6b94b-4c78-4ea4-a646-8abe650d46a7'::UUID, NULL, 4000) IS NULL 
        THEN 'NULL result'
        WHEN get_combined_knowledge_base_context('d8d6b94b-4c78-4ea4-a646-8abe650d46a7'::UUID, NULL, 4000) = '' 
        THEN 'Empty result'
        WHEN get_combined_knowledge_base_context('d8d6b94b-4c78-4ea4-a646-8abe650d46a7'::UUID, NULL, 4000) LIKE '%dash%' 
        THEN 'Contains dash'
        WHEN get_combined_knowledge_base_context('d8d6b94b-4c78-4ea4-a646-8abe650d46a7'::UUID, NULL, 4000) LIKE '%crm%' 
        THEN 'Contains crm'
        WHEN get_combined_knowledge_base_context('d8d6b94b-4c78-4ea4-a646-8abe650d46a7'::UUID, NULL, 4000) LIKE '%Global Knowledge%' 
        THEN 'Contains Global Knowledge'
        ELSE 'Other content'
    END as function_result,
    LENGTH(get_combined_knowledge_base_context('d8d6b94b-4c78-4ea4-a646-8abe650d46a7'::UUID, NULL, 4000)) as content_length; 