'use client';

import React, {
  useState,
  useRef,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from 'react';
import { useAgents } from '@/hooks/react-query/agents/use-agents';

import { Card, CardContent } from '@/components/ui/card';
import { handleFiles } from './file-upload-handler';
import { MessageInput } from './message-input';
import { AttachmentGroup } from '../attachment-group';
import { useModelSelection } from './_use-model-selection';
import { useFileDelete } from '@/hooks/react-query/files';
import { useQueryClient } from '@tanstack/react-query';
import { ToolCallInput } from './floating-tool-preview';
import { ChatSnack } from './chat-snack';
import { Brain, Zap, Workflow, Database } from 'lucide-react';
import { FaGoogle, FaDiscord } from 'react-icons/fa';
import { SiNotion } from 'react-icons/si';
import { AgentConfigModal } from '@/components/agents/agent-config-modal';
import { PipedreamRegistry } from '@/components/agents/pipedream/pipedream-registry';
import { pipedreamApi } from '@/hooks/react-query/pipedream/utils';
import { usePipedreamProfiles } from '@/hooks/react-query/pipedream/use-pipedream-profiles';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useSubscriptionWithStreaming } from '@/hooks/react-query/subscriptions/use-subscriptions';
import { isLocalMode } from '@/lib/config';
import { BillingModal } from '@/components/billing/billing-modal';
import { useRouter } from 'next/navigation';
import { BorderBeam } from '@/components/magicui/border-beam';
import { toast } from 'sonner';

// Helper function to check if we're in production mode
const isProductionMode = (): boolean => {
  const envMode = process.env.NEXT_PUBLIC_ENV_MODE?.toLowerCase();
  return envMode === 'production';
};

export interface ChatInputHandles {
  getPendingFiles: () => File[];
  clearPendingFiles: () => void;
}

