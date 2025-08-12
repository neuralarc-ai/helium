import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
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

export interface KnowledgeBaseEntry {
  entry_id: string;
  name: string;
  description: string;
  content: string;
  usage_context: string;
  is_active: boolean;
  content_tokens?: number;
  created_at: string;
  updated_at: string;
  source_type?: string;
  source_metadata?: any;
  file_size?: number;
  file_mime_type?: string;
}

export interface KnowledgeBaseListResponse {
  entries: KnowledgeBaseEntry[];
  total_count: number;
  total_tokens: number;
}

export interface CreateKnowledgeBaseEntryRequest {
  name: string;
  description: string;
  content: string;
  usage_context: string;
  is_active?: boolean;
}

export interface UpdateKnowledgeBaseEntryRequest {
  name?: string;
  description?: string;
  content?: string;
  usage_context?: string;
  is_active?: boolean;
}

// Query keys
export const globalKnowledgeBaseKeys = {
  all: ['global-knowledge-base'] as const,
  lists: () => [...globalKnowledgeBaseKeys.all, 'list'] as const,
  list: (filters: { includeInactive?: boolean }) => [...globalKnowledgeBaseKeys.lists(), filters] as const,
  details: () => [...globalKnowledgeBaseKeys.all, 'detail'] as const,
  detail: (id: string) => [...globalKnowledgeBaseKeys.details(), id] as const,
  context: () => [...globalKnowledgeBaseKeys.all, 'context'] as const,
};

// Get global knowledge base entries
export function useGlobalKnowledgeBaseEntries(options: { includeInactive?: boolean } = {}) {
  const { getHeaders } = useAuthHeaders();
  
  return useQuery({
    queryKey: globalKnowledgeBaseKeys.list(options),
    queryFn: async (): Promise<KnowledgeBaseListResponse> => {
      const headers = await getHeaders();
      const params = new URLSearchParams();
      if (options.includeInactive) {
        params.append('include_inactive', 'true');
      }
      
      const response = await fetch(`${API_URL}/knowledge-base/global?${params.toString()}`, { headers });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to fetch global knowledge base entries');
      }
      
      return await response.json() as KnowledgeBaseListResponse;
    },
  });
}

// Create global knowledge base entry
export function useCreateGlobalKnowledgeBaseEntry() {
  const queryClient = useQueryClient();
  const { getHeaders } = useAuthHeaders();
  
  return useMutation({
    mutationFn: async (entryData: CreateKnowledgeBaseEntryRequest): Promise<KnowledgeBaseEntry> => {
      const headers = await getHeaders();
      const response = await fetch(`${API_URL}/knowledge-base/global`, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(entryData),
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to create global knowledge base entry');
      }
      
      return await response.json() as KnowledgeBaseEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: globalKnowledgeBaseKeys.lists() });
      toast.success('Global knowledge base entry created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create global knowledge base entry');
    },
  });
}

// Update global knowledge base entry
export function useUpdateGlobalKnowledgeBaseEntry() {
  const queryClient = useQueryClient();
  const { getHeaders } = useAuthHeaders();
  
  return useMutation({
    mutationFn: async ({ entryId, entryData }: { entryId: string; entryData: UpdateKnowledgeBaseEntryRequest }): Promise<KnowledgeBaseEntry> => {
      const headers = await getHeaders();
      const response = await fetch(`${API_URL}/knowledge-base/global/${entryId}`, {
        method: 'PUT',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(entryData),
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to update global knowledge base entry');
      }
      
      return await response.json() as KnowledgeBaseEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: globalKnowledgeBaseKeys.lists() });
      toast.success('Global knowledge base entry updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update global knowledge base entry');
    },
  });
}

// Delete global knowledge base entry
export function useDeleteGlobalKnowledgeBaseEntry() {
  const queryClient = useQueryClient();
  const { getHeaders } = useAuthHeaders();
  
  return useMutation({
    mutationFn: async (entryId: string): Promise<void> => {
      const headers = await getHeaders();
      const response = await fetch(`${API_URL}/knowledge-base/global/${entryId}`, {
        method: 'DELETE',
        headers,
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to delete global knowledge base entry');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: globalKnowledgeBaseKeys.lists() });
      toast.success('Global knowledge base entry deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete global knowledge base entry');
    },
  });
}

// Get specific global knowledge base entry
export function useGlobalKnowledgeBaseEntry(entryId: string) {
  const { getHeaders } = useAuthHeaders();
  
  return useQuery({
    queryKey: globalKnowledgeBaseKeys.detail(entryId),
    queryFn: async (): Promise<KnowledgeBaseEntry> => {
      const headers = await getHeaders();
      const response = await fetch(`${API_URL}/knowledge-base/global/${entryId}`, { headers });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to fetch global knowledge base entry');
      }
      
      return await response.json() as KnowledgeBaseEntry;
    },
    enabled: !!entryId,
  });
}

// Get global knowledge base context
export function useGlobalKnowledgeBaseContext(maxTokens: number = 4000) {
  const { getHeaders } = useAuthHeaders();
  
  return useQuery({
    queryKey: globalKnowledgeBaseKeys.context(),
    queryFn: async (): Promise<{ context: string | null; max_tokens: number; account_id: string }> => {
      const headers = await getHeaders();
      const response = await fetch(`${API_URL}/knowledge-base/global/context?max_tokens=${maxTokens}`, { headers });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to fetch global knowledge base context');
      }
      
      return await response.json() as { context: string | null; max_tokens: number; account_id: string };
    },
  });
}

// Upload file to global knowledge base
export function useUploadGlobalFile() {
  const queryClient = useQueryClient();
  const { getHeaders } = useAuthHeaders();
  
  return useMutation({
    mutationFn: async (params: { file: File; customName?: string }): Promise<{
      success: boolean;
      entry_id: string;
      filename: string;
      content_length: number;
      extraction_method: string;
      message: string;
    }> => {
      const { file, customName } = params;
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('No access token available');
      }
      
      const formData = new FormData();
      formData.append('file', file);
      if (customName) {
        formData.append('custom_name', customName);
      }
      
      const response = await fetch(`${API_URL}/knowledge-base/global/upload-file`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: formData,
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to upload file');
      }
      
      return await response.json();
    },
    onSuccess: (data) => {
      toast.success(`File "${data.filename}" uploaded successfully`);
      queryClient.invalidateQueries({ queryKey: globalKnowledgeBaseKeys.lists() });
    },
    onError: (error: Error) => {
      toast.error(`Failed to upload file: ${error.message}`);
    },
  });
}
