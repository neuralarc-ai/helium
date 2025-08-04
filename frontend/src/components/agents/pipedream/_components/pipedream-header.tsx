import React from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Sparkles } from 'lucide-react';
import { AgentSelector } from '../../../thread/chat-input/agent-selector';
import type { PipedreamHeaderProps } from '../types';

export const PipedreamHeader: React.FC<PipedreamHeaderProps> = ({
  search,
  onSearchChange,
  showAgentSelector,
  currentAgentId,
  onAgentChange,
  agentName,
  isSunaAgent
}) => {
  return (
    <div className="flex-shrink-0 border-b bg-background px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                {agentName ? `Integrations for ${agentName}` : 'Integrations'}
              </h1>
              <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200 dark:border-blue-900 dark:bg-blue-900/20 dark:text-blue-400 text-xs">
                <Sparkles className="h-3 w-3" />
                New
              </Badge>
            </div>
            {agentName && (
              <p className="text-sm text-muted-foreground mt-1">
                Configure integrations for your agent
              </p>
            )}
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search 2700+ apps..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 h-9 focus:border-primary/50 focus:ring-primary/20 rounded-lg text-sm"
          />
        </div>
        {showAgentSelector && (
          <div className="flex items-center gap-2">
            <AgentSelector
              selectedAgentId={currentAgentId}
              onAgentSelect={onAgentChange}
              isSunaAgent={isSunaAgent}
            />
          </div>
        )}
      </div>
    </div>
  );
}; 