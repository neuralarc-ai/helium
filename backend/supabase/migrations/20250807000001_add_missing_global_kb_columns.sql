-- Migration: Add missing columns to global_knowledge_base_entries table

BEGIN;

-- Add missing columns that the FileProcessor expects
ALTER TABLE global_knowledge_base_entries 
ADD COLUMN IF NOT EXISTS source_type VARCHAR(100),
ADD COLUMN IF NOT EXISTS source_metadata JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS file_size BIGINT,
ADD COLUMN IF NOT EXISTS file_mime_type VARCHAR(255),
ADD COLUMN IF NOT EXISTS extracted_from_zip_id UUID REFERENCES global_knowledge_base_entries(entry_id) ON DELETE CASCADE;

-- Create index for the new extracted_from_zip_id column
CREATE INDEX IF NOT EXISTS idx_global_kb_entries_extracted_from_zip ON global_knowledge_base_entries(extracted_from_zip_id);

-- Create index for source_type
CREATE INDEX IF NOT EXISTS idx_global_kb_entries_source_type ON global_knowledge_base_entries(source_type);

COMMIT;
