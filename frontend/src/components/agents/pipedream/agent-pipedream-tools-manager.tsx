'use client';

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { 
  Loader2, 
  Settings, 
  CheckCircle2, 
  XCircle, 
  Zap, 
  Info,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePipedreamToolsData } from '@/hooks/react-query/agents/use-pipedream-tools';
import type { PipedreamTool } from '@/hooks/react-query/agents/use-pipedream-tools';
import { ToolsLoader } from '../mcp/tools-loader';

interface AgentPipedreamToolsManagerProps {
  agentId: string;
  profileId: string;
  appName: string;
  profileName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onToolsUpdate?: (enabledTools: string[]) => void;
}

export const AgentPipedreamToolsManager: React.FC<AgentPipedreamToolsManagerProps> = ({
  agentId,
  profileId,
  appName,
  profileName,
  open,
  onOpenChange,
  onToolsUpdate
}) => {
  const { data, isLoading, error, isUpdating, refetch } = usePipedreamToolsData(agentId, profileId);
  const [localTools, setLocalTools] = useState<Record<string, boolean>>({});
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize local state when data loads
  React.useEffect(() => {
    if (data?.tools) {
      const toolsMap = data.tools.reduce((acc, tool) => {
        acc[tool.name] = tool.enabled;
        return acc;
      }, {} as Record<string, boolean>);
      setLocalTools(toolsMap);
      setHasChanges(false);
    }
  }, [data]);

  const enabledCount = useMemo(() => {
    return Object.values(localTools).filter(Boolean).length;
  }, [localTools]);

  const totalCount = data?.tools?.length || 0;

  const handleToolToggle = (toolName: string) => {
    setLocalTools(prev => {
      const newValue = !prev[toolName];
      const updated = { ...prev, [toolName]: newValue };
      
      // Check if there are changes compared to server data
      const serverTools = data?.tools?.reduce((acc, tool) => {
        acc[tool.name] = tool.enabled;
        return acc;
      }, {} as Record<string, boolean>) || {};
      
      const hasChanges = Object.keys(updated).some(key => updated[key] !== serverTools[key]);
      setHasChanges(hasChanges);
      
      return updated;
    });
  };

  const handleSelectAll = () => {
    if (!data?.tools) return;
    
    const allEnabled = data.tools.every(tool => localTools[tool.name]);
    const newState = data.tools.reduce((acc, tool) => {
      acc[tool.name] = !allEnabled;
      return acc;
    }, {} as Record<string, boolean>);
    
    setLocalTools(newState);
    setHasChanges(true);
  };

  const handleSave = () => {
    const enabledTools = Object.entries(localTools)
      .filter(([_, enabled]) => enabled)
      .map(([name]) => name);
    setHasChanges(false);

    if (onToolsUpdate) {
      onToolsUpdate(enabledTools);
    }
  };

  const handleCancel = () => {
    // Reset to server state
    if (data?.tools) {
      const serverState = data.tools.reduce((acc, tool) => {
        acc[tool.name] = tool.enabled;
        return acc;
      }, {} as Record<string, boolean>);
      setLocalTools(serverState);
      setHasChanges(false);
    }
  };

  if (error) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-destructive" />
              Error Loading Tools
            </DialogTitle>
            <DialogDescription>
              Failed to load {appName} tools for {profileName}
            </DialogDescription>
          </DialogHeader>
          
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              {error?.message || 'An unexpected error occurred while loading tools.'}
            </AlertDescription>
          </Alert>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Configure {appName} Tools
          </DialogTitle>
          <DialogDescription>
            Choose which {appName} tools are available to your agent via the "{profileName}" profile
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          {isLoading ? (
            <ToolsLoader toolCount={5} />
          ) : !data?.tools?.length ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Info className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  No tools available for this {appName} profile
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {enabledCount} of {totalCount} tools enabled
                      </span>
                      {hasChanges && (
                        <Badge variant="secondary" className="text-xs">
                          Unsaved changes
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Profile: {profileName}
                    </p>
                  </div>
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                  disabled={isUpdating}
                >
                  {data.tools.every(tool => localTools[tool.name]) ? 'Deselect All' : 'Select All'}
                </Button>
              </div>

              {/* Tools list */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {data.tools.map((tool) => (
                  <Card 
                    key={tool.name}
                    className={cn(
                      "transition-colors cursor-pointer",
                      localTools[tool.name] ? "bg-muted/50 border-primary/20" : "hover:bg-muted/20"
                    )}
                    onClick={() => handleToolToggle(tool.name)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-sm">{tool.name}</h4>
                            {localTools[tool.name] && (
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {tool.description}
                          </p>
                        </div>
                        <Switch
                          checked={localTools[tool.name] || false}
                          onCheckedChange={() => handleToolToggle(tool.name)}
                          onClick={(e) => e.stopPropagation()}
                          disabled={isUpdating}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </div>

        <DialogFooter className="border-t p-4">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              {!data?.has_mcp_config && data?.tools?.length > 0 && (
                <Alert className="p-2">
                  <Info className="h-3 w-3" />
                  <AlertDescription className="text-xs">
                    This will create a new MCP configuration for your agent
                  </AlertDescription>
                </Alert>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={hasChanges ? handleCancel : () => onOpenChange(false)}
                disabled={isUpdating}
              >
                {hasChanges ? 'Cancel' : 'Close'}
              </Button>
              
              {hasChanges && (
                <Button
                  onClick={handleSave}
                  disabled={isUpdating}
                >
                  {isUpdating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}; 