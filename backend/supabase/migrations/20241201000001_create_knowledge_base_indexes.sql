-- Migration: Create Knowledge Base Indexes
-- This migration creates the performance indexes for the knowledge base tables

BEGIN;

-- Global KB indexes
CREATE INDEX IF NOT EXISTS idx_global_kb_entries_account_id ON global_knowledge_base_entries(account_id);
CREATE INDEX IF NOT EXISTS idx_global_kb_entries_is_active ON global_knowledge_base_entries(is_active);
CREATE INDEX IF NOT EXISTS idx_global_kb_entries_usage_context ON global_knowledge_base_entries(usage_context);
CREATE INDEX IF NOT EXISTS idx_global_kb_entries_created_at ON global_knowledge_base_entries(created_at);
CREATE INDEX IF NOT EXISTS idx_global_kb_entries_source_type ON global_knowledge_base_entries(source_type);
CREATE INDEX IF NOT EXISTS idx_global_kb_entries_extracted_from_zip ON global_knowledge_base_entries(extracted_from_zip_id);
CREATE INDEX IF NOT EXISTS idx_global_kb_entries_is_file_group ON global_knowledge_base_entries(is_file_group);
CREATE INDEX IF NOT EXISTS idx_global_kb_entries_group_id ON global_knowledge_base_entries(group_id);
CREATE INDEX IF NOT EXISTS idx_global_kb_embeddings ON global_knowledge_base_entries USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Thread KB indexes
CREATE INDEX IF NOT EXISTS idx_kb_entries_thread_id ON knowledge_base_entries(thread_id);
CREATE INDEX IF NOT EXISTS idx_kb_entries_account_id ON knowledge_base_entries(account_id);
CREATE INDEX IF NOT EXISTS idx_kb_entries_is_active ON knowledge_base_entries(is_active);
CREATE INDEX IF NOT EXISTS idx_kb_entries_usage_context ON knowledge_base_entries(usage_context);
CREATE INDEX IF NOT EXISTS idx_kb_entries_created_at ON knowledge_base_entries(created_at);
CREATE INDEX IF NOT EXISTS idx_kb_entries_source_type ON knowledge_base_entries(source_type);
CREATE INDEX IF NOT EXISTS idx_kb_embeddings ON knowledge_base_entries USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Agent KB indexes
CREATE INDEX IF NOT EXISTS idx_agent_kb_entries_agent_id ON agent_knowledge_base_entries(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_kb_entries_account_id ON agent_knowledge_base_entries(account_id);
CREATE INDEX IF NOT EXISTS idx_agent_kb_entries_is_active ON agent_knowledge_base_entries(is_active);
CREATE INDEX IF NOT EXISTS idx_agent_kb_entries_usage_context ON agent_knowledge_base_entries(usage_context);
CREATE INDEX IF NOT EXISTS idx_agent_kb_entries_created_at ON agent_knowledge_base_entries(created_at);
CREATE INDEX IF NOT EXISTS idx_agent_kb_entries_source_type ON agent_knowledge_base_entries(source_type);
CREATE INDEX IF NOT EXISTS idx_agent_kb_entries_extracted_from_zip ON agent_knowledge_base_entries(extracted_from_zip_id);

-- Usage log indexes
CREATE INDEX IF NOT EXISTS idx_global_kb_usage_entry_id ON global_knowledge_base_usage_log(entry_id);
CREATE INDEX IF NOT EXISTS idx_global_kb_usage_thread_id ON global_knowledge_base_usage_log(thread_id);
CREATE INDEX IF NOT EXISTS idx_global_kb_usage_used_at ON global_knowledge_base_usage_log(used_at);
CREATE INDEX IF NOT EXISTS idx_kb_usage_entry_id ON knowledge_base_usage_log(entry_id);
CREATE INDEX IF NOT EXISTS idx_kb_usage_thread_id ON knowledge_base_usage_log(thread_id);
CREATE INDEX IF NOT EXISTS idx_kb_usage_used_at ON knowledge_base_usage_log(used_at);
CREATE INDEX IF NOT EXISTS idx_agent_kb_usage_entry_id ON agent_knowledge_base_usage_log(entry_id);
CREATE INDEX IF NOT EXISTS idx_agent_kb_usage_agent_id ON agent_knowledge_base_usage_log(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_kb_usage_used_at ON agent_knowledge_base_usage_log(used_at);

-- File group indexes
CREATE INDEX IF NOT EXISTS idx_file_group_members_group_entry_id ON file_group_members(group_entry_id);
CREATE INDEX IF NOT EXISTS idx_file_group_members_file_entry_id ON file_group_members(file_entry_id);
CREATE INDEX IF NOT EXISTS idx_file_group_members_display_order ON file_group_members(display_order);

COMMIT;
