-- Migration: Fix global knowledge base constraints
-- This migration makes the account_id column more flexible to fix upload issues

BEGIN;

-- Drop the foreign key constraint if it exists to make the table more flexible
DO $$
BEGIN
    -- Drop the foreign key constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'global_knowledge_base_entries_account_id_fkey' 
        AND table_name = 'global_knowledge_base_entries'
    ) THEN
        ALTER TABLE global_knowledge_base_entries DROP CONSTRAINT global_knowledge_base_entries_account_id_fkey;
        RAISE NOTICE 'Dropped foreign key constraint global_knowledge_base_entries_account_id_fkey';
    ELSE
        RAISE NOTICE 'Foreign key constraint global_knowledge_base_entries_account_id_fkey does not exist';
    END IF;
END $$;

-- Make the account_id column more flexible by changing its type to VARCHAR
-- This allows it to accept both UUID and string values
ALTER TABLE global_knowledge_base_entries 
ALTER COLUMN account_id TYPE VARCHAR(255);

-- Add a comment to explain the change
COMMENT ON COLUMN global_knowledge_base_entries.account_id IS 'Account ID or user ID. Can be either a UUID from basejump.accounts or a user_id string.';

COMMIT;
