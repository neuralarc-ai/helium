-- Migration: Add Improved Knowledge Base Schema
-- This migration adds the new data block architecture tables to your existing database
-- Run this after your existing knowledge base tables are set up

BEGIN;

-- ============================================================
-- 0. VERIFY AND FIX EXISTING SCHEMA ISSUES
-- ============================================================

-- First, let's verify the content column exists and fix any issues
DO $$ 
BEGIN
    -- Check if content column exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'global_knowledge_base_entries' 
                   AND column_name = 'content') THEN
        -- Add content column if it's missing
        ALTER TABLE global_knowledge_base_entries 
        ADD COLUMN content TEXT NOT NULL DEFAULT 'Legacy content';
        
        RAISE NOTICE 'Added missing content column to global_knowledge_base_entries';
    ELSE
        RAISE NOTICE 'Content column already exists in global_knowledge_base_entries';
    END IF;
    
    -- Check if embedding column exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'global_knowledge_base_entries' 
                   AND column_name = 'embedding') THEN
        -- Add embedding column if it's missing
        ALTER TABLE global_knowledge_base_entries 
        ADD COLUMN embedding vector(384);
        
        RAISE NOTICE 'Added missing embedding column to global_knowledge_base_entries';
    ELSE
        RAISE NOTICE 'Embedding column already exists in global_knowledge_base_entries';
    END IF;
    
    -- Check if account_id column exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'global_knowledge_base_entries' 
                   AND column_name = 'account_id') THEN
        -- Add account_id column if it's missing
        ALTER TABLE global_knowledge_base_entries 
        ADD COLUMN account_id VARCHAR(255) NOT NULL DEFAULT 'legacy';
        
        RAISE NOTICE 'Added missing account_id column to global_knowledge_base_entries';
    ELSE
        RAISE NOTICE 'Account_id column already exists in global_knowledge_base_entries';
    END IF;
    
END $$;

-- ============================================================
-- 1. ADD NEW COLUMNS TO EXISTING TABLES
-- ============================================================

-- Add new columns to global_knowledge_base_entries if they don't exist
DO $$ 
BEGIN
    -- Add content_summary column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'global_knowledge_base_entries' 
                   AND column_name = 'content_summary') THEN
        ALTER TABLE global_knowledge_base_entries 
        ADD COLUMN content_summary TEXT;
    END IF;
    
    -- Add total_data_blocks column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'global_knowledge_base_entries' 
                   AND column_name = 'total_data_blocks') THEN
        ALTER TABLE global_knowledge_base_entries 
        ADD COLUMN total_data_blocks INTEGER DEFAULT 0;
    END IF;
    
    -- Add processing_status column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'global_knowledge_base_entries' 
                   AND column_name = 'processing_status') THEN
        ALTER TABLE global_knowledge_base_entries 
        ADD COLUMN processing_status VARCHAR(50) DEFAULT 'completed';
    END IF;
    
    -- Add processing_error column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'global_knowledge_base_entries' 
                   AND column_name = 'processing_error') THEN
        ALTER TABLE global_knowledge_base_entries 
        ADD COLUMN processing_error TEXT;
    END IF;
    
    -- Add file_type column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'global_knowledge_base_entries' 
                   AND column_name = 'file_type') THEN
        ALTER TABLE global_knowledge_base_entries 
        ADD COLUMN file_type VARCHAR(50);
    END IF;
    
    -- Add file_size_bytes column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'global_knowledge_base_entries' 
                   AND column_name = 'file_size_bytes') THEN
        ALTER TABLE global_knowledge_base_entries 
        ADD COLUMN file_size_bytes BIGINT;
    END IF;
    
    -- Add original_filename column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'global_knowledge_base_entries' 
                   AND column_name = 'original_filename') THEN
        ALTER TABLE global_knowledge_base_entries 
        ADD COLUMN original_filename VARCHAR(500);
    END IF;
    
    -- Add usage_context column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'global_knowledge_base_entries' 
                   AND column_name = 'usage_context') THEN
        ALTER TABLE global_knowledge_base_entries 
        ADD COLUMN usage_context VARCHAR(100) DEFAULT 'general';
    END IF;
    
    -- Add is_active column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'global_knowledge_base_entries' 
                   AND column_name = 'is_active') THEN
        ALTER TABLE global_knowledge_base_entries 
        ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
    
    -- Add extracted_from_zip_id column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'global_knowledge_base_entries' 
                   AND column_name = 'extracted_from_zip_id') THEN
        ALTER TABLE global_knowledge_base_entries 
        ADD COLUMN extracted_from_zip_id UUID REFERENCES global_knowledge_base_entries(entry_id) ON DELETE CASCADE;
    END IF;
    
    -- Add is_file_group column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'global_knowledge_base_entries' 
                   AND column_name = 'is_file_group') THEN
        ALTER TABLE global_knowledge_base_entries 
        ADD COLUMN is_file_group BOOLEAN DEFAULT false;
    END IF;
    
    -- Add group_id column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'global_knowledge_base_entries' 
                   AND column_name = 'group_id') THEN
        ALTER TABLE global_knowledge_base_entries 
        ADD COLUMN group_id UUID REFERENCES global_knowledge_base_entries(entry_id) ON DELETE CASCADE;
    END IF;
    
    -- Add file_count column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'global_knowledge_base_entries' 
                   AND column_name = 'file_count') THEN
        ALTER TABLE global_knowledge_base_entries 
        ADD COLUMN file_count INTEGER DEFAULT 1;
    END IF;
    
    -- Add tags column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'global_knowledge_base_entries' 
                   AND column_name = 'tags') THEN
        ALTER TABLE global_knowledge_base_entries 
        ADD COLUMN tags JSONB DEFAULT '[]'::jsonb;
    END IF;
    
    -- Add last_accessed_at column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'global_knowledge_base_entries' 
                   AND column_name = 'last_accessed_at') THEN
        ALTER TABLE global_knowledge_base_entries 
        ADD COLUMN last_accessed_at TIMESTAMPTZ;
    END IF;
    
