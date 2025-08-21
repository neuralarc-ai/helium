-- Migration: Enable Knowledge Base RLS and Add Comments
-- This migration enables Row Level Security and adds documentation

BEGIN;

-- 1. RLS (Row Level Security) - Enable for all tables
ALTER TABLE global_knowledge_base_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_base_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_knowledge_base_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE global_knowledge_base_usage_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_base_usage_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_knowledge_base_usage_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_group_members ENABLE ROW LEVEL SECURITY;

-- 2. TABLE COMMENTS
COMMENT ON TABLE global_knowledge_base_entries IS 'Global knowledge base entries accessible across all threads and agents';
COMMENT ON TABLE knowledge_base_entries IS 'Thread-specific knowledge base entries';
COMMENT ON TABLE agent_knowledge_base_entries IS 'Agent-specific knowledge base entries';
COMMENT ON TABLE file_group_members IS 'Tracks individual files that belong to file groups';

-- 3. FUNCTION COMMENTS
COMMENT ON FUNCTION get_relevant_kb_context IS 'RAG-based function that retrieves relevant knowledge base entries based on query similarity';
COMMENT ON FUNCTION get_knowledge_base_context IS 'Retrieves thread-specific knowledge base context';
COMMENT ON FUNCTION get_agent_knowledge_base_context IS 'Retrieves agent-specific knowledge base context';
COMMENT ON FUNCTION get_combined_knowledge_base_context IS 'Combines agent, thread, and global knowledge base context';

-- 4. COLUMN COMMENTS
COMMENT ON COLUMN global_knowledge_base_entries.source_type IS 'Type of source: manual, file, git_repo, zip_extracted, thread_extraction, api, webhook';
COMMENT ON COLUMN global_knowledge_base_entries.source_metadata IS 'Additional metadata about the source (file info, git details, etc.)';
COMMENT ON COLUMN global_knowledge_base_entries.file_size IS 'Size of the source file in bytes';
COMMENT ON COLUMN global_knowledge_base_entries.file_mime_type IS 'MIME type of the source file';
COMMENT ON COLUMN global_knowledge_base_entries.extracted_from_zip_id IS 'Reference to parent ZIP file if this entry was extracted from a ZIP';
COMMENT ON COLUMN global_knowledge_base_entries.is_file_group IS 'Whether this entry represents a group of files';
COMMENT ON COLUMN global_knowledge_base_entries.group_id IS 'Reference to the file group this entry belongs to';
COMMENT ON COLUMN global_knowledge_base_entries.file_count IS 'Number of files in this group (for group entries)';
COMMENT ON COLUMN global_knowledge_base_entries.tags IS 'JSON array of tags for categorization';

COMMENT ON COLUMN knowledge_base_entries.source_type IS 'Type of source: manual, file, git_repo, zip_extracted, thread_extraction, api, webhook';
COMMENT ON COLUMN knowledge_base_entries.source_metadata IS 'Additional metadata about the source';
COMMENT ON COLUMN knowledge_base_entries.file_size IS 'Size of the source file in bytes';
COMMENT ON COLUMN knowledge_base_entries.file_mime_type IS 'MIME type of the source file';

COMMENT ON COLUMN agent_knowledge_base_entries.source_type IS 'Type of source: manual, file, git_repo, zip_extracted, api, webhook';
COMMENT ON COLUMN agent_knowledge_base_entries.source_metadata IS 'Additional metadata about the source';
COMMENT ON COLUMN agent_knowledge_base_entries.file_path IS 'Path to the source file';
COMMENT ON COLUMN agent_knowledge_base_entries.file_size IS 'Size of the source file in bytes';
COMMENT ON COLUMN agent_knowledge_base_entries.file_mime_type IS 'MIME type of the source file';
COMMENT ON COLUMN agent_knowledge_base_entries.extracted_from_zip_id IS 'Reference to parent ZIP file if this entry was extracted from a ZIP';

COMMIT;
