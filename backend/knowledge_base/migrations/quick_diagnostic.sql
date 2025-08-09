-- Quick diagnostic for global knowledge base
-- Run these queries to check the current state

-- 1. Check if the thread exists
SELECT 'Thread exists' as check_type, 
       CASE WHEN COUNT(*) > 0 THEN '✅ YES' ELSE '❌ NO' END as result
FROM threads 
WHERE thread_id = 'b2f7ceb0-d5e6-4e87-9f7a-1ee8acb38f90';

-- 2. Check if there are any global knowledge base entries
SELECT 'Global KB entries exist' as check_type,
       COUNT(*) as total_entries,
       COUNT(CASE WHEN is_active = TRUE THEN 1 END) as active_entries
FROM global_knowledge_base_entries;

-- 3. Check if there are Dash CRM entries specifically
SELECT 'Dash CRM entries exist' as check_type,
       COUNT(*) as dash_crm_entries
FROM global_knowledge_base_entries
WHERE name ILIKE '%dash%' OR name ILIKE '%crm%' OR description ILIKE '%dash%' OR description ILIKE '%crm%';

-- 4. Test the function directly
SELECT 'Function returns content' as check_type,
       CASE 
           WHEN LENGTH(get_combined_knowledge_base_context('b2f7ceb0-d5e6-4e87-9f7a-1ee8acb38f90'::UUID, NULL, 4000)) > 0 
           THEN '✅ YES' 
           ELSE '❌ NO' 
       END as result; 