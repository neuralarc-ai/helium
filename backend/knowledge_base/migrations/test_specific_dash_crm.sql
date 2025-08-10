-- Test specific Dash CRM content inclusion
-- This will help us identify exactly why the Dash CRM content is missing

-- 1. First, let's see what Dash CRM entries exist
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

-- 2. Check if the thread account_id matches any Dash CRM entries
WITH thread_info AS (
    SELECT account_id, account_id::VARCHAR(255) as account_id_varchar
    FROM threads 
    WHERE thread_id = 'd8d6b94b-4c78-4ea4-a646-8abe650d46a7'
)
SELECT 
    'Dash CRM Account Matching' as test_type,
    t.account_id,
    t.account_id_varchar,
    g.entry_id,
    g.name,
    g.account_id as entry_account_id,
    g.is_active,
    g.usage_context,
    CASE 
        WHEN g.account_id = t.account_id_varchar THEN '✅ Matches VARCHAR'
        WHEN g.account_id = t.account_id::VARCHAR(255) THEN '✅ Matches direct cast'
        ELSE '❌ No match'
    END as match_status
FROM thread_info t
LEFT JOIN global_knowledge_base_entries g ON (
    g.account_id = t.account_id_varchar 
    OR g.account_id = t.account_id::VARCHAR(255)
)
WHERE (g.name ILIKE '%dash%' OR g.name ILIKE '%crm%' OR g.description ILIKE '%dash%' OR g.description ILIKE '%crm%')
AND g.is_active = TRUE 
AND g.usage_context IN ('always', 'contextual');

-- 3. Test the function with a smaller token limit to see if content is being truncated
SELECT 
    'Function with Smaller Token Limit' as test_type,
    CASE 
        WHEN get_combined_knowledge_base_context('d8d6b94b-4c78-4ea4-a646-8abe650d46a7'::UUID, NULL, 10000) LIKE '%dash%' 
        THEN '✅ Contains dash content (10k tokens)'
        ELSE '❌ Missing dash content (10k tokens)'
    END as content_check_10k,
    CASE 
        WHEN get_combined_knowledge_base_context('d8d6b94b-4c78-4ea4-a646-8abe650d46a7'::UUID, NULL, 20000) LIKE '%dash%' 
        THEN '✅ Contains dash content (20k tokens)'
        ELSE '❌ Missing dash content (20k tokens)'
    END as content_check_20k;

-- 4. Check the actual content length being returned
SELECT 
    'Content Length Analysis' as test_type,
    LENGTH(get_combined_knowledge_base_context('d8d6b94b-4c78-4ea4-a646-8abe650d46a7'::UUID, NULL, 4000)) as function_content_length,
    LENGTH(get_combined_knowledge_base_context('d8d6b94b-4c78-4ea4-a646-8abe650d46a7'::UUID, NULL, 10000)) as function_content_length_10k,
    LENGTH(get_combined_knowledge_base_context('d8d6b94b-4c78-4ea4-a646-8abe650d46a7'::UUID, NULL, 20000)) as function_content_length_20k;

-- 5. Get a detailed preview of what the function is actually returning
SELECT 
    'Detailed Function Output' as test_type,
    LEFT(get_combined_knowledge_base_context('d8d6b94b-4c78-4ea4-a646-8abe650d46a7'::UUID, NULL, 4000), 3000) as detailed_output; 