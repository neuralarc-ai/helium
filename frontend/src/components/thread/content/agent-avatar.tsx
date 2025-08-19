'use client';

import React from 'react';
import { useAgent } from '@/hooks/react-query/agents/use-agents';
import { HeliumLogo } from '@/components/sidebar/helium-logo';
import { Skeleton } from '@/components/ui/skeleton';

interface AgentAvatarProps {
  agentId?: string;
  size?: number;
  className?: string;
  fallbackName?: string;
}

export const AgentAvatar: React.FC<AgentAvatarProps> = ({ 
  agentId, 
  size = 16, 
  className = "", 
  fallbackName = "Suna" 
}) => {
  // Only fetch agent data if agentId is provided
  const { data: agent, isLoading } = useAgent(agentId || '');

  // Show loading skeleton only when we're actually loading data
  if (isLoading && agentId) {
    return (
      <Skeleton 
        className={`rounded-full ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  // If no agentId provided or agent not found, use fallback
  if (!agentId || !agent) {
    return <HeliumLogo size={size} />;
  }

  const isSuna = agent?.metadata?.is_suna_default;
  if (isSuna) {
    return <HeliumLogo size={size} />;
  }

  if (agent?.profile_image_url) {
    return (
      <img 
        src={agent.profile_image_url} 
        alt={agent.name || fallbackName}
        className={`rounded-full object-cover ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return <HeliumLogo size={size} />;
};

interface AgentNameProps {
  agentId?: string;
  fallback?: string;
  className?: string;
}

export const AgentName: React.FC<AgentNameProps> = ({ 
  agentId, 
  fallback = "Suna",
  className = ""
}) => {
  // Only fetch agent data if agentId is provided
  const { data: agent, isLoading } = useAgent(agentId || '');

  if (isLoading && agentId) {
    return <Skeleton className={`h-4 w-24 ${className}`} />;
  }

  // If no agentId provided or agent not found, use fallback
  if (!agentId || !agent) {
    return <span className={className}>{fallback}</span>;
  }

  return <span className={className}>{agent.name || fallback}</span>;
};