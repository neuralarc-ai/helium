import React, { forwardRef, useEffect, useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UploadedFile } from './chat-input';
import { FileUploadHandler } from './file-upload-handler';
import { VoiceRecorder } from './voice-recorder';
import { ModelSelector } from './model-selector';
import { AgentSelector } from './agent-selector';
import { canAccessModel, SubscriptionStatus } from './_use-model-selection';
import { isLocalMode } from '@/lib/config';
import { useFeatureFlag } from '@/lib/feature-flags';
import { TooltipContent } from '@/components/ui/tooltip';
import { Tooltip } from '@/components/ui/tooltip';
import { TooltipProvider, TooltipTrigger } from '@radix-ui/react-tooltip';
import { BillingModal } from '@/components/billing/billing-modal';
import ChatDropdown from './chat-dropdown';
import { handleFiles } from './file-upload-handler';
import { HeliumLogo } from '@/components/sidebar/helium-logo';


interface MessageInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  onTranscription: (text: string) => void;
  placeholder: string;
  loading: boolean;
  disabled: boolean;
  isAgentRunning: boolean;
  onStopAgent?: () => void;
  isDraggingOver: boolean;
  uploadedFiles: UploadedFile[];

  fileInputRef: React.RefObject<HTMLInputElement>;
  isUploading: boolean;
  sandboxId?: string;
  setPendingFiles: React.Dispatch<React.SetStateAction<File[]>>;
  setUploadedFiles: React.Dispatch<React.SetStateAction<UploadedFile[]>>;
  setIsUploading: React.Dispatch<React.SetStateAction<boolean>>;
  hideAttachments?: boolean;
  messages?: any[]; // Add messages prop
  isLoggedIn?: boolean;

  selectedModel: string;
  onModelChange: (model: string) => void;
  modelOptions: any[];
  subscriptionStatus: SubscriptionStatus;
  canAccessModel: (modelId: string) => boolean;
  refreshCustomModels?: () => void;
  selectedAgentId?: string;
  onAgentSelect?: (agentId: string | undefined) => void;
  enableAdvancedConfig?: boolean;
  hideAgentSelection?: boolean;
}

