-- Verify which version of the function is currently in the database
-- This will help us determine if the fix was properly applied

-- Check the current function definition
SELECT 
    'Function Definition Check' as test_type,
    pg_get_functiondef(oid) as function_definition
FROM pg_proc 
WHERE proname = 'get_combined_knowledge_base_context'
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- Check if the function has the OR condition in the WHERE clause
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