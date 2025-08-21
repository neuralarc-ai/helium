'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useVectorKnowledgeBaseSearch, useVectorKBRelevanceCheck } from '@/hooks/react-query/knowledge-base/use-vector-knowledge-base-search';

interface VectorKBChunk {
  chunk_id: string;
  chunk_text: string;
  chunk_tokens: number;
  similarity_score: number;
  kb_entry_id: string;
  kb_type: 'global' | 'thread';
  source_metadata: any;
}

interface VectorKBSearchResult {
  relevant: boolean;
  chunks?: VectorKBChunk[];
  total_chunks_found?: number;
  reason?: string;
  error?: string;
}

interface VectorKBContextType {
  // Search functionality
  searchKnowledgeBase: (params: {
    query: string;
    thread_id?: string;
    kb_type?: 'global' | 'thread';
    similarity_threshold?: number;
    max_chunks?: number;
  }) => Promise<VectorKBSearchResult>;
  
  // Relevance checking
  checkQueryRelevance: (params: {
    query: string;
    thread_id?: string;
    kb_type?: 'global' | 'thread';
    similarity_threshold?: number;
  }) => Promise<boolean>;
  
  // State management
  lastSearchResult: VectorKBSearchResult | null;
  isSearching: boolean;
  isCheckingRelevance: boolean;
  
  // Utility functions
  getRelevantContext: (query: string, thread_id?: string) => Promise<string>;
  shouldUseKnowledgeBase: (query: string, thread_id?: string) => Promise<boolean>;
}

const VectorKBContext = createContext<VectorKBContextType | undefined>(undefined);

interface VectorKBProviderProps {
  children: ReactNode;
}

export const VectorKBProvider: React.FC<VectorKBProviderProps> = ({ children }) => {
  const [lastSearchResult, setLastSearchResult] = useState<VectorKBSearchResult | null>(null);
  
  const searchMutation = useVectorKnowledgeBaseSearch();
  const relevanceCheckMutation = useVectorKBRelevanceCheck();

  const searchKnowledgeBase = useCallback(async (params: {
    query: string;
    thread_id?: string;
    kb_type?: 'global' | 'thread';
    similarity_threshold?: number;
    max_chunks?: number;
  }): Promise<VectorKBSearchResult> => {
    try {
      const result = await searchMutation.mutateAsync(params);
      setLastSearchResult(result);
      return result;
    } catch (error) {
      console.error('Knowledge base search failed:', error);
      return {
        relevant: false,
        error: error instanceof Error ? error.message : 'Search failed'
      };
    }
  }, [searchMutation]);

  const checkQueryRelevance = useCallback(async (params: {
    query: string;
    thread_id?: string;
    kb_type?: 'global' | 'thread';
    similarity_threshold?: number;
  }): Promise<boolean> => {
    try {
      return await relevanceCheckMutation.mutateAsync(params);
    } catch (error) {
      console.error('Relevance check failed:', error);
      return false;
    }
  }, [relevanceCheckMutation]);

  const getRelevantContext = useCallback(async (query: string, thread_id?: string): Promise<string> => {
    try {
      const result = await searchKnowledgeBase({
        query,
        thread_id,
        similarity_threshold: 0.7,
        max_chunks: 3
      });

      if (result.relevant && result.chunks) {
        // Format chunks into context for the LLM
        const contextParts = result.chunks.map(chunk => 
          `[${chunk.kb_type.toUpperCase()} KB - Similarity: ${chunk.similarity_score.toFixed(2)}]\n${chunk.chunk_text}`
        );
        return `\n\n--- Knowledge Base Context ---\n\n${contextParts.join('\n\n')}\n\n--- End Knowledge Base Context ---\n\n`;
      }
      
      return '';
    } catch (error) {
      console.error('Failed to get relevant context:', error);
      return '';
    }
  }, [searchKnowledgeBase]);

  const shouldUseKnowledgeBase = useCallback(async (query: string, thread_id?: string): Promise<boolean> => {
    try {
      return await checkQueryRelevance({
        query,
        thread_id,
        similarity_threshold: 0.6
      });
    } catch (error) {
      console.error('Failed to check knowledge base relevance:', error);
      return false;
    }
  }, [checkQueryRelevance]);

  const contextValue: VectorKBContextType = {
    searchKnowledgeBase,
    checkQueryRelevance,
    lastSearchResult,
    isSearching: searchMutation.isPending,
    isCheckingRelevance: relevanceCheckMutation.isPending,
    getRelevantContext,
    shouldUseKnowledgeBase,
  };

  return (
    <VectorKBContext.Provider value={contextValue}>
      {children}
    </VectorKBContext.Provider>
  );
};

export const useVectorKB = (): VectorKBContextType => {
  const context = useContext(VectorKBContext);
  if (context === undefined) {
    throw new Error('useVectorKB must be used within a VectorKBProvider');
  }
  return context;
};

// Hook for getting knowledge base context for a specific query
export const useKnowledgeBaseContext = (query: string, thread_id?: string) => {
  const { getRelevantContext, shouldUseKnowledgeBase } = useVectorKB();
  const [context, setContext] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [shouldUse, setShouldUse] = useState<boolean | null>(null);

  const fetchContext = useCallback(async () => {
    if (!query.trim()) {
      setContext('');
      setShouldUse(false);
      return;
    }

    setIsLoading(true);
    try {
      // First check if we should use the knowledge base
      const relevant = await shouldUseKnowledgeBase(query, thread_id);
      setShouldUse(relevant);

      if (relevant) {
        // If relevant, get the context
        const kbContext = await getRelevantContext(query, thread_id);
        setContext(kbContext);
      } else {
        setContext('');
      }
    } catch (error) {
      console.error('Failed to fetch knowledge base context:', error);
      setContext('');
      setShouldUse(false);
    } finally {
      setIsLoading(false);
    }
  }, [query, thread_id, getRelevantContext, shouldUseKnowledgeBase]);

  React.useEffect(() => {
    fetchContext();
  }, [fetchContext]);

  return {
    context,
    shouldUse,
    isLoading,
    refetch: fetchContext,
  };
};

