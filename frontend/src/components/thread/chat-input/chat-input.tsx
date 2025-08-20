'use client';

import React, {
  useState,
  useRef,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from 'react';
import { useAgents } from '@/hooks/react-query/agents/use-agents';
import { useAgentSelection } from '@/lib/stores/agent-selection-store';

import { Card, CardContent } from '@/components/ui/card';
import { handleFiles } from './file-upload-handler';
import { MessageInput } from './message-input';
import { AttachmentGroup } from '../attachment-group';
import { useModelSelection } from './_use-model-selection';
import { useFileDelete } from '@/hooks/react-query/files';
import { useQueryClient } from '@tanstack/react-query';
import { ToolCallInput } from './floating-tool-preview';
import { ChatSnack } from './chat-snack';
import { Brain, Zap, Workflow, Database, ArrowDown } from 'lucide-react';
import { usePipedreamToolkitIcon } from '@/hooks/react-query/pipedream/use-pipedream';
import { usePipedreamProfiles } from '@/hooks/react-query/pipedream/use-pipedream-profiles';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

import { IntegrationsRegistry } from '@/components/agents/integrations-registry';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useSubscriptionWithStreaming } from '@/hooks/react-query/subscriptions/use-subscriptions';
import { isLocalMode } from '@/lib/config';
import { BillingModal } from '@/components/billing/billing-modal';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
// import posthog from 'posthog-js';

export interface ChatInputHandles {
  getPendingFiles: () => File[];
  clearPendingFiles: () => void;
}

export interface ChatInputProps {
  onSubmit: (
    message: string,
    options?: {
      model_name?: string;
      enable_thinking?: boolean;
      agent_id?: string;
      tools?: string[];
    },
  ) => void;
  placeholder?: string;
  loading?: boolean;
  disabled?: boolean;
  isAgentRunning?: boolean;
  onStopAgent?: () => void;
  autoFocus?: boolean;
  value?: string;
  onChange?: (value: string) => void;
  onFileBrowse?: () => void;
  sandboxId?: string;
  hideAttachments?: boolean;
  selectedAgentId?: string;
  onAgentSelect?: (agentId: string | undefined) => void;
  agentName?: string;
  messages?: any[];
  bgColor?: string;
  toolCalls?: ToolCallInput[];
  toolCallIndex?: number;
  showToolPreview?: boolean;
  onExpandToolPreview?: () => void;
  isLoggedIn?: boolean;
  enableAdvancedConfig?: boolean;
  onConfigureAgent?: (agentId: string) => void;
  hideAgentSelection?: boolean;
  defaultShowSnackbar?: 'tokens' | 'upgrade' | false;
  showToLowCreditUsers?: boolean;
  agentMetadata?: {
    is_suna_default?: boolean;
  };
  showScrollToBottomIndicator?: boolean;
  onScrollToBottom?: () => void;
}

export interface UploadedFile {
  name: string;
  path: string;
  size: number;
  type: string;
  localUrl?: string;
}



