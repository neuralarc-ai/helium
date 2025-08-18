'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { agentKeys } from './keys';
import { Agent } from './utils';

export interface AgentExportData {
  agent: Agent;
  timestamp: string;
  version: string;
  name: string;
  description: string;
  exported_at: string;
}

export interface AgentImportData {
  name: string;
  description: string;
  system_prompt: string;
  avatar?: string;
  avatar_color?: string;
  configured_mcps?: any[];
  custom_mcps?: any[];
  agentpress_tools?: Record<string, any>;
  metadata?: Record<string, any>;
}

export const parseAgentImportFile = async (file: File): Promise<AgentExportData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        
        // Validate the structure
        if (!data.agent || !data.timestamp || !data.version) {
          reject(new Error('Invalid agent export file: missing required fields'));
          return;
        }
        
        // Extract name and description from the agent data
        const agentData = {
          ...data,
          name: data.agent.name || 'Unknown Agent',
          description: data.agent.description || '',
          exported_at: data.timestamp
        };
        
        resolve(agentData);
      } catch (error) {
        reject(new Error('Invalid JSON file'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsText(file);
  });
};

export const useExportAgent = () => {
  return useMutation({
    mutationFn: async (agentId: string): Promise<AgentExportData> => {
      // This would typically call an API endpoint to export the agent
      // For now, we'll simulate the export
      const response = await fetch(`/api/agents/${agentId}/export`);
      if (!response.ok) {
        throw new Error('Failed to export agent');
      }
      return response.json();
    },
    onSuccess: (data) => {
      // Create a downloadable file
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `agent-${data.agent.name}-${data.timestamp}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('Agent exported successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to export agent');
    },
  });
};

export const useImportAgent = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (importData: AgentImportData): Promise<Agent> => {
      // This would typically call an API endpoint to import the agent
      const response = await fetch('/api/agents/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(importData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to import agent');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: agentKeys.lists() });
      queryClient.setQueryData(agentKeys.detail(data.agent_id), data);
      toast.success('Agent imported successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to import agent');
    },
  });
};

export const useValidateAgentImport = () => {
  return useMutation({
    mutationFn: async (file: File): Promise<AgentImportData> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
          try {
            const content = e.target?.result as string;
            const data = JSON.parse(content);
            
            // Basic validation
            if (!data.name || !data.system_prompt) {
              reject(new Error('Invalid agent data: missing required fields'));
              return;
            }
            
            resolve(data);
          } catch (error) {
            reject(new Error('Invalid JSON file'));
          }
        };
        
        reader.onerror = () => {
          reject(new Error('Failed to read file'));
        };
        
        reader.readAsText(file);
      });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to validate agent file');
    },
  });
};