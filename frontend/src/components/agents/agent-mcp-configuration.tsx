import React from 'react';
import { MCPConfigurationNew } from './mcp/mcp-configuration-new';

interface AgentMCPConfigurationProps {
  configuredMCPs: any[];
  customMCPs: any[];
  onMCPChange: (updates: { configured_mcps: any[]; custom_mcps: any[] }) => void;
  agentId?: string;
  versionData?: {
    configured_mcps?: any[];
    custom_mcps?: any[];
    system_prompt?: string;
    agentpress_tools?: any;
  };
  saveMode?: 'direct' | 'callback';
  versionId?: string;
}

export const AgentMCPConfiguration: React.FC<AgentMCPConfigurationProps> = ({
  configuredMCPs,
  customMCPs,
  onMCPChange,
  agentId,
  versionData,
  saveMode = 'direct',
  versionId
}) => {
  const allMCPs = [
    ...(configuredMCPs || []),
    ...(customMCPs || []).map(customMcp => ({
      name: customMcp.name,
      qualifiedName: `custom_${customMcp.type || customMcp.customType}_${customMcp.name.replace(' ', '_').toLowerCase()}`,
      config: customMcp.config,
      enabledTools: customMcp.enabledTools,
      isCustom: true,
      customType: customMcp.type || customMcp.customType
    }))
  ];

  const handleConfigurationChange = (mcps: any[]) => {
    const configured = mcps.filter(mcp => !mcp.isCustom);
    const custom = mcps
      .filter(mcp => mcp.isCustom)
      .map(mcp => ({
        name: mcp.name,
        type: mcp.customType,
        customType: mcp.customType,
        config: mcp.config,
        enabledTools: mcp.enabledTools
      }));

    onMCPChange({
      configured_mcps: configured,
      custom_mcps: custom
    });
  };

  return (
    <MCPConfigurationNew
      configuredMCPs={allMCPs}
      onConfigurationChange={handleConfigurationChange}
      agentId={agentId}
      versionData={versionData}
      saveMode={saveMode}
      versionId={versionId}
    />
  );
}; 