-- Migration: Final fix for global knowledge base table
-- This migration ensures the table structure is correct for file uploads

BEGIN;

-- First, let's check the current table structure
DO $$
DECLARE
    column_type text;
BEGIN
    -- Check the current type of account_id column
    SELECT data_type INTO column_type 
    FROM information_schema.columns 
    WHERE table_name = 'global_knowledge_base_entries' 
    AND column_name = 'account_id';
    
    RAISE NOTICE 'Current account_id column type: %', column_type;
    
    -- If it's still UUID, change it to VARCHAR
    IF column_type = 'uuid' THEN
        ALTER TABLE global_knowledge_base_entries ALTER COLUMN account_id TYPE VARCHAR(255);
        RAISE NOTICE 'Changed account_id column type from UUID to VARCHAR(255)';
    ELSE
        RAISE NOTICE 'account_id column is already VARCHAR(255)';
    END IF;
END $$;

-- Drop the foreign key constraint if it still exists
DO $$
BEGIN
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

-- Make sure all required columns exist
ALTER TABLE global_knowledge_base_entries 
ADD COLUMN IF NOT EXISTS source_type VARCHAR(100),
ADD COLUMN IF NOT EXISTS source_metadata JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS file_size BIGINT,
ADD COLUMN IF NOT EXISTS file_mime_type VARCHAR(255),
ADD COLUMN IF NOT EXISTS extracted_from_zip_id UUID REFERENCES global_knowledge_base_entries(entry_id) ON DELETE CASCADE;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_global_kb_entries_extracted_from_zip ON global_knowledge_base_entries(extracted_from_zip_id);
CREATE INDEX IF NOT EXISTS idx_global_kb_entries_source_type ON global_knowledge_base_entries(source_type);

-- Update the comment
COMMENT ON COLUMN global_knowledge_base_entries.account_id IS 'Account ID or user ID. Can be either a UUID from basejump.accounts or a user_id string.';

COMMIT;
