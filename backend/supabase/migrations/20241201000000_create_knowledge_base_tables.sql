-- Migration: Create Knowledge Base Tables
-- This migration creates the basic table structure for the knowledge base system

BEGIN;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 1. GLOBAL KNOWLEDGE BASE ENTRIES (Main table for file uploads and global content)
CREATE TABLE IF NOT EXISTS public.global_knowledge_base_entries (
    entry_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id VARCHAR(255) NOT NULL, -- Flexible to accept both UUID and string IDs
    name VARCHAR(255) NOT NULL,
    description TEXT,
    content TEXT NOT NULL,
    content_tokens INTEGER,
    usage_context VARCHAR(100) DEFAULT 'always' CHECK (usage_context IN ('always', 'on_request', 'contextual')),
    is_active BOOLEAN DEFAULT TRUE,
    source_type VARCHAR(100) CHECK (source_type IN ('manual', 'file', 'git_repo', 'zip_extracted', 'thread_extraction', 'api', 'webhook')),
    source_metadata JSONB DEFAULT '{}'::jsonb,
    file_size BIGINT,
    file_mime_type VARCHAR(255),
    extracted_from_zip_id UUID REFERENCES global_knowledge_base_entries(entry_id) ON DELETE CASCADE,
    is_file_group BOOLEAN DEFAULT FALSE,
    group_id UUID REFERENCES global_knowledge_base_entries(entry_id) ON DELETE CASCADE,
    file_count INTEGER DEFAULT 1,
    tags JSONB DEFAULT '[]'::jsonb,
    embedding vector(384),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_accessed_at TIMESTAMPTZ,
    
    CONSTRAINT global_kb_entries_content_not_empty CHECK (
        content IS NOT NULL AND LENGTH(TRIM(content)) > 0
    )
);

-- 2. THREAD-SPECIFIC KNOWLEDGE BASE ENTRIES
CREATE TABLE IF NOT EXISTS public.knowledge_base_entries (
    entry_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID NOT NULL REFERENCES threads(thread_id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES basejump.accounts(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    content TEXT NOT NULL,
    content_tokens INTEGER,
    usage_context VARCHAR(100) DEFAULT 'always' CHECK (usage_context IN ('always', 'on_request', 'contextual')),
    is_active BOOLEAN DEFAULT TRUE,
    source_type VARCHAR(100) CHECK (source_type IN ('manual', 'file', 'git_repo', 'zip_extracted', 'thread_extraction', 'api', 'webhook')),
    source_metadata JSONB DEFAULT '{}'::jsonb,
    file_size BIGINT,
    file_mime_type VARCHAR(255),
    embedding vector(384),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_accessed_at TIMESTAMPTZ,
    
    CONSTRAINT kb_entries_content_not_empty CHECK (
        content IS NOT NULL AND LENGTH(TRIM(content)) > 0
    )
);

-- 3. AGENT KNOWLEDGE BASE ENTRIES
CREATE TABLE IF NOT EXISTS public.agent_knowledge_base_entries (
    entry_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES agents(agent_id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES basejump.accounts(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    content TEXT NOT NULL,
    content_tokens INTEGER,
    usage_context VARCHAR(100) DEFAULT 'always' CHECK (usage_context IN ('always', 'on_request', 'contextual')),
    is_active BOOLEAN DEFAULT TRUE,
    source_type VARCHAR(50) DEFAULT 'manual' CHECK (source_type IN ('manual', 'file', 'git_repo', 'zip_extracted', 'api', 'webhook')),
    source_metadata JSONB DEFAULT '{}',
    file_path TEXT,
    file_size BIGINT,
    file_mime_type VARCHAR(255),
    extracted_from_zip_id UUID REFERENCES agent_knowledge_base_entries(entry_id) ON DELETE CASCADE,
    embedding vector(384),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_accessed_at TIMESTAMPTZ,
    
    CONSTRAINT agent_kb_entries_content_not_empty CHECK (
        content IS NOT NULL AND LENGTH(TRIM(content)) > 0
    )
);

-- 4. USAGE LOG TABLES
CREATE TABLE IF NOT EXISTS public.global_knowledge_base_usage_log (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_id UUID NOT NULL REFERENCES global_knowledge_base_entries(entry_id) ON DELETE CASCADE,
    thread_id UUID REFERENCES threads(thread_id) ON DELETE CASCADE,
    usage_type VARCHAR(50) NOT NULL,
    tokens_used INTEGER,
    used_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.knowledge_base_usage_log (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_id UUID NOT NULL REFERENCES knowledge_base_entries(entry_id) ON DELETE CASCADE,
    thread_id UUID NOT NULL REFERENCES threads(thread_id) ON DELETE CASCADE,
    usage_type VARCHAR(50) NOT NULL,
    tokens_used INTEGER,
    used_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.agent_knowledge_base_usage_log (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_id UUID NOT NULL REFERENCES agent_knowledge_base_entries(entry_id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES agents(agent_id) ON DELETE CASCADE,
    usage_type VARCHAR(50) NOT NULL,
    tokens_used INTEGER,
    used_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. FILE GROUP MEMBERS (for organizing multiple files)
CREATE TABLE IF NOT EXISTS public.file_group_members (
    member_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_entry_id UUID NOT NULL REFERENCES global_knowledge_base_entries(entry_id) ON DELETE CASCADE,
    file_entry_id UUID NOT NULL REFERENCES global_knowledge_base_entries(entry_id) ON DELETE CASCADE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(file_entry_id)
);

COMMIT;
