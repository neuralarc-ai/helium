import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface VectorKBSearchParams {
  query: string;
  thread_id?: string;
  kb_type?: 'global' | 'thread';
  similarity_threshold?: number;
  max_chunks?: number;
}

interface VectorKBSearchResult {
  relevant: boolean;
  chunks?: Array<{
    chunk_id: string;
    chunk_text: string;
    chunk_tokens: number;
    similarity_score: number;
    kb_entry_id: string;
    kb_type: 'global' | 'thread';
    source_metadata: any;
  }>;
  total_chunks_found?: number;
  reason?: string;
  error?: string;
}

export const useVectorKnowledgeBaseSearch = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: VectorKBSearchParams): Promise<VectorKBSearchResult> => {
      const formData = new FormData();
      formData.append('query', params.query);
      
      if (params.thread_id) {
        formData.append('thread_id', params.thread_id);
      }
      
      if (params.kb_type) {
        formData.append('kb_type', params.kb_type);
      }
      
      formData.append('similarity_threshold', String(params.similarity_threshold || 0.7));
      formData.append('max_chunks', String(params.max_chunks || 5));

      const response = await fetch('/api/vector-kb/search', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Search failed');
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      if (data.relevant) {
        console.log(`Found ${data.total_chunks_found} relevant chunks for query: "${variables.query}"`);
      } else {
        console.log(`Query not relevant to knowledge base: "${variables.query}"`);
      }
    },
    onError: (error: Error) => {
      console.error('Vector KB search failed:', error);
      toast.error(`Knowledge base search failed: ${error.message}`);
    },
  });
};

// Hook for checking if a query is relevant to the knowledge base
export const useVectorKBRelevanceCheck = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: VectorKBSearchParams): Promise<boolean> => {
      const formData = new FormData();
      formData.append('query', params.query);
      formData.append('similarity_threshold', String(params.similarity_threshold || 0.6));
      
      if (params.thread_id) {
        formData.append('thread_id', params.thread_id);
      }
      
      if (params.kb_type) {
        formData.append('kb_type', params.kb_type);
      }

      const response = await fetch('/api/vector-kb/search', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Relevance check failed');
      }

      const result = await response.json();
      return result.relevant;
    },
    onError: (error: Error) => {
      console.error('Vector KB relevance check failed:', error);
      // Don't show error toast for relevance checks as they're background operations
    },
  });
};

