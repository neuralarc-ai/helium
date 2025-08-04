export interface MarketplaceTemplate {
  id: string;
  name: string;
  description: string;
  tags: string[];
  download_count: number;
  creator_name: string;
  created_at: string;
  marketplace_published_at?: string;
  avatar?: string;
  avatar_color?: string;
  template_id: string;
  is_kortix_team?: boolean;
  mcp_requirements?: Array<{
    qualified_name: string;
    display_name: string;
    enabled_tools?: string[];
    required_config: string[];
    custom_type?: 'sse' | 'http' | 'pipedream';
  }>;
  metadata?: {
    source_agent_id?: string;
    source_version_id?: string;
    source_version_name?: string;
  };
}

export interface SetupStep {
  id: string;
  title: string;
  description: string;
  type: 'credential_profile' | 'custom_server' | 'pipedream_profile';
  service_name: string;
  qualified_name: string;
  required_fields?: Array<{
    key: string;
    label: string;
    type: 'text' | 'url' | 'password';
    placeholder: string;
    description?: string;
  }>;
  custom_type?: 'sse' | 'http' | 'pipedream'; 
  app_slug?: string;
  app_name?: string;
} 