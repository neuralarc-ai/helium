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
import { useAutosave } from '@/hooks/use-autosave';
import { AutosaveIndicator } from '@/components/ui/autosave-indicator';
import { cn } from '@/lib/utils';

import { AgentHeader, VersionAlert, AgentBuilderTab, ConfigurationTab } from '@/components/agents/config';
import { UpcomingRunsDropdown } from '@/components/agents/upcoming-runs-dropdown';

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

  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    system_prompt: '',
    agentpress_tools: {},
    configured_mcps: [],
    custom_mcps: [],
    is_default: false,
    avatar: '',
    avatar_color: '',
  });

  const [originalData, setOriginalData] = useState<FormData>(formData);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  // Initialize active tab from URL param, default to 'agent-builder'
  const initialTab = tabParam === 'configuration' ? 'configuration' : 'agent-builder';
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    if (!agent) return;
    let configSource = agent;
    if (versionData) {
      configSource = versionData;
    } 
    else if (agent.current_version) {
      configSource = agent.current_version;
    }
    
    const initialData: FormData = {
      name: agent.name || '',
      description: agent.description || '',
      system_prompt: configSource.system_prompt || '',
      agentpress_tools: configSource.agentpress_tools || {},
      configured_mcps: configSource.configured_mcps || [],
      custom_mcps: configSource.custom_mcps || [],
      is_default: agent.is_default || false,
      avatar: agent.avatar || '',
      avatar_color: agent.avatar_color || '',
    };
    
    setFormData(initialData);
    setOriginalData(initialData);
  }, [agent, versionData]);

  // Autosave callback function
  const handleAutosave = useCallback(async (data: FormData) => {
    if (!agent || isViewingOldVersion) return;
    
    const isSunaAgent = agent?.metadata?.is_suna_default || false;
    const restrictions = agent?.metadata?.restrictions || {};
    
    if (isSunaAgent) {
      if (restrictions.name_editable === false && data.name !== originalData.name) {
        throw new Error("Suna's name cannot be modified.");
      }

      if (restrictions.tools_editable === false && JSON.stringify(data.agentpress_tools) !== JSON.stringify(originalData.agentpress_tools)) {
        throw new Error("Suna's default tools cannot be modified.");
      }
    }
    
    const normalizedCustomMcps = (data.custom_mcps || []).map(mcp => ({
      name: mcp.name || 'Unnamed MCP',
      type: mcp.type || mcp.customType || 'sse',
      config: mcp.config || {},
      enabledTools: Array.isArray(mcp.enabledTools) ? mcp.enabledTools : [],
    }));
    
    const newVersion = await createVersionMutation.mutateAsync({
      agentId,
      data: {
        system_prompt: isSunaAgent ? '' : data.system_prompt,
        configured_mcps: data.configured_mcps,
        custom_mcps: normalizedCustomMcps,
        agentpress_tools: data.agentpress_tools,
        description: 'Autosave'
      }
    });
    
    const updatedAgent = await updateAgentMutation.mutateAsync({
      agentId,
      name: data.name,
      description: data.description,
      is_default: data.is_default,
      avatar: data.avatar,
      avatar_color: data.avatar_color
    });
    
    queryClient.setQueryData(['agent', agentId], {
      ...updatedAgent,
      current_version: newVersion,
      current_version_id: newVersion.versionId
    });
    
    // Update original data to reflect successful save
    setOriginalData(data);
  }, [agent, originalData, isViewingOldVersion, agentId, createVersionMutation, updateAgentMutation, queryClient]);

  // Use autosave hook
  const { status: autosaveStatus, hasUnsavedChanges, lastSaveTime, saveNow } = useAutosave({
    data: formData,
    originalData,
    onSave: handleAutosave,
    delay: 2000, // 2 seconds delay
    enabled: !isViewingOldVersion && !!agent
  });

  // Update the version store with unsaved changes status
  useEffect(() => {
    setHasUnsavedChanges(hasUnsavedChanges);
  }, [hasUnsavedChanges, setHasUnsavedChanges]);

  const handleFieldChange = useCallback((field: keyof FormData, value: any) => {
    if (isViewingOldVersion) {
      toast.error('Cannot edit old versions. Please activate this version first to make changes.');
      return;
    }
    setFormData(prev => ({ ...prev, [field]: value }));
  }, [isViewingOldVersion]);

  const handleMCPChange = useCallback((updates: { configured_mcps: any[]; custom_mcps: any[] }) => {
    if (isViewingOldVersion) {
      toast.error('Cannot edit old versions. Please activate this version first to make changes.');
      return;
    }
    setFormData(prev => ({
      ...prev,
      configured_mcps: updates.configured_mcps,
      custom_mcps: updates.custom_mcps
    }));
  }, [isViewingOldVersion]);

  const handleStyleChange = useCallback((emoji: string, color: string) => {
    if (isViewingOldVersion) {
      toast.error('Cannot edit old versions. Please activate this version first to make changes.');
      return;
    }
    setFormData(prev => ({
      ...prev,
      avatar: emoji,
      avatar_color: color
    }));
  }, [isViewingOldVersion]);

  const handleActivateVersion = useCallback(async (versionId: string) => {
    try {
      await activateVersionMutation.mutateAsync({ agentId, versionId });
    } catch (error) {
      toast.error('Failed to activate version');
    }
  }, [agentId, activateVersionMutation]);

  useEffect(() => {
    if (isViewingOldVersion && activeTab === 'agent-builder') {
      setActiveTab('configuration');
    }
  }, [isViewingOldVersion, activeTab]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Alert variant="destructive" className="max-w-md">
          <AlertDescription>
            {error.message || 'Failed to load agent configuration'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading agent configuration...</p>
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Alert className="max-w-md">
          <AlertDescription>Agent not found</AlertDescription>
        </Alert>
      </div>
    );
  }

  const displayData = isViewingOldVersion && versionData ? {
    name: agent?.name || '',
    description: agent?.description || '',
    system_prompt: versionData.system_prompt || '',
    agentpress_tools: versionData.agentpress_tools || {},
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

  return (
    <div className="h-screen flex flex-col bg-background">
      <div className="flex-1 flex overflow-hidden">
        <div className="hidden lg:flex w-full h-full">
          <div className="w-1/2 border-r border-border/40 bg-background h-full flex flex-col">
            <div className="h-full flex flex-col">
              <div className="flex-shrink-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      {!agent?.metadata?.is_suna_default && (
                        <AgentVersionSwitcher
                          agentId={agentId}
                          currentVersionId={agent?.current_version_id}
                          currentFormData={{
                            system_prompt: formData.system_prompt,
                            configured_mcps: formData.configured_mcps,
                            custom_mcps: formData.custom_mcps,
                            agentpress_tools: formData.agentpress_tools
                          }}
                        />
                      )}
                      <CreateVersionButton
                        agentId={agentId}
                        currentFormData={{
                          system_prompt: formData.system_prompt,
                          configured_mcps: formData.configured_mcps,
                          custom_mcps: formData.custom_mcps,
                          agentpress_tools: formData.agentpress_tools
                        }}
                        hasChanges={hasUnsavedChanges && !isViewingOldVersion}
                        onVersionCreated={() => {
                          setOriginalData(formData);
                        }}
                      />
                      <UpcomingRunsDropdown agentId={agentId} />
                    </div>
                    <div className="flex items-center gap-2">
                      {!isViewingOldVersion && (
                        <AutosaveIndicator
                          status={autosaveStatus}
                          lastSaveTime={lastSaveTime}
                        />
                      )}
                    </div>
                  </div>
                  {isViewingOldVersion && (
                    <VersionAlert
                      versionData={versionData}
                      isActivating={activateVersionMutation.isPending}
                      onActivateVersion={handleActivateVersion}
                    />
                  )}
                  <AgentHeader
                    agentId={agentId}
                    displayData={displayData}
                    currentStyle={currentStyle}
                    activeTab={activeTab}
                    isViewingOldVersion={isViewingOldVersion}
                    onFieldChange={handleFieldChange}
                    onStyleChange={handleStyleChange}
                    onTabChange={setActiveTab}
                    agentMetadata={agent?.metadata}
                  />
                </div>
              </div>
              <div className="flex-1 overflow-hidden">
                {agent?.metadata?.is_suna_default ? (
                  <div className="flex-1 h-full">
                    <ConfigurationTab
                      agentId={agentId}
                      displayData={displayData}
                      versionData={versionData}
                      isViewingOldVersion={isViewingOldVersion}
                      onFieldChange={handleFieldChange}
                      onMCPChange={handleMCPChange}
                      initialAccordion={initialAccordion}
                      agentMetadata={agent?.metadata}
                    />
                  </div>
                ) : (
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
                    <TabsContent value="agent-builder" className="flex-1 h-0 m-0">
                      <AgentBuilderTab
                        agentId={agentId}
                        displayData={displayData}
                        currentStyle={currentStyle}
                        isViewingOldVersion={isViewingOldVersion}
                        onFieldChange={handleFieldChange}
                        onStyleChange={handleStyleChange}
                      />
                    </TabsContent>
                    <TabsContent value="configuration" className="flex-1 h-0 m-0">
                      <ConfigurationTab
                        agentId={agentId}
                        displayData={displayData}
                        versionData={versionData}
                        isViewingOldVersion={isViewingOldVersion}
                        onFieldChange={handleFieldChange}
                        onMCPChange={handleMCPChange}
                        initialAccordion={initialAccordion}
                        agentMetadata={agent?.metadata}
                      />
                    </TabsContent>
                  </Tabs>
                )}
              </div>
            </div>
          </div>
          <div className="w-1/2 bg-muted/30 overflow-y-auto">
            <div className="h-full">
              {previewAgent && <AgentPreview agent={previewAgent} agentMetadata={agent?.metadata} />}
            </div>
          </div>
        </div>
        <div className="lg:hidden flex flex-col h-full w-full">
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-shrink-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <AgentVersionSwitcher
                      agentId={agentId}
                      currentVersionId={agent?.current_version_id}
                      currentFormData={{
                        system_prompt: formData.system_prompt,
                        configured_mcps: formData.configured_mcps,
                        custom_mcps: formData.custom_mcps,
                        agentpress_tools: formData.agentpress_tools
                      }}
                    />
                    <CreateVersionButton
                      agentId={agentId}
                      currentFormData={{
                        system_prompt: formData.system_prompt,
                        configured_mcps: formData.configured_mcps,
                        custom_mcps: formData.custom_mcps,
                        agentpress_tools: formData.agentpress_tools
                      }}
                      hasChanges={hasUnsavedChanges && !isViewingOldVersion}
                      onVersionCreated={() => {
                        setOriginalData(formData);
                      }}
                    />
                    <UpcomingRunsDropdown agentId={agentId} />
                  </div>
                  <div className="flex items-center gap-2">
                    {!isViewingOldVersion && (
                      <AutosaveIndicator
                        status={autosaveStatus}
                        lastSaveTime={lastSaveTime}
                      />
                    )}
                  </div>
                </div>

                {isViewingOldVersion && (
                  <VersionAlert
                    versionData={versionData}
                    isActivating={activateVersionMutation.isPending}
                    onActivateVersion={handleActivateVersion}
                  />
                )}

                <AgentHeader
                  agentId={agentId}
                  displayData={displayData}
                  currentStyle={currentStyle}
                  activeTab={activeTab}
                  isViewingOldVersion={isViewingOldVersion}
                  onFieldChange={handleFieldChange}
                  onStyleChange={handleStyleChange}
                  onTabChange={setActiveTab}
                  agentMetadata={agent?.metadata}
                />
              </div>
            </div>

            <div className="flex-1 overflow-hidden">
              {agent?.metadata?.is_suna_default ? (
                <div className="flex-1 h-full">
                  <ConfigurationTab
                    agentId={agentId}
                    displayData={displayData}
                    versionData={versionData}
                    isViewingOldVersion={isViewingOldVersion}
                    onFieldChange={handleFieldChange}
                    onMCPChange={handleMCPChange}
                    initialAccordion={initialAccordion}
                    agentMetadata={agent?.metadata}
                  />
                </div>
              ) : (
                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
                  <TabsContent value="agent-builder" className="flex-1 h-0 m-0">
                    <AgentBuilderTab
                      agentId={agentId}
                      displayData={displayData}
                      currentStyle={currentStyle}
                      isViewingOldVersion={isViewingOldVersion}
                      onFieldChange={handleFieldChange}
                      onStyleChange={handleStyleChange}
                    />
                  </TabsContent>
                  <TabsContent value="configuration" className="flex-1 h-0 m-0">
                    <ConfigurationTab
                      agentId={agentId}
                      displayData={displayData}
                      versionData={versionData}
                      isViewingOldVersion={isViewingOldVersion}
                      onFieldChange={handleFieldChange}
                      onMCPChange={handleMCPChange}
                      initialAccordion={initialAccordion}
                      agentMetadata={agent?.metadata}
                    />
                  </TabsContent>
                </Tabs>
              )}
            </div>
          </div>

          <Drawer open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
            <DrawerTrigger asChild>
              <Button 
                className="fixed bottom-6 right-6 rounded-full shadow-lg h-14 w-14 bg-primary hover:bg-primary/90"
                size="icon"
              >
                <Eye className="h-5 w-5" />
              </Button>
            </DrawerTrigger>
            <DrawerContent className="h-[85vh]">
              <DrawerHeader className="border-b">
                <DrawerTitle>Agent Preview</DrawerTitle>
              </DrawerHeader>
              <div className="flex-1 overflow-y-auto p-4">
                {previewAgent && <AgentPreview agent={previewAgent} agentMetadata={agent?.metadata} />}
              </div>
            </DrawerContent>
          </Drawer>
        </div>
      </div>
    </div>
  );
} 