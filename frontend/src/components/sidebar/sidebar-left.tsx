'use client';

import * as React from 'react';
import Link from 'next/link';
import { Bot, Menu, Plus, Plug, ChevronRight, Lightbulb, X } from 'lucide-react';
import Image from 'next/image';

import { NavAgents } from '@/components/sidebar/nav-agents';
import { NavUserWithTeams } from '@/components/sidebar/nav-user-with-teams';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useIsMobile } from '@/hooks/use-mobile';
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';
import { usePathname, useSearchParams } from 'next/navigation';
import { useFeatureFlags } from '@/lib/feature-flags';
import { useCreateNewAgent } from '@/hooks/react-query/agents/use-agents';
import { Button } from '../ui/button';
import { useRouter } from 'next/navigation';
import { KnowledgeBaseDialog } from '@/components/thread/knowledge-based/knowledge-base-dialog';
import { GlobalKnowledgeBaseDialog } from '@/components/thread/knowledge-based/global-knowledge-base-dialog';

// Helper function to extract threadId from pathname
const extractThreadIdFromPathname = (pathname: string): string | null => {
  // Match patterns like /projects/{projectId}/thread/{threadId}
  const threadMatch = pathname.match(/\/projects\/[^\/]+\/thread\/([^\/]+)/);
  if (threadMatch) {
    return threadMatch[1];
  }
  
  // Match patterns like /share/{threadId}
  const shareMatch = pathname.match(/\/share\/([^\/]+)/);
  if (shareMatch) {
    return shareMatch[1];
  }
  
  return null;
};

