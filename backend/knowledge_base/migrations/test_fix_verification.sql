-- Test script to verify the account ID normalization fix is working
-- This will help us confirm that the global knowledge base entries are now being found

-- 1. Test the function with a specific thread ID
SELECT 
    'Function Test' as test_type,
    CASE 
        WHEN get_combined_knowledge_base_context('d8d6b94b-4c78-4ea4-a646-8abe650d46a7'::UUID, NULL, 4000) LIKE '%GLOBAL KNOWLEDGE BASE%' 
        THEN '✅ Contains GLOBAL KNOWLEDGE BASE header'
        ELSE '❌ Missing GLOBAL KNOWLEDGE BASE header'
    END as header_check,
    CASE 
        WHEN get_combined_knowledge_base_context('d8d6b94b-4c78-4ea4-a646-8abe650d46a7'::UUID, NULL, 4000) LIKE '%dash%' 
        THEN '✅ Contains dash content'
        ELSE '❌ Missing dash content'
    END as content_check,
    LENGTH(get_combined_knowledge_base_context('d8d6b94b-4c78-4ea4-a646-8abe650d46a7'::UUID, NULL, 4000)) as content_length;

-- 2. Check if there are any Dash CRM entries in the global knowledge base
SELECT 
    'Dash CRM Entries Check' as test_type,
    COUNT(*) as total_entries,
    STRING_AGG(name, ', ') as entry_names
FROM global_knowledge_base_entries
WHERE name ILIKE '%dash%' OR name ILIKE '%crm%' OR description ILIKE '%dash%' OR description ILIKE '%crm%' OR content ILIKE '%dash%' OR content ILIKE '%crm%';

-- 3. Check the account_id formats in the global knowledge base entries
SELECT 
    'Account ID Formats' as test_type,
    account_id,
    LENGTH(account_id) as id_length,
    CASE 
        WHEN account_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN 'UUID format'
        WHEN account_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN 'UUID format (lowercase)'
        ELSE 'Other format'
    END as format_type
FROM global_knowledge_base_entries
WHERE name ILIKE '%dash%' OR name ILIKE '%crm%'
ORDER BY created_at DESC;

-- 4. Test the thread account_id and its variants
WITH thread_info AS (
    SELECT account_id, account_id::TEXT as account_id_text, LOWER(TRIM(account_id::TEXT)) as normalized_id
    FROM threads 
    WHERE thread_id = 'd8d6b94b-4c78-4ea4-a646-8abe650d46a7'
)
SELECT 
    'Thread Account ID Variants' as test_type,
    t.account_id,
    t.account_id_text,
    t.normalized_id,
    ARRAY[t.normalized_id, t.account_id_text, TRIM(t.account_id_text)] as variants
FROM thread_info t;

-- 5. Test the exact matching logic that the function uses
WITH thread_info AS (
    SELECT account_id, LOWER(TRIM(account_id::TEXT)) as normalized_id
    FROM threads 
    WHERE thread_id = 'd8d6b94b-4c78-4ea4-a646-8abe650d46a7'
),
account_variants AS (
    SELECT 
        t.account_id,
        ARRAY[t.normalized_id, t.account_id::TEXT, TRIM(t.account_id::TEXT)] as variants
    FROM thread_info t
)
SELECT 
    'Matching Test' as test_type,
    av.account_id,
    COUNT(g.entry_id) as matching_entries,
    STRING_AGG(g.name, ', ') as matching_names
FROM account_variants av
LEFT JOIN global_knowledge_base_entries g ON g.account_id = ANY(av.variants)
WHERE g.is_active = TRUE AND g.usage_context IN ('always', 'contextual')
GROUP BY av.account_id;

-- 6. Get a preview of the actual function output
SELECT 
    'Function Output Preview' as test_type,
    LEFT(get_combined_knowledge_base_context('d8d6b94b-4c78-4ea4-a646-8abe650d46a7'::UUID, NULL, 4000), 2000) as output_preview; 