export const MessageInput = forwardRef<HTMLTextAreaElement, MessageInputProps>(
  (
    {
      value,
      onChange,
      onSubmit,
      onTranscription,
      placeholder,
      loading,
      disabled,
      isAgentRunning,
      onStopAgent,
      isDraggingOver,
      uploadedFiles,

      fileInputRef,
      isUploading,
      sandboxId,
      setPendingFiles,
      setUploadedFiles,
      setIsUploading,
      hideAttachments = false,
      messages = [],
      isLoggedIn = true,

      selectedModel,
      onModelChange,
      modelOptions,
      subscriptionStatus,
      canAccessModel,
      refreshCustomModels,

      selectedAgentId,
      onAgentSelect,
      enableAdvancedConfig = false,
      hideAgentSelection = false,
    },
    ref,
  ) => {
    const [billingModalOpen, setBillingModalOpen] = useState(false);
    const { enabled: customAgentsEnabled, loading: flagsLoading } = useFeatureFlag('custom_agents');

    useEffect(() => {
      const textarea = ref as React.RefObject<HTMLTextAreaElement>;
      if (!textarea.current) return;

      const adjustHeight = () => {
        textarea.current!.style.height = 'auto';
        const newHeight = Math.min(
          Math.max(textarea.current!.scrollHeight, 24),
          200,
        );
        textarea.current!.style.height = `${newHeight}px`;
      };

      adjustHeight();

      // Call it twice to ensure proper height calculation
      adjustHeight();

      window.addEventListener('resize', adjustHeight);
      return () => window.removeEventListener('resize', adjustHeight);
    }, [value, ref]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
        e.preventDefault();
        if (
          (value.trim() || uploadedFiles.length > 0) &&
          !loading &&
          (!disabled || isAgentRunning)
        ) {
          onSubmit(e as unknown as React.FormEvent);
        }
      }
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      if (!e.clipboardData) return;
      const items = Array.from(e.clipboardData.items);
      const imageFiles: File[] = [];
      for (const item of items) {
        if (item.kind === 'file' && item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) imageFiles.push(file);
        }
      }
      if (imageFiles.length > 0) {
        e.preventDefault();
        handleFiles(
          imageFiles,
          sandboxId,
          setPendingFiles,
          setUploadedFiles,
          setIsUploading,
          messages,
        );
      }
    };

    const renderDropdown = () => {
      if (isLoggedIn) {
        // In production mode, show Helium logo with Helio o1 text
        if (!isLocalMode()) {
          return (
            <div className='flex items-center gap-[10px]'>
              {/* Pill-shaped toggle with Helium gradient */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="relative flex items-center rounded-full shadow-xs border border-black/10 gap-1.5 p-2 px-4 cursor-pointer">
                      {/* Inner Helio o1 section with dark background */}
                        <HeliumLogo size={16} />
                        <span className="text-sm font-medium text-foreground">Helio o1</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    Our most powerful agent system
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <span className='h-6 w-[1px] bg-muted-foreground/20'></span>
            </div>
          );
        }

        // In local mode, show full functionality
        const showAdvancedFeatures = enableAdvancedConfig || (customAgentsEnabled && !flagsLoading);

        return (
          <div className="flex items-center gap-2">
            {showAdvancedFeatures && !hideAgentSelection && (
              <AgentSelector
                selectedAgentId={selectedAgentId}
                onAgentSelect={onAgentSelect}
                disabled={loading || (disabled && !isAgentRunning)}
                isSunaAgent={true}
              />
            )}
            <ModelSelector
              selectedModel={selectedModel}
              onModelChange={onModelChange}
              modelOptions={modelOptions}
              subscriptionStatus={subscriptionStatus}
              canAccessModel={canAccessModel}
              refreshCustomModels={refreshCustomModels}
              billingModalOpen={billingModalOpen}
              setBillingModalOpen={setBillingModalOpen}
            />
          </div>
        );
      }
      return <ChatDropdown />;
    }

    return (
      <div className="relative flex flex-col w-full h-full gap-4 justify-between">
        <div className="flex flex-col px-2 flex-grow">
          <Textarea
            ref={ref}
            value={value}
            onChange={onChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className={cn(
              'w-full bg-transparent dark:bg-transparent z-20 border-none shadow-none focus-visible:ring-0 px-1 pb-6 pt-4 min-h-[86px] max-h-[200px] overflow-y-auto scrollbar-hide resize-none md:text-base md:placeholder:text-base',
              isDraggingOver ? 'opacity-40' : '',
            )}
            disabled={loading || (disabled && !isAgentRunning)}
            rows={1}
          />
        </div>

        <div className="flex items-center justify-between mt-0 mb-2 px-2 flex-shrink-0">
          <div className="flex items-center gap-3 w-full">
            {!hideAttachments && (
              <FileUploadHandler
                ref={fileInputRef}
                loading={loading}
                disabled={disabled}
                isAgentRunning={isAgentRunning}
                isUploading={isUploading}
                sandboxId={sandboxId}
                setPendingFiles={setPendingFiles}
                setUploadedFiles={setUploadedFiles}
                setIsUploading={setIsUploading}
                messages={messages}
                isLoggedIn={isLoggedIn}
              />
            )}

            {/* Spacer to push the rest of the buttons to the right */}
            <div className='flex-1' />

            <div className='flex items-center gap-2'>
              {renderDropdown()}
              
              {/* Billing Modal - only show in local mode */}
              {isLocalMode() && (
                <BillingModal
                  open={billingModalOpen}
                  onOpenChange={setBillingModalOpen}
                  returnUrl={typeof window !== 'undefined' ? window.location.href : '/'}
                />
              )}

              {/* Voice Recorder Button */}
              {isLoggedIn && <VoiceRecorder
                onTranscription={onTranscription}
                disabled={loading || (disabled && !isAgentRunning)}
              />}

              <Button
                type="submit"
                onClick={isAgentRunning && onStopAgent ? onStopAgent : onSubmit}
                size="icon"
                className={cn(
                  'w-8 h-8 flex-shrink-0 rounded-full bg-helium-teal hover:bg-helium-teal/80 cursor-pointer',
                  (!value.trim() && uploadedFiles.length === 0 && !isAgentRunning) ||
                    loading ||
                    (disabled && !isAgentRunning)
                    ? 'opacity-50'
                    : '',
                )}
                disabled={
                  (!value.trim() && uploadedFiles.length === 0 && !isAgentRunning) ||
                  loading ||
                  (disabled && !isAgentRunning)
                }
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : isAgentRunning ? (
                  <div className="w-3 h-3 aspect-square rounded-xs bg-current" />
                ) : (
                  <ArrowUp className="h-5 w-5" />
                )}
              </Button>
            </div>
          </div>
          
          {subscriptionStatus === 'no_subscription' && !isLocalMode() &&
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <p role='button' className='text-sm text-amber-500 hidden sm:block cursor-pointer' onClick={() => setBillingModalOpen(true)}></p>
                </TooltipTrigger>
                <TooltipContent>
                  <p>The free tier is severely limited by the amount of usage. Upgrade to experience the full power of Helium AI.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          }
        </div>
        
        {subscriptionStatus === 'no_subscription' && !isLocalMode() &&
          <div className='sm:hidden absolute -bottom-8 left-0 right-0 flex justify-center'>
            <p className='text-xs text-amber-500 px-2 py-1'>
              Upgrade for better performance
            </p>
          </div>
        }
      </div>
    );
  },
);

MessageInput.displayName = 'MessageInput';