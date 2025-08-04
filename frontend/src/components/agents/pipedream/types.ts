import type { PipedreamApp } from '@/hooks/react-query/pipedream/utils';
import type { PipedreamProfile } from '@/components/agents/pipedream/pipedream-types';

export type ConnectedApp = PipedreamApp & {
  connectedProfiles?: PipedreamProfile[];
  profileCount?: number;
};

export interface PipedreamRegistryProps {
  onProfileSelected?: (profile: PipedreamProfile) => void;
  onToolsSelected?: (profileId: string, selectedTools: string[], appName: string, appSlug: string) => void;
  onAppSelected?: (app: { app_slug: string; app_name: string }) => void;
  mode?: 'full' | 'simple' | 'profile-only';
  onClose?: () => void;
  showAgentSelector?: boolean;
  selectedAgentId?: string;
  onAgentChange?: (agentId: string | undefined) => void;
  versionData?: {
    configured_mcps?: any[];
    custom_mcps?: any[];
    system_prompt?: string;
    agentpress_tools?: any;
  };
  versionId?: string;
}

export interface AppCardProps {
  app: ConnectedApp | PipedreamApp;
  compact?: boolean;
  mode?: 'full' | 'simple' | 'profile-only';
  currentAgentId?: string;
  agentName?: string;
  agentPipedreamProfiles?: any[];
  onAppSelected?: (app: { app_slug: string; app_name: string }) => void;
  onConnectApp?: (app: PipedreamApp) => void;
  onConfigureTools?: (profile: any) => void;
  connectedProfiles?: PipedreamProfile[];
  handleCategorySelect?: (category: string) => void;
}

export interface CategorySidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  categories: string[];
  selectedCategory: string;
  onCategorySelect: (category: string) => void;
  allApps: PipedreamApp[];
}

export interface PipedreamHeaderProps {
  search: string;
  onSearchChange: (value: string) => void;
  showAgentSelector: boolean;
  currentAgentId?: string;
  onAgentChange?: (agentId: string | undefined) => void;
  agentName?: string;
  isSunaAgent?: boolean;
}

export interface ConnectedAppsSectionProps {
  connectedApps: ConnectedApp[];
  showAgentSelector: boolean;
  currentAgentId?: string;
  agent?: any;
  agentPipedreamProfiles?: any[];
  mode?: 'full' | 'simple' | 'profile-only';
  onAppSelected?: (app: { app_slug: string; app_name: string }) => void;
  onConnectApp?: (app: PipedreamApp) => void;
  onConfigureTools?: (profile: any) => void;
  onCategorySelect?: (category: string) => void;
}

export interface AppsGridProps {
  apps: PipedreamApp[];
  selectedCategory: string;
  mode?: 'full' | 'simple' | 'profile-only';
  isLoading: boolean;
  currentAgentId?: string;
  agent?: any;
  agentPipedreamProfiles?: any[];
  onAppSelected?: (app: { app_slug: string; app_name: string }) => void;
  onConnectApp?: (app: PipedreamApp) => void;
  onConfigureTools?: (profile: any) => void;
  onCategorySelect?: (category: string) => void;
  onBrowseMore?: () => void;
  onBackToPopular?: () => void;
}

export interface EmptyStateProps {
  selectedCategory: string;
  mode?: 'full' | 'simple' | 'profile-only';
  onClearFilters: () => void;
}

export interface PaginationControlsProps {
  isLoading: boolean;
  paginationHistory: string[];
  hasMore: boolean;
  onPrevPage: () => void;
  onNextPage: () => void;
} 