export function SidebarLeft({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const { state, setOpen, setOpenMobile } = useSidebar();
  const isMobile = useIsMobile();
  const router = useRouter();
  const [user, setUser] = useState<{
    name: string;
    email: string;
    avatar: string;
  }>({
    name: 'Loading...',
    email: 'loading@example.com',
    avatar: '',
  });
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [showKnowledgeBase, setShowKnowledgeBase] = useState(false);

  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { flags, loading: flagsLoading } = useFeatureFlags(['custom_agents', 'agent_marketplace', 'knowledge_base']);
  const customAgentsEnabled = flags.custom_agents;
  const marketplaceEnabled = flags.agent_marketplace;
  const knowledgeBaseEnabled = flags.knowledge_base;
  const createNewAgentMutation = useCreateNewAgent();
  const [showNewAgentDialog, setShowNewAgentDialog] = useState(false);

  // Extract threadId from current pathname
  const currentThreadId = extractThreadIdFromPathname(pathname);

  const openKnowledgeBase = () => {
    setShowKnowledgeBase(true);
  };

  const handleUserUpdate = (updatedUser: { name: string; email: string; avatar: string }) => {
    setUser(updatedUser);
  };

  
  useEffect(() => {
    const fetchUserData = async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();

      if (data.user) {
        setUser({
          name:
            data.user.user_metadata?.name ||
            data.user.email?.split('@')[0] ||
            'User',
          email: data.user.email || '',
          avatar: data.user.user_metadata?.avatar_url || '',
        });
      }
    };

    fetchUserData();
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'b') {
        event.preventDefault();
        setOpen(!state.startsWith('expanded'));
        window.dispatchEvent(
          new CustomEvent('sidebar-left-toggled', {
            detail: { expanded: !state.startsWith('expanded') },
          }),
        );
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state, setOpen]);


  const handleCreateNewAgent = () => {
    createNewAgentMutation.mutate();
  };

  return (
    <Sidebar
      collapsible="icon"
      className="border-r-0 bg-background/95 backdrop-blur-sm [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']"
      {...props}
    >
      <SidebarHeader className="px-2 py-2">
        <div className="flex h-[40px] items-center px-1 relative">
          <Link href="/dashboard">
            <Image src="/helium-logo.png" alt="Helium Logo" width={30} height={30} />
          </Link>
          {state !== 'collapsed' && (
            <div className="ml-2 transition-all duration-200 ease-in-out whitespace-nowrap">
            </div>
          )}
          <div className="ml-auto flex items-center gap-2">
            {!isMobile && state !== 'collapsed' && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <SidebarTrigger className="h-8 w-8" />
                </TooltipTrigger>
                <TooltipContent>Toggle sidebar (CMD+B)</TooltipContent>
              </Tooltip>
            )}
          
   {isMobile && (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={() => setOpenMobile(false)}
          className="h-6 cursor-pointer w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 flex items-center justify-center rounded-md hover:bg-accent transition-all duration-300 ease-in-out"
        >
          <X className="h-5 w-5 sm:h-5 sm:w-5 md:h-4 md:w-4 transition-all duration-300 ease-in-out" />
        </button>
      </TooltipTrigger>
      <TooltipContent>Close sidebar</TooltipContent>
    </Tooltip>
  )}

          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="[&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
        <SidebarGroup>
          <Link href="/dashboard">
            <SidebarMenuButton className={cn({
              'bg-accent text-accent-foreground font-medium': pathname === '/dashboard',
            })}>
              <Plus className="h-4 w-4 mr-1 cursor-pointer" />
              <span className="flex items-center justify-between w-full">
                New Task
              </span>
            </SidebarMenuButton>
          </Link>
          {!isMobile && state === 'collapsed' && (
            <div className="mt-2 flex justify-center">
              <Tooltip>
                <TooltipTrigger asChild>
                  <SidebarTrigger className="h-8 w-8 hover:bg-accent hover:text-accent-foreground cursor-pointer" />
                </TooltipTrigger>
                <TooltipContent side="right">Expand sidebar (CMD+B)</TooltipContent>
              </Tooltip>
            </div>
          )}
          
          {!flagsLoading && customAgentsEnabled && (
            <SidebarMenu>
              <Collapsible
                defaultOpen={pathname?.includes('/agents')}
                className="group/collapsible"
              >
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      tooltip="Agents"
                    >
                      <Bot className="h-4 w-4 mr-1" />
                      <span>Agents</span>
                      <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton className={cn('pl-3', {
                          'bg-accent text-accent-foreground font-medium': pathname === '/agents' && searchParams.get('tab') === 'marketplace',
                        })} asChild>
                          <Link href="/agents?tab=marketplace">
                            <span>Explore</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton className={cn('pl-3', {
                          'bg-accent text-accent-foreground font-medium': pathname === '/agents' && (searchParams.get('tab') === 'my-agents' || searchParams.get('tab') === null),
                        })} asChild>
                          <Link href="/agents?tab=my-agents">
                            <span>My Agents</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton 
                          onClick={() => setShowNewAgentDialog(true)}
                          className="cursor-pointer pl-3"
                        >
                          <span>New Agent</span>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            </SidebarMenu>
          )}
          {!flagsLoading && customAgentsEnabled && (
            <Link href="/settings/credentials">
              <SidebarMenuButton className={cn({
                'bg-accent text-accent-foreground font-medium': pathname === '/settings/credentials',
              })}>
                <Plug className="h-4 w-4 mr-1" />
                <span className="flex items-center justify-between w-full">
                  Integrations
                </span>
              </SidebarMenuButton>
            </Link>
          )}
        </SidebarGroup>
        <NavAgents />
      </SidebarContent>
      <SidebarFooter>
        <div className={state === 'collapsed' && !isMobile ? 'w-full flex flex-col items-center' : 'w-full flex flex-col items-start'}>
          {/* Knowledge Base button: always show if feature is enabled */}
          {!flagsLoading && knowledgeBaseEnabled && (
            <Tooltip>
              <TooltipTrigger asChild className='w-full'>
                <button
  className={`h-5 w-full cursor-pointer flex items-center my-1 mx-3 rounded-sm flex-shrink-0 transition-colors ${isMobile ? 'justify-start' : (state === 'collapsed' ? 'justify-center my-3' : '')} ${state === 'collapsed' && !isMobile ? 'hover:bg-card' : ''}`}
  type="button"
  tabIndex={0}
  aria-label="Knowledge Base"
  onClick={() => {
    setOpen(true);
    setTimeout(() => { setShowKnowledgeBase(true); }, 100); // Show knowledge base after expanding
  }}
>
  <Lightbulb className="w-5 h-5" />
  {(isMobile || state !== 'collapsed') && (
    <span className="ml-2 text-sm font-medium whitespace-nowrap">Knowledge Base</span>
  )}
</button>
              </TooltipTrigger>
              <TooltipContent side="right">
                {currentThreadId 
                  ? "Knowledge Base" 
                  : "Knowledge Base"
                }
              </TooltipContent>
            </Tooltip>
          )}
          {/* Divider above NavUserWithTeams only when expanded */}
          {state !== 'collapsed' && <div className="w-full h-px bg-border my-2" />}
          <NavUserWithTeams user={user} />
        </div>
      </SidebarFooter>
      <SidebarRail />
      <AlertDialog open={showNewAgentDialog} onOpenChange={setShowNewAgentDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Create New Agent</AlertDialogTitle>
            <AlertDialogDescription>
              This will create a new agent with a default name and description.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleCreateNewAgent}>Create</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {!flagsLoading && knowledgeBaseEnabled && currentThreadId && (
        <KnowledgeBaseDialog
          threadId={currentThreadId}
          isOpen={showKnowledgeBase}
          onOpenChange={setShowKnowledgeBase}
        />
      )}
      {!flagsLoading && knowledgeBaseEnabled && !currentThreadId && (
        <GlobalKnowledgeBaseDialog
          isOpen={showKnowledgeBase}
          onOpenChange={setShowKnowledgeBase}
        />
      )}
    </Sidebar>
  );
}
