import React from 'react';
import { Settings, Trash2, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { KortixLogo } from '@/components/sidebar/kortix-logo';

interface Agent {
  agent_id: string;
  name: string;
  description?: string;
  is_default: boolean;
  created_at: string;
  updated_at?: string;
  configured_mcps?: Array<{ name: string }>;
  agentpress_tools?: Record<string, any>;
  metadata?: {
    is_suna_default?: boolean;
    centrally_managed?: boolean;
    restrictions?: {
      system_prompt_editable?: boolean;
      tools_editable?: boolean;
      name_editable?: boolean;
      description_editable?: boolean;
      mcps_editable?: boolean;
    };
  };
}

interface AgentsListProps {
  agents: Agent[];
  onEditAgent: (agentId: string) => void;
  onDeleteAgent: (agentId: string) => void;
  onToggleDefault: (agentId: string, currentDefault: boolean) => void;
  deleteAgentMutation: { isPending: boolean };
}

export const AgentsList = ({ 
  agents, 
  onEditAgent, 
  onDeleteAgent, 
  onToggleDefault,
  deleteAgentMutation 
}: AgentsListProps) => {
  return (
    <div className="space-y-4">
      {agents.map((agent) => (
        <Card 
          key={agent.agent_id} 
          className="group transition-all duration-200 border-border/50 hover:border-border flex-row"
        >
          <CardHeader className="flex-1 pb-4">
            <div className="space-y-3 flex flex-col justify-between h-full">
              <div className="flex items-start justify-between gap-3">
                <CardTitle className="text-xl font-semibold text-foreground leading-tight flex items-center gap-2 group-hover:text-primary transition-colors">
                  <div className="flex items-center gap-2 relative">
                    <span className="line-clamp-2">{agent.name}</span>
                    {agent.metadata?.is_suna_default && (
                      <div className="h-4 w-4 flex items-center justify-center">
                        <KortixLogo size={12} />
                      </div>
                    )}
                  </div>
                  {agent.is_default && (
                    <Badge variant="secondary" className="text-xs font-medium shrink-0">
                      <Star className="h-3 w-3 mr-1 fill-current" />
                      Default
                    </Badge>
                  )}
                </CardTitle>
                <div className="flex gap-1">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => onEditAgent(agent.agent_id)}
                    title="Edit agent"
                  >
                    <Settings className="h-4 w-4 text-muted-foreground" />
                  </Button>
                  {!agent.is_default && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                          disabled={deleteAgentMutation.isPending}
                          title="Delete agent"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="max-w-md">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-xl">Delete Agent</AlertDialogTitle>
                          <AlertDialogDescription className="text-muted-foreground">
                            Are you sure you want to delete &quot;{agent.name}&quot;? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => onDeleteAgent(agent.agent_id)}
                            disabled={deleteAgentMutation.isPending}
                            className="bg-destructive hover:bg-destructive/90"
                          >
                            {deleteAgentMutation.isPending ? 'Deleting...' : 'Delete'}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </div>
              {agent.description && (
                <CardDescription className="text-sm text-muted-foreground line-clamp-2">
                  {agent.description}
                </CardDescription>
              )}
            </div>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}