export const ChatInput = forwardRef<ChatInputHandles, ChatInputProps>(
  (
    {
      onSubmit,
      placeholder = 'Describe what you need help with...',
      loading = false,
      disabled = false,
      isAgentRunning = false,
      onStopAgent,
      autoFocus = true,
      value: controlledValue,
      onChange: controlledOnChange,
      onFileBrowse,
      sandboxId,
      hideAttachments = false,
      selectedAgentId,
      onAgentSelect,
      agentName,
      messages = [],
      bgColor = 'bg-card',
      toolCalls = [],
      toolCallIndex = 0,
      showToolPreview = false,
      onExpandToolPreview,
      isLoggedIn = true,
      enableAdvancedConfig = false,
      onConfigureAgent,
      hideAgentSelection = false,
      defaultShowSnackbar = false,
      showToLowCreditUsers = true,
      agentMetadata,
      showScrollToBottomIndicator = false,
      onScrollToBottom,
    },
    ref,
  ) => {
    const isControlled =
      controlledValue !== undefined && controlledOnChange !== undefined;
    const router = useRouter();

    const [uncontrolledValue, setUncontrolledValue] = useState('');
    const value = isControlled ? controlledValue : uncontrolledValue;

    const isSunaAgent = agentMetadata?.is_suna_default || false;

    const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
    const [pendingFiles, setPendingFiles] = useState<File[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [isDraggingOver, setIsDraggingOver] = useState(false);

    const [registryDialogOpen, setRegistryDialogOpen] = useState(false);
    const [showSnackbar, setShowSnackbar] = useState(defaultShowSnackbar);
    const [userDismissedUsage, setUserDismissedUsage] = useState(false);
    const [billingModalOpen, setBillingModalOpen] = useState(false);
    const [isAddingTools, setIsAddingTools] = useState(false);

    const {
      selectedModel,
      setSelectedModel: handleModelChange,
      subscriptionStatus,
      allModels: modelOptions,
      canAccessModel,
      getActualModelId,
      refreshCustomModels,
    } = useModelSelection();

    const { data: subscriptionData } = useSubscriptionWithStreaming(isAgentRunning);
    const deleteFileMutation = useFileDelete();
    const queryClient = useQueryClient();

    // Fetch connected Pipedream profiles to show integration icons
    const { data: profiles } = usePipedreamProfiles();
    const connectedProfiles = profiles?.filter(p => p.is_connected) || [];
    
    // Get unique app slugs from connected profiles
    const connectedAppSlugs = [...new Set(connectedProfiles.map(p => p.app_slug))];
    
    // Fetch icons for all connected apps - use static hook calls
    const googleDriveIcon = usePipedreamToolkitIcon('googledrive', { enabled: isLoggedIn && !!enableAdvancedConfig && connectedAppSlugs.includes('googledrive') });
    const slackIcon = usePipedreamToolkitIcon('slack', { enabled: isLoggedIn && !!enableAdvancedConfig && connectedAppSlugs.includes('slack') });
    const notionIcon = usePipedreamToolkitIcon('notion', { enabled: isLoggedIn && !!enableAdvancedConfig && connectedAppSlugs.includes('notion') });
    const githubIcon = usePipedreamToolkitIcon('github', { enabled: isLoggedIn && !!enableAdvancedConfig && connectedAppSlugs.includes('github') });
    const discordIcon = usePipedreamToolkitIcon('discord', { enabled: isLoggedIn && !!enableAdvancedConfig && connectedAppSlugs.includes('discord') });
    const zapierIcon = usePipedreamToolkitIcon('zapier', { enabled: isLoggedIn && !!enableAdvancedConfig && connectedAppSlugs.includes('zapier') });
    
    // Create a map of app slugs to icon URLs with better error handling
    const appIconMap = connectedAppSlugs.reduce((acc, appSlug) => {
      let iconUrl = null;
      
      // Map common app slugs to their icon hooks
      switch (appSlug) {
        case 'googledrive':
          iconUrl = googleDriveIcon?.data;
          break;
        case 'slack':
          iconUrl = slackIcon?.data;
          break;
        case 'notion':
          iconUrl = notionIcon?.data;
          break;
        case 'github':
          iconUrl = githubIcon?.data;
          break;
        case 'discord':
          iconUrl = discordIcon?.data;
          break;
        case 'zapier':
          iconUrl = zapierIcon?.data;
          break;
        default:
          // For other apps, we'll show initials
          iconUrl = null;
          break;
      }
      
      if (iconUrl) {
        acc[appSlug] = iconUrl;
      }
      return acc;
    }, {} as Record<string, string>);

    // Get app names for better display
    const appNameMap = connectedProfiles.reduce((acc, profile) => {
      if (!acc[profile.app_slug]) {
        acc[profile.app_slug] = profile.app_name;
      }
      return acc;
    }, {} as Record<string, string>);

    // Show usage preview logic:
    // - Always show to free users when showToLowCreditUsers is true
    // - For paid users, only show when they're at 70% or more of their cost limit (30% or below remaining)
    const shouldShowUsage = !isLocalMode() && subscriptionData && showToLowCreditUsers && (() => {
      // Free users: always show
      if (subscriptionStatus === 'no_subscription') {
        return true;
      }

      // Paid users: only show when at 70% or more of cost limit
      const currentUsage = subscriptionData.current_usage || 0;
      const costLimit = subscriptionData.cost_limit || 0;

      if (costLimit === 0) return false; // No limit set

      return currentUsage >= (costLimit * 0.7); // 70% or more used (30% or less remaining)
    })();

    // Auto-show usage preview when we have subscription data
    useEffect(() => {
      if (shouldShowUsage && defaultShowSnackbar !== false && !userDismissedUsage && (showSnackbar === false || showSnackbar === defaultShowSnackbar)) {
        setShowSnackbar('upgrade');
      } else if (!shouldShowUsage && showSnackbar !== false) {
        setShowSnackbar(false);
      }
    }, [subscriptionData, showSnackbar, defaultShowSnackbar, shouldShowUsage, subscriptionStatus, showToLowCreditUsers, userDismissedUsage]);

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { data: agentsResponse } = useAgents({});
    const agents = agentsResponse?.agents || [];

    const { setSelectedAgentId } = useAgentSelection();
    useImperativeHandle(ref, () => ({
      getPendingFiles: () => pendingFiles,
      clearPendingFiles: () => setPendingFiles([]),
    }));

    useEffect(() => {
      if (agents.length > 0 && !onAgentSelect) {
        setSelectedAgentId(agents[0].agent_id);
      }
    }, [agents, onAgentSelect, setSelectedAgentId]);

    useEffect(() => {
      if (autoFocus && textareaRef.current) {
        textareaRef.current.focus();
      }
    }, [autoFocus]);

    // Handle tools selected from integrations
    const handleToolsSelected = async (profileId: string, selectedTools: string[], appName: string, appSlug: string) => {
      if (!selectedAgentId) {
        toast.error('Please select an agent first');
        return;
      }

      if (selectedTools.length === 0) {
        toast.error('Please select at least one tool to add');
        return;
      }

      setIsAddingTools(true);
      try {
        // Update the agent's Pipedream tools for this profile
        const response = await fetch(`/api/agents/${selectedAgentId}/pipedream-tools/${profileId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ enabled_tools: selectedTools }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.detail || 'Failed to update tools');
        }

        const result = await response.json();
        
        // Close the dialog
        setRegistryDialogOpen(false);
        
        // Show success message with more details
        if (result.success) {
          // Check if this was a new configuration or an update
          const isNewConfiguration = !result.existing_mcp;
          const actionText = isNewConfiguration ? 'added' : 'updated';
          
          toast.success(`Successfully ${actionText} ${selectedTools.length} tool${selectedTools.length > 1 ? 's' : ''} from ${appName}!`, {
            description: `Tools: ${selectedTools.slice(0, 3).join(', ')}${selectedTools.length > 3 ? '...' : ''}`,
            duration: 4000,
          });
        } else {
          toast.success(`Added ${selectedTools.length} tool${selectedTools.length > 1 ? 's' : ''} from ${appName}!`, {
            description: 'Some tools may need to be configured further.',
            duration: 4000,
          });
        }
        
        // Invalidate queries to refresh the UI
        queryClient.invalidateQueries({ queryKey: ['agent', selectedAgentId] });
        queryClient.invalidateQueries({ queryKey: ['pipedream', 'profiles'] });
        queryClient.invalidateQueries({ queryKey: ['agent-tools', selectedAgentId] });
        
      } catch (error) {
        console.error('Error updating tools:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to add tools. Please try again.';
        toast.error(errorMessage, {
          description: 'Please check your agent configuration and try again.',
          duration: 5000,
        });
      } finally {
        setIsAddingTools(false);
      }
    };

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (
        (!value.trim() && uploadedFiles.length === 0) ||
        loading ||
        (disabled && !isAgentRunning)
      )
        return;

      if (isAgentRunning && onStopAgent) {
        onStopAgent();
        return;
      }

      let message = value;

      if (uploadedFiles.length > 0) {
        const fileInfo = uploadedFiles
          .map((file) => `[Uploaded File: ${file.path}]`)
          .join('\n');
        message = message ? `${message}\n\n${fileInfo}` : fileInfo;
      }

      let baseModelName = getActualModelId(selectedModel);
      let thinkingEnabled = false;
      if (selectedModel.endsWith('-thinking')) {
        baseModelName = getActualModelId(selectedModel.replace(/-thinking$/, ''));
        thinkingEnabled = true;
      }

      // Get the enabled tools for the selected agent
      let enabledTools: string[] = [];
      if (selectedAgentId) {
        try {
          // First, get the agent's active profile
          const profileResponse = await fetch(`/api/agents/${selectedAgentId}/profiles?is_active=true`);
          if (profileResponse.ok) {
            const profiles = await profileResponse.json();
            const activeProfile = profiles?.[0];
            
            if (activeProfile?.id) {
              // Then get the tools for this profile
              const toolsResponse = await fetch(
                `/api/agents/${selectedAgentId}/pipedream-tools/${activeProfile.id}`
              );
              
              if (toolsResponse.ok) {
                const data = await toolsResponse.json();
                console.log('Raw tools response:', data);
                
                // First check if we have enabled_tools array (regardless of success status)
                if (Array.isArray(data?.enabled_tools)) {
                  enabledTools = data.enabled_tools;
                  console.log('Using enabled_tools from response:', enabledTools);
                } 
                // Fallback to the tools array if enabled_tools is not available
                else if (Array.isArray(data?.tools)) {
                  enabledTools = data.tools
                    .filter((tool: { enabled: boolean }) => tool.enabled)
                    .map((tool: { name: string }) => tool.name);
                }
                
                console.log('Final enabled tools:', enabledTools);
                
                // Log a warning if success is false but we're still trying to use the tools
                if (data.success === false) {
                  console.warn('Tool fetch returned success:false, but proceeding with available tools');
                }
              } else {
                console.warn('Failed to fetch tools for profile:', await toolsResponse.text());
              }
            } else {
              console.warn('No active profile found for agent');
            }
          }
        } catch (error) {
          console.error('Error fetching enabled tools:', error);
        }
      }

      // posthog.capture("task_prompt_submitted", { message });
      console.log('Enabled tools to be sent:', enabledTools);
      onSubmit(message, {
        agent_id: selectedAgentId,
        model_name: baseModelName,
        enable_thinking: thinkingEnabled,
        tools: enabledTools.length > 0 ? enabledTools : undefined,
      });

      if (!isControlled) {
        setUncontrolledValue('');
      }

      setUploadedFiles([]);
    };

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      if (isControlled) {
        controlledOnChange(newValue);
      } else {
        setUncontrolledValue(newValue);
      }
    };

    const handleTranscription = (transcribedText: string) => {
      const currentValue = isControlled ? controlledValue : uncontrolledValue;
      const newValue = currentValue ? `${currentValue} ${transcribedText}` : transcribedText;

      if (isControlled) {
        controlledOnChange(newValue);
      } else {
        setUncontrolledValue(newValue);
      }
    };

    const removeUploadedFile = async (index: number) => {
      const fileToRemove = uploadedFiles[index];

      // Clean up local URL if it exists
      if (fileToRemove.localUrl) {
        URL.revokeObjectURL(fileToRemove.localUrl);
      }

      // Remove from local state immediately for responsive UI
      setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
      if (!sandboxId && pendingFiles.length > index) {
        setPendingFiles((prev) => prev.filter((_, i) => i !== index));
      }

      // Check if file is referenced in existing chat messages before deleting from server
      const isFileUsedInChat = messages.some(message => {
        const content = typeof message.content === 'string' ? message.content : '';
        return content.includes(`[Uploaded File: ${fileToRemove.path}]`);
      });

      // Only delete from server if file is not referenced in chat history
      if (sandboxId && fileToRemove.path && !isFileUsedInChat) {
        deleteFileMutation.mutate({
          sandboxId,
          filePath: fileToRemove.path,
        }, {
          onError: (error) => {
            console.error('Failed to delete file from server:', error);
          }
        });
      } else {
        // File exists in chat history, don't delete from server
      }
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDraggingOver(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDraggingOver(false);
    };



    return (
      <div className="mx-auto w-full max-w-4xl relative">
        <div className="relative">
          <ChatSnack
            toolCalls={toolCalls}
            toolCallIndex={toolCallIndex}
            onExpandToolPreview={onExpandToolPreview}
            agentName={agentName}
            showToolPreview={showToolPreview}
            showUsagePreview={showSnackbar}
            subscriptionData={subscriptionData}
            onCloseUsage={() => { setShowSnackbar(false); setUserDismissedUsage(true); }}
            onOpenUpgrade={() => setBillingModalOpen(true)}
            isVisible={showToolPreview || !!showSnackbar}
          />

          {/* Scroll to bottom button */}
          {showScrollToBottomIndicator && onScrollToBottom && (
            <button
              onClick={onScrollToBottom}
              className={`absolute cursor-pointer right-3 z-50 w-8 h-8 rounded-full bg-card border border-border transition-all duration-200 hover:scale-105 flex items-center justify-center ${showToolPreview || !!showSnackbar ? '-top-12' : '-top-5'
                }`}
              title="Scroll to bottom"
            >
              <ArrowDown className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
          <Card
            className={`-mb-2 shadow-none w-full max-w-4xl mx-auto bg-transparent border-none overflow-visible ${enableAdvancedConfig && selectedAgentId ? '' : 'rounded-3xl'} relative z-10`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDraggingOver(false);
              if (fileInputRef.current && e.dataTransfer.files.length > 0) {
                const files = Array.from(e.dataTransfer.files);
                handleFiles(
                  files,
                  sandboxId,
                  setPendingFiles,
                  setUploadedFiles,
                  setIsUploading,
                  messages,
                  queryClient,
                );
              }
            }}
          >
            <div className="w-full text-sm flex flex-col justify-between items-start rounded-lg">
              <CardContent className={`w-full p-1.5 pb-2 ${bgColor} border rounded-3xl`}>
                <AttachmentGroup
                  files={uploadedFiles || []}
                  sandboxId={sandboxId}
                  onRemove={removeUploadedFile}
                  layout="inline"
                  maxHeight="216px"
                  showPreviews={true}
                />
                <MessageInput
                  ref={textareaRef}
                  value={value}
                  onChange={handleChange}
                  onSubmit={handleSubmit}
                  onTranscription={handleTranscription}
                  placeholder={placeholder}
                  loading={loading}
                  disabled={disabled}
                  isAgentRunning={isAgentRunning}
                  onStopAgent={onStopAgent}
                  isDraggingOver={isDraggingOver}
                  uploadedFiles={uploadedFiles}

                  fileInputRef={fileInputRef}
                  isUploading={isUploading}
                  sandboxId={sandboxId}
                  setPendingFiles={setPendingFiles}
                  setUploadedFiles={setUploadedFiles}
                  setIsUploading={setIsUploading}
                  hideAttachments={hideAttachments}
                  messages={messages}

                  selectedModel={selectedModel}
                  onModelChange={handleModelChange}
                  modelOptions={modelOptions}
                  subscriptionStatus={subscriptionStatus}
                  canAccessModel={canAccessModel}
                  refreshCustomModels={refreshCustomModels}
                  isLoggedIn={isLoggedIn}

                  selectedAgentId={selectedAgentId}
                  onAgentSelect={onAgentSelect}
                  hideAgentSelection={hideAgentSelection}
                />
              </CardContent>
            </div>
          </Card>

          {enableAdvancedConfig && selectedAgentId && (
            <div className="w-full max-w-4xl mx-auto -mt-12 relative z-20">
              <div className="bg-gradient-to-b from-transparent via-transparent to-muted/30 pt-8 pb-2 px-4 rounded-b-3xl border border-t-0 border-border/50 transition-all duration-300 ease-out">
                <div className="flex items-center justify-between gap-1 overflow-x-auto scrollbar-none relative">
                  <button
                    onClick={() => setRegistryDialogOpen(true)}
                    disabled={isAddingTools}
                    className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-all duration-200 px-2.5 py-1.5 rounded-lg hover:bg-muted/50 border border-transparent hover:border-border/30 flex-shrink-0 cursor-pointer relative pointer-events-auto disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-center -space-x-0.5">
                      {isAddingTools ? (
                        <div className="w-4 h-4 bg-white dark:bg-muted border border-border rounded-full flex items-center justify-center shadow-sm">
                          <div className="w-2.5 h-2.5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      ) : connectedAppSlugs.length > 0 ? (
                        connectedAppSlugs.slice(0, 3).map((appSlug, index) => {
                          const iconUrl = appIconMap[appSlug];
                          const appName = appNameMap[appSlug] || appSlug;
                          return (
                            <div key={appSlug} className="w-4 h-4 bg-white dark:bg-muted border border-border rounded-full flex items-center justify-center shadow-sm">
                              {iconUrl ? (
                                <img 
                                  src={iconUrl} 
                                  className="w-2.5 h-2.5" 
                                  alt={appName} 
                                  title={appName}
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                    target.nextElementSibling?.classList.remove('hidden');
                                  }}
                                />
                              ) : null}
                              <span className={cn(
                                "text-xs font-medium text-muted-foreground",
                                iconUrl ? "hidden" : "block"
                              )}>
                                {appName.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          );
                        })
                      ) : (
                        <>
                          <div className="w-4 h-4 bg-white dark:bg-muted border border-border rounded-full flex items-center justify-center shadow-sm">
                            <Skeleton className="w-2.5 h-2.5 rounded" />
                          </div>
                          <div className="w-4 h-4 bg-white dark:bg-muted border border-border rounded-full flex items-center justify-center shadow-sm">
                            <Skeleton className="w-2.5 h-2.5 rounded" />
                          </div>
                          <div className="w-4 h-4 bg-white dark:bg-muted border border-border rounded-full flex items-center justify-center shadow-sm">
                            <Skeleton className="w-2.5 h-2.5 rounded" />
                          </div>
                        </>
                      )}
                    </div>
                    <span className="text-xs font-medium">
                      {isAddingTools ? 'Adding Tools...' : 'Integrations'}
                    </span>
                  </button>
                  <button
                    onClick={() => router.push(`/agents/config/${selectedAgentId}?tab=configuration&accordion=instructions`)}
                    className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-all duration-200 px-2.5 py-1.5 rounded-lg hover:bg-muted/50 border border-transparent hover:border-border/30 flex-shrink-0 cursor-pointer relative pointer-events-auto"
                  >
                    <Brain className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="text-xs font-medium">Instructions</span>
                  </button>
                  <button
                    onClick={() => router.push(`/agents/config/${selectedAgentId}?tab=configuration&accordion=knowledge`)}
                    className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-all duration-200 px-2.5 py-1.5 rounded-lg hover:bg-muted/50 border border-transparent hover:border-border/30 flex-shrink-0 cursor-pointer relative pointer-events-auto"
                  >
                    <Database className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="text-xs font-medium">Knowledge</span>
                  </button>
                  <button
                    onClick={() => router.push(`/agents/config/${selectedAgentId}?tab=configuration&accordion=triggers`)}
                    className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-all duration-200 px-2.5 py-1.5 rounded-lg hover:bg-muted/50 border border-transparent hover:border-border/30 flex-shrink-0 cursor-pointer relative pointer-events-auto"
                  >
                    <Zap className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="text-xs font-medium">Triggers</span>
                  </button>
                  <button
                    onClick={() => router.push(`/agents/config/${selectedAgentId}?tab=configuration&accordion=workflows`)}
                    className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-all duration-200 px-2.5 py-1.5 rounded-lg hover:bg-muted/50 border border-transparent hover:border-border/30 flex-shrink-0 cursor-pointer relative pointer-events-auto"
                  >
                    <Workflow className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="text-xs font-medium">Playbooks</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          <Dialog open={registryDialogOpen} onOpenChange={setRegistryDialogOpen}>
            <DialogContent className="p-0 max-w-6xl h-[90vh] overflow-hidden">
              <DialogHeader className="sr-only">
                <DialogTitle>Integrations</DialogTitle>
              </DialogHeader>
              <IntegrationsRegistry
                showAgentSelector={true}
                selectedAgentId={selectedAgentId}
                onAgentChange={onAgentSelect}
                onToolsSelected={handleToolsSelected}
              />
            </DialogContent>
          </Dialog>
          <BillingModal
            open={billingModalOpen}
            onOpenChange={setBillingModalOpen}
          />
        </div>
      </div>
    );
  },
);

ChatInput.displayName = 'ChatInput';