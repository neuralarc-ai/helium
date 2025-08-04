import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Plus, Settings, Zap, Bot, ChevronDown, Star, CheckCircle, Eye, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getCategoryEmoji } from '../utils';
import type { AppCardProps } from '../types';
import { usePipedreamProfiles } from '@/hooks/react-query/pipedream/use-pipedream-profiles';
import { usePipedreamAppIcon } from '@/hooks/react-query/pipedream/use-pipedream';
import { usePipedreamAppTools } from '@/hooks/react-query/pipedream/use-pipedream';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';

export const AppCard: React.FC<AppCardProps> = ({ 
  app, 
  compact = false, 
  mode = 'full',
  currentAgentId,
  agentName,
  agentPipedreamProfiles = [],
  onAppSelected,
  onConnectApp,
  onConfigureTools,
  handleCategorySelect,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const { data: appToolsData, isLoading: isToolsLoading } = usePipedreamAppTools(app.name_slug, { enabled: isDialogOpen });
  const tools = appToolsData?.tools ?? [];

  const { data: profiles } = usePipedreamProfiles();
  const { data: iconData } = usePipedreamAppIcon(app.name_slug, {
    enabled: !app.img_src
  });

  const connectedProfiles = useMemo(() => {
    return profiles?.filter(p => p.app_slug === app.name_slug && p.is_connected) || [];
  }, [profiles, app.name_slug]);

  const agentProfiles = useMemo(() => {
    return agentPipedreamProfiles?.filter(p => p.app_slug === app.name_slug) || [];
  }, [agentPipedreamProfiles, app.name_slug]);

  const totalToolsCount = useMemo(() => {
    return agentProfiles.reduce((sum, profile) => {
      return sum + (profile.toolsCount ?? profile.enabledTools?.length ?? 0);
    }, 0);
  }, [agentProfiles]);

  const handleCategoryClick = (e: React.MouseEvent, category: string) => {
    e.stopPropagation();
    handleCategorySelect?.(category);
  };

  const handleConnectClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Prevent opening if dialog is in the process of closing
    if (isClosing) return;
    setIsDialogOpen(true);
  };

  const handleDialogChange = (open: boolean) => {
    if (!open) {
      setIsClosing(true);
      setIsDialogOpen(false);
      // Reset closing state after a short delay to prevent rapid reopening
      setTimeout(() => setIsClosing(false), 300);
    } else {
      setIsDialogOpen(open);
    }
  };

  const handleActualConnect = () => {
    setIsDialogOpen(false);
    
    if (mode === 'simple' && onAppSelected) {
      onAppSelected({ app_slug: app.name_slug, app_name: app.name });
    } else if (onConnectApp) {
      onConnectApp(app);
    }
  };

  const handleConfigureClick = (e: React.MouseEvent, profile: any) => {
    e.stopPropagation();
    if (onConfigureTools) {
      onConfigureTools(profile);
    }
  };

  const isConnected = connectedProfiles.length > 0;
  const hasAgentTools = agentProfiles.length > 0;

  return (
    <Card 
      className={cn(
        "group relative overflow-hidden transition-all p-0 duration-300 hover:cursor-pointer hover:bg-muted",
      )}
      onClick={handleConnectClick}
    >
      <CardContent className="p-4 h-full flex flex-col">
        <div className="flex items-start gap-3 mb-3">
          <div className="flex-shrink-0 relative">
            <div className={cn(
              "h-8 w-8 rounded-lg border bg-muted flex items-center justify-center text-primary font-semibold overflow-hidden transition-all duration-300"
            )}>
              {(app.img_src || iconData?.icon_url) ? (
                <img
                  src={app.img_src || iconData?.icon_url || ''}
                  alt={app.name}
                  className="w-5 h-5 object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    target.nextElementSibling?.classList.remove('hidden');
                  }}
                />
              ) : null}
              <span className={cn(
                "font-bold text-lg",
                (app.img_src || iconData?.icon_url) ? "hidden" : "block"
              )}>
                {app.name.charAt(0).toUpperCase()}
              </span>
            </div>
            {isConnected && (
              <div className="absolute -top-1 -right-1 h-4 w-4 bg-green-500 rounded-full border-2 border-white dark:border-gray-800 flex items-center justify-center">
                <CheckCircle className="h-2 w-2 text-white" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <h3 className="font-semibold text-base text-foreground truncate group-hover:text-primary transition-colors">
                {app.name}
              </h3>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
              {app.description}
            </p>
          </div>
        </div>

        {hasAgentTools && (
          <div className="mb-3">
            <div className="rounded-xl bg-muted py-2 border border" onClick={(e) => e.stopPropagation()}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="ghost" className="h-auto w-full justify-between p-0 hover:bg-transparent">
                    <div className="flex items-center gap-2">
                      <Bot className="h-4 w-4 text-primary" />
                      <div className="text-left">
                        <div className="text-sm font-medium text-foreground">
                          {agentProfiles.length} {agentProfiles.length === 1 ? 'Profile' : 'Profiles'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {totalToolsCount} tools configured
                        </div>
                      </div>
                    </div>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-full min-w-[200px]">
                  {agentProfiles.map((profile) => (
                    <DropdownMenuItem 
                      key={profile.profile_id} 
                      onClick={(e) => handleConfigureClick(e, profile)}
                      className="cursor-pointer"
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          <Settings className="h-4 w-4" />
                          <span className="font-medium">{profile.profile_name}</span>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {profile.toolsCount ?? profile.enabledTools?.length ?? 0} tools
                        </Badge>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        )}
        <div className="flex-1" />
      </CardContent>

      {/* Preview Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={handleDialogChange}>
        <DialogContent className="overflow-hidden max-w-4xl p-0 h-[600px]">
          <DialogTitle className='sr-only'>{app.name} Tools</DialogTitle>
          <div className="grid grid-cols-2 h-full">
            <div className="p-8 border-r bg-gradient-to-br from-background to-muted/20">
              <div className="flex flex-col h-full">
                <div className="text-start mb-4">
                  <div className="mx-auto mb-6 relative">
                    <div className="h-20 w-20 rounded-3xl border bg-muted flex items-center justify-center overflow-hidden">
                      {(app.img_src || iconData?.icon_url) ? (
                        <img
                          src={app.img_src || iconData?.icon_url}
                          alt={`${app.name} icon`}
                          className="h-12 w-12 object-cover rounded-lg"
                        />
                      ) : (
                        <span className="font-bold text-2xl text-primary">
                          {app.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                  </div>
                  <h2 className="text-2xl font-bold text-foreground mb-2">{app.name}</h2>
                  <Badge variant="outline" className="mb-4 bg-muted">
                    {tools.length} {tools.length === 1 ? 'Tool' : 'Tools'} Available
                  </Badge>
                </div>
                <div className="mb-8 flex-1">
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {app.description}
                  </p>
                </div>
                {isConnected && (
                  <div className="mb-6">
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-green-700 dark:text-green-300">
                        Connected ({connectedProfiles.length} profile{connectedProfiles.length !== 1 ? 's' : ''})
                      </span>
                    </div>
                  </div>
                )}
                <div className="space-y-3">
                  <Button
                    size="lg"
                    onClick={handleActualConnect}
                    className="w-full font-medium"
                  >
                    {mode === 'simple' ? (
                      <>
                        <Plus className="h-4 w-4" />
                        Connect
                      </>
                    ) : mode === 'profile-only' ? (
                      <>
                        <Plus className="h-4 w-4" />
                        {isConnected ? 'Add Profile' : 'Connect'}
                      </>
                    ) : (
                      <>
                        {isConnected ? (
                          <>
                            <Zap className="h-4 w-4" />
                            Add Tools
                          </>
                        ) : (
                          <>
                            <Plus className="h-4 w-4" />
                            Connect
                          </>
                        )}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
            <div className="flex flex-col h-full">
              <div className="p-4 border-b bg-muted/30">
                <h3 className="text-lg font-semibold text-foreground">Available Tools</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {tools.length} tool{tools.length !== 1 ? 's' : ''} ready to integrate
                </p>
              </div>
              <ScrollArea className="flex-1 max-h-[500px]">
                <div className="p-4">
                  {isToolsLoading ? (
                    <div className="flex flex-col gap-2 items-center justify-center">
                      <Skeleton className="h-12 w-full rounded-lg" />
                      <Skeleton className="h-12 w-full rounded-lg" />
                      <Skeleton className="h-12 w-full rounded-lg" />
                      <Skeleton className="h-12 w-full rounded-lg" />
                      <Skeleton className="h-12 w-full rounded-lg" />
                      <Skeleton className="h-12 w-full rounded-lg" />
                    </div>
                  ) : tools.length > 0 ? (
                    <div className="space-y-2">
                      {tools.map((tool, index) => (
                        <Card 
                          key={tool.name} 
                          className="group p-4 rounded-xl transition-all duration-200"
                        >
                          <CardHeader className='p-0'>
                            <CardTitle>
                              <div className='flex items-center gap-2'>
                                <div className=" flex-shrink-0 h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                  <Zap className="h-4 w-4 text-primary" />
                                </div>
                                <div className='flex flex-col items-start'>
                                  <p className="text-sm font-medium text-foreground">
                                    {tool.name}
                                  </p>
                                  <p className="text-xs text-muted-foreground line-clamp-2 font-normal">
                                    {tool.description}
                                  </p>
                                </div>
                              </div>
                            </CardTitle>
                          </CardHeader>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center py-12">
                      <div className="text-center">
                        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                          <Settings className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <p className="text-sm text-muted-foreground">No tools available</p>
                        <p className="text-xs text-muted-foreground mt-1">Check back later for updates</p>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};