import React from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Wrench as ToolIcon } from 'lucide-react';
import { useChatTools } from '@/hooks/use-chat-tools';

interface ToolSelectorProps {
  agentId?: string;
  profileId?: string;
  onToolSelect: (toolName: string) => void;
}

export const ToolSelector: React.FC<ToolSelectorProps> = ({
  agentId,
  profileId,
  onToolSelect,
}) => {
  const { data: tools, isLoading } = useChatTools(agentId, profileId);

  if (isLoading || !tools?.length) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <ToolIcon className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="end">
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Available Tools</h4>
          <div className="max-h-60 overflow-y-auto">
            {tools.map((tool) => (
              <div
                key={tool.id}
                className="p-2 text-sm rounded hover:bg-accent cursor-pointer"
                onClick={() => onToolSelect(tool.name)}
              >
                <div className="font-medium">{tool.name}</div>
                <div className="text-xs text-muted-foreground line-clamp-1">
                  {tool.description}
                </div>
              </div>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
