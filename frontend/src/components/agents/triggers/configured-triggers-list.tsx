"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Edit, 
  Trash2, 
  ExternalLink, 
  MessageSquare, 
  Webhook, 
  Clock, 
  Mail,
  Github,
  Gamepad2,
  Activity,
  Copy
} from 'lucide-react';
import { TriggerConfiguration } from './types';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { getTriggerIcon } from './utils';
import { truncateString } from '@/lib/utils';

interface ConfiguredTriggersListProps {
  triggers: TriggerConfiguration[];
  onEdit: (trigger: TriggerConfiguration) => void;
  onRemove: (trigger: TriggerConfiguration) => void;
  onToggle: (trigger: TriggerConfiguration) => void;
  isLoading?: boolean;
}

const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
  } catch (err) {
    console.error('Failed to copy text: ', err);
  }
};

const getCronDescription = (cron: string): string => {
  const cronDescriptions: Record<string, string> = {
    '0 9 * * *': 'Daily at 9:00 AM',
    '0 18 * * *': 'Daily at 6:00 PM',
    '0 9 * * 1-5': 'Weekdays at 9:00 AM',
    '0 10 * * 1-5': 'Weekdays at 10:00 AM',
    '0 9 * * 1': 'Every Monday at 9:00 AM',
    '0 9 1 * *': 'Monthly on the 1st at 9:00 AM',
    '0 9 1 1 *': 'Yearly on Jan 1st at 9:00 AM',
    '0 */2 * * *': 'Every 2 hours',
    '*/30 * * * *': 'Every 30 minutes',
    '0 0 * * *': 'Daily at midnight',
    '0 12 * * *': 'Daily at noon',
    '0 9 * * 0': 'Every Sunday at 9:00 AM',
    '0 9 * * 6': 'Every Saturday at 9:00 AM',
  };

  return cronDescriptions[cron] || cron;
};

export const ConfiguredTriggersList: React.FC<ConfiguredTriggersListProps> = ({
  triggers,
  onEdit,
  onRemove,
  onToggle,
  isLoading = false,
}) => {
  return (
    <TooltipProvider>
      <div className="space-y-2">
        {triggers.map((trigger) => (
          <div
            key={trigger.trigger_id}
            className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center space-x-4 flex-1">
              <div className="p-2 rounded-lg bg-muted border">
                {getTriggerIcon(trigger.trigger_type)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <h4 className="text-sm font-medium truncate">
                    {trigger.name}
                  </h4>
                  <Badge 
                    variant={trigger.is_active ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {trigger.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                
                {trigger.description && (
                  <p className="text-xs text-muted-foreground truncate">
                    {truncateString(trigger.description, 50)}
                  </p>
                )}
                {trigger.trigger_type === 'schedule' && trigger.config && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {trigger.config.execution_type === 'agent' && trigger.config.agent_prompt && (
                      <p>Prompt: {truncateString(trigger.config.agent_prompt, 40)}</p>
                    )}
                    {trigger.config.execution_type === 'workflow' && trigger.config.workflow_id && (
                      <p>Workflow: {trigger.config.workflow_id}</p>
                    )}
                  </div>
                )}
                {trigger.webhook_url && (
                  <div className="flex items-center space-x-2 mt-2">
                    <code className="text-xs bg-muted px-2 py-1 rounded font-mono max-w-xs truncate">
                      {trigger.webhook_url}
                    </code>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={() => copyToClipboard(trigger.webhook_url!)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Copy webhook URL</p>
                      </TooltipContent>
                    </Tooltip>
                    {trigger.webhook_url.startsWith('http') && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={() => window.open(trigger.webhook_url, '_blank')}
                          >
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Open webhook URL</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center">
                    <Switch
                      checked={trigger.is_active}
                      onCheckedChange={() => onToggle(trigger)}
                      disabled={isLoading}
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{trigger.is_active ? 'Disable' : 'Enable'} trigger</p>
                </TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onEdit(trigger)}
                    className="h-8 w-8 p-0"
                    disabled={isLoading}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Edit trigger</p>
                </TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onRemove(trigger)}
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    disabled={isLoading}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Delete trigger</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        ))}
      </div>
    </TooltipProvider>
  );
}; 