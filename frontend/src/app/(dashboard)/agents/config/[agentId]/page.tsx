'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, Save, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUpdateAgent } from '@/hooks/react-query/agents/use-agents';
import { useCreateAgentVersion, useActivateAgentVersion } from '@/hooks/react-query/agents/use-agent-versions';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getAgentAvatar } from '../../../../../lib/utils/get-agent-style';
import { AgentPreview } from '../../../../../components/agents/agent-preview';
import { AgentVersionSwitcher } from '@/components/agents/agent-version-switcher';
import { CreateVersionButton } from '@/components/agents/create-version-button';
import { useAgentVersionData } from '../../../../../hooks/use-agent-version-data';
import { useSearchParams } from 'next/navigation';
import { useAgentVersionStore } from '../../../../../lib/stores/agent-version-store';
import { cn } from '@/lib/utils';
import { AgentHeader, VersionAlert, AgentBuilderTab, ConfigurationTab } from '@/components/agents/config';
import { UpcomingRunsDropdown } from '@/components/agents/upcoming-runs-dropdown';
import { DEFAULT_AGENTPRESS_TOOLS } from '@/components/agents/tools';
import { useExportAgent } from '@/hooks/react-query/agents/use-agent-export-import';

interface FormData {
  name: string;
  description: string;
  system_prompt: string;
  agentpress_tools: any;
  configured_mcps: any[];
  custom_mcps: any[];
  is_default: boolean;
  avatar: string;
  avatar_color: string;
}

export default function AgentConfigurationPage() {
  const params = useParams();
  const agentId = params.agentId as string;
  const queryClient = useQueryClient();

  const { agent, versionData, isViewingOldVersion, isLoading, error } = useAgentVersionData({ agentId });
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const initialAccordion = searchParams.get('accordion');
  const { setHasUnsavedChanges } = useAgentVersionStore();
  
  const updateAgentMutation = useUpdateAgent();
  const createVersionMutation = useCreateAgentVersion();
  const activateVersionMutation = useActivateAgentVersion();
  const exportMutation = useExportAgent();

  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    system_prompt: '',
    agentpress_tools: DEFAULT_AGENTPRESS_TOOLS,
    configured_mcps: [],
    custom_mcps: [],
    is_default: false,
    avatar: '',
    avatar_color: '',
  });

  const [originalData, setOriginalData] = useState<FormData>(formData);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(tabParam === 'configuration' ? 'configuration' : 'agent-builder');
  const [isSaving, setIsSaving] = useState(false);

  // ... rest of the component code remains the same until the handleActivateVersion function ...

  const handleActivateVersion = useCallback(async (versionId: string) => {
    try {
      await activateVersionMutation.mutateAsync({ agentId, versionId });
    } catch (error) {
      toast.error('Failed to activate version');
    }
  }, [agentId, activateVersionMutation]);

  const handleExport = useCallback(() => {
    if (!agentId) return;
    exportMutation.mutate(agentId);
  }, [agentId, exportMutation]);

  // Define displayData and currentStyle before the JSX return
  const displayData = isViewingOldVersion && versionData ? {
    name: agent?.name || '',
    description: agent?.description || '',
    system_prompt: versionData.system_prompt || '',
    agentpress_tools: versionData.agentpress_tools || DEFAULT_AGENTPRESS_TOOLS,
    configured_mcps: versionData.configured_mcps || [],
    custom_mcps: versionData.custom_mcps || [],
    is_default: agent?.is_default || false,
    avatar: agent?.avatar || '',
    avatar_color: agent?.avatar_color || '',
  } : formData;

  const currentStyle = displayData.avatar && displayData.avatar_color
    ? { avatar: displayData.avatar, color: displayData.avatar_color }
    : getAgentAvatar(agentId);

  const previewAgent = {
    ...agent,
    ...displayData,
    agent_id: agentId,
  };

  useEffect(() => {
    if (isViewingOldVersion && activeTab === 'agent-builder') {
      setActiveTab('configuration');
    }
  }, [isViewingOldVersion, activeTab]);

  // ... rest of the component code remains the same ...
}