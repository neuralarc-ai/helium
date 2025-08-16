'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Menu } from 'lucide-react';
import { useI18n } from '@/lib/i18n-clients';
import {
  ChatInput,
  ChatInputHandles,
} from '@/components/thread/chat-input/chat-input';
import {
  BillingError,
} from '@/lib/api';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSidebar } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useBillingError } from '@/hooks/useBillingError';
import { BillingErrorAlert } from '@/components/billing/usage-limit-alert';
import { useAccounts } from '@/hooks/use-accounts';
import { useInitiateAgentWithInvalidation } from '@/hooks/react-query/dashboard/use-initiate-agent';
import { ModalProviders } from '@/providers/modal-providers';
import { useAgents } from '@/hooks/react-query/agents/use-agents';
import { cn } from '@/lib/utils';
import { useModal } from '@/hooks/use-modal-store';
import { useThreadQuery } from '@/hooks/react-query/threads/use-threads';
import { normalizeFilenameToNFC } from '@/lib/utils/unicode';
import { useAuth } from '@/components/AuthProvider';

const PENDING_PROMPT_KEY = 'pendingAgentPrompt';

export function DashboardContent() {
  const [inputValue, setInputValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [autoSubmit, setAutoSubmit] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string | undefined>();
  const [initiatedThreadId, setInitiatedThreadId] = useState<string | null>(null);
  const { billingError, handleBillingError, clearBillingError } =
    useBillingError();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isMobile = useIsMobile();
  const { setOpenMobile } = useSidebar();
  const { data: accounts } = useAccounts();
  const personalAccount = accounts?.find((account) => account.personal_account);
  const chatInputRef = useRef<ChatInputHandles>(null);
  const initiateAgentMutation = useInitiateAgentWithInvalidation();
  const { onOpen } = useModal();
  const { user } = useAuth();
  const firstName =
    user?.user_metadata?.first_name ||
    user?.user_metadata?.name?.split(' ')[0] ||
    user?.email?.split('@')[0] ||
    'there';

  const { t, currentLanguage } = useI18n();
  const [greeting, setGreeting] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Update greeting when language changes or time changes
  useEffect(() => {
    console.log('Interface language changed to:', currentLanguage);
    
    const updateGreeting = () => {
      const hour = new Date().getHours();
      let greetingKey = '';
      
      // Determine the appropriate greeting based on time of day
      if (hour < 12) {
        greetingKey = 'dashboard.goodMorning';
      } else if (hour < 18) {
        greetingKey = 'dashboard.goodAfternoon';
      } else {
        greetingKey = 'dashboard.goodEvening';
      }
      
      // Define greetings for all available languages
      const greetings: Record<string, Record<string, string>> = {
        'dashboard.goodMorning': {
          en: 'Good Morning!',
          es: '¡Buenos días!',
          fr: 'Bonjour!',
          de: 'Guten Morgen!',
          zh: '早上好!',
          ja: 'おはようございます!',
          hi: 'सुप्रभात!',
          ar: 'صباح الخير!',
          ru: 'Доброе утро!',
          pt: 'Bom dia!',
          it: 'Buongiorno!',
          ko: '안녕하세요! (아침)',
          ur: 'صبح بخیر!',
          bn: 'শুভ সকাল!',
          ms: 'Selamat pagi!',
          en_GB: 'Good Morning!'
        },
        'dashboard.goodAfternoon': {
          en: 'Good Afternoon!',
          es: '¡Buenas tardes!',
          fr: 'Bon après-midi!',
          de: 'Guten Tag!',
          zh: '下午好!',
          ja: 'こんにちは!',
          hi: 'नमस्ते!',
          ar: 'مساء الخير!',
          ru: 'Добрый день!',
          pt: 'Boa tarde!',
          it: 'Buon pomeriggio!',
          ko: '안녕하세요! (오후)',
          ur: 'سہ پہر بخیر!',
          bn: 'শুভ অপরাহ্ন!',
          ms: 'Selamat petang!',
          en_GB: 'Good Afternoon!'
        },
        'dashboard.goodEvening': {
          en: 'Good Evening!',
          es: '¡Buenas noches!',
          fr: 'Bonsoir!',
          de: 'Guten Abend!',
          zh: '晚上好!',
          ja: 'こんばんは!',
          hi: 'शुभ संध्या!',
          ar: 'مساء الخير!',
          ru: 'Добрый вечер!',
          pt: 'Boa noite!',
          it: 'Buonasera!',
          ko: '안녕하세요! (저녁)',
          ur: 'شام بخیر!',
          bn: 'শুভ সন্ধ্যা!',
          ms: 'Selamat malam!',
          en_GB: 'Good Evening!'
        }
      };

      // Get the greeting in the current interface language, fallback to English
      const greetingText = greetings[greetingKey]?.[currentLanguage] || 
                          greetings[greetingKey]?.['en'] || 
                          'Hello!';
      
      setGreeting(greetingText);
    };
    
    // Update greeting immediately
    updateGreeting();
    
    // Add storage event listener to detect language changes in other tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'preferredLanguage' && e.newValue && e.newValue !== currentLanguage) {
        console.log('Detected language change from storage event:', e.newValue);
        setRefreshKey(prev => prev + 1);
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Update greeting every minute to handle time changes
    const intervalId = setInterval(updateGreeting, 60000);
    
    // Cleanup on unmount
    return () => {
      clearInterval(intervalId);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [t, currentLanguage]); // Re-run effect when language changes

  // Fetch agents to get the selected agent's name
  const { data: agentsResponse } = useAgents({
    limit: 100,
    sort_by: 'name',
    sort_order: 'asc'
  });

  const agents = agentsResponse?.agents || [];
  const selectedAgent = selectedAgentId
    ? agents.find(agent => agent.agent_id === selectedAgentId)
    : null;
  const displayName = selectedAgent?.name || 'Helium';
  const agentAvatar = selectedAgent?.avatar;
  const isSunaAgent = selectedAgent?.metadata?.is_suna_default || false;

  const threadQuery = useThreadQuery(initiatedThreadId || '');

  useEffect(() => {
    const agentIdFromUrl = searchParams.get('agent_id');
    if (agentIdFromUrl && agentIdFromUrl !== selectedAgentId) {
      setSelectedAgentId(agentIdFromUrl);
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('agent_id');
      router.replace(newUrl.pathname + newUrl.search, { scroll: false });
    }
  }, [searchParams, selectedAgentId, router]);

  useEffect(() => {
    if (threadQuery.data && initiatedThreadId) {
      const thread = threadQuery.data;
      console.log('Thread data received:', thread);
      if (thread.project_id) {
        router.push(`/projects/${thread.project_id}/thread/${initiatedThreadId}`);
      } else {
        router.push(`/agents/${initiatedThreadId}`);
      }
      setInitiatedThreadId(null);
    }
  }, [threadQuery.data, initiatedThreadId, router]);

  const handleSubmit = async (
    message: string,
    options?: {
      model_name?: string;
      enable_thinking?: boolean;
      reasoning_effort?: string;
      stream?: boolean;
      enable_context_manager?: boolean;
    },
  ) => {
    if (
      (!message.trim() && !chatInputRef.current?.getPendingFiles().length) ||
      isSubmitting
    )
      return;

    setIsSubmitting(true);

    try {
      const files = chatInputRef.current?.getPendingFiles() || [];
      localStorage.removeItem(PENDING_PROMPT_KEY);

      const formData = new FormData();
      formData.append('prompt', message);

      // Add selected agent if one is chosen
      if (selectedAgentId) {
        formData.append('agent_id', selectedAgentId);
      }

      files.forEach((file, index) => {
        const normalizedName = normalizeFilenameToNFC(file.name);
        formData.append('files', file, normalizedName);
      });

      if (options?.model_name) formData.append('model_name', options.model_name);
      formData.append('enable_thinking', String(options?.enable_thinking ?? false));
      formData.append('reasoning_effort', options?.reasoning_effort ?? 'low');
      formData.append('stream', String(options?.stream ?? true));
      formData.append('enable_context_manager', String(options?.enable_context_manager ?? false));

      console.log('FormData content:', Array.from(formData.entries()));

      const result = await initiateAgentMutation.mutateAsync(formData);
      console.log('Agent initiated:', result);

      if (result.thread_id) {
        setInitiatedThreadId(result.thread_id);
      } else {
        throw new Error('Agent initiation did not return a thread_id.');
      }
      chatInputRef.current?.clearPendingFiles();
    } catch (error: any) {
      console.error('Error during submission process:', error);
      // DISABLED: Billing error handling for production
      // if (error instanceof BillingError) {
      //   console.log('Handling BillingError:', error.detail);
      //   onOpen("paymentRequiredDialog");
      // }
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      const pendingPrompt = localStorage.getItem(PENDING_PROMPT_KEY);

      if (pendingPrompt) {
        setInputValue(pendingPrompt);
        setAutoSubmit(true);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (autoSubmit && inputValue && !isSubmitting) {
      const timer = setTimeout(() => {
        handleSubmit(inputValue);
        setAutoSubmit(false);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [autoSubmit, inputValue, isSubmitting]);

  return (
    <>
      <ModalProviders />
      <div className="flex flex-col h-screen w-full">
        {isMobile && (
          <div className="absolute top-4 left-4 z-10">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setOpenMobile(true)}
                >
                  <Menu className="h-4 w-4" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Open menu</TooltipContent>
            </Tooltip>
          </div>
        )}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[650px] max-w-[90%]">
          <div className="flex flex-col items-center text-center w-full">
            <p className="tracking-tight text-4xl font-normal text-muted-foreground/80 mt-2">
              {greeting}{' '}
              <span 
                className="font-semibold text-foreground/80"
              >
                {firstName}
              </span>
            </p>
          </div>
          <div className={cn(
            "w-full mb-2",
            "max-w-full",
            "sm:max-w-3xl"
          )}>
            <ChatInput
              ref={chatInputRef}
              onSubmit={handleSubmit}
              loading={isSubmitting}
              placeholder="Assign tasks or ask anything..."
              value={inputValue}
              onChange={setInputValue}
              hideAttachments={false}
              selectedAgentId={selectedAgentId}
              onAgentSelect={setSelectedAgentId}
              enableAdvancedConfig={true}
              onConfigureAgent={(agentId) => router.push(`/agents/config/${agentId}`)}
            />
          </div>
        </div>
        <BillingErrorAlert
          message={billingError?.message}
          currentUsage={billingError?.currentUsage}
          limit={billingError?.limit}
          accountId={personalAccount?.account_id}
          onDismiss={clearBillingError}
          isOpen={!!billingError}
        />
      </div>
    </>
  );
}
