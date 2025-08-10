-- Test knowledge base content format
-- This will help us verify that the content is properly formatted for the AI

-- 1. Check the format of Dash CRM content
SELECT 
    'Dash CRM Content Format' as test_type,
    entry_id,
    name,
    LEFT(content, 500) as content_preview,
    LENGTH(content) as content_length,
    usage_context,
    is_active
FROM global_knowledge_base_entries
WHERE name ILIKE '%dash%' OR name ILIKE '%crm%' OR description ILIKE '%dash%' OR description ILIKE '%crm%'
ORDER BY created_at DESC
LIMIT 1;

-- 2. Test the function output format
SELECT 
    'Function Output Format' as test_type,
    CASE 
        WHEN get_combined_knowledge_base_context('d8d6b94b-4c78-4ea4-a646-8abe650d46a7'::UUID, NULL, 4000) LIKE '%GLOBAL KNOWLEDGE BASE%' 
        THEN '✅ Contains GLOBAL KNOWLEDGE BASE header'
        ELSE '❌ Missing GLOBAL KNOWLEDGE BASE header'
    END as header_check,
    CASE 
        WHEN get_combined_knowledge_base_context('d8d6b94b-4c78-4ea4-a646-8abe650d46a7'::UUID, NULL, 4000) LIKE '%Global Knowledge:%' 
        THEN '✅ Contains Global Knowledge sections'
        ELSE '❌ Missing Global Knowledge sections'
    END as section_check,
    CASE 
        WHEN get_combined_knowledge_base_context('d8d6b94b-4c78-4ea4-a646-8abe650d46a7'::UUID, NULL, 4000) LIKE '%dash%' 
        THEN '✅ Contains dash content'
        ELSE '❌ Missing dash content'
    END as content_check;

-- 3. Get a detailed preview of the function output
SELECT 
    'Detailed Function Output' as test_type,
    LEFT(get_combined_knowledge_base_context('d8d6b94b-4c78-4ea4-a646-8abe650d46a7'::UUID, NULL, 4000), 2000) as detailed_output; 