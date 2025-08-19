import React from 'react';
// import { Sparkles, Settings } from 'lucide-react';
import { Sparkles, Settings, MoreHorizontal, Download } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EditableText } from '@/components/ui/editable';
import { StylePicker } from '../style-picker';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { HeliumLogo } from '@/components/sidebar/helium-logo';

interface AgentHeaderProps {
  agentId: string;
  displayData: {
    name: string;
    description?: string;
  };
  currentStyle: {
    avatar: string;
    color: string;
  };
  activeTab: string;
  isViewingOldVersion: boolean;
  onFieldChange: (field: string, value: any) => void;
  onStyleChange: (emoji: string, color: string) => void;
  onTabChange: (value: string) => void;
  onExport?: () => void;
  isExporting?: boolean;
  currentVersionId?: string;
  agentMetadata?: {
    is_suna_default?: boolean;
    restrictions?: {
      name_editable?: boolean;
      avatar_editable?: boolean;
    };
  };
}

export function AgentHeader({
  agentId,
  displayData,
  currentStyle,
  activeTab,
  isViewingOldVersion,
  onFieldChange,
  onStyleChange,
  onTabChange,
  onExport,
  isExporting = false,
  agentMetadata,
}: AgentHeaderProps) {
  const isSunaAgent = agentMetadata?.is_suna_default || false;
  console.log('isSunaAgent', isSunaAgent);
  const restrictions = agentMetadata?.restrictions || {};
  const isNameEditable = !isViewingOldVersion && (restrictions.name_editable !== false);
  const isAvatarEditable = !isViewingOldVersion && (restrictions.avatar_editable !== false);  
  const handleNameChange = (value: string) => {
    if (!isNameEditable && isSunaAgent) {
      toast.error("Name cannot be edited", {
        description: "Suna's name is managed centrally and cannot be changed.",
      });
      return;
    }
    onFieldChange('name', value);
  };
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        <div className="relative">
          {isSunaAgent ? (
            <div className="h-9 w-9 rounded-lg border flex items-center justify-center">
              <HeliumLogo size={16} />
            </div>
          ) : (
            <StylePicker
              currentEmoji={currentStyle.avatar}
              currentColor={currentStyle.color}
              onStyleChange={onStyleChange}
              agentId={agentId}
              >
              <div 
                className="h-9 w-9 rounded-lg flex items-center justify-center shadow-sm ring-1 ring-black/5 hover:ring-black/10 transition-all duration-200 cursor-pointer"
                style={{ backgroundColor: currentStyle.color }}
              >
                <div className="text-lg font-medium">{currentStyle.avatar}</div>
              </div>
            </StylePicker>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <EditableText
            value={displayData.name}
            onSave={handleNameChange}
            className={cn(
              "text-lg font-semibold bg-transparent text-foreground placeholder:text-muted-foreground",
              !isNameEditable && isSunaAgent && "cursor-not-allowed opacity-75"
            )}
            placeholder="Agent name..."
            disabled={!isNameEditable}
          />
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        {/* 3-dots menu for actions - always show if onExport is available */}
        {onExport && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                disabled={isExporting}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-40">
              <DropdownMenuItem 
                onClick={onExport}
                disabled={isExporting}
                className="flex items-center gap-2 text-xs"
              >
                <Download className="h-3 w-3" />
                Export agent
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        
        {/* Only show tabs for non-Suna agents */}
        {!isSunaAgent && (
          <Tabs value={activeTab} onValueChange={onTabChange}>
            <TabsList className="grid grid-cols-2 bg-muted/50 h-9">
              <TabsTrigger 
                value="agent-builder"
                disabled={isViewingOldVersion}
                className={cn(
                  "flex items-center gap-2 text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm",
                  isViewingOldVersion && "opacity-50 cursor-not-allowed"
                )}
              >
                <Sparkles className="h-3 w-3" />
                Prompt to Build
              </TabsTrigger>
              <TabsTrigger 
                value="configuration"
                className="flex items-center gap-2 text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                <Settings className="h-3 w-3" />
                Manual Config
              </TabsTrigger>
            </TabsList>
          </Tabs>
        )}
      </div>
    </div>
  );
} 