END $$;

-- ============================================================
-- 2. CREATE NEW TABLES FOR IMPROVED ARCHITECTURE
-- ============================================================

-- Create file metadata table
CREATE TABLE IF NOT EXISTS kb_file_metadata (
    metadata_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_id UUID NOT NULL REFERENCES global_knowledge_base_entries(entry_id) ON DELETE CASCADE,
    file_type VARCHAR(50) NOT NULL,
    
    -- CSV-specific metadata
    csv_columns JSONB, -- Array of column definitions: [{"name": "budget_id", "type": "string", "sample_values": [...]}]
    csv_row_count INTEGER,
    csv_delimiter VARCHAR(10),
    csv_has_header BOOLEAN,
    
    -- PDF-specific metadata
    pdf_page_count INTEGER,
    pdf_has_images BOOLEAN,
    pdf_has_tables BOOLEAN,
    
    -- Common structured metadata
    data_categories JSONB, -- Categories found in the data: ["department", "year", "quarter"]
    time_periods JSONB, -- Time periods covered: {"start": "2023-01-01", "end": "2023-12-31", "granularity": "quarterly"}
    key_entities JSONB, -- Important entities: ["Retail Banking", "Commercial Banking", "Investment Banking"]
    data_quality_score FLOAT, -- 0-1 score based on completeness, consistency, etc.
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create data blocks table
CREATE TABLE IF NOT EXISTS kb_data_blocks (
    block_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_id UUID NOT NULL REFERENCES global_knowledge_base_entries(entry_id) ON DELETE CASCADE,
    block_type VARCHAR(50) NOT NULL, -- row_group, page_section, paragraph, table, etc.
    block_index INTEGER NOT NULL, -- Order within the file
    
    -- Content and context
    content TEXT NOT NULL, -- The actual data block content
    content_tokens INTEGER,
    content_summary TEXT, -- Brief summary of this block
    embedding VECTOR(384), -- Block-specific embedding (using existing vector size)
    
    -- Structured metadata for filtering and retrieval
    metadata JSONB NOT NULL DEFAULT '{}', -- Flexible metadata: {"department": "Retail Banking", "year": 2023, "quarter": 1}
    categories JSONB, -- Categories this block belongs to: ["financial", "budget", "retail"]
    entities JSONB, -- Named entities in this block: ["EMP87249", "Retail Banking"]
    
    -- Relationships and context
    parent_block_id UUID REFERENCES kb_data_blocks(block_id) ON DELETE CASCADE,
    context_before TEXT, -- Content that comes before this block for context
    context_after TEXT, -- Content that comes after this block for context
    
    -- Quality and relevance metrics
    importance_score FLOAT DEFAULT 0.5, -- 0-1 score indicating importance of this block
    query_frequency INTEGER DEFAULT 0, -- How often this block is retrieved
    last_accessed TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create data block relationships table
CREATE TABLE IF NOT EXISTS kb_data_block_relationships (
    relationship_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_block_id UUID NOT NULL REFERENCES kb_data_blocks(block_id) ON DELETE CASCADE,
    target_block_id UUID NOT NULL REFERENCES kb_data_blocks(block_id) ON DELETE CASCADE,
    relationship_type VARCHAR(50) NOT NULL, -- related_to, part_of, follows, contradicts, etc.
    strength FLOAT DEFAULT 0.5, -- 0-1 strength of the relationship
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create usage analytics table
CREATE TABLE IF NOT EXISTS kb_usage_analytics (
    id BIGSERIAL PRIMARY KEY,
    entry_id UUID REFERENCES global_knowledge_base_entries(entry_id) ON DELETE CASCADE,
    block_id UUID REFERENCES kb_data_blocks(block_id) ON DELETE CASCADE,
    thread_id UUID,
    agent_id UUID,
    query_text TEXT,
    query_embedding VECTOR(384), -- Using existing vector size
    retrieval_method VARCHAR(50), -- semantic, metadata, hybrid, etc.
    relevance_score FLOAT,
    user_feedback INTEGER, -- -1, 0, 1 for negative, neutral, positive
    response_time_ms INTEGER,
    used_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 3. CREATE INDEXES FOR PERFORMANCE
-- ============================================================

-- File metadata indexes
CREATE INDEX IF NOT EXISTS idx_kb_file_metadata_entry_id ON kb_file_metadata(entry_id);
CREATE INDEX IF NOT EXISTS idx_kb_file_metadata_file_type ON kb_file_metadata(file_type);
CREATE INDEX IF NOT EXISTS idx_kb_file_metadata_data_categories ON kb_file_metadata USING gin(data_categories);
CREATE INDEX IF NOT EXISTS idx_kb_file_metadata_time_periods ON kb_file_metadata USING gin(time_periods);
CREATE INDEX IF NOT EXISTS idx_kb_file_metadata_key_entities ON kb_file_metadata USING gin(key_entities);

-- Data blocks indexes
CREATE INDEX IF NOT EXISTS idx_kb_data_blocks_entry_id ON kb_data_blocks(entry_id);
CREATE INDEX IF NOT EXISTS idx_kb_data_blocks_block_type ON kb_data_blocks(block_type);
CREATE INDEX IF NOT EXISTS idx_kb_data_blocks_block_index ON kb_data_blocks(block_index);
CREATE INDEX IF NOT EXISTS idx_kb_data_blocks_metadata ON kb_data_blocks USING gin(metadata);
CREATE INDEX IF NOT EXISTS idx_kb_data_blocks_categories ON kb_data_blocks USING gin(categories);
CREATE INDEX IF NOT EXISTS idx_kb_data_blocks_entities ON kb_data_blocks USING gin(entities);
CREATE INDEX IF NOT EXISTS idx_kb_data_blocks_importance_score ON kb_data_blocks(importance_score);
CREATE INDEX IF NOT EXISTS idx_kb_data_blocks_query_frequency ON kb_data_blocks(query_frequency);
CREATE INDEX IF NOT EXISTS idx_kb_data_blocks_last_accessed ON kb_data_blocks(last_accessed);

-- Create vector index for embeddings (using existing vector size)
CREATE INDEX IF NOT EXISTS idx_kb_data_blocks_embeddings ON kb_data_blocks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Data block relationships indexes
CREATE INDEX IF NOT EXISTS idx_kb_relationships_source_block ON kb_data_block_relationships(source_block_id);
CREATE INDEX IF NOT EXISTS idx_kb_relationships_target_block ON kb_data_block_relationships(target_block_id);
CREATE INDEX IF NOT EXISTS idx_kb_relationships_type ON kb_data_block_relationships(relationship_type);
CREATE INDEX IF NOT EXISTS idx_kb_relationships_strength ON kb_data_block_relationships(strength);

-- Usage analytics indexes
CREATE INDEX IF NOT EXISTS idx_kb_usage_analytics_entry_id ON kb_usage_analytics(entry_id);
CREATE INDEX IF NOT EXISTS idx_kb_usage_analytics_block_id ON kb_usage_analytics(block_id);
CREATE INDEX IF NOT EXISTS idx_kb_usage_analytics_thread_id ON kb_usage_analytics(thread_id);
CREATE INDEX IF NOT EXISTS idx_kb_usage_analytics_agent_id ON kb_usage_analytics(agent_id);
CREATE INDEX IF NOT EXISTS idx_kb_usage_analytics_used_at ON kb_usage_analytics(used_at);
CREATE INDEX IF NOT EXISTS idx_kb_usage_analytics_relevance_score ON kb_usage_analytics(relevance_score);
CREATE INDEX IF NOT EXISTS idx_kb_usage_analytics_user_feedback ON kb_usage_analytics(user_feedback);

-- ============================================================
-- 4. CREATE TRIGGERS AND FUNCTIONS
-- ============================================================

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update data block count in main entry
CREATE OR REPLACE FUNCTION update_data_block_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE global_knowledge_base_entries 
        SET total_data_blocks = total_data_blocks + 1,
            updated_at = NOW()
        WHERE entry_id = NEW.entry_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE global_knowledge_base_entries 
        SET total_data_blocks = total_data_blocks - 1,
            updated_at = NOW()
        WHERE entry_id = OLD.entry_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to update query frequency and last accessed
CREATE OR REPLACE FUNCTION update_block_usage()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE kb_data_blocks 
    SET query_frequency = query_frequency + 1,
        last_accessed = NOW()
    WHERE block_id = NEW.block_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers (drop first if they exist, then create)
DO $$ 
BEGIN
    -- Drop existing triggers if they exist
    DROP TRIGGER IF EXISTS trigger_kb_file_metadata_update_timestamp ON kb_file_metadata;
    DROP TRIGGER IF EXISTS trigger_kb_data_blocks_update_timestamp ON kb_data_blocks;
    DROP TRIGGER IF EXISTS trigger_kb_data_blocks_count ON kb_data_blocks;
    DROP TRIGGER IF EXISTS trigger_kb_usage_analytics_update_block_usage ON kb_usage_analytics;
    
    -- Create new triggers
    CREATE TRIGGER trigger_kb_file_metadata_update_timestamp 
        BEFORE UPDATE ON kb_file_metadata 
        FOR EACH ROW EXECUTE FUNCTION update_timestamp();

    CREATE TRIGGER trigger_kb_data_blocks_update_timestamp 
        BEFORE UPDATE ON kb_data_blocks 
        FOR EACH ROW EXECUTE FUNCTION update_timestamp();

    CREATE TRIGGER trigger_kb_data_blocks_count 
        AFTER INSERT OR DELETE ON kb_data_blocks 
        FOR EACH ROW EXECUTE FUNCTION update_data_block_count();

    CREATE TRIGGER trigger_kb_usage_analytics_update_block_usage 
        AFTER INSERT ON kb_usage_analytics 
        FOR EACH ROW EXECUTE FUNCTION update_block_usage();
        
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Some triggers could not be created: %', SQLERRM;
END $$;

-- ============================================================
-- 5. UPDATE EXISTING DATA
-- ============================================================

-- Set default values for existing entries
UPDATE global_knowledge_base_entries 
SET 
    content_summary = COALESCE(description, 'Legacy entry'),
    total_data_blocks = 1,
    processing_status = 'completed',
    file_type = 'unknown',
    usage_context = 'always',
    is_active = true
WHERE content_summary IS NULL;

-- ============================================================
-- 6. CREATE ROW LEVEL SECURITY POLICIES
-- ============================================================

-- Enable RLS on new tables
ALTER TABLE kb_file_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_data_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_data_block_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_usage_analytics ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (basic - you may want to customize these)
DO $$ 
BEGIN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Users can view their own file metadata" ON kb_file_metadata;
    DROP POLICY IF EXISTS "Users can view their own data blocks" ON kb_data_blocks;
    DROP POLICY IF EXISTS "Users can view their own usage analytics" ON kb_usage_analytics;
    
    -- Create new policies
    CREATE POLICY "Users can view their own file metadata" ON kb_file_metadata
        FOR SELECT USING (
            EXISTS (
                SELECT 1 FROM global_knowledge_base_entries gkb
                WHERE gkb.entry_id = kb_file_metadata.entry_id
                AND gkb.account_id = current_setting('app.current_user_id', true)::text
            )
        );

    CREATE POLICY "Users can view their own data blocks" ON kb_data_blocks
        FOR SELECT USING (
            EXISTS (
                SELECT 1 FROM global_knowledge_base_entries gkb
                WHERE gkb.entry_id = kb_data_blocks.entry_id
                AND gkb.account_id = current_setting('app.current_user_id', true)::text
            )
        );

    CREATE POLICY "Users can view their own usage analytics" ON kb_usage_analytics
        FOR SELECT USING (
            EXISTS (
                SELECT 1 FROM global_knowledge_base_entries gkb
                WHERE gkb.entry_id = kb_usage_analytics.entry_id
                AND gkb.account_id = current_setting('app.current_user_id', true)::text
            )
        );
        
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Some RLS policies could not be created: %', SQLERRM;
        -- Continue with migration even if policies fail
END $$;

COMMIT;

-- ============================================================
-- MIGRATION COMPLETE
-- ============================================================

-- You can now use the improved knowledge base system!
-- The system will automatically detect which schema is available
-- and use the appropriate storage method.

-- ============================================================
-- TROUBLESHOOTING: If you still get schema cache errors
-- ============================================================

-- Option 1: Refresh Supabase schema cache (run this in your Supabase dashboard SQL editor)
-- SELECT schema_cache_clear();

-- Option 2: Restart your Supabase instance
-- This will clear the schema cache automatically

-- Option 3: Verify the schema manually
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'global_knowledge_base_entries' 
-- ORDER BY ordinal_position;

-- Option 4: Check if the table exists
-- SELECT EXISTS (
--     SELECT FROM information_schema.tables 
--     WHERE table_schema = 'public' 
--     AND table_name = 'global_knowledge_base_entries'
-- );
