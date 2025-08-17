import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Project } from '@/lib/api';
import { useThreadQuery } from '@/hooks/react-query/threads/use-threads';
import { useMessagesQuery } from '@/hooks/react-query/threads/use-messages';
import { useProjectQuery } from '@/hooks/react-query/threads/use-project';
import { useAgentRunsQuery } from '@/hooks/react-query/threads/use-agent-run';
import { ApiMessageType, UnifiedMessage, AgentStatus } from '../_types';

interface UseThreadDataReturn {
  messages: UnifiedMessage[];
  setMessages: React.Dispatch<React.SetStateAction<UnifiedMessage[]>>;
  project: Project | null;
  sandboxId: string | null;
  projectName: string;
  agentRunId: string | null;
  setAgentRunId: React.Dispatch<React.SetStateAction<string | null>>;
  agentStatus: AgentStatus;
  setAgentStatus: React.Dispatch<React.SetStateAction<AgentStatus>>;
  isLoading: boolean;
  error: string | null;
  initialLoadCompleted: boolean;
  threadQuery: ReturnType<typeof useThreadQuery>;
  messagesQuery: ReturnType<typeof useMessagesQuery>;
  projectQuery: ReturnType<typeof useProjectQuery>;
  agentRunsQuery: ReturnType<typeof useAgentRunsQuery>;
}

export function useThreadData(threadId: string, projectId: string): UseThreadDataReturn {
  const [messages, setMessages] = useState<UnifiedMessage[]>([]);
  const [project, setProject] = useState<Project | null>(null);
  const [sandboxId, setSandboxId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState<string>('');
  const [agentRunId, setAgentRunId] = useState<string | null>(null);
  const [agentStatus, setAgentStatus] = useState<AgentStatus>('idle');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const initialLoadCompleted = useRef<boolean>(false);
  const messagesLoadedRef = useRef(false);
  const agentRunsCheckedRef = useRef(false);
  const hasInitiallyScrolled = useRef<boolean>(false);

  const threadQuery = useThreadQuery(threadId);
  const messagesQuery = useMessagesQuery(threadId);
  const projectQuery = useProjectQuery(projectId);
  const agentRunsQuery = useAgentRunsQuery(threadId);

  useEffect(() => {
    let isMounted = true;

    async function initializeData() {
      if (!initialLoadCompleted.current) setIsLoading(true);
      setError(null);
      try {
        if (!threadId) throw new Error('Thread ID is required');

        if (threadQuery.isError) {
          throw new Error('Failed to load thread data: ' + threadQuery.error);
        }
        if (!isMounted) return;

        if (projectQuery.data) {
          setProject(projectQuery.data);
          if (typeof projectQuery.data.sandbox === 'string') {
            setSandboxId(projectQuery.data.sandbox);
          } else if (projectQuery.data.sandbox?.id) {
            setSandboxId(projectQuery.data.sandbox.id);
          }

          setProjectName(projectQuery.data.name || '');
        }

        if (messagesQuery.data && !messagesLoadedRef.current) {
          const unifiedMessages = (messagesQuery.data || [])
            .filter((msg) => msg.type !== 'status')
            .map((msg: ApiMessageType) => ({
              message_id: msg.message_id || null,
              thread_id: msg.thread_id || threadId,
              type: (msg.type || 'system') as UnifiedMessage['type'],
              is_llm_message: Boolean(msg.is_llm_message),
              content: msg.content || '',
              metadata: msg.metadata || '{}',
              created_at: msg.created_at || new Date().toISOString(),
              updated_at: msg.updated_at || new Date().toISOString(),
            }));

          setMessages(unifiedMessages);
          console.log('[PAGE] Loaded Messages (excluding status, keeping browser_state):', unifiedMessages.length);
          messagesLoadedRef.current = true;

          if (!hasInitiallyScrolled.current) {
            hasInitiallyScrolled.current = true;
          }
        }

        if (agentRunsQuery.data && !agentRunsCheckedRef.current && isMounted) {
          console.log('[PAGE] Checking for active agent runs...');
          agentRunsCheckedRef.current = true;

          // Only check for very recent agent runs (last 30 seconds) to avoid false positives
          const thirtySecondsAgo = new Date(Date.now() - 30 * 1000);
          const recentActiveRun = agentRunsQuery.data.find((run) => {
            const runCreatedAt = new Date(run.started_at || 0);
            return run.status === 'running' && runCreatedAt > thirtySecondsAgo;
          });
          
          if (recentActiveRun && isMounted) {
            console.log('[PAGE] Found recent active run on load:', recentActiveRun.id);
            setAgentRunId(recentActiveRun.id);
            setAgentStatus('running');
          } else {
            console.log('[PAGE] No recent active agent runs found');
            if (isMounted) {
              setAgentStatus('idle');
              setAgentRunId(null);
            }
          }
        }

        if (threadQuery.data && messagesQuery.data && agentRunsQuery.data) {
          initialLoadCompleted.current = true;
          setIsLoading(false);
          
          // Final safety check: if no recent active runs found, ensure status is idle
          if (agentRunsCheckedRef.current) {
            const thirtySecondsAgo = new Date(Date.now() - 30 * 1000);
            const hasRecentActiveRun = agentRunsQuery.data.find((run) => {
              const runCreatedAt = new Date(run.started_at || 0);
              return run.status === 'running' && runCreatedAt > thirtySecondsAgo;
            });
            
            if (!hasRecentActiveRun) {
              console.log('[PAGE] Final check: No recent active runs, ensuring idle status');
              if (isMounted) {
                setAgentStatus('idle');
                setAgentRunId(null);
              }
            }
          }
        }

      } catch (err) {
        console.error('Error loading thread data:', err);
        if (isMounted) {
          const errorMessage =
            err instanceof Error ? err.message : 'Failed to load thread';
          setError(errorMessage);
          toast.error(errorMessage);
          setIsLoading(false);
        }
      }
    }

    if (threadId) {
      initializeData();
    }

    return () => {
      isMounted = false;
    };
  }, [
    threadId,
    threadQuery.data,
    threadQuery.isError,
    threadQuery.error,
    projectQuery.data,
    messagesQuery.data,
    agentRunsQuery.data
  ]);

  // Disabled automatic message replacement to prevent optimistic message deletion
  // Messages are now only loaded on initial page load and updated via streaming
  useEffect(() => {
    if (messagesQuery.data && messagesQuery.status === 'success') {
      // Only load messages on initial load, not when agent status changes
      if (!isLoading && messages.length === 0) {
        const unifiedMessages = (messagesQuery.data || [])
          .filter((msg) => msg.type !== 'status')
          .map((msg: ApiMessageType) => ({
            message_id: msg.message_id || null,
            thread_id: msg.thread_id || threadId,
            type: (msg.type || 'system') as UnifiedMessage['type'],
            is_llm_message: Boolean(msg.is_llm_message),
            content: msg.content || '',
            metadata: msg.metadata || '{}',
            created_at: msg.created_at || new Date().toISOString(),
            updated_at: msg.updated_at || new Date().toISOString(),
            agent_id: (msg as any).agent_id,
            agents: (msg as any).agents,
          }));

        setMessages(unifiedMessages);
      }
    }
  }, [messagesQuery.data, messagesQuery.status, isLoading, messages.length, threadId]);

  return {
    messages,
    setMessages,
    project,
    sandboxId,
    projectName,
    agentRunId,
    setAgentRunId,
    agentStatus,
    setAgentStatus,
    isLoading,
    error,
    initialLoadCompleted: initialLoadCompleted.current,
    threadQuery,
    messagesQuery,
    projectQuery,
    agentRunsQuery,
  };
} 