// frontend/src/hooks/react-query/composio/use-composio-mcp.ts
import { useQuery } from '@tanstack/react-query';
import { backendApi } from '@/lib/api-client';

export const useComposioMcpConfig = (profileId: string, enabled = true) => {
  return useQuery({
    queryKey: ['composio', 'mcp-config', profileId],
    queryFn: async () => {
      const response = await backendApi.get(`/api/v1/composio/profiles/${profileId}/mcp-config`);
      return response.data;
    },
    enabled: enabled && !!profileId,
    staleTime: 5 * 60 * 1000,
  });
};