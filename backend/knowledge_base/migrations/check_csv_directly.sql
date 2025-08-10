-- Check if CSV content is actually in the database
-- Run this directly in your database to verify

-- 1. Check all global knowledge base entries
SELECT 
    'All Entries' as check_type,
    COUNT(*) as total_entries
FROM global_knowledge_base_entries
WHERE is_active = TRUE;

-- 2. Check for CSV-related entries
SELECT 
    'CSV Entries' as check_type,
    entry_id,
    name,
    account_id,
    usage_context,
    is_active,
    created_at,
    LENGTH(content) as content_length,
    LEFT(content, 300) as content_preview
FROM global_knowledge_base_entries
WHERE (name ILIKE '%csv%' OR name ILIKE '%attrition%' OR content ILIKE '%csv%' OR content ILIKE '%attrition%')
AND is_active = TRUE
ORDER BY created_at DESC;

-- 3. Check for entries with "HR" or "Employee" in the name or content
SELECT 
    'HR/Employee Entries' as check_type,
    entry_id,
    name,
    account_id,
    usage_context,
    is_active,
    created_at,
    LENGTH(content) as content_length,
    LEFT(content, 300) as content_preview
FROM global_knowledge_base_entries
WHERE (name ILIKE '%hr%' OR name ILIKE '%employee%' OR content ILIKE '%hr%' OR content ILIKE '%employee%')
AND is_active = TRUE
ORDER BY created_at DESC;

-- 4. Check the most recent entries
SELECT 
    'Recent Entries' as check_type,
    entry_id,
    name,
    account_id,
    usage_context,
    is_active,
    created_at,
    LENGTH(content) as content_length,
    LEFT(content, 300) as content_preview
FROM global_knowledge_base_entries
WHERE is_active = TRUE
ORDER BY created_at DESC
LIMIT 5;

-- 5. Check account_id formats for the specific thread
SELECT 
    'Thread Account Info' as check_type,
    thread_id,
    account_id,
    account_id::TEXT as account_id_text,
    LOWER(TRIM(account_id::TEXT)) as normalized_account_id
FROM threads 
WHERE thread_id = 'cd0d2704-1ad4-4c78-a9df-42a2d614c10b';

-- 6. Check if there are any entries for the thread's account_id
WITH thread_info AS (
    SELECT account_id, account_id::TEXT as account_id_text, LOWER(TRIM(account_id::TEXT)) as normalized_account_id
    FROM threads 
    WHERE thread_id = 'cd0d2704-1ad4-4c78-a9df-42a2d614c10b'
)
SELECT 
    'Matching Entries' as check_type,
    t.account_id,
    t.account_id_text,
    t.normalized_account_id,
    COUNT(g.entry_id) as matching_entries,
    STRING_AGG(g.name, ', ') as matching_names
FROM thread_info t
LEFT JOIN global_knowledge_base_entries g ON (
    g.account_id = t.account_id_text OR 
    g.account_id = t.normalized_account_id OR 
    g.account_id = t.account_id::TEXT
)
WHERE g.is_active = TRUE AND g.usage_context IN ('always', 'contextual')
GROUP BY t.account_id, t.account_id_text, t.normalized_account_id; 