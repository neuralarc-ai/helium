import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

const useAuthHeaders = () => {
  const getHeaders = async () => {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      throw new Error('No access token available');
    }
    return {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    };  
  };
  
  return { getHeaders };
};

// Types
export interface KnowledgeBaseEntry {
  entry_id: string;
  name: string;
  description: string;
  content: string;
  usage_context: 'always' | 'on_request' | 'contextual';
  is_active: boolean;
  content_tokens?: number;
  created_at: string;
  updated_at: string;
  source_type?: string;
  source_metadata?: any;
  file_size?: any;
}

export interface CreateKnowledgeBaseEntryRequest {
  name: string;
  description: string;
  content: string;
  usage_context: 'always' | 'on_request' | 'contextual';
}

export interface UpdateKnowledgeBaseEntryRequest {
  name?: string;
  description?: string;
  content?: string;
  usage_context?: 'always' | 'on_request' | 'contextual';
  is_active?: boolean;
}

export interface ExtractThreadKnowledgeRequest {
  thread_id: string;
  entry_name: string;
  description?: string;
  usage_context: 'always' | 'on_request' | 'contextual';
  include_messages: boolean;
  include_agent_runs: boolean;
  max_messages: number;
}

export interface KnowledgeBaseListResponse {
  entries: KnowledgeBaseEntry[];
  total_count: number;
  total_tokens: number;
}

export interface KnowledgeBaseContextResponse {
  context: string | null;
  max_tokens: number;
  thread_id?: string;
  agent_id?: string;
}

// Additional types for agent knowledge base functionality
export interface ProcessingJob {
  job_id: string;
  job_type: string;
  status: string;
  source_info: Record<string, any>;
  result_info: Record<string, any>;
  entries_created: number;
  total_files: number;
  created_at: string;
  completed_at?: string;
  error_message?: string;
}

export interface FileUploadRequest {
  agentId: string;
  file: File;
}

export interface GitCloneRequest {
  agentId: string;
  git_url: string;
  branch?: string;
}

export interface UploadResponse {
  job_id: string;
  message: string;
  filename: string;
}

export interface CloneResponse {
  job_id: string;
  message: string;
  repository: string;
}

// Query keys
export const knowledgeBaseKeys = {
  all: ['knowledge-base'] as const,
  lists: () => [...knowledgeBaseKeys.all, 'list'] as const,
  list: (threadId: string) => [...knowledgeBaseKeys.lists(), threadId] as const,
  agentList: (agentId: string) => [...knowledgeBaseKeys.lists(), 'agent', agentId] as const,
  details: () => [...knowledgeBaseKeys.all, 'detail'] as const,
  detail: (entryId: string) => [...knowledgeBaseKeys.details(), entryId] as const,
  context: (threadId: string) => [...knowledgeBaseKeys.all, 'context', threadId] as const,
  agentContext: (agentId: string) => [...knowledgeBaseKeys.all, 'agent-context', agentId] as const,
  combinedContext: (threadId: string, agentId?: string) => [...knowledgeBaseKeys.all, 'combined-context', threadId, agentId] as const,
  processingJobs: (agentId: string) => [...knowledgeBaseKeys.all, 'processing-jobs', agentId] as const,
  threadProcessingJobs: (threadId: string) => [...knowledgeBaseKeys.all, 'thread-processing-jobs', threadId] as const,
};

// API functions
const createKnowledgeBaseEntry = async (threadId: string, data: CreateKnowledgeBaseEntryRequest): Promise<KnowledgeBaseEntry> => {
  const response = await fetch(`${API_URL}/vector-kb/thread-entries/${threadId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || 'Failed to create knowledge base entry');
  }

  return response.json();
};

const updateKnowledgeBaseEntry = async (entryId: string, data: UpdateKnowledgeBaseEntryRequest): Promise<KnowledgeBaseEntry> => {
  const response = await fetch(`${API_URL}/vector-kb/entry/${entryId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || 'Failed to update knowledge base entry');
  }

  return response.json();
};

