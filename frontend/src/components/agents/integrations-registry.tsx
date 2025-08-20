'use client';
import React from 'react';
import { PipedreamRegistry } from './pipedream/pipedream-registry';

interface IntegrationsRegistryProps {
  showAgentSelector?: boolean;
  selectedAgentId?: string;
  onAgentChange?: (agentId: string | undefined) => void;
  onToolsSelected?: (profileId: string, selectedTools: string[], appName: string, appSlug: string) => void;
  onClose?: () => void;
  onAppSelected?: (app: { app_slug: string; app_name: string }) => void;
  mode?: 'full' | 'simple' | 'profile-only';
}

export const IntegrationsRegistry: React.FC<IntegrationsRegistryProps> = ({
  showAgentSelector = true,
  selectedAgentId,
  onAgentChange,
  onToolsSelected,
  onAppSelected,
  onClose,
  mode = 'full'
}) => {
  return (
    <PipedreamRegistry
      showAgentSelector={showAgentSelector}
      selectedAgentId={selectedAgentId}
      onAgentChange={onAgentChange}
      onToolsSelected={onToolsSelected}
      onAppSelected={onAppSelected}
      onClose={onClose}
      mode={mode}
    />
  );
}; 