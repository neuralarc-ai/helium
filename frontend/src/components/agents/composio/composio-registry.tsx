import React, { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Zap, X } from 'lucide-react';
import { useComposioToolkits, useComposioCategories } from '@/hooks/react-query/composio/use-composio';
import { useComposioProfiles } from '@/hooks/react-query/composio/use-composio-profiles';
import { useAgent } from '@/hooks/react-query/agents/use-agents';
import { ComposioConnector } from './composio-connector';
import type { ComposioToolkit, ComposioProfile } from '@/hooks/react-query/composio/utils';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';
import { AgentSelector } from '../../thread/chat-input/agent-selector';

const CATEGORY_EMOJIS: Record<string, string> = {
  'popular': '🔥',
  'productivity': '📊',
  'ai': '🤖',
  'crm': '👥',
  'marketing': '📢',
  'email': '📧',
  'analytics': '📈',
  'automation': '⚡',
  'communication': '💬',
  'project-management': '📋',
  'e-commerce': '🛒',
  'social-media': '📱',
  'payments': '💳',
  'finance': '💰',
  'developer-tools': '🛠️',
  'api': '🔌',
  'notifications': '🔔',
  'scheduling': '📅',
  'data-analytics': '📊',
  'customer-support': '🎧'
};


interface ComposioRegistryProps {
  onToolsSelected?: (profileId: string, selectedTools: string[], appName: string, appSlug: string) => void;
  onAppSelected?: (app: ComposioToolkit) => void;
  mode?: 'full' | 'profile-only';
  onClose?: () => void;
  showAgentSelector?: boolean;
  selectedAgentId?: string;
  onAgentChange?: (agentId: string | undefined) => void;
}

const AppCardSkeleton = () => (
  <div className="border border-border/50 rounded-xl p-4">
    <div className="flex items-center gap-3 mb-3">
      <Skeleton className="w-10 h-10 rounded-lg" />
      <div className="flex-1">
        <Skeleton className="w-3/4 h-4 mb-2" />
        <Skeleton className="w-full h-3" />
      </div>
    </div>
    <div className="flex flex-wrap gap-1 mb-3">
      <Skeleton className="w-16 h-5" />
      <Skeleton className="w-20 h-5" />
    </div>
    <div className="flex justify-between items-center">
      <Skeleton className="w-24 h-6" />
      <Skeleton className="w-20 h-8" />
    </div>
  </div>
);

