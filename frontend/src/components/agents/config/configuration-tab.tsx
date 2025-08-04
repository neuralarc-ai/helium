import React from 'react';
import { Settings, Wrench, Server, BookOpen, Workflow, Zap, ChevronDown } from 'lucide-react';
import { ExpandableMarkdownEditor } from '@/components/ui/expandable-markdown-editor';
import { AgentToolsConfiguration } from '../agent-tools-configuration';
import { AgentMCPConfiguration } from '../agent-mcp-configuration';
import { AgentKnowledgeBaseManager } from '../knowledge-base/agent-knowledge-base-manager';
import { AgentWorkflowsConfiguration } from '../workflows/agent-workflows-configuration';
import { AgentTriggersConfiguration } from '../triggers/agent-triggers-configuration';
import { toast } from 'sonner';
import { KortixLogo } from '../../sidebar/kortix-logo';

interface ConfigurationTabProps {
  agentId: string;
  displayData: {
    name: string;
    description: string;
    system_prompt: string;
    agentpress_tools: any;
    configured_mcps: any[];
    custom_mcps: any[];
    is_default: boolean;
    avatar: string;
    avatar_color: string;
  };
  versionData?: {
    version_id: string;
    configured_mcps: any[];
    custom_mcps: any[];
    system_prompt: string;
    agentpress_tools: any;
  };
  isViewingOldVersion: boolean;
  onFieldChange: (field: string, value: any) => void;
  onMCPChange: (updates: { configured_mcps: any[]; custom_mcps: any[] }) => void;
  initialAccordion?: string;
  agentMetadata?: {
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

export function ConfigurationTab({
  agentId,
  displayData,
  versionData,
  isViewingOldVersion,
  onFieldChange,
  onMCPChange,
  initialAccordion,
  agentMetadata,
}: ConfigurationTabProps) {
  const isSunaAgent = agentMetadata?.is_suna_default || false;
  
  const mapAccordion = (val?: string) => {
    if (val === 'instructions') return isSunaAgent ? 'integrations' : 'system';
    if (isSunaAgent && (val === 'system' || val === 'tools')) {
      return 'integrations';
    }
    if (['system', 'tools', 'integrations', 'knowledge', 'workflows', 'triggers'].includes(val || '')) {
      return val!;
    }
    return isSunaAgent ? 'integrations' : 'system';
  };
  
  const [openAccordion, setOpenAccordion] = React.useState<string>(mapAccordion(initialAccordion));
  React.useEffect(() => {
    if (initialAccordion) {
      setOpenAccordion(mapAccordion(initialAccordion));
    }
  }, [initialAccordion]);
  const restrictions = agentMetadata?.restrictions || {};
  
  const isSystemPromptEditable = !isViewingOldVersion && (restrictions.system_prompt_editable !== false);
  const areToolsEditable = !isViewingOldVersion && (restrictions.tools_editable !== false);
  
  const handleSystemPromptChange = (value: string) => {
    if (!isSystemPromptEditable && isSunaAgent) {
      toast.error("System prompt cannot be edited", {
        description: "Suna's system prompt is managed centrally and cannot be changed.",
      });
      return;
    }
    onFieldChange('system_prompt', value);
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 pb-8">
        {isSunaAgent && (
          <div className="mb-4 p-4 bg-primary/10 border border-primary-200 rounded-xl">
            <div className="flex items-center gap-3 mb-2">
              <div className="text-primary-600">
                <KortixLogo size={20} />
              </div>
              <span className="font-semibold text-primary-800">Suna Default Agent</span>
            </div>
            <p className="text-sm text-primary-700">
              This is Suna's default agent with centrally managed system prompt and tools. 
              You can customize integrations, knowledge base, workflows, and triggers to personalize your experience.
            </p>
          </div>
        )}
        
        <div className="space-y-3">
        {!isSunaAgent && (
          <div className="group overflow-hidden rounded-2xl border border-border bg-card transition-all duration-300 hover:border-primary/30">
            <button
              className="w-full p-4 text-left group-hover:bg-muted/30 transition-all duration-300"
              onClick={() => setOpenAccordion(openAccordion === 'system' ? '' : 'system')}
            >
              <div className="flex items-center gap-4 w-full">
                <div className="relative">
                  <div className="bg-muted rounded-xl h-10 w-10 flex items-center justify-center transition-all duration-300 group-hover:scale-105">
                    <Settings className="h-5 w-5 text-muted-foreground" />
                  </div>
                 
                </div>
                <div className="text-left flex-1">
                  <h4 className="font-semibold text-base text-foreground mb-1 group-hover:text-primary transition-colors duration-300">System Prompt</h4>
                  <p className="text-sm text-muted-foreground group-hover:text-foreground/70 transition-colors duration-300">Define agent behavior and goals</p>
                </div>
                <ChevronDown className={`h-4 w-4 transition-transform duration-300 ease-out ${openAccordion === 'system' ? 'rotate-180' : ''}`} />
              </div>
            </button>
            <div 
              className={`overflow-hidden transition-all duration-300 ease-out ${
                openAccordion === 'system' 
                  ? 'max-h-96 opacity-100' 
                  : 'max-h-0 opacity-0'
              }`}
            >
              <div className="px-6 pb-6 pt-2">
                <div className="border-t border-border/30 pt-4">
                  <ExpandableMarkdownEditor
                    value={displayData.system_prompt}
                    onSave={handleSystemPromptChange}
                    placeholder="Click to set system instructions..."
                    title="System Instructions"
                    disabled={!isSystemPromptEditable}
                    autosave={true}
                    autosaveDelay={1500}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
        {!isSunaAgent && (
          <div className="group overflow-hidden rounded-2xl border border-border bg-card transition-all duration-300 hover:border-primary/30">
            <button
              className="w-full p-4 text-left group-hover:bg-muted/30 transition-all duration-300"
              onClick={() => setOpenAccordion(openAccordion === 'tools' ? '' : 'tools')}
            >
              <div className="flex items-center gap-4 w-full">
                <div className="relative">
                  <div className="bg-muted rounded-xl h-10 w-10 flex items-center justify-center transition-all duration-300 group-hover:scale-105">
                    <Wrench className="h-5 w-5 text-muted-foreground" />
                  </div>
                 
                </div>
                <div className="text-left flex-1">
                  <h4 className="font-semibold text-base text-foreground mb-1 group-hover:text-primary transition-colors duration-300">Default Tools</h4>
                  <p className="text-sm text-muted-foreground group-hover:text-foreground/70 transition-colors duration-300">Configure default agentpress tools</p>
                </div>
                <ChevronDown className={`h-4 w-4 transition-transform duration-300 ease-out ${openAccordion === 'tools' ? 'rotate-180' : ''}`} />
              </div>
            </button>
            <div 
              className={`overflow-hidden transition-all duration-300 ease-out ${
                openAccordion === 'tools' 
                  ? 'max-h-auto opacity-100' 
                  : 'max-h-0 opacity-0'
              }`}
            >
              <div className="px-6 pb-6 pt-2">
                <div className="border-t border-border/30 pt-4">
                  <AgentToolsConfiguration
                    tools={displayData.agentpress_tools}
                    onToolsChange={areToolsEditable ? (tools) => onFieldChange('agentpress_tools', tools) : () => {}}
                    disabled={!areToolsEditable}
                    isSunaAgent={isSunaAgent}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
        <div className="group overflow-hidden rounded-2xl border border-border bg-card transition-all duration-300 hover:border-primary/30">
          <button
            className="w-full p-4 text-left group-hover:bg-muted/30 transition-all duration-300"
            onClick={() => setOpenAccordion(openAccordion === 'integrations' ? '' : 'integrations')}
          >
            <div className="flex items-center gap-4 w-full">
              <div className="relative">
                <div className="bg-muted rounded-xl h-10 w-10 flex items-center justify-center transition-all duration-300 group-hover:scale-105">
                  <Server className="h-5 w-5 text-muted-foreground" />
                </div>
               
              </div>
              <div className="text-left flex-1">
                <h4 className="font-semibold text-base text-foreground mb-1 group-hover:text-primary transition-colors duration-300">Integrations</h4>
                <p className="text-sm text-muted-foreground group-hover:text-foreground/70 transition-colors duration-300">Connect external services via MCPs</p>
              </div>
              <ChevronDown className={`h-4 w-4 transition-transform duration-300 ease-out ${openAccordion === 'integrations' ? 'rotate-180' : ''}`} />
            </div>
          </button>
          <div 
            className={`overflow-hidden transition-all duration-300 ease-out ${
              openAccordion === 'integrations' 
                ? 'max-h-auto opacity-100' 
                : 'max-h-0 opacity-0'
            }`}
          >
            <div className="px-6 pb-6 pt-2">
              <div className="border-t border-border/30 pt-4">
                <AgentMCPConfiguration
                  configuredMCPs={displayData.configured_mcps}
                  customMCPs={displayData.custom_mcps}
                  onMCPChange={onMCPChange}
                  agentId={agentId}
                  versionData={{
                    configured_mcps: displayData.configured_mcps,
                    custom_mcps: displayData.custom_mcps,
                    system_prompt: displayData.system_prompt,
                    agentpress_tools: displayData.agentpress_tools
                  }}
                  saveMode="callback"
                  versionId={versionData?.version_id}
                />
              </div>
            </div>
          </div>
        </div>
        <div className="group overflow-hidden rounded-2xl border border-border bg-card transition-all duration-300 hover:border-primary/30">
          <button
            className="w-full p-4 text-left group-hover:bg-muted/30 transition-all duration-300"
            onClick={() => setOpenAccordion(openAccordion === 'knowledge' ? '' : 'knowledge')}
          >
            <div className="flex items-center gap-4 w-full">
              <div className="relative">
                <div className="bg-muted rounded-xl h-10 w-10 flex items-center justify-center transition-all duration-300 group-hover:scale-105">
                  <BookOpen className="h-5 w-5 text-muted-foreground" />
                </div>
               
              </div>
              <div className="text-left flex-1">
                <h4 className="font-semibold text-base text-foreground mb-1 group-hover:text-primary transition-colors duration-300">Knowledge Base</h4>
                <p className="text-sm text-muted-foreground group-hover:text-foreground/70 transition-colors duration-300">Upload and manage knowledge for the agent</p>
              </div>
              <ChevronDown className={`h-4 w-4 transition-transform duration-300 ease-out ${openAccordion === 'knowledge' ? 'rotate-180' : ''}`} />
            </div>
          </button>
          <div 
            className={`overflow-hidden transition-all duration-300 ease-out ${
              openAccordion === 'knowledge' 
                ? 'max-h-auto opacity-100' 
                : 'max-h-0 opacity-0'
            }`}
          >
            <div className="px-6 pb-6 pt-2">
              <div className="border-t border-border/30 pt-4">
                <AgentKnowledgeBaseManager
                  agentId={agentId}
                  agentName={displayData.name || 'Agent'}
                />
              </div>
            </div>
          </div>
        </div>
        <div className="group overflow-hidden rounded-2xl border border-border bg-card transition-all duration-300 hover:border-primary/30">
          <button
            className="w-full p-4 text-left group-hover:bg-muted/30 transition-all duration-300"
            onClick={() => setOpenAccordion(openAccordion === 'workflows' ? '' : 'workflows')}
          >
            <div className="flex items-center gap-4 w-full">
              <div className="relative">
                <div className="bg-muted rounded-xl h-10 w-10 flex items-center justify-center transition-all duration-300 group-hover:scale-105">
                  <Workflow className="h-5 w-5 text-muted-foreground" />
                </div>
               
              </div>
              <div className="text-left flex-1">
                <h4 className="font-semibold text-base text-foreground mb-1 group-hover:text-primary transition-colors duration-300">Workflows</h4>
                <p className="text-sm text-muted-foreground group-hover:text-foreground/70 transition-colors duration-300">Automate complex processes</p>
              </div>
              <ChevronDown className={`h-4 w-4 transition-transform duration-300 ease-out ${openAccordion === 'workflows' ? 'rotate-180' : ''}`} />
            </div>
          </button>
          <div 
            className={`overflow-hidden transition-all duration-300 ease-out ${
              openAccordion === 'workflows' 
                ? 'max-h-auto opacity-100' 
                : 'max-h-0 opacity-0'
            }`}
          >
            <div className="px-6 pb-6 pt-2">
              <div className="border-t border-border/30 pt-4">
                <AgentWorkflowsConfiguration
                  agentId={agentId}
                  agentName={displayData.name || 'Agent'}
                />
              </div>
            </div>
          </div>
        </div>
        <div className="group overflow-hidden rounded-2xl border border-border bg-card transition-all duration-300 hover:border-primary/30">
          <button
            className="w-full p-4 text-left group-hover:bg-muted/30 transition-all duration-300"
            onClick={() => setOpenAccordion(openAccordion === 'triggers' ? '' : 'triggers')}
          >
            <div className="flex items-center gap-4 w-full">
              <div className="relative">
                <div className="bg-muted rounded-xl h-10 w-10 flex items-center justify-center transition-all duration-300 group-hover:scale-105">
                  <Zap className="h-5 w-5 text-muted-foreground" />
                </div>
               
              </div>
              <div className="text-left flex-1">
                <h4 className="font-semibold text-base text-foreground mb-1 group-hover:text-primary transition-colors duration-300">Triggers</h4>
                <p className="text-sm text-muted-foreground group-hover:text-foreground/70 transition-colors duration-300">Set up automated agent runs</p>
              </div>
              <ChevronDown className={`h-4 w-4 transition-transform duration-300 ease-out ${openAccordion === 'triggers' ? 'rotate-180' : ''}`} />
            </div>
          </button>
          <div 
            className={`overflow-hidden transition-all duration-300 ease-out ${
              openAccordion === 'triggers' 
                ? 'max-h-auto opacity-100' 
                : 'max-h-0 opacity-0'
            }`}
          >
            <div className="px-6 pb-6 pt-2">
              <div className="border-t border-border/30 pt-4">
                <AgentTriggersConfiguration agentId={agentId} />
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
