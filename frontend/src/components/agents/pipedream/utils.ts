import type { PipedreamApp } from '@/hooks/react-query/pipedream/utils';
import type { PipedreamProfile } from '@/components/agents/pipedream/pipedream-types';
import { categoryEmojis, PAGINATION_CONSTANTS } from './constants';
import type { ConnectedApp } from './types';

export const getSimplifiedCategories = () => {
  return ['All', 'Popular'];
};

export const getPopularApps = (apps: PipedreamApp[]) => {
  return apps
    .filter((app) => app.featured_weight > 0)
    .sort((a, b) => b.featured_weight - a.featured_weight)
    .slice(0, PAGINATION_CONSTANTS.POPULAR_APPS_COUNT);
};

export const filterAppsByCategory = (apps: PipedreamApp[], category: string) => {
  if (category === 'All') return apps;
  return apps.filter(app => app.categories.includes(category));
};

export const getAppCategoryCount = (apps: PipedreamApp[], category: string) => {
  return category === 'All' 
    ? apps.length 
    : apps.filter(app => app.categories.includes(category)).length;
};

export const createConnectedAppsFromProfiles = (
  connectedProfiles: PipedreamProfile[],
  allApps: PipedreamApp[]
): ConnectedApp[] => {
  const profilesByApp = connectedProfiles.reduce((acc, profile) => {
    const key = profile.app_slug;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(profile);
    return acc;
  }, {} as Record<string, typeof connectedProfiles>);

  return Object.entries(profilesByApp).map(([appSlug, profiles]) => {
    const firstProfile = profiles[0];
    const registryApp = allApps.find(app => 
      app.name_slug === firstProfile.app_slug || 
      app.name.toLowerCase() === firstProfile.app_name.toLowerCase()
    );
    
    return {
      id: `app_${appSlug}`,
      name: firstProfile.app_name,
      name_slug: firstProfile.app_slug,
      auth_type: "keys",
      description: `Access your ${firstProfile.app_name} workspace and tools`,
      img_src: registryApp?.img_src || "",
      custom_fields_json: registryApp?.custom_fields_json || "[]",
      categories: registryApp?.categories || [],
      featured_weight: 0,
      connect: {
        allowed_domains: registryApp?.connect?.allowed_domains || null,
        base_proxy_target_url: registryApp?.connect?.base_proxy_target_url || "",
        proxy_enabled: registryApp?.connect?.proxy_enabled || false,
      },
      connectedProfiles: profiles,
      profileCount: profiles.length
    } as ConnectedApp;
  });
};

export const getAgentPipedreamProfiles = (
  agent: any,
  profiles: PipedreamProfile[],
  currentAgentId?: string,
  versionData?: {
    configured_mcps?: any[];
    custom_mcps?: any[];
    system_prompt?: string;
    agentpress_tools?: any;
  }
) => {
  if (!agent || !profiles || !currentAgentId) return [];

  const customMcps = versionData?.custom_mcps || agent.custom_mcps || [];
  const pipedreamMcps = customMcps.filter((mcp: any) => 
    mcp.config?.profile_id && mcp.config?.url?.includes('pipedream')
  );
  
  const profileIds = pipedreamMcps.map((mcp: any) => mcp.config?.profile_id).filter(Boolean);
  const usedProfiles = profiles.filter(profile => 
    profileIds.includes(profile.profile_id)
  );

  return usedProfiles.map(profile => {
    const mcpConfig = pipedreamMcps.find((mcp: any) => mcp.config?.profile_id === profile.profile_id);
    const enabledTools = mcpConfig?.enabledTools || mcpConfig?.enabled_tools || [];
    const toolsCount = enabledTools.length;
    
    return {
      ...profile,
      enabledTools,
      toolsCount
    };
  });
};

export const getCategoryEmoji = (category: string): string => {
  return categoryEmojis[category] || '🔧';
}; 