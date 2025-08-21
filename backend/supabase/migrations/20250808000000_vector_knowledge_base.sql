-- Vector-Enabled Knowledge Base System
-- This migration creates tables for global and thread-specific knowledge bases with vector search capabilities

BEGIN;

-- Enable pgvector extension for vector operations
CREATE EXTENSION IF NOT EXISTS vector;

-- Create enum for knowledge base types
DO $$ BEGIN
    CREATE TYPE knowledge_base_type AS ENUM ('global', 'thread');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create enum for document processing status
DO $$ BEGIN
    CREATE TYPE document_status AS ENUM ('pending', 'processing', 'completed', 'failed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create enum for document types
DO $$ BEGIN
    CREATE TYPE document_type AS ENUM ('pdf', 'docx', 'csv', 'txt', 'md', 'json', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Global Knowledge Base table
CREATE TABLE IF NOT EXISTS global_knowledge_base (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES basejump.accounts(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    content TEXT NOT NULL,
    content_tokens INTEGER DEFAULT 0,
    usage_context VARCHAR(50) DEFAULT 'always' CHECK (usage_context IN ('always', 'contextual', 'on_request')),
    is_active BOOLEAN DEFAULT true,
    source_metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT global_kb_name_account_unique UNIQUE (name, account_id)
);

-- Thread-specific Knowledge Base table
CREATE TABLE IF NOT EXISTS thread_knowledge_base (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID NOT NULL REFERENCES threads(thread_id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES basejump.accounts(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    content TEXT NOT NULL,
    content_tokens INTEGER DEFAULT 0,
    usage_context VARCHAR(50) DEFAULT 'always' CHECK (usage_context IN ('always', 'contextual', 'on_request')),
    is_active BOOLEAN DEFAULT true,
    source_metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT thread_kb_name_thread_unique UNIQUE (name, thread_id)
);

-- Document processing queue table
CREATE TABLE IF NOT EXISTS document_processing_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES basejump.accounts(id) ON DELETE CASCADE,
    thread_id UUID REFERENCES threads(thread_id) ON DELETE CASCADE,
    kb_type knowledge_base_type NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100),
    document_type document_type,
    status document_status DEFAULT 'pending',
    processing_started_at TIMESTAMPTZ,
    processing_completed_at TIMESTAMPTZ,
    error_message TEXT,
    extracted_text TEXT,
    chunk_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Document chunks table for vector search
CREATE TABLE IF NOT EXISTS document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES document_processing_queue(id) ON DELETE CASCADE,
    kb_entry_id UUID, -- References either global_knowledge_base or thread_knowledge_base
    kb_type knowledge_base_type NOT NULL,
    chunk_index INTEGER NOT NULL,
    chunk_text TEXT NOT NULL,
    chunk_tokens INTEGER DEFAULT 0,
    embedding vector(384), -- Using 384 dimensions for sentence-transformers
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Knowledge base query logs for relevance tracking
CREATE TABLE IF NOT EXISTS kb_query_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID REFERENCES threads(thread_id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES basejump.accounts(id) ON DELETE CASCADE,
    user_query TEXT NOT NULL,
    query_embedding vector(384),
    relevant_chunks_found INTEGER DEFAULT 0,
    chunks_retrieved JSONB DEFAULT '[]',
    relevance_score FLOAT,
    was_kb_used BOOLEAN DEFAULT false,
    response_time_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_global_kb_account_id ON global_knowledge_base(account_id);
CREATE INDEX IF NOT EXISTS idx_global_kb_is_active ON global_knowledge_base(is_active);
CREATE INDEX IF NOT EXISTS idx_global_kb_usage_context ON global_knowledge_base(usage_context);
CREATE INDEX IF NOT EXISTS idx_global_kb_created_at ON global_knowledge_base(created_at);

CREATE INDEX IF NOT EXISTS idx_thread_kb_thread_id ON thread_knowledge_base(thread_id);
CREATE INDEX IF NOT EXISTS idx_thread_kb_account_id ON thread_knowledge_base(account_id);
CREATE INDEX IF NOT EXISTS idx_thread_kb_is_active ON thread_knowledge_base(is_active);
CREATE INDEX IF NOT EXISTS idx_thread_kb_usage_context ON thread_knowledge_base(usage_context);

CREATE INDEX IF NOT EXISTS idx_doc_queue_account_id ON document_processing_queue(account_id);
CREATE INDEX IF NOT EXISTS idx_doc_queue_thread_id ON document_processing_queue(thread_id);
CREATE INDEX IF NOT EXISTS idx_doc_queue_status ON document_processing_queue(status);
CREATE INDEX IF NOT EXISTS idx_doc_queue_kb_type ON document_processing_queue(kb_type);
CREATE INDEX IF NOT EXISTS idx_doc_queue_created_at ON document_processing_queue(created_at);

CREATE INDEX IF NOT EXISTS idx_doc_chunks_document_id ON document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_doc_chunks_kb_type ON document_chunks(kb_type);
CREATE INDEX IF NOT EXISTS idx_doc_chunks_chunk_index ON document_chunks(chunk_index);

-- Vector similarity search index
CREATE INDEX IF NOT EXISTS idx_doc_chunks_embedding ON document_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_kb_query_logs_thread_id ON kb_query_logs(thread_id);
CREATE INDEX IF NOT EXISTS idx_kb_query_logs_account_id ON kb_query_logs(account_id);
CREATE INDEX IF NOT EXISTS idx_kb_query_logs_created_at ON kb_query_logs(created_at);

-- Enable RLS on all tables
ALTER TABLE global_knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE thread_knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_processing_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_query_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for global knowledge base
CREATE POLICY "Users can view global KB in their accounts" ON global_knowledge_base
    FOR SELECT USING (basejump.has_role_on_account(account_id));

CREATE POLICY "Users can create global KB in their accounts" ON global_knowledge_base
    FOR INSERT WITH CHECK (basejump.has_role_on_account(account_id));

CREATE POLICY "Users can update global KB in their accounts" ON global_knowledge_base
    FOR UPDATE USING (basejump.has_role_on_account(account_id));

CREATE POLICY "Users can delete global KB in their accounts" ON global_knowledge_base
    FOR DELETE USING (basejump.has_role_on_account(account_id));

-- RLS Policies for thread knowledge base
CREATE POLICY "Users can view thread KB in their threads" ON thread_knowledge_base
    FOR SELECT USING (
        basejump.has_role_on_account(account_id) OR
        EXISTS (
            SELECT 1 FROM threads t
            LEFT JOIN projects p ON t.project_id = p.project_id
            WHERE t.thread_id = thread_knowledge_base.thread_id
            AND (
                p.is_public = TRUE OR
                basejump.has_role_on_account(t.account_id) = true OR 
                basejump.has_role_on_account(p.account_id) = true
            )
        )
    );

CREATE POLICY "Users can create thread KB in their threads" ON thread_knowledge_base
    FOR INSERT WITH CHECK (
        basejump.has_role_on_account(account_id) OR
        EXISTS (
            SELECT 1 FROM threads t
            WHERE t.thread_id = thread_knowledge_base.thread_id
            AND basejump.has_role_on_account(t.account_id) = true
        )
    );

CREATE POLICY "Users can update thread KB in their threads" ON thread_knowledge_base
    FOR UPDATE USING (
        basejump.has_role_on_account(account_id) OR
        EXISTS (
            SELECT 1 FROM threads t
            WHERE t.thread_id = thread_knowledge_base.thread_id
            AND basejump.has_role_on_account(t.account_id) = true
        )
    );

CREATE POLICY "Users can delete thread KB in their threads" ON thread_knowledge_base
    FOR DELETE USING (
        basejump.has_role_on_account(account_id) OR
        EXISTS (
            SELECT 1 FROM threads t
            WHERE t.thread_id = thread_knowledge_base.thread_id
            AND basejump.has_role_on_account(t.account_id) = true
        )
    );

-- RLS Policies for document processing queue
CREATE POLICY "Users can view their document processing jobs" ON document_processing_queue
    FOR SELECT USING (basejump.has_role_on_account(account_id));

CREATE POLICY "Users can create document processing jobs" ON document_processing_queue
    FOR INSERT WITH CHECK (basejump.has_role_on_account(account_id));

CREATE POLICY "Service role can update document processing jobs" ON document_processing_queue
    FOR UPDATE USING (auth.jwt() ->> 'role' = 'service_role');

-- RLS Policies for document chunks
CREATE POLICY "Users can view chunks from their documents" ON document_chunks
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM document_processing_queue dpq
            WHERE dpq.id = document_chunks.document_id
            AND basejump.has_role_on_account(dpq.account_id) = true
        )
    );

CREATE POLICY "Service role can insert chunks" ON document_chunks
    FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- RLS Policies for query logs
CREATE POLICY "Users can view their query logs" ON kb_query_logs
    FOR SELECT USING (basejump.has_role_on_account(account_id));

CREATE POLICY "Users can create query logs" ON kb_query_logs
    FOR INSERT WITH CHECK (basejump.has_role_on_account(account_id));

-- Functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_kb_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_global_kb_timestamp
    BEFORE UPDATE ON global_knowledge_base
    FOR EACH ROW EXECUTE FUNCTION update_kb_timestamp();

CREATE TRIGGER update_thread_kb_timestamp
    BEFORE UPDATE ON thread_knowledge_base
    FOR EACH ROW EXECUTE FUNCTION update_kb_timestamp();

CREATE TRIGGER update_doc_queue_timestamp
    BEFORE UPDATE ON document_processing_queue
    FOR EACH ROW EXECUTE FUNCTION update_kb_timestamp();

-- Function to calculate content tokens (approximate)
CREATE OR REPLACE FUNCTION calculate_content_tokens(content_text TEXT)
RETURNS INTEGER AS $$
BEGIN
    -- Rough approximation: 1 token ≈ 4 characters for English text
    RETURN LENGTH(content_text) / 4;
END;
$$ LANGUAGE plpgsql;

-- Function to get relevant knowledge base chunks for a query
CREATE OR REPLACE FUNCTION get_relevant_kb_chunks(
    query_embedding vector(384),
    p_kb_type knowledge_base_type DEFAULT NULL,
    p_thread_id UUID DEFAULT NULL,
    p_account_id UUID DEFAULT NULL,
    similarity_threshold FLOAT DEFAULT 0.7,
    max_chunks INTEGER DEFAULT 5
)
RETURNS TABLE (
    chunk_id UUID,
    chunk_text TEXT,
    chunk_tokens INTEGER,
    similarity_score FLOAT,
    kb_entry_id UUID,
    kb_type knowledge_base_type,
    source_metadata JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        dc.id,
        dc.chunk_text,
        dc.chunk_tokens,
        1 - (dc.embedding <=> query_embedding) as similarity_score,
        dc.kb_entry_id,
        dc.kb_type,
        dc.metadata
    FROM document_chunks dc
    JOIN document_processing_queue dpq ON dc.document_id = dpq.id
    WHERE 
        -- Filter by knowledge base type if specified
        (p_kb_type IS NULL OR dc.kb_type = p_kb_type)
        -- Filter by thread if specified
        AND (p_thread_id IS NULL OR dpq.thread_id = p_thread_id)
        -- Filter by account if specified
        AND (p_account_id IS NULL OR dpq.account_id = p_account_id)
        -- Only include chunks from completed documents
        AND dpq.status = 'completed'
        -- Only include chunks with embeddings
        AND dc.embedding IS NOT NULL
        -- Similarity threshold
        AND (1 - (dc.embedding <=> query_embedding)) >= similarity_threshold
    ORDER BY dc.embedding <=> query_embedding
    LIMIT max_chunks;
END;
$$ LANGUAGE plpgsql;

-- Function to check if a query is relevant to knowledge base
CREATE OR REPLACE FUNCTION is_query_relevant_to_kb(
    query_embedding vector(384),
    p_kb_type knowledge_base_type DEFAULT NULL,
    p_thread_id UUID DEFAULT NULL,
    p_account_id UUID DEFAULT NULL,
    relevance_threshold FLOAT DEFAULT 0.6
)
RETURNS BOOLEAN AS $$
DECLARE
    max_similarity FLOAT;
BEGIN
    SELECT MAX(1 - (dc.embedding <=> query_embedding))
    INTO max_similarity
    FROM document_chunks dc
    JOIN document_processing_queue dpq ON dc.document_id = dpq.id
    WHERE 
        (p_kb_type IS NULL OR dc.kb_type = p_kb_type)
        AND (p_thread_id IS NULL OR dpq.thread_id = p_thread_id)
        AND (p_account_id IS NULL OR dpq.account_id = p_account_id)
        AND dpq.status = 'completed'
        AND dc.embedding IS NOT NULL;
    
    RETURN COALESCE(max_similarity, 0) >= relevance_threshold;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT ALL PRIVILEGES ON TABLE global_knowledge_base TO authenticated, service_role;
GRANT ALL PRIVILEGES ON TABLE thread_knowledge_base TO authenticated, service_role;
GRANT ALL PRIVILEGES ON TABLE document_processing_queue TO authenticated, service_role;
GRANT ALL PRIVILEGES ON TABLE document_chunks TO authenticated, service_role;
GRANT ALL PRIVILEGES ON TABLE kb_query_logs TO authenticated, service_role;

GRANT EXECUTE ON FUNCTION get_relevant_kb_chunks TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION is_query_relevant_to_kb TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION calculate_content_tokens TO authenticated, service_role;

-- Add comments for documentation
COMMENT ON TABLE global_knowledge_base IS 'Global knowledge base entries accessible across all threads for an account';
COMMENT ON TABLE thread_knowledge_base IS 'Thread-specific knowledge base entries';
COMMENT ON TABLE document_processing_queue IS 'Queue for processing uploaded documents into knowledge base entries';
COMMENT ON TABLE document_chunks IS 'Chunked document content with vector embeddings for similarity search';
COMMENT ON TABLE kb_query_logs IS 'Logs of knowledge base queries for relevance tracking and optimization';

COMMIT;