const AppCard = ({ app, profiles, onConnect, onConfigure }: {
  app: ComposioToolkit; 
  profiles: ComposioProfile[];
  onConnect: () => void;
  onConfigure: (profile: ComposioProfile) => void;
}) => {
  const connectedProfiles = profiles.filter(p => p.is_connected);
  
  return (
    <div onClick={connectedProfiles.length > 0 ? () => onConfigure(connectedProfiles[0]) : onConnect} className="group border bg-card hover:bg-muted rounded-2xl p-4 transition-all duration-200">
      <div className="flex items-start gap-3 mb-3">
        {app.logo ? (
          <img src={app.logo} alt={app.name} className="w-10 h-10 rounded-lg object-cover p-2 bg-muted rounded-xl border" />
        ) : (
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <span className="text-primary text-sm font-medium">{app.name.charAt(0)}</span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-sm leading-tight truncate mb-1">{app.name}</h3>
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {app.description || `Connect your ${app.name} account to access its features.`}
          </p>
        </div>
      </div>
      
      {app.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {app.tags.slice(0, 2).map((tag, index) => (
            <Badge key={index} variant="secondary" className="text-xs px-1.5 py-0.5 h-auto">
              {tag}
            </Badge>
          ))}
          {app.tags.length > 2 && (
            <Badge variant="outline" className="text-xs px-1.5 py-0.5 h-auto">
              +{app.tags.length - 2}
            </Badge>
          )}
        </div>
      )}
      
      <div className="flex justify-between items-center">
        {connectedProfiles.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
              Connected ({connectedProfiles.length})
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const ComposioRegistry: React.FC<ComposioRegistryProps> = ({
  onToolsSelected,
  onAppSelected,
  mode = 'full',
  onClose,
  showAgentSelector = false,
  selectedAgentId,
  onAgentChange,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedApp, setSelectedApp] = useState<ComposioToolkit | null>(null);
  const [showConnector, setShowConnector] = useState(false);
  
  const [internalSelectedAgentId, setInternalSelectedAgentId] = useState<string | undefined>(selectedAgentId);
  const queryClient = useQueryClient();
  
  const { data: categoriesData, isLoading: isLoadingCategories } = useComposioCategories();
  const { data: toolkits, isLoading } = useComposioToolkits(search, selectedCategory);
  const { data: profiles } = useComposioProfiles();
  
  const currentAgentId = selectedAgentId ?? internalSelectedAgentId;
  const { data: agent } = useAgent(currentAgentId || '');

  const handleAgentSelect = (agentId: string | undefined) => {
    if (onAgentChange) {
      onAgentChange(agentId);
    } else {
      setInternalSelectedAgentId(agentId);
    }
  };

  const profilesByToolkit = useMemo(() => {
    const grouped: Record<string, ComposioProfile[]> = {};
    profiles?.forEach(profile => {
      if (profile.is_connected) {
        if (!grouped[profile.toolkit_slug]) {
          grouped[profile.toolkit_slug] = [];
        }
        grouped[profile.toolkit_slug].push(profile);
      }
    });
    return grouped;
  }, [profiles]);

  const filteredToolkits = useMemo(() => {
    if (!toolkits?.toolkits) return [];
    return toolkits.toolkits;
  }, [toolkits]);

  const handleConnect = (app: ComposioToolkit) => {
    if (!currentAgentId && showAgentSelector) {
      toast.error('Please select an agent first');
      return;
    }
    setSelectedApp(app);
    setShowConnector(true);
  };

  const handleConfigure = (app: ComposioToolkit, profile: ComposioProfile) => {
    if (!currentAgentId) {
      toast.error('Please select an agent first');
      return;
    }
    setSelectedApp(app);
    setShowConnector(true);
  };

  const handleConnectionComplete = (profileId: string, appName: string, appSlug: string) => {
    setShowConnector(false);
    queryClient.invalidateQueries({ queryKey: ['composio', 'profiles'] });
    if (onToolsSelected) {
      onToolsSelected(profileId, [], appName, appSlug);
    }
  };

  const categories = categoriesData?.categories || [];

  return (
    <div className="h-full w-full overflow-hidden flex">
      <div className="w-64 h-full overflow-hidden border-r bg-muted/20">
        <div className="h-full flex flex-col">
          <div className="flex-shrink-0 p-4 border-b">
            <h3 className="text-sm font-medium text-muted-foreground">Categories</h3>
          </div>
          
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-1">
                <button
                  onClick={() => setSelectedCategory('')}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-1.5 rounded-lg text-sm transition-colors text-left",
                    selectedCategory === '' 
                      ? "bg-muted-foreground/20 text-muted-foreground" 
                      : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span className="text-base">📁</span>
                  <span>All Apps</span>
                </button>

                {isLoadingCategories ? (
                  <div className="space-y-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-3 px-3 py-2">
                        <div className="w-4 h-4 bg-muted rounded" />
                        <div className="flex-1 h-4 bg-muted rounded" />
                      </div>
                    ))}
                  </div>
                ) : (
                  categories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-1.5 rounded-lg text-sm transition-colors text-left",
                        selectedCategory === category.id 
                          ? "bg-muted-foreground/20 text-muted-foreground" 
                          : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <span className="text-base">{CATEGORY_EMOJIS[category.id] || '📁'}</span>
                      <span className="truncate">{category.name}</span>
                    </button>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>

      <div className="flex-1 h-full overflow-hidden">
        <div className="h-full flex flex-col">
          <div className="flex-shrink-0 border-b p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold">App Integrations</h2>
                <p className="text-sm text-muted-foreground">
                  Connect your favorite apps powered by Composio
                </p>
              </div>
              <div className="flex items-center gap-3">
                {showAgentSelector && (
                  <AgentSelector
                    selectedAgentId={currentAgentId}
                    onAgentSelect={handleAgentSelect}
                    isSunaAgent={agent?.metadata?.is_suna_default}
                  />
                )}
                {onClose && (
                  <Button variant="ghost" size="sm" onClick={onClose}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search apps..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            {selectedCategory && (
              <div className="flex items-center gap-2 mt-3">
                <span className="text-xs text-muted-foreground">Filtered by:</span>
                <Badge variant="outline" className="gap-1 bg-muted-foreground/20 text-muted-foreground">
                  <span>{CATEGORY_EMOJIS[selectedCategory] || '📁'}</span>
                  <span>{categories.find(c => c.id === selectedCategory)?.name}</span>
                  <button
                    onClick={() => setSelectedCategory('')}
                    className="ml-1 hover:bg-muted rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-6">
                {isLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.from({ length: 12 }).map((_, i) => (
                      <AppCardSkeleton key={i} />
                    ))}
                  </div>
                ) : filteredToolkits.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                      <Search className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-medium mb-2">No apps found</h3>
                    <p className="text-muted-foreground">
                      {search ? `No apps match "${search}"` : 'No apps available in this category'}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredToolkits.map((app) => (
                      <AppCard
                        key={app.slug}
                        app={app}
                        profiles={profilesByToolkit[app.slug] || []}
                        onConnect={() => handleConnect(app)}
                        onConfigure={(profile) => handleConfigure(app, profile)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>

      {selectedApp && (
        <ComposioConnector
          app={selectedApp}
          agentId={currentAgentId}
          open={showConnector}
          onOpenChange={setShowConnector}
          onComplete={handleConnectionComplete}
        />
      )}
    </div>
  );
}; 