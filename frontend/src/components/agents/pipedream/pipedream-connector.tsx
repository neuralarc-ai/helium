import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from '@/components/ui/dialog';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Loader2, 
  Plus, 
  CheckCircle2, 
  Zap,
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { usePipedreamProfiles, useCreatePipedreamProfile, useConnectPipedreamProfile } from '@/hooks/react-query/pipedream/use-pipedream-profiles';
import { useUpdatePipedreamToolsForAgent } from '@/hooks/react-query/agents/use-pipedream-tools';
import { pipedreamApi } from '@/hooks/react-query/pipedream/utils';
import type { CreateProfileRequest } from '@/components/agents/pipedream/pipedream-types';
import type { PipedreamApp } from '@/hooks/react-query/pipedream/utils';

interface PipedreamConnectorProps {
  app: PipedreamApp;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (profileId: string, selectedTools: string[], appName: string, appSlug: string) => void;
  mode?: 'full' | 'profile-only';
  saveMode?: 'direct' | 'callback';
  agentId?: string;
  existingProfileIds?: string[];
}

interface PipedreamTool {
  name: string;
  description: string;
}

export const PipedreamConnector: React.FC<PipedreamConnectorProps> = ({
  app,
  open,
  onOpenChange,
  onComplete,
  mode = 'full',
  saveMode = 'callback',
  agentId,
  existingProfileIds = []
}) => {
  const [step, setStep] = useState<'profile' | 'tools'>('profile');
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [selectedTools, setSelectedTools] = useState<Set<string>>(new Set());
  const [tools, setTools] = useState<PipedreamTool[]>([]);
  const [isLoadingTools, setIsLoadingTools] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isCompletingConnection, setIsCompletingConnection] = useState(false);
  const [connectionSuccessProfileId, setConnectionSuccessProfileId] = useState<string | null>(null);

  const updatePipedreamTools = useUpdatePipedreamToolsForAgent();

  const { data: profiles, refetch: refetchProfiles } = usePipedreamProfiles({ app_slug: app.name_slug });
  const createProfile = useCreatePipedreamProfile();
  const connectProfile = useConnectPipedreamProfile();

  const connectedProfiles = useMemo(() => {
    return profiles?.filter(p => p.is_connected) || [];
  }, [profiles]);

  const availableProfiles = useMemo(() => {
    return connectedProfiles.filter(p => !existingProfileIds.includes(p.profile_id));
  }, [connectedProfiles, existingProfileIds]);

  const selectedProfile = useMemo(() => {
    return availableProfiles.find(p => p.profile_id === selectedProfileId);
  }, [availableProfiles, selectedProfileId]);

  useEffect(() => {
    if (open) {
      setStep('profile');
      setSelectedProfileId('');
      setIsCreatingProfile(false);
      setNewProfileName('');
      setSelectedTools(new Set());
      setTools([]);
      setConnectionSuccessProfileId(null);
    }
  }, [open]);

  useEffect(() => {
    if (open && availableProfiles.length === 1 && !selectedProfileId) {
      setSelectedProfileId(availableProfiles[0].profile_id);
    }
  }, [open, availableProfiles, selectedProfileId]);

  const handleCreateProfile = useCallback(async () => {
    if (!newProfileName.trim()) {
      toast.error('Please enter a profile name');
      return;
    }

    setIsConnecting(true);
    try {
      const request: CreateProfileRequest = {
        profile_name: newProfileName.trim(),
        app_slug: app.name_slug,
        app_name: app.name,
        is_default: connectedProfiles.length === 0,
      };

      const newProfile = await createProfile.mutateAsync(request);
      
      await connectProfile.mutateAsync({
        profileId: newProfile.profile_id,
        app: app.name_slug,
        profileName: newProfile.profile_name,
      });

      await refetchProfiles();
      setSelectedProfileId(newProfile.profile_id);
      setIsCreatingProfile(false);
      setNewProfileName('');
      toast.success('Profile created and connected successfully!');
      
      if (mode === 'profile-only') {
        onComplete(newProfile.profile_id, [], app.name, app.name_slug);
        onOpenChange(false);
      } else {
        proceedToTools();
      }
    } catch (error) {
      console.error('Error creating profile:', error);
    } finally {
      setIsConnecting(false);
    }
  }, [newProfileName, app.name_slug, app.name, connectedProfiles.length, createProfile, connectProfile, refetchProfiles, mode, onComplete, onOpenChange]);

  const proceedToTools = useCallback(async () => {
    if (!selectedProfileId || !selectedProfile) return;

    setIsLoadingTools(true);
    setStep('tools');
    
    try {
      const servers = await pipedreamApi.discoverMCPServers(selectedProfile.external_user_id, app.name_slug);
      const server = servers.find(s => s.app_slug === app.name_slug);
      
      if (server?.available_tools) {
        setTools(server.available_tools);
        setSelectedTools(new Set(server.available_tools.map(tool => tool.name)));
      }
    } catch (error) {
      console.error('Error fetching tools:', error);
      toast.error('Failed to load tools');
    } finally {
      setIsLoadingTools(false);
    }
  }, [selectedProfileId, selectedProfile, app.name_slug]);

  // Listen for connection success events
  useEffect(() => {
    const handleConnectionSuccess = (event: CustomEvent) => {
      const { profileId, profileName } = event.detail;
      setConnectionSuccessProfileId(profileId);
      
      // Auto-navigate to tools after successful connection
      if (open && step === 'profile' && mode === 'full') {
        setTimeout(() => {
          setSelectedProfileId(profileId);
          proceedToTools();
        }, 1000); // Small delay to show the success state
      }
      
      // Clear success state after 5 seconds
      setTimeout(() => {
        setConnectionSuccessProfileId(null);
      }, 5000);
    };

    window.addEventListener('pipedream-connection-success', handleConnectionSuccess as EventListener);
    return () => {
      window.removeEventListener('pipedream-connection-success', handleConnectionSuccess as EventListener);
    };
  }, [open, step, mode, proceedToTools]);

  const handleComplete = useCallback(async () => {
    if (!selectedProfileId || selectedTools.size === 0) {
      toast.error('Please select at least one tool');
      return;
    }
    
    setIsCompletingConnection(true);
    try {
      if (saveMode === 'direct' && agentId) {
        await updatePipedreamTools.mutateAsync({
          agentId,
          profileId: selectedProfileId,
          enabledTools: Array.from(selectedTools)
        });
        toast.success(`Added ${selectedTools.size} tools from ${app.name}!`);
        onOpenChange(false);
      } else {
        onComplete(selectedProfileId, Array.from(selectedTools), app.name, app.name_slug);
        onOpenChange(false);
      }
    } catch (error) {
      console.error('Error completing connection:', error);
      if (saveMode === 'direct') {
        toast.error('Failed to add tools. Please try again.');
      }
    } finally {
      setIsCompletingConnection(false);
    }
  }, [selectedProfileId, selectedTools, saveMode, agentId, updatePipedreamTools, onComplete, app.name, app.name_slug, onOpenChange]);

  const handleProfileOnlyComplete = useCallback(async () => {
    if (!selectedProfileId) {
      toast.error('Please select a profile');
      return;
    }

    setIsCompletingConnection(true);
    try {
      onComplete(selectedProfileId, [], app.name, app.name_slug);
      onOpenChange(false);
    } catch (error) {
      console.error('Error completing connection:', error);
    } finally {
      setIsCompletingConnection(false);
    }
  }, [selectedProfileId, onComplete, app.name, app.name_slug, onOpenChange]);

  const handleToolToggle = useCallback((toolName: string) => {
    setSelectedTools(prev => {
      const newSelected = new Set(prev);
      if (newSelected.has(toolName)) {
        newSelected.delete(toolName);
      } else {
        newSelected.add(toolName);
      }
      return newSelected;
    });
  }, []);

  const handleProfileNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setNewProfileName(e.target.value);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleCreateProfile();
    }
  }, [handleCreateProfile]);

  const ProfileStep = useMemo(() => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Connect to {app.name}</h3>
        <p className="text-sm text-muted-foreground">
          {mode === 'profile-only' 
            ? 'Create a new profile to connect your account'
            : (connectedProfiles.length > 0 
                ? 'Select a profile or create a new one to connect different accounts'
                : 'Create your first profile to get started')
          }
        </p>
      </div>
      {mode !== 'profile-only' && availableProfiles.length > 0 && !isCreatingProfile && (
        <div className="space-y-4">
          {connectionSuccessProfileId && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium text-green-800">
                {connectedProfiles.find(p => p.profile_id === connectionSuccessProfileId)?.profile_name} successfully connected!
              </span>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="profile-select">Select Profile</Label>
            <Select value={selectedProfileId} onValueChange={setSelectedProfileId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose a profile">
                  {selectedProfile && (
                    <div className="flex items-center gap-2">
                      <span>{selectedProfile.profile_name}</span>
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                    </div>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {availableProfiles.map((profile) => (
                  <SelectItem key={profile.profile_id} value={profile.profile_id}>
                    <div className="flex items-center gap-2">
                      <span>{profile.profile_name}</span>
                      <div className="h-2 w-2 bg-green-500 rounded-full" />
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground">OR</span>
            <Separator className="flex-1" />
          </div>

          <Button 
            variant="outline" 
            onClick={() => setIsCreatingProfile(true)}
            className="w-full"
          >
            <Plus className="h-4 w-4" />
            Create New Profile
          </Button>
        </div>
      )}

      {(mode === 'profile-only' || availableProfiles.length === 0 || isCreatingProfile) && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="profile-name">Profile Name</Label>
            <Input
              id="profile-name"
              placeholder="e.g., Personal Account, Work Account"
              value={newProfileName}
              onChange={handleProfileNameChange}
              onKeyDown={handleKeyDown}
              autoFocus={mode === 'profile-only' || isCreatingProfile}
            />
          </div>

          <div className="flex gap-3">
            {mode !== 'profile-only' && isCreatingProfile && (
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsCreatingProfile(false);
                  setNewProfileName('');
                }}
                className="flex-1"
              >
                Cancel
              </Button>
            )}
            <Button 
              onClick={handleCreateProfile}
              disabled={!newProfileName.trim() || isConnecting}
              className={mode === 'profile-only' ? 'w-full' : 'flex-1'}
            >
              {isConnecting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Create & Connect
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {mode !== 'profile-only' && selectedProfileId && !isCreatingProfile && (
        <div className="pt-4 border-t">
          <Button 
            onClick={proceedToTools}
            disabled={!selectedProfileId || isCompletingConnection}
            className="w-full"
          >
            {isCompletingConnection ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                Continue to Tools
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  ), [
    app.name, 
    connectedProfiles, 
    isCreatingProfile, 
    selectedProfileId, 
    selectedProfile, 
    newProfileName, 
    isConnecting, 
    handleProfileNameChange, 
    handleKeyDown, 
    handleCreateProfile, 
    proceedToTools,
    mode,
    handleProfileOnlyComplete,
    isCompletingConnection,
    availableProfiles
  ]);

  const ToolsStep = useMemo(() => (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <Button 
            variant="link" 
            size="sm"
            onClick={() => setStep('profile')}
            className="mb-4 p-0 h-auto font-normal text-muted-foreground hover:text-foreground"
          >
            ← Back to Profile
          </Button>
        </div>
      </div>

      {isLoadingTools ? (
        <div className="flex items-center justify-center py-8">
          <div className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Loading tools...</span>
          </div>
        </div>
      ) : tools.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-4xl mb-3">🔧</div>
          <h4 className="font-medium mb-2">No tools available</h4>
          <p className="text-sm text-muted-foreground mb-4">
            This app doesn't have any tools available yet.
          </p>
          <Button variant="outline" onClick={proceedToTools}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {selectedTools.size} of {tools.length} tools selected
              </span>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  if (selectedTools.size === tools.length) {
                    setSelectedTools(new Set());
                  } else {
                    setSelectedTools(new Set(tools.map(tool => tool.name)));
                  }
                }}
              >
                {selectedTools.size === tools.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>
            
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {tools.map((tool) => {
                const isSelected = selectedTools.has(tool.name);
                
                return (
                  <Card 
                    key={tool.name}
                    className={cn(
                      "p-0 border cursor-pointer transition-colors",
                      isSelected ? "bg-muted/50" : "hover:bg-muted/20"
                    )}
                    onClick={() => handleToolToggle(tool.name)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-sm">{tool.name}</h4>
                            {isSelected && (
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            )}
                          </div>
                        </div>
                        <Switch
                          checked={isSelected}
                          onCheckedChange={() => handleToolToggle(tool.name)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
          <div className="pt-4 border-t">
            <Button 
              onClick={handleComplete}
              disabled={selectedTools.size === 0 || isCompletingConnection}
              className="w-full"
            >
              {isCompletingConnection ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {saveMode === 'direct' ? 'Adding Tools...' : 'Connecting...'}
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4" />
                  {saveMode === 'direct' 
                    ? `Add ${selectedTools.size} Tool${selectedTools.size !== 1 ? 's' : ''} to Agent`
                    : `Connect with ${selectedTools.size} Tool${selectedTools.size !== 1 ? 's' : ''}`
                  }
                </>
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  ), [
    app.name, 
    isLoadingTools, 
    tools, 
    selectedTools, 
    handleToolToggle, 
    handleComplete, 
    isCompletingConnection, 
    proceedToTools
  ]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 flex-shrink-0 rounded-lg bg-muted flex items-center justify-center">
              {app.img_src ? (
                <img
                  src={app.img_src}
                  alt={app.name}
                  className="h-6 w-6 object-cover rounded"
                />
              ) : (
                <span className="text-sm font-semibold">{app.name.charAt(0)}</span>
              )}
            </div>
            <div>
              <DialogTitle className="text-left">{app.name}</DialogTitle>
              <DialogDescription className="text-left">
                {mode === 'profile-only' 
                  ? 'Connect your account to continue with installation'
                  : app.description
                }
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="mt-6">
          {step === 'profile' ? ProfileStep : ToolsStep}
        </div>
      </DialogContent>
    </Dialog>
  );
}; 