export interface ChatInputProps {
  onSubmit: (
    message: string,
    options?: { model_name?: string; enable_thinking?: boolean },
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
      placeholder = 'Assign tasks or ask anything...',
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
    const [configModalOpen, setConfigModalOpen] = useState(false);
    const [configModalTab, setConfigModalTab] = useState('integrations');
    const [registryDialogOpen, setRegistryDialogOpen] = useState(false);
    const [showSnackbar, setShowSnackbar] = useState(defaultShowSnackbar);
    const [userDismissedUsage, setUserDismissedUsage] = useState(false);
    const [billingModalOpen, setBillingModalOpen] = useState(false);

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

    // Direct tool execution state
    const [useDirectTool, setUseDirectTool] = useState(false);
    const [selectedProfileId, setSelectedProfileId] = useState<string>('');
    const [selectedToolName, setSelectedToolName] = useState<string>('');
    const [userPickedProfile, setUserPickedProfile] = useState(false);
    const [userPickedTool, setUserPickedTool] = useState(false);
    const { data: pdProfiles } = usePipedreamProfiles({ is_active: true });
    const enabledToolsByProfile = React.useMemo(() => {
      const map: Record<string, string[]> = {};
      (pdProfiles || []).forEach((p: any) => {
        if (p.enabled_tools && p.enabled_tools.length > 0 && p.is_connected) {
          map[p.profile_id] = p.enabled_tools;
        }
      });
      return map;
    }, [pdProfiles]);

    // Reset manual flags when toggling mode
    useEffect(() => {
      if (useDirectTool) {
        setUserPickedProfile(false);
        setUserPickedTool(false);
      }
    }, [useDirectTool]);

    // Auto-select profile/tool based on message content using keyword scoring (only if user hasn't picked)
    useEffect(() => {
      if (!useDirectTool) return;
      const text = ((isControlled ? controlledValue : uncontrolledValue) || '').toLowerCase();
      if (!text.trim()) return;
      const profiles: any[] = (pdProfiles || []).filter((p: any) => p.is_connected && (p.enabled_tools?.length || 0) > 0);
      if (profiles.length === 0) return;

      const appKeywordMap: Record<string, string[]> = {
        google_calendar: ['calendar', 'event', 'invite', 'meeting', 'schedule', 'reschedule'],
        google_drive: ['drive', 'file', 'files', 'upload', 'doc', 'docs', 'sheet', 'sheets', 'folder'],
        gmail: ['gmail', 'mail', 'email', 'inbox', 'send email'],
        slack: ['slack', 'channel', 'dm', 'message'],
        notion: ['notion', 'page', 'database', 'db'],
        github: ['github', 'issue', 'pull request', 'pr', 'repo'],
        zoom: ['zoom', 'meeting', 'schedule', 'invite'],
      };

      // Tool selection heuristics by app -> list of { match: keywords[], toolContains: substring }
      const toolKeywordMap: Record<string, Array<{ match: string[]; toolContains: string }>> = {
        google_calendar: [
          { match: ['create', 'new', 'schedule', 'add'], toolContains: 'create' },
          { match: ['update', 'reschedule', 'move', 'change'], toolContains: 'update' },
          { match: ['delete', 'remove', 'cancel'], toolContains: 'delete' },
          { match: ['list', 'show', 'find', 'upcoming'], toolContains: 'list' },
        ],
        google_drive: [
          { match: ['upload', 'add', 'put'], toolContains: 'upload' },
          { match: ['create folder', 'new folder', 'folder'], toolContains: 'folder' },
          { match: ['list', 'show', 'find'], toolContains: 'list' },
          { match: ['share'], toolContains: 'share' },
        ],
        gmail: [
          { match: ['send', 'email', 'mail'], toolContains: 'send' },
          { match: ['search', 'find'], toolContains: 'search' },
        ],
        slack: [
          { match: ['send', 'message', 'post'], toolContains: 'post' },
          { match: ['create channel', 'new channel'], toolContains: 'channel' },
        ],
        notion: [
          { match: ['create page', 'new page'], toolContains: 'page' },
          { match: ['database', 'db', 'row'], toolContains: 'database' },
        ],
        github: [
          { match: ['create issue', 'new issue', 'bug'], toolContains: 'issue' },
          { match: ['pull request', 'pr'], toolContains: 'pull' },
        ],
        zoom: [
          { match: ['schedule', 'create', 'meeting'], toolContains: 'create' },
        ],
      };

      const scoreProfile = (p: any): number => {
        let score = 0;
        const slug = (p.app_slug || '').toLowerCase();
        const name = (p.app_name || '').toLowerCase();
        if (slug && text.includes(slug)) score += 3;
        if (name && text.includes(name)) score += 3;
        const kws = appKeywordMap[slug] || appKeywordMap[name] || [];
        kws.forEach((kw) => { if (text.includes(kw)) score += 2; });
        const tools: string[] = p.enabled_tools || [];
        tools.forEach((t) => { if (text.includes(t.toLowerCase())) score += 1; });
        return score;
      };

      // Pick highest-scoring profile above a confidence threshold
      let best = { p: null as any, s: -1 };
      profiles.forEach((p) => {
        const s = scoreProfile(p);
        if (s > best.s) best = { p, s };
      });
      const chosen = best.s >= 4 ? best.p : null;

      if (chosen && !userPickedProfile) {
        if (chosen.profile_id !== selectedProfileId) setSelectedProfileId(chosen.profile_id);
        const tools: string[] = chosen.enabled_tools || [];
        // Prefer tool whose name occurs in text
        let matched = tools.find((t) => text.includes(t.toLowerCase()));
        if (!matched) {
          const heur = toolKeywordMap[chosen.app_slug] || toolKeywordMap[chosen.app_name?.toLowerCase() || ''] || [];
          for (const h of heur) {
            if (h.match.some((kw) => text.includes(kw)) ) {
              matched = tools.find((t) => t.toLowerCase().includes(h.toolContains));
              if (matched) break;
            }
          }
        }
        if (!userPickedTool && matched && matched !== selectedToolName) setSelectedToolName(matched);
      }
    }, [useDirectTool, pdProfiles, controlledValue, uncontrolledValue, isControlled, selectedProfileId, selectedToolName, userPickedProfile, userPickedTool]);

    // Show usage preview logic:
    // - Disabled in production environment
    // - Disabled when usage goes over $5
    // - Always show to free users when showToLowCreditUsers is true (if not in production and under $5)
    // - For paid users, only show when they're at 70% or more of their cost limit (30% or below remaining) (if not in production and under $5)
    const isProduction = isProductionMode();
    const currentUsage = subscriptionData?.current_usage || 0;
    const usageOver5Dollars = currentUsage > 5;
    
    // DISABLED: Billing check functionality for production
    // const shouldShowUsage = !isLocalMode() && !isProduction && !usageOver5Dollars && subscriptionData && showToLowCreditUsers && (() => {
    //   // Free users: always show (if not in production and under $5)
    //   if (subscriptionStatus === 'no_subscription') {
    //     return true;
    //   }

    //   // Paid users: only show when at 70% or more of cost limit (if not in production and under $5)
    //   const costLimit = subscriptionData.cost_limit || 0;

    //   if (costLimit === 0) return false; // No limit set

    //   return currentUsage >= (costLimit * 0.7); // 70% or more used (30% or less remaining)
    // })();
    
    // Always return false to disable usage preview
    const shouldShowUsage = false;

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
    const hasLoadedFromLocalStorage = useRef(false);
    
    const { data: agentsResponse } = useAgents();
    const agents = agentsResponse?.agents || [];

    useImperativeHandle(ref, () => ({
      getPendingFiles: () => pendingFiles,
      clearPendingFiles: () => setPendingFiles([]),
    }));

    useEffect(() => {
      if (typeof window !== 'undefined' && onAgentSelect && !hasLoadedFromLocalStorage.current && agents.length > 0) {
        const urlParams = new URLSearchParams(window.location.search);
        const hasAgentIdInUrl = urlParams.has('agent_id');
        if (!selectedAgentId && !hasAgentIdInUrl) {
          const savedAgentId = localStorage.getItem('lastSelectedAgentId');
          if (savedAgentId) {
            if (savedAgentId === 'o1') {
              // When saved agent is 'o1', default to undefined (which shows o1 in the UI)
              console.log('Saved agent is o1, defaulting to undefined');
              onAgentSelect(undefined);
            } else {
              onAgentSelect(savedAgentId);
            }
          } else {
            // Default to o1 (undefined) when no agent is selected
            console.log('No saved agent preference, defaulting to o1');
            onAgentSelect(undefined);
          }
        } else {
          console.log('Skipping localStorage load:', {
            hasSelectedAgent: !!selectedAgentId,
            hasAgentIdInUrl,
            selectedAgentId
          });
        }
        hasLoadedFromLocalStorage.current = true;
      }
    }, [onAgentSelect, selectedAgentId, agents]); // Add agents to dependencies

    // Save selected agent to localStorage whenever it changes
    useEffect(() => {
      if (typeof window !== 'undefined' && agents.length > 0) {
        // Check if the selected agent is the Suna default agent
        const selectedAgent = agents.find(agent => agent.agent_id === selectedAgentId);
        const isSunaAgent = selectedAgent?.metadata?.is_suna_default || selectedAgentId === undefined;
        
        // Use 'suna' as a special key for the Suna default agent
        const keyToStore = isSunaAgent ? 'o1' : selectedAgentId;
        console.log('Saving selected agent to localStorage:', keyToStore, 'for selectedAgentId:', selectedAgentId);
        localStorage.setItem('lastSelectedAgentId', keyToStore);
      }
    }, [selectedAgentId, agents]);

    useEffect(() => {
      if (autoFocus && textareaRef.current) {
        textareaRef.current.focus();
      }
    }, [autoFocus]);

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

      // If direct tool mode is on, execute the selected tool instead of sending to agent
      if (useDirectTool && selectedProfileId && selectedToolName) {
        try {
          // Build arguments by looking up tool schema and filling sensible defaults
          let args = { query: message, instruction: message } as Record<string, any>;
          const chosenProfile: any = (pdProfiles || []).find((p: any) => p.profile_id === selectedProfileId);
          if (chosenProfile?.app_slug) {
            try {
              const toolsResp = await pipedreamApi.getAppTools(chosenProfile.app_slug);
              const toolMeta: any = (toolsResp.tools || []).find((t: any) => t.name === selectedToolName);
              const schema: any = toolMeta?.inputSchema || toolMeta?.input_schema;
              if (schema && schema.properties) {
                // If specific required fields exist and are strings, fill with the whole message when undefined
                const props: any = schema.properties;
                const required: string[] = Array.isArray(schema.required) ? schema.required : [];
                const textLikeKeys = ['instruction','query','text','prompt','message','input'];
                // Ensure common text keys are present if defined
                textLikeKeys.forEach((k) => { if (props[k] && args[k] === undefined) args[k] = message; });
                // Fill required string fields with message if not present
                required.forEach((key) => {
                  const prop = props[key];
                  if (prop && (prop.type === 'string' || (Array.isArray(prop.type) && prop.type.includes('string'))) && args[key] === undefined) {
                    args[key] = message;
                  }
                });
              }
            } catch {}
          }
          toast.message('Executing tool...', { description: `${selectedToolName}` });
          const resp = await pipedreamApi.executeTool(selectedProfileId, selectedToolName, args);
          if (resp.success) {
            const text = typeof resp.result === 'string' ? resp.result : JSON.stringify(resp.result, null, 2);
            // Emit an event so parent chat can add an assistant message
            try {
              const evt = new CustomEvent('chat-direct-tool-result', { detail: { role: 'assistant', content: text, tool: selectedToolName } });
              window.dispatchEvent(evt);
            } catch {}
            toast.success('Tool executed', { description: text.slice(0, 500) });
          } else {
            toast.error('Tool failed', { description: resp.error || 'Unknown error' });
          }
        } catch (err) {
          console.error('Direct tool execution failed', err);
          toast.error('Tool execution error');
        }
      } else {
        onSubmit(message, {
          model_name: baseModelName,
          enable_thinking: thinkingEnabled,
        });
      }

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

    const removeUploadedFile = (index: number) => {
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
      } else if (isFileUsedInChat) {
        console.log(`Skipping server deletion for ${fileToRemove.path} - file is referenced in chat history`);
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
          <Card
            className={`-mb-2 p-0 mt-6 shadow-none w-full max-w-4xl mx-auto bg-transparent border-none overflow-visible ${enableAdvancedConfig && selectedAgentId ? '' : 'rounded-3xl'} relative`}
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
              <CardContent className={`w-full shadow-sm p-1.5 ${enableAdvancedConfig && selectedAgentId ? 'pb-1' : 'pb-2'} ${bgColor} border-0 ${enableAdvancedConfig && selectedAgentId ? 'rounded-2xl' : 'rounded-2xl'} overflow-hidden relative`}>
              <div className="absolute inset-0 rounded-[inherit] overflow-hidden pointer-events-none">
                <BorderBeam duration={4} borderWidth={1.5} size={200} className="from-transparent via-helium-teal to-transparent"/>
                <BorderBeam duration={4} borderWidth={1.5} delay={2} size={200} className="from-transparent via-helium-pink to-transparent"/>
              </div>
                {/* Bottom tool control moved into MessageInput dropdown */}
                <AttachmentGroup
                  files={uploadedFiles || []}
                  sandboxId={sandboxId}
                  onRemove={removeUploadedFile}
                  layout="inline"
                  maxHeight="216px"
                  showPreviews={false}
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
                  toolControl={{
                    available: (pdProfiles || []).some((p: any) => p.is_connected && (p.enabled_tools?.length || 0) > 0),
                    useDirectTool,
                    onUseDirectToolChange: setUseDirectTool,
                    profiles: (pdProfiles || [])
                      .filter((p: any) => p.is_connected && (p.enabled_tools?.length || 0) > 0)
                      .map((p: any) => ({ profile_id: p.profile_id, app_name: p.app_name, profile_name: p.profile_name })),
                    selectedProfileId,
                    onProfileChange: (v: string) => {
                      setSelectedProfileId(v);
                      setUserPickedProfile(true);
                      const tools = enabledToolsByProfile[v] || [];
                      setSelectedToolName((prev) => (tools.includes(prev) ? prev : tools[0] || ''));
                    },
                    tools: enabledToolsByProfile[selectedProfileId] || [],
                    selectedToolName,
                    onToolChange: (t: string) => {
                      setSelectedToolName(t);
                      setUserPickedTool(true);
                    },
                  }}

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

              {/* {enableAdvancedConfig && selectedAgentId && (
              <div className="w-full border-t bg-muted/20 px-4 py-1.5 rounded-b-3xl border-l border-r border-b border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto scrollbar-none">
                    <button
                      onClick={() => setRegistryDialogOpen(true)}
                      className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-all duration-200 px-2.5 py-1.5 rounded-md hover:bg-muted/50 border border-transparent hover:border-border/30 flex-shrink-0"
                    >
                      <div className="flex items-center -space-x-0.5">
                        <div className="w-5 h-5 bg-white dark:bg-muted border border-border rounded-full flex items-center justify-center shadow-sm">
                          <FaGoogle className="w-3 h-3" />
                        </div>
                        <div className="w-5 h-5 bg-white dark:bg-muted border border-border rounded-full flex items-center justify-center shadow-sm">
                          <FaDiscord className="w-3 h-3" />
                        </div>
                        <div className="w-5 h-5 bg-white dark:bg-muted border border-border rounded-full flex items-center justify-center shadow-sm">
                          <SiNotion className="w-3 h-3" />
                        </div>
                      </div>
                      <span className="text-xs font-medium">Integrations</span>
                    </button>
                    
                    <div className="w-px h-4 bg-border/60" />
                    
                    <button
                      onClick={() => router.push(`/agents/config/${selectedAgentId}?tab=configuration&accordion=instructions`)}
                      className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-all duration-200 px-2.5 py-1.5 rounded-md hover:bg-muted/50 border border-transparent hover:border-border/30 flex-shrink-0"
                    >
                      <Brain className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="text-xs font-medium">Instructions</span>
                    </button>
                    
                    <div className="w-px h-4 bg-border/60" />
                    
                    <button
                      onClick={() => router.push(`/agents/config/${selectedAgentId}?tab=configuration&accordion=knowledge`)}
                      className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-all duration-200 px-2.5 py-1.5 rounded-md hover:bg-muted/50 border border-transparent hover:border-border/30 flex-shrink-0"
                    >
                      <Database className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="text-xs font-medium">Knowledge</span>
                    </button>
                    
                    <div className="w-px h-4 bg-border/60" />
                    
                    <button
                      onClick={() => router.push(`/agents/config/${selectedAgentId}?tab=configuration&accordion=triggers`)}
                      className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-all duration-200 px-2.5 py-1.5 rounded-md hover:bg-muted/50 border border-transparent hover:border-border/30 flex-shrink-0"
                    >
                      <Zap className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="text-xs font-medium">Triggers</span>
                    </button>
                    
                    <div className="w-px h-4 bg-border/60" />
                    
                    <button
                      onClick={() => router.push(`/agents/config/${selectedAgentId}?tab=configuration&accordion=workflows`)}
                      className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-all duration-200 px-2.5 py-1.5 rounded-md hover:bg-muted/50 border border-transparent hover:border-border/30 flex-shrink-0"
                    >
                      <Workflow className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="text-xs font-medium">Workflows</span>
                    </button>
                  </div>
                </div>
              </div>
            )} */}
            </div>
          </Card>
          <AgentConfigModal
            isOpen={configModalOpen}
            onOpenChange={setConfigModalOpen}
            selectedAgentId={selectedAgentId}
            onAgentSelect={onAgentSelect}
            initialTab={configModalTab}
          />
          <Dialog open={registryDialogOpen} onOpenChange={setRegistryDialogOpen}>
            <DialogContent className="p-0 max-w-6xl max-h-[90vh] overflow-y-auto">
              <DialogHeader className="sr-only">
                <DialogTitle>Integrations</DialogTitle>
              </DialogHeader>
              <PipedreamRegistry
                showAgentSelector={true}
                selectedAgentId={selectedAgentId}
                onAgentChange={onAgentSelect}
                onToolsSelected={(profileId, selectedTools, appName, appSlug) => {
                  console.log('Tools selected:', { profileId, selectedTools, appName, appSlug });
                }}
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