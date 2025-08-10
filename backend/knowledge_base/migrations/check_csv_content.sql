-- Check if CSV content is stored in the global knowledge base
-- This script will help us verify if the CSV file was properly uploaded and stored

-- 1. Check all global knowledge base entries
SELECT 
    'All Global KB Entries' as check_type,
    COUNT(*) as total_entries,
    STRING_AGG(name, ', ') as entry_names
FROM global_knowledge_base_entries
WHERE is_active = TRUE;

-- 2. Check for CSV-related entries
SELECT 
    'CSV Entries' as check_type,
    entry_id,
    name,
    description,
    usage_context,
    is_active,
    created_at,
    LENGTH(content) as content_length,
    LEFT(content, 200) as content_preview
FROM global_knowledge_base_entries
WHERE (name ILIKE '%csv%' OR name ILIKE '%attrition%' OR content ILIKE '%csv%' OR content ILIKE '%attrition%')
AND is_active = TRUE
ORDER BY created_at DESC;

-- 3. Check for entries with "HR" or "Employee" in the name or content
SELECT 
    'HR/Employee Entries' as check_type,
    entry_id,
    name,
    description,
    usage_context,
    is_active,
    created_at,
    LENGTH(content) as content_length,
    LEFT(content, 200) as content_preview
FROM global_knowledge_base_entries
WHERE (name ILIKE '%hr%' OR name ILIKE '%employee%' OR content ILIKE '%hr%' OR content ILIKE '%employee%')
AND is_active = TRUE
ORDER BY created_at DESC;

-- 4. Check the most recent entries
SELECT 
    'Recent Entries' as check_type,
    entry_id,
    name,
    description,
    usage_context,
    is_active,
    created_at,
    LENGTH(content) as content_length,
    LEFT(content, 200) as content_preview
FROM global_knowledge_base_entries
WHERE is_active = TRUE
ORDER BY created_at DESC
LIMIT 5;

-- 5. Check account_id formats
SELECT 
    'Account ID Formats' as check_type,
    account_id,
    LENGTH(account_id) as id_length,
    CASE 
        WHEN account_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN 'UUID format'
        ELSE 'Other format'
    END as format_type,
    COUNT(*) as entry_count
FROM global_knowledge_base_entries
WHERE is_active = TRUE
GROUP BY account_id, LENGTH(account_id)
ORDER BY entry_count DESC; 