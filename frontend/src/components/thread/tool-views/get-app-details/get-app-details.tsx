import React from 'react';
import {
  Info,
  CheckCircle,
  AlertTriangle,
  Shield,
  ShieldCheck,
  ExternalLink,
  Server,
  Sparkles,
  Verified,
  Tag,
  Zap,
  Play,
  DollarSign,
  BookOpen,
  Settings
} from 'lucide-react';
import { ToolViewProps } from '../types';
import { formatTimestamp, getToolTitle } from '../utils';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from "@/components/ui/scroll-area";
import { LoadingState } from '../shared/LoadingState';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { extractGetAppDetailsData, AppDetails } from './_utils';

export function GetAppDetailsToolView({
  name = 'get-app-details',
  assistantContent,
  toolContent,
  assistantTimestamp,
  toolTimestamp,
  isSuccess = true,
  isStreaming = false,
}: ToolViewProps) {

  const {
    app_slug,
    message,
    app,
    actualIsSuccess,
    actualToolTimestamp,
    actualAssistantTimestamp
  } = extractGetAppDetailsData(
    assistantContent,
    toolContent,
    isSuccess,
    toolTimestamp,
    assistantTimestamp
  );

  const toolTitle = getToolTitle(name);

  const getAuthTypeColor = (authType: string) => {
    switch (authType?.toLowerCase()) {
      case 'oauth':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800';
      case 'api_key':
        return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800';
      case 'none':
        return 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-900/20 dark:text-gray-300 dark:border-gray-800';
      default:
        return 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800';
    }
  };

  const getAuthTypeIcon = (authType: string) => {
    switch (authType?.toLowerCase()) {
      case 'oauth':
        return ShieldCheck;
      case 'api_key':
        return Shield;
      default:
        return Shield;
    }
  };

  return (
    <Card className="gap-0 flex border shadow-none border-t border-b-0 border-x-0 p-0 rounded-none flex-col h-full overflow-hidden bg-card">
      <CardHeader className="h-14 bg-zinc-50/80 dark:bg-zinc-900/80 backdrop-blur-sm border-b p-2 px-4 space-y-2">
        <div className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative p-2 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/20">
              <Info className="w-5 h-5 text-blue-500 dark:text-blue-400" />
            </div>
            <div>
              <CardTitle className="text-base font-medium text-zinc-900 dark:text-zinc-100">
                {toolTitle}
              </CardTitle>
            </div>
          </div>

          {!isStreaming && (
            <Badge
              variant="secondary"
              className={cn(
                "text-xs font-medium",
                actualIsSuccess
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800"
                  : "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800"
              )}
            >
              {actualIsSuccess ? (
                <CheckCircle className="h-3 w-3 " />
              ) : (
                <AlertTriangle className="h-3 w-3 " />
              )}
              {actualIsSuccess ? 'Details loaded' : 'Failed to load'}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-0 h-full flex-1 overflow-hidden relative">
        {isStreaming ? (
          <LoadingState
            icon={Info}
            iconColor="text-blue-500 dark:text-blue-400"
            bgColor="bg-gradient-to-b from-blue-100 to-blue-50 shadow-inner dark:from-blue-800/40 dark:to-blue-900/60 dark:shadow-blue-950/20"
            title="Loading app details"
            filePath={app_slug ? `"${app_slug}"` : undefined}
            showProgress={true}
          />
        ) : app ? (
          <ScrollArea className="h-full w-full">
            <div className="p-4 space-y-6">
              <div className="border rounded-xl p-4">
                <div className="flex items-start gap-4">
                  <div className="relative flex-shrink-0">
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-muted/50 border flex items-center justify-center">
                      {app.logo_url ? (
                        <img
                          src={app.logo_url}
                          alt={`${app.name} logo`}
                          className="w-8 h-8 object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const parent = target.parentElement;
                            if (parent) {
                              parent.innerHTML = `<div class="w-full h-full flex items-center justify-center"><svg class="w-8 h-8 text-zinc-400" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clip-rule="evenodd" /></svg></div>`;
                            }
                          }}
                        />
                      ) : (
                        <Server className="w-8 h-8 text-zinc-400" />
                      )}
                    </div>
                    {app.is_verified && (
                      <div className="absolute -top-1 -right-1">
                        <div className="bg-blue-500 rounded-full p-1">
                          <Verified className="w-3 h-3 text-white" />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                            {app.name}
                          </h2>
                          {app.is_verified && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <div className="flex items-center">
                                    <Sparkles className="w-5 h-5 text-blue-500" />
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Verified integration</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400 font-mono mb-2">
                          {app.app_slug}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {(() => {
                          const AuthIcon = getAuthTypeIcon(app.auth_type);
                          return (
                            <Badge
                              variant="outline"
                              className={cn("text-xs font-medium", getAuthTypeColor(app.auth_type))}
                            >
                              <AuthIcon className="w-3 h-3 " />
                              {app.auth_type?.replace('_', ' ') || 'Unknown'}
                            </Badge>
                          );
                        })()}
                      </div>
                    </div>

                    <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed mb-4">
                      {app.description}
                    </p>

                    {app.tags && app.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-4">
                        {app.tags.map((tag, tagIndex) => (
                          <Badge
                            key={tagIndex}
                            variant="secondary"
                            className="text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300"
                          >
                            <Tag className="w-2.5 h-2.5 " />
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      {app.url && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-3 text-xs hover:bg-blue-50 dark:hover:bg-blue-900/20"
                          onClick={() => window.open(app.url!, '_blank')}
                        >
                          <ExternalLink className="w-3 h-3 " />
                          Visit Website
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {(app.pricing || app.setup_instructions) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {app.pricing && (
                    <div className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <DollarSign className="w-4 h-4 text-green-500" />
                        <h3 className="font-medium text-zinc-900 dark:text-zinc-100">Pricing</h3>
                      </div>
                      <p className="text-sm text-zinc-600 dark:text-zinc-300">
                        {app.pricing || 'No pricing information available'}
                      </p>
                    </div>
                  )}

                  {app.setup_instructions && (
                    <div className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Settings className="w-4 h-4 text-blue-500" />
                        <h3 className="font-medium text-zinc-900 dark:text-zinc-100">Setup</h3>
                      </div>
                      <p className="text-sm text-zinc-600 dark:text-zinc-300">
                        {app.setup_instructions || 'No setup instructions available'}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {(app.available_actions?.length || app.available_triggers?.length) ? (
                <div className="space-y-4">
                  {app.available_actions && app.available_actions.length > 0 && (
                    <div className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Zap className="w-4 h-4 text-orange-500" />
                        <h3 className="font-medium text-zinc-900 dark:text-zinc-100">Available Actions</h3>
                        <Badge variant="secondary" className="text-xs">
                          {app.available_actions.length}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        {app.available_actions.slice(0, 5).map((action: any, index: number) => (
                          <div key={index} className="flex items-center gap-2 text-sm">
                            <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                            <span className="text-zinc-700 dark:text-zinc-300">
                              {action.name || action.display_name || action}
                            </span>
                          </div>
                        ))}
                        {app.available_actions.length > 5 && (
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
                            +{app.available_actions.length - 5} more actions
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {app.available_triggers && app.available_triggers.length > 0 && (
                    <div className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Play className="w-4 h-4 text-green-500" />
                        <h3 className="font-medium text-zinc-900 dark:text-zinc-100">Available Triggers</h3>
                        <Badge variant="secondary" className="text-xs">
                          {app.available_triggers.length}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        {app.available_triggers.slice(0, 5).map((trigger: any, index: number) => (
                          <div key={index} className="flex items-center gap-2 text-sm">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                            <span className="text-zinc-700 dark:text-zinc-300">
                              {trigger.name || trigger.display_name || trigger}
                            </span>
                          </div>
                        ))}
                        {app.available_triggers.length > 5 && (
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
                            +{app.available_triggers.length - 5} more triggers
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-zinc-50 dark:bg-zinc-900/30 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 text-center">
                  <BookOpen className="w-8 h-8 text-zinc-400 mx-auto mb-2" />
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    No actions or triggers available for this integration
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        ) : (
          <div className="flex flex-col items-center justify-center h-full py-8 px-6">
            <div className="text-center w-full max-w-xs">
              <div className="w-16 h-16 rounded-xl mx-auto mb-4 flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                <Info className="h-8 w-8 text-zinc-400" />
              </div>
              <h3 className="text-base font-medium text-zinc-900 dark:text-zinc-100 mb-2">
                No app details found
              </h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {app_slug ? `Unable to load details for "${app_slug}"` : 'App information not available'}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 