const deleteKnowledgeBaseEntry = async (entryId: string): Promise<void> => {
  const response = await fetch(`${API_URL}/vector-kb/entry/${entryId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || 'Failed to delete knowledge base entry');
  }
};

const extractThreadKnowledge = async (threadId: string, data: ExtractThreadKnowledgeRequest): Promise<KnowledgeBaseEntry> => {
  const response = await fetch(`${API_URL}/vector-kb/thread-entries/${threadId}/extract-knowledge`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || 'Failed to extract thread knowledge');
  }

  return response.json();
};

// React Query hooks
export function useKnowledgeBaseEntries(threadId: string, includeInactive = false) {
  const { getHeaders } = useAuthHeaders();
  
  return useQuery({
    queryKey: knowledgeBaseKeys.list(threadId),
    queryFn: async () => {
      const headers = await getHeaders();
      const url = new URL(`${API_URL}/vector-kb/thread-entries/${threadId}`);
      url.searchParams.set('include_inactive', includeInactive.toString());
      
      const response = await fetch(url.toString(), { headers });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to fetch knowledge base entries');
      }
      
      return await response.json() as KnowledgeBaseListResponse;
    },
    enabled: !!threadId,
  });
}

export function useCreateKnowledgeBaseEntry() {
  const queryClient = useQueryClient();
  const { getHeaders } = useAuthHeaders();
  
  return useMutation({
    mutationFn: async ({ threadId, data }: { threadId: string; data: CreateKnowledgeBaseEntryRequest }) => {
      const headers = await getHeaders();
      const response = await fetch(`${API_URL}/vector-kb/thread-entries/${threadId}`, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to create knowledge base entry');
      }
      
      return await response.json() as KnowledgeBaseEntry;
    },
    onSuccess: (data, { threadId }) => {
      queryClient.invalidateQueries({ queryKey: knowledgeBaseKeys.list(threadId) });
    },
  });
}

export function useUpdateKnowledgeBaseEntry() {
  const queryClient = useQueryClient();
  const { getHeaders } = useAuthHeaders();
  
  return useMutation({
    mutationFn: async ({ entryId, data }: { entryId: string; data: UpdateKnowledgeBaseEntryRequest }) => {
      const headers = await getHeaders();
      const response = await fetch(`${API_URL}/knowledge-base/${entryId}`, {
        method: 'PUT',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to update knowledge base entry');
      }
      
      return await response.json() as KnowledgeBaseEntry;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: knowledgeBaseKeys.detail(data.entry_id) });
      // Invalidate lists that might contain this entry
      queryClient.invalidateQueries({ queryKey: knowledgeBaseKeys.lists() });
    },
  });
}

export function useDeleteKnowledgeBaseEntry() {
  const queryClient = useQueryClient();
  const { getHeaders } = useAuthHeaders();
  
  return useMutation({
    mutationFn: async (entryId: string) => {
      const headers = await getHeaders();
      const response = await fetch(`${API_URL}/knowledge-base/${entryId}`, {
        method: 'DELETE',
        headers,
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to delete knowledge base entry');
      }
    },
    onSuccess: () => {
      // Invalidate all knowledge base queries since we don't know which list contained this entry
      queryClient.invalidateQueries({ queryKey: knowledgeBaseKeys.all });
    },
  });
}

export function useExtractThreadKnowledge() {
  const queryClient = useQueryClient();
  const { getHeaders } = useAuthHeaders();
  
  return useMutation({
    mutationFn: async ({ threadId, data }: { threadId: string; data: ExtractThreadKnowledgeRequest }) => {
      const headers = await getHeaders();
      const response = await fetch(`${API_URL}/vector-kb/thread-entries/${threadId}/extract-knowledge`, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to extract thread knowledge');
      }
      
      return await response.json() as KnowledgeBaseEntry;
    },
    onSuccess: (data, { threadId }) => {
      queryClient.invalidateQueries({ queryKey: knowledgeBaseKeys.list(threadId) });
    },
  });
}

export function useKnowledgeBaseContext(threadId: string, maxTokens = 4000) {
  const { getHeaders } = useAuthHeaders();
  
  return useQuery({
    queryKey: knowledgeBaseKeys.context(threadId),
    queryFn: async () => {
      const headers = await getHeaders();
      const url = new URL(`${API_URL}/vector-kb/thread-entries/${threadId}/context`);
      url.searchParams.set('max_tokens', maxTokens.toString());
      
      const response = await fetch(url.toString(), { headers });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to fetch knowledge base context');
      }
      
      return await response.json() as KnowledgeBaseContextResponse;
    },
    enabled: !!threadId,
  });
}

export function useAgentKnowledgeBaseEntries(agentId: string, includeInactive = false) {
  const { getHeaders } = useAuthHeaders();
  
  return useQuery({
    queryKey: knowledgeBaseKeys.agentList(agentId),
    queryFn: async () => {
      const headers = await getHeaders();
      const url = new URL(`${API_URL}/knowledge-base/agents/${agentId}`);
      url.searchParams.set('include_inactive', includeInactive.toString());
      
      const response = await fetch(url.toString(), { headers });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to fetch agent knowledge base entries');
      }
      
      return await response.json() as KnowledgeBaseListResponse;
    },
    enabled: !!agentId,
  });
}

export function useCreateAgentKnowledgeBaseEntry() {
  const queryClient = useQueryClient();
  const { getHeaders } = useAuthHeaders();
  
  return useMutation({
    mutationFn: async ({ agentId, data }: { agentId: string; data: CreateKnowledgeBaseEntryRequest }) => {
      const headers = await getHeaders();
      const response = await fetch(`${API_URL}/knowledge-base/agents/${agentId}`, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to create agent knowledge base entry');
      }
      
      return await response.json() as KnowledgeBaseEntry;
    },
    onSuccess: (data, { agentId }) => {
      queryClient.invalidateQueries({ queryKey: knowledgeBaseKeys.agentList(agentId) });
    },
  });
}

export function useAgentKnowledgeBaseContext(agentId: string, maxTokens = 4000) {
  const { getHeaders } = useAuthHeaders();
  
  return useQuery({
    queryKey: knowledgeBaseKeys.agentContext(agentId),
    queryFn: async () => {
      const headers = await getHeaders();
      const url = new URL(`${API_URL}/knowledge-base/agents/${agentId}/context`);
      url.searchParams.set('max_tokens', maxTokens.toString());
      
      const response = await fetch(url.toString(), { headers });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to fetch agent knowledge base context');
      }
      
      return await response.json() as KnowledgeBaseContextResponse;
    },
    enabled: !!agentId,
  });
}

export function useCombinedKnowledgeBaseContext(threadId: string, agentId?: string, maxTokens = 4000) {
  const { getHeaders } = useAuthHeaders();
  
  return useQuery({
    queryKey: knowledgeBaseKeys.combinedContext(threadId, agentId),
    queryFn: async () => {
      const headers = await getHeaders();
      const url = new URL(`${API_URL}/vector-kb/thread-entries/${threadId}/combined-context`);
      url.searchParams.set('max_tokens', maxTokens.toString());
      if (agentId) {
        url.searchParams.set('agent_id', agentId);
      }
      
      const response = await fetch(url.toString(), { headers });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to fetch combined knowledge base context');
      }
      
      return await response.json() as KnowledgeBaseContextResponse;
    },
    enabled: !!threadId,
  });
}

// Agent knowledge base file upload and processing hooks
export function useUploadAgentFiles() {
  const queryClient = useQueryClient();
  const { getHeaders } = useAuthHeaders();
  
  return useMutation({
    mutationFn: async ({ agentId, file }: FileUploadRequest): Promise<UploadResponse> => {
      const headers = await getHeaders();
      const formData = new FormData();
      formData.append('file', file);

      // Remove Content-Type header for FormData uploads - browser will set it automatically
      const { 'Content-Type': _, ...uploadHeaders } = headers;

      const response = await fetch(`${API_URL}/knowledge-base/agents/${agentId}/upload-file`, {
        method: 'POST',
        headers: uploadHeaders,
        body: formData,
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to upload file');
      }
      
      return await response.json();
    },
    onSuccess: (data, { agentId }) => {
      queryClient.invalidateQueries({ queryKey: knowledgeBaseKeys.agentList(agentId) });
      queryClient.invalidateQueries({ queryKey: knowledgeBaseKeys.processingJobs(agentId) });
    },
  });
}

export function useUploadThreadFiles() {
  const queryClient = useQueryClient();
  const { getHeaders } = useAuthHeaders();
  
  return useMutation({
    mutationFn: async ({ threadId, file, customName }: { threadId: string; file: File; customName?: string }): Promise<UploadResponse> => {
      const headers = await getHeaders();
      const formData = new FormData();
      formData.append('file', file);
      if (customName && customName.trim().length > 0) {
        formData.append('custom_name', customName.trim());
      }

      // Remove Content-Type header for FormData uploads - browser will set it automatically
      const { 'Content-Type': _, ...uploadHeaders } = headers;

      const response = await fetch(`${API_URL}/vector-kb/thread-entries/${threadId}/upload-file`, {
        method: 'POST',
        headers: uploadHeaders,
        body: formData,
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to upload file');
      }
      
      return await response.json();
    },
    onSuccess: (data, { threadId }) => {
      queryClient.invalidateQueries({ queryKey: knowledgeBaseKeys.list(threadId) });
      queryClient.invalidateQueries({ queryKey: knowledgeBaseKeys.threadProcessingJobs(threadId) });
    },
  });
}

export function useCloneGitRepository() {
  const queryClient = useQueryClient();
  const { getHeaders } = useAuthHeaders();
  
  return useMutation({
    mutationFn: async ({ agentId, git_url, branch = 'main' }: GitCloneRequest): Promise<CloneResponse> => {
      const headers = await getHeaders();
      const response = await fetch(`${API_URL}/knowledge-base/agents/${agentId}/clone-git-repo`, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ git_url, branch }),
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to clone repository');
      }
      
      return await response.json();
    },
    onSuccess: (data, { agentId }) => {
      queryClient.invalidateQueries({ queryKey: knowledgeBaseKeys.agentList(agentId) });
      queryClient.invalidateQueries({ queryKey: knowledgeBaseKeys.processingJobs(agentId) });
    },
  });
}

export function useAgentProcessingJobs(agentId: string) {
  const { getHeaders } = useAuthHeaders();
  
  return useQuery({
    queryKey: knowledgeBaseKeys.processingJobs(agentId),
    queryFn: async (): Promise<{ jobs: ProcessingJob[] }> => {
      const headers = await getHeaders();
      const response = await fetch(`${API_URL}/knowledge-base/agents/${agentId}/processing-jobs`, { headers });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to fetch processing jobs');
      }
      
      const data = await response.json();
      return { jobs: data.jobs || [] };
    },
    enabled: !!agentId,
    refetchInterval: 5000,
  });
} 

export function useSaveThreadKnowledgeToGlobal() {
  const queryClient = useQueryClient();
  const { getHeaders } = useAuthHeaders();
  
  return useMutation({
    mutationFn: async (threadId: string) => {
      const headers = await getHeaders();
      const response = await fetch(`${API_URL}/vector-kb/thread-entries/${threadId}/save-to-global`, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to save thread knowledge to global');
      }
      
      return await response.json() as {
        message: string;
        entries_saved: number;
        entries_skipped: number;
        thread_id: string;
      };
    },
    onSuccess: () => {
      // Invalidate global knowledge base queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['global-knowledge-base'] });
    },
  });
} 
