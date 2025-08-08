-- Debug why Dash CRM content is missing from function output
-- This will help us identify the exact issue

-- 1. Check if Dash CRM entries exist and their details
SELECT 
    'Dash CRM Entries Check' as test_type,
    entry_id,
    name,
    description,
    account_id,
    usage_context,
    is_active,
    created_at,
    LENGTH(content) as content_length,
    CASE 
        WHEN name ILIKE '%dash%' THEN 'Name contains dash'
        WHEN description ILIKE '%dash%' THEN 'Description contains dash'
        WHEN content ILIKE '%dash%' THEN 'Content contains dash'
        ELSE 'No dash reference found'
    END as dash_reference
FROM global_knowledge_base_entries
WHERE name ILIKE '%dash%' OR name ILIKE '%crm%' OR description ILIKE '%dash%' OR description ILIKE '%crm%' OR content ILIKE '%dash%' OR content ILIKE '%crm%'
ORDER BY created_at DESC;

-- 2. Check the thread account_id and test matching
WITH thread_info AS (
    SELECT account_id, account_id::VARCHAR(255) as account_id_varchar
    FROM threads 
    WHERE thread_id = 'd8d6b94b-4c78-4ea4-a646-8abe650d46a7'
)
SELECT 
    'Thread Account Matching' as test_type,
    t.account_id,
    t.account_id_varchar,
    COUNT(g.entry_id) as matching_entries,
    STRING_AGG(g.name, ', ') as matching_entry_names
FROM thread_info t
LEFT JOIN global_knowledge_base_entries g ON (
    g.account_id = t.account_id_varchar 
    OR g.account_id = t.account_id::VARCHAR(255)
)
WHERE g.is_active = TRUE AND g.usage_context IN ('always', 'contextual')
GROUP BY t.account_id, t.account_id_varchar;

-- 3. Test the exact query that the function uses
WITH thread_info AS (
    SELECT account_id, account_id::VARCHAR(255) as account_id_varchar
    FROM threads 
    WHERE thread_id = 'd8d6b94b-4c78-4ea4-a646-8abe650d46a7'
),
user_account AS (
    SELECT id::VARCHAR(255) as user_account_id
    FROM basejump.accounts 
    WHERE id = (SELECT account_id FROM thread_info) 
    AND personal_account = TRUE 
    LIMIT 1
)
SELECT 
    'Function Query Test' as test_type,
    t.account_id,
    t.account_id_varchar,
    COALESCE(ua.user_account_id, t.account_id_varchar) as final_user_account_id,
    COUNT(g.entry_id) as matching_entries,
    STRING_AGG(g.name, ', ') as matching_entry_names
FROM thread_info t
LEFT JOIN user_account ua ON TRUE
LEFT JOIN global_knowledge_base_entries g ON (
    g.account_id = COALESCE(ua.user_account_id, t.account_id_varchar)
    OR g.account_id = t.account_id_varchar
)
WHERE g.is_active = TRUE AND g.usage_context IN ('always', 'contextual')
GROUP BY t.account_id, t.account_id_varchar, ua.user_account_id;

-- 4. Check if there are any entries at all for this account
WITH thread_info AS (
    SELECT account_id, account_id::VARCHAR(255) as account_id_varchar
    FROM threads 
    WHERE thread_id = 'd8d6b94b-4c78-4ea4-a646-8abe650d46a7'
)
SELECT 
    'All Global KB Entries for Account' as test_type,
    t.account_id,
    t.account_id_varchar,
    COUNT(g.entry_id) as total_entries,
    COUNT(CASE WHEN g.is_active = TRUE THEN 1 END) as active_entries,
    COUNT(CASE WHEN g.usage_context IN ('always', 'contextual') THEN 1 END) as contextual_entries,
    STRING_AGG(g.name, ', ') as all_entry_names
FROM thread_info t
LEFT JOIN global_knowledge_base_entries g ON (
    g.account_id = t.account_id_varchar 
    OR g.account_id = t.account_id::VARCHAR(255)
)
GROUP BY t.account_id, t.account_id_varchar;

-- 5. Test the function step by step
SELECT 
    'Function Step Test' as test_type,
    CASE 
        WHEN get_combined_knowledge_base_context('d8d6b94b-4c78-4ea4-a646-8abe650d46a7'::UUID, NULL, 4000) IS NULL 
        THEN 'NULL result'
        WHEN get_combined_knowledge_base_context('d8d6b94b-4c78-4ea4-a646-8abe650d46a7'::UUID, NULL, 4000) = '' 
        THEN 'Empty result'
        WHEN get_combined_knowledge_base_context('d8d6b94b-4c78-4ea4-a646-8abe650d46a7'::UUID, NULL, 4000) LIKE '%GLOBAL KNOWLEDGE BASE%' 
        THEN 'Contains GLOBAL KNOWLEDGE BASE header'
        ELSE 'Other content'
    END as function_result,
    LENGTH(get_combined_knowledge_base_context('d8d6b94b-4c78-4ea4-a646-8abe650d46a7'::UUID, NULL, 4000)) as content_length; 