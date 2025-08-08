-- Migration: Add global knowledge base table
-- This table stores knowledge base entries that are available globally across all agents and threads

BEGIN;

-- Create global knowledge base entries table
CREATE TABLE IF NOT EXISTS global_knowledge_base_entries (
    entry_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES basejump.accounts(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    content TEXT NOT NULL,
    content_tokens INTEGER,
    usage_context VARCHAR(50) DEFAULT 'always' CHECK (usage_context IN ('always', 'on_request', 'contextual')),
    is_active BOOLEAN DEFAULT TRUE,
    source_type VARCHAR(100),
    source_metadata JSONB DEFAULT '{}'::jsonb,
    file_size BIGINT,
    file_mime_type VARCHAR(255),
    extracted_from_zip_id UUID REFERENCES global_knowledge_base_entries(entry_id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_global_kb_entries_account_id ON global_knowledge_base_entries(account_id);
CREATE INDEX IF NOT EXISTS idx_global_kb_entries_is_active ON global_knowledge_base_entries(is_active);
CREATE INDEX IF NOT EXISTS idx_global_kb_entries_usage_context ON global_knowledge_base_entries(usage_context);
CREATE INDEX IF NOT EXISTS idx_global_kb_entries_created_at ON global_knowledge_base_entries(created_at);
CREATE INDEX IF NOT EXISTS idx_global_kb_entries_source_type ON global_knowledge_base_entries(source_type);
CREATE INDEX IF NOT EXISTS idx_global_kb_entries_extracted_from_zip ON global_knowledge_base_entries(extracted_from_zip_id);

-- Enable Row Level Security
ALTER TABLE global_knowledge_base_entries ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY global_kb_entries_user_access ON global_knowledge_base_entries
    FOR ALL USING (
        basejump.has_role_on_account(account_id) = true
    );

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_global_kb_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_global_kb_entries_updated_at ON global_knowledge_base_entries;
CREATE TRIGGER update_global_kb_entries_updated_at
    BEFORE UPDATE ON global_knowledge_base_entries
    FOR EACH ROW EXECUTE FUNCTION update_global_kb_updated_at_column();

-- Grant permissions
GRANT ALL PRIVILEGES ON TABLE global_knowledge_base_entries TO authenticated, service_role;

-- Add comments
COMMENT ON TABLE global_knowledge_base_entries IS 'Stores global knowledge base entries available across all agents and threads';
COMMENT ON COLUMN global_knowledge_base_entries.usage_context IS 'When to include this entry: always, on_request, or contextual';

COMMIT;
