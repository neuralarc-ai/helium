-- Migration: Add RLS policies for knowledge base tables
-- This migration adds the necessary Row Level Security policies

BEGIN;

-- 1. RLS Policy for global_knowledge_base_entries
CREATE POLICY "Users can access their own global knowledge base entries" ON global_knowledge_base_entries
FOR ALL USING (
    CASE
        WHEN account_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
            -- If it's a UUID, use the basejump function
            basejump.has_role_on_account(account_id::uuid) = true
        ELSE
            -- If it's a string (user_id), check if it matches the current user
            account_id = auth.uid()::text
    END
);

-- 2. RLS Policy for knowledge_base_entries (thread-specific)
CREATE POLICY "Users can access thread knowledge base entries" ON knowledge_base_entries
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM threads t
        WHERE t.thread_id = knowledge_base_entries.thread_id
        AND (
            basejump.has_role_on_account(t.account_id) = true OR 
            basejump.has_role_on_account(knowledge_base_entries.account_id) = true
        )
    )
);

-- 3. RLS Policy for agent_knowledge_base_entries
CREATE POLICY "Users can access agent knowledge base entries" ON agent_knowledge_base_entries
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM agents a
        WHERE a.agent_id = agent_knowledge_base_entries.agent_id
        AND basejump.has_role_on_account(a.account_id) = true
    )
);

-- 4. RLS Policy for usage log tables
CREATE POLICY "Users can access global KB usage logs" ON global_knowledge_base_usage_log
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM global_knowledge_base_entries g
        WHERE g.entry_id = global_knowledge_base_usage_log.entry_id
        AND (
            CASE
                WHEN g.account_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
                    basejump.has_role_on_account(g.account_id::uuid) = true
                ELSE
                    g.account_id = auth.uid()::text
            END
        )
    )
);

CREATE POLICY "Users can access KB usage logs" ON knowledge_base_usage_log
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM knowledge_base_entries k
        WHERE k.entry_id = knowledge_base_usage_log.entry_id
        AND EXISTS (
            SELECT 1 FROM threads t
            WHERE t.thread_id = k.thread_id
            AND basejump.has_role_on_account(t.account_id) = true
        )
    )
);

CREATE POLICY "Users can access agent KB usage logs" ON agent_knowledge_base_usage_log
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM agent_knowledge_base_entries a
        WHERE a.entry_id = agent_knowledge_base_usage_log.entry_id
        AND EXISTS (
            SELECT 1 FROM agents ag
            WHERE ag.agent_id = a.agent_id
            AND basejump.has_role_on_account(ag.account_id) = true
        )
    )
);

-- 5. RLS Policy for file_group_members
CREATE POLICY "Users can access file group members" ON file_group_members
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM global_knowledge_base_entries g
        WHERE g.entry_id = file_group_members.group_entry_id
        AND (
            CASE
                WHEN g.account_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
                    basejump.has_role_on_account(g.account_id::uuid) = true
                ELSE
                    g.account_id = auth.uid()::text
            END
        )
    )
);

COMMIT;
