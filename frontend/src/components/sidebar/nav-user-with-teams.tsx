'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  BadgeCheck,
  Bell,
  ChevronDown,
  ChevronsUpDown,
  Command,
  CreditCard,
  Key,
  LogOut,
  Plus,
  Settings,
  User,
  AudioWaveform,
  Sun,
  Moon,
  KeyRound,
  Pencil,
  Sparkles,
} from 'lucide-react';
import { useAccounts } from '@/hooks/use-accounts';
import NewTeamForm from '@/components/basejump/new-team-form';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { createClient } from '@/lib/supabase/client';
import { useTheme } from 'next-themes';
import { isLocalMode } from '@/lib/config';
import { useFeatureFlag } from '@/lib/feature-flags';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/AuthProvider';
import { useSubscriptionUsage } from '@/hooks/useSubscriptionUsage';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { backendApi } from '@/lib/api-client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function NavUserWithTeams({
  user,
  onUserUpdate,
}: {
  user: {
    name: string;
    email: string;
    avatar: string;
  };
  onUserUpdate?: (updatedUser: {
    name: string;
    email: string;
    avatar: string;
  }) => void;
}) {
  const router = useRouter();
  const { isMobile } = useSidebar();
  const { data: accounts } = useAccounts();
  const [showNewTeamDialog, setShowNewTeamDialog] = React.useState(false);
  const [showEditNameDialog, setShowEditNameDialog] = React.useState(false);
  const [editName, setEditName] = React.useState(user.name);
  const [isUpdating, setIsUpdating] = React.useState(false);
  const { theme, setTheme } = useTheme();
  const { enabled: customAgentsEnabled, loading: flagLoading } =
    useFeatureFlag('custom_agents');
  const { refreshUser } = useAuth();
  const { usedCredits, totalCredits, usagePercent, isLoading, error } =
    useSubscriptionUsage();
  const [showPersonalizationDialog, setShowPersonalizationDialog] = React.useState(false);
  // Personalization states
  const [roleInput, setRoleInput] = React.useState('');
  const [taskInput, setTaskInput] = React.useState(''); // manual task entry
  const [selectedTaskKey, setSelectedTaskKey] = React.useState<string | null>(null);
  const [selectedPrompt, setSelectedPrompt] = React.useState('');
  const [isLoadingTask, setIsLoadingTask] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);
  // simple client cache to reduce backend calls in-session
  const singlePromptCacheRef = React.useRef<Map<string, string>>(new Map());
  // store multiple prompts for UI rendering
  const [selectedPrompts, setSelectedPrompts] = React.useState<string[]>([]);

  // Prepare personal account and team accounts
  const personalAccount = React.useMemo(
    () => accounts?.find((account) => account.personal_account),
    [accounts],
  );
  const teamAccounts = React.useMemo(
    () => accounts?.filter((account) => !account.personal_account),
    [accounts],
  );

  // Create a default list of teams with logos for the UI (will show until real data loads)
  const defaultTeams = [
    {
      name: personalAccount?.name || 'Personal Account',
      logo: Command,
      plan: 'Personal',
      account_id: personalAccount?.account_id,
      slug: personalAccount?.slug,
      personal_account: true,
    },
    ...(teamAccounts?.map((team) => ({
      name: team.name,
      logo: AudioWaveform,
      plan: 'Team',
      account_id: team.account_id,
      slug: team.slug,
      personal_account: false,
    })) || []),
  ];

  // Use the first team or first entry in defaultTeams as activeTeam
  const [activeTeam, setActiveTeam] = React.useState(defaultTeams[0]);

  // Update active team when accounts load
  React.useEffect(() => {
    if (accounts?.length) {
      const currentTeam = accounts.find(
        (account) => account.account_id === activeTeam.account_id,
      );
      if (currentTeam) {
        setActiveTeam({
          name: currentTeam.name,
          logo: currentTeam.personal_account ? Command : AudioWaveform,
          plan: currentTeam.personal_account ? 'Personal' : 'Team',
          account_id: currentTeam.account_id,
          slug: currentTeam.slug,
          personal_account: currentTeam.personal_account,
        });
      } else {
        // If current team not found, set first available account as active
        const firstAccount = accounts[0];
        setActiveTeam({
          name: firstAccount.name,
          logo: firstAccount.personal_account ? Command : AudioWaveform,
          plan: firstAccount.personal_account ? 'Personal' : 'Team',
          account_id: firstAccount.account_id,
          slug: firstAccount.slug,
          personal_account: firstAccount.personal_account,
        });
      }
    }
  }, [accounts, activeTeam.account_id]);

  // Handle team selection
  const handleTeamSelect = (team) => {
    setActiveTeam(team);

    // Navigate to the appropriate dashboard
    if (team.personal_account) {
      router.push('/dashboard');
    } else {
      router.push(`/${team.slug}`);
    }
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/auth');
  };

  const handleCopy = async () => {
    // copy all prompts if available, else single prompt
    const textToCopy = selectedPrompts.length > 0
      ? selectedPrompts.map((p, i) => `${i + 1}. ${p}`).join('\n\n')
      : selectedPrompt;
    if (!textToCopy) return;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      // no-op
    }
  };

  const fetchTaskPrompt = async (role: string, taskKey: string) => {
    const roleKey = role.trim();
    const n = 5;
    const cacheKey = `${roleKey}:${taskKey}:n=${n}`;
    setErrorMsg(null);
    setIsLoadingTask(true);

    // prefer single-prompt cache
    const cachedSingle = singlePromptCacheRef.current.get(cacheKey);
    if (cachedSingle) {
      setSelectedPrompt(cachedSingle);
      // hydrate prompts list from cached text by splitting on double newlines if present
      const parts = cachedSingle.split(/\n\n+/).map((s) => s.replace(/^\d+\.\s*/, '').trim()).filter(Boolean);
      if (parts.length > 1) setSelectedPrompts(parts);
      setIsLoadingTask(false);
      return;
    }

    try {
      // Try multi-prompt endpoint first
      const multi = await backendApi.get<{ role: string; task: string; prompts: string[] }>(
        `/get_prompts_multi/?role=${encodeURIComponent(roleKey)}&task=${encodeURIComponent(taskKey)}&n=${n}`,
      );

      let promptOut = '';
      if (multi.success && multi.data && Array.isArray(multi.data.prompts) && multi.data.prompts.length > 0) {
        // Join prompts with spacing and numbering
        promptOut = multi.data.prompts
          .map((p, i) => `${i + 1}. ${p}`)
          .join('\n\n');
        setSelectedPrompts(multi.data.prompts);
      } else {
        // Fallback to single prompt endpoint
        const single = await backendApi.get<{ role: string; task: string; prompt: string }>(
          `/get_prompts/?role=${encodeURIComponent(roleKey)}&task=${encodeURIComponent(taskKey)}`,
        );
        if (!single.success || !single.data) throw new Error('Request failed');
        promptOut = single.data.prompt ?? '';
        setSelectedPrompts([]);
      }

      setSelectedPrompt(promptOut);
      singlePromptCacheRef.current.set(cacheKey, promptOut);
    } catch (err: any) {
      setSelectedPrompt('');
      setSelectedPrompts([]);
      setErrorMsg('Failed to generate the prompt. Please try again.');
    } finally {
      setIsLoadingTask(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((part) => part.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  if (!activeTeam) {
    return null;
  }

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editName.trim() || editName.trim() === user.name) {
      setShowEditNameDialog(false);
      return;
    }

    setIsUpdating(true);

    try {
      const supabase = createClient();

      // Update user metadata in Supabase
      const { error } = await supabase.auth.updateUser({
        data: {
          name: editName.trim(),
          first_name: editName.trim().split(' ')[0], // Also update first_name for consistency
        },
      });

      if (error) {
        console.error('Error updating user name:', error);
        // You could add toast notification here for error
        return;
      }

      // Refresh the auth state to get updated user data
      await refreshUser();

      // Update local state through callback
      if (onUserUpdate) {
        onUserUpdate({
          ...user,
          name: editName.trim(),
        });
      }

      setShowEditNameDialog(false);
      // You could add toast notification here for success
    } catch (error) {
      console.error('Error updating user name:', error);
      // You could add toast notification here for error
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <>
      <Dialog open={showNewTeamDialog} onOpenChange={setShowNewTeamDialog}>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="cursor-pointer data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback className="rounded-lg">
                      {getInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{user.name}</span>
                    <span className="truncate text-xs">{user.email}</span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-(--radix-dropdown-menu-trigger-width) min-w-56"
                side={isMobile ? 'bottom' : 'top'}
                align="start"
                sideOffset={4}
              >
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1.5 py-1.5 text-left text-md ">
                    <Avatar className="h-9 w-9 rounded-sm ">
                      <AvatarImage src={user.avatar} alt={user.name} />
                      <AvatarFallback className="rounded-sm bg-[#7BC3BF] text-white font-bold text-[19px]">
                        {getInitials(user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-medium text-[15px] flex items-center gap-1">
                        {user?.name
                          ? user.name.replace(/\b\w/g, (char) =>
                              char.toUpperCase(),
                            )
                          : ''}
                        <img
                          src="/neuralarc/editIcon.png"
                          className="w-3.5 h-3.5 cursor-pointer text-muted-foreground/80 hover:text-foreground"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditName(user.name);
                            setShowEditNameDialog(true);
                          }}
                          aria-label="Edit name"
                        />
                      </span>
                      <span className="truncate text-xs">{user.email}</span>
                    </div>
                  </div>
                  {/* Token Usage Section */}
                  <div className="px-2 py-2 text-sm space-y-3">
                    <div className="text-foreground font-medium text-left">
                      {isLoading
                        ? 'Loading usage...'
                        : error
                          ? 'Unable to load usage'
                          : `You have used ${usagePercent}% of your credits`}
                    </div>
                    <div className="text-muted-foreground text-xs text-left">
                      {isLoading
                        ? '0 / 0'
                        : error
                          ? '— / —'
                          : `${usedCredits} / ${totalCredits}`}
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full">
                      <div className="w-full bg-muted/30 rounded-full h-2 overflow-hidden border border-border/20 group hover:bg-muted/40 transition-colors duration-200">
                        {isLoading ? (
                          <div className="h-full bg-gradient-to-r from-muted to-muted/60 animate-pulse" />
                        ) : error ? (
                          <div className="h-full bg-destructive/20 animate-pulse" />
                        ) : (
                          <div
                            className="h-full transition-all duration-500 ease-out shadow-sm group-hover:shadow-md"
                            style={{
                              width: `${Math.max(usagePercent, 2)}%`,
                              background: '#7BC3BF',
                              boxShadow: '0 0 8px rgba(0, 0, 0, 0.1)',
                            }}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                {/* Teams Section */}
                {personalAccount && (
                  <>
                    <DropdownMenuLabel className="text-muted-foreground text-sm">
                      Personal Account
                    </DropdownMenuLabel>
                    <DropdownMenuItem
                      key={personalAccount.account_id}
                      onClick={() =>
                        handleTeamSelect({
                          name: personalAccount.name,
                          logo: Command,
                          plan: 'Personal',
                          account_id: personalAccount.account_id,
                          slug: personalAccount.slug,
                          personal_account: true,
                        })
                      }
                      className="gap-2 p-2"
                    >
                      <div className="flex size-6 items-center justify-center">
                        <User className="size-6 shrink-0" />
                      </div>
                      {personalAccount?.name
                        ? personalAccount.name.replace(/\b\w/g, (char) =>
                            char.toUpperCase(),
                          )
                        : ''}
                      <DropdownMenuShortcut>
                        <img
                          src="/neuralarc/Setting_alt_line_light.png"
                          className="size-4 shrink-0"
                        />
                      </DropdownMenuShortcut>
                    </DropdownMenuItem>
                    {/* Personalization button */}
                    <DropdownMenuItem
                      onClick={() => setShowPersonalizationDialog(true)}
                      className="gap-2 p-2"
                    >
                      <div className="flex size-6 items-center justify-center">
                        <Sparkles className="size-4" />
                      </div>
                      Personalization
                    </DropdownMenuItem>
                  </>
                )}

                <DropdownMenuSeparator />

                {/* Create Team Option */}
                <DropdownMenuLabel className="text-muted-foreground text-sm">
                  Team Accounts
                </DropdownMenuLabel>
                {teamAccounts?.length === 0 && (
                  <DropdownMenuItem
                    onClick={() => setShowNewTeamDialog(true)}
                    className="gap-2 p-2"
                  >
                    <img
                      src="/neuralarc/createTeam.png"
                      className="size-5 shrink-0"
                    />
                    Create Team
                  </DropdownMenuItem>
                )}
                {teamAccounts?.length > 0 && (
                  <>
                    {teamAccounts.map((team, index) => (
                      <DropdownMenuItem
                        key={team.account_id}
                        onClick={() =>
                          handleTeamSelect({
                            name: team.name,
                            logo: AudioWaveform,
                            plan: 'Team',
                            account_id: team.account_id,
                            slug: team.slug,
                            personal_account: false,
                          })
                        }
                        className="gap-2 p-2"
                      >
                        <div className="flex size-6 items-center justify-center">
                          <img
                            src="/neuralarc/Group_light.png"
                            className="size-6 shrink-0"
                          />
                        </div>
                        {team.name}
                        {/* <DropdownMenuShortcut>
                          ⌘{index + 2}
                        </DropdownMenuShortcut> */}
                      </DropdownMenuItem>
                    ))}
                  </>
                )}
                {/* Token Usage Section */}
                <DropdownMenuSeparator />

                {/* <DropdownMenuSeparator /> */}

                {/* User Settings Section */}
                {/* <DropdownMenuGroup>
                  <DropdownMenuItem asChild>
                    <Link href="/settings/billing">
                      <CreditCard className="h-4 w-4" />
                      Billing
                    </Link>
                  </DropdownMenuItem>
                  {!flagLoading && customAgentsEnabled && (
                    <DropdownMenuItem asChild>
                      <Link href="/settings/api-keys">
                        <Key className="h-4 w-4" />
                        API Keys
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {isLocalMode() && (
                    <DropdownMenuItem asChild>
                      <Link href="/settings/env-manager">
                        <KeyRound className="h-4 w-4" />
                        Local .Env Manager
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onClick={() =>
                      setTheme(theme === 'light' ? 'dark' : 'light')
                    }
                  >
                    <div className="flex items-center gap-2">
                      <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                      <span>{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuGroup> */}
                {/* <DropdownMenuSeparator /> */}
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive focus:bg-destructive/10"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4 text-destructive" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>

        <DialogContent className="sm:max-w-[425px] border-subtle dark:border-white/10 bg-white rounded-2xl shadow-custom">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              Create a new team
            </DialogTitle>
            <DialogDescription className="text-foreground/70">
              Create a team to collaborate with others.
            </DialogDescription>
          </DialogHeader>
          <NewTeamForm />
        </DialogContent>
      </Dialog>

      {/* Edit Name Dialog */}
      <Dialog open={showEditNameDialog} onOpenChange={setShowEditNameDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Edit your name</DialogTitle>
            <DialogDescription>
              Update your display name as it appears across the app.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveName} className="space-y-4">
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Your name"
              autoFocus
              required
            />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowEditNameDialog(false)}
                disabled={isUpdating}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!editName.trim() || isUpdating}>
                {isUpdating ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Personalization Dialog */}
      <Dialog
        open={showPersonalizationDialog}
        onOpenChange={(open) => {
          setShowPersonalizationDialog(open);
          if (!open) {
            setRoleInput('');
            setTaskInput('');
            setSelectedTaskKey(null);
            setSelectedPrompt('');
            setErrorMsg(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-[900px]">
          <DialogHeader>
            <DialogTitle>Personalization</DialogTitle>
            <DialogDescription>
              Type a role and a task, then click Generate to create a prompt you can copy.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Tabs defaultValue="prompt" className="space-y-4">
              <TabsList>
                <TabsTrigger value="prompt">Prompt Library</TabsTrigger>
                <TabsTrigger value="company">Company Profile</TabsTrigger>
              </TabsList>

              <TabsContent value="prompt" className="space-y-4">
                {/* Role input */}
                <div>
                  <Label htmlFor="personalization-role">Role</Label>
                  <Input
                    id="personalization-role"
                    placeholder="e.g., Recruiter, HR Manager, Payroll Specialist"
                    value={roleInput}
                    onChange={(e) => setRoleInput(e.target.value)}
                  />
                </div>
                {/* Task input placed below role */}
                <div>
                  <Label htmlFor="task-input">Task</Label>
                  <Textarea
                    id="task-input"
                    placeholder="e.g., draft_offer_letter"
                    value={taskInput}
                    onChange={(e) => setTaskInput(e.target.value)}
                    className="min-h-24 resize-none"
                    rows={3}
                  />
                </div>
                <div className="flex justify-end">
                  <Button
                    type="button"
                    onClick={() => {
                      if (!roleInput.trim() || !taskInput.trim()) return;
                      setSelectedTaskKey(taskInput.trim());
                      fetchTaskPrompt(roleInput, taskInput.trim());
                    }}
                    disabled={!roleInput.trim() || !taskInput.trim() || isLoadingTask}
                  >
                    {isLoadingTask ? 'Generating…' : 'Generate'}
                  </Button>
                </div>

                {/* Error state */}
                {errorMsg && (
                  <div className="text-sm text-destructive">{errorMsg}</div>
                )}

                {/* Prompt output */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Prompt</Label>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleCopy}
                      disabled={!selectedPrompt && selectedPrompts.length === 0}
                      className="h-8 px-3"
                    >
                      {copied ? 'Copied' : 'Copy'}
                    </Button>
                  </div>
                  {selectedPrompts.length > 0 ? (
                    <div className="max-h-[360px] overflow-y-auto pr-2">
                      <div className="grid gap-3">
                        {selectedPrompts.map((p, idx) => (
                          <div key={`prompt-${idx}`} className="rounded-md border p-3 whitespace-pre-wrap text-sm leading-6 bg-background">
                            <div className="font-medium mb-1">Prompt {idx + 1}</div>
                            {formatPromptToLines(p)}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <Textarea
                      readOnly
                      value={isLoadingTask ? 'Generating…' : selectedPrompt}
                      placeholder={'Type a role and task, then click Generate'}
                      className="min-h-[360px]"
                    />
                  )}
                </div>
              </TabsContent>

              <TabsContent value="company" className="space-y-4">
                <CompanyProfileTab />
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function CompanyProfileTab() {
  const [companyName, setCompanyName] = React.useState('');
  const [websiteUrl, setWebsiteUrl] = React.useState('');
  const [companyDescription, setCompanyDescription] = React.useState('');
  const [services, setServices] = React.useState<string[]>([]);
  const [products, setProducts] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const fetchProfile = async () => {
    if (!websiteUrl.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ url: websiteUrl.trim() });
      if (companyName.trim()) params.set('name', companyName.trim());
      const { data, success } = await backendApi.get<{
        company_name?: string;
        website_url: string;
        company_description: string;
        services: string[];
        products: string[];
      }>(`/company_profile/?${params.toString()}`);
      if (!success || !data) {
        // Fallback attempt for environments where API_URL misses "/api" prefix
        const res = await fetch(`/api/company_profile/?${params.toString()}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const alt = await res.json();
        setCompanyDescription(alt?.company_description || '');
        setServices(Array.isArray(alt?.services) ? alt.services : []);
        setProducts(Array.isArray(alt?.products) ? alt.products : []);
        if (!companyName && alt?.company_name) setCompanyName(alt.company_name);
        return;
      }
      if (!companyName && data.company_name) setCompanyName(data.company_name);
      setCompanyDescription(data.company_description || '');
      setServices(Array.isArray(data.services) ? data.services : []);
      setProducts(Array.isArray(data.products) ? data.products : []);
    } catch (e) {
      setError('Failed to fetch company profile.');
      setCompanyDescription('');
      setServices([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="company-name">Company Name</Label>
        <Input
          id="company-name"
          placeholder="e.g., Neural Arc Inc"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="company-url">Website URL</Label>
        <div className="flex gap-2">
          <Input
            id="company-url"
            placeholder="https://example.com"
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
          />
          <Button type="button" onClick={fetchProfile} disabled={!websiteUrl.trim() || loading}>
            {loading ? 'Fetching…' : 'Fetch'}
          </Button>
        </div>
      </div>
      {error && <div className="text-sm text-destructive">{error}</div>}
      <div>
        <Label>Company Description</Label>
        <Textarea readOnly value={companyDescription} placeholder="Description will appear here" className="min-h-28" />
      </div>
      <div>
        <Label>Services & Products</Label>
        {services.length === 0 ? (
          <div className="text-sm text-foreground/70">No services or products found yet.</div>
        ) : (
          <div className="space-y-3">
            {services.length > 0 && (
              <div>
                <div className="text-sm font-medium text-foreground/80 mb-2">Services:</div>
                <ul className="list-disc pl-5 text-sm space-y-1">
                  {services.map((s, i) => (
                    <li key={`service-${s}-${i}`}>{s}</li>
                  ))}
                </ul>
              </div>
            )}
            {products.length > 0 && (
              <div>
                <div className="text-sm font-medium text-foreground/80 mb-2">Products:</div>
                <ul className="list-disc pl-5 text-sm space-y-1">
                  {products.map((p, i) => (
                    <li key={`product-${p}-${i}`}>{p}</li>
                  ))}
                </ul>
              </div>
            )}
            {(services.length === 0 && products.length === 0) && (
              <ul className="list-disc pl-5 text-sm space-y-1">
                {services.map((s, i) => (
                  <li key={`${s}-${i}`}>{s}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Helper to format a prompt into ~4-5 lines for readability
function formatPromptToLines(prompt: string) {
  // Prefer explicit line breaks from backend. First line is objective, following are numbered steps
  const rawLines = prompt.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (rawLines.length > 0 && /^(?:\d+[\.)])/.test(rawLines[0])) {
    // If first line is also numbered, treat all as steps
    const steps = rawLines.map(l => {
      const m = l.match(/^(\d+)[\.)]\s*(.*)$/);
      return m ? `${m[1]}. ${m[2]}` : l;
    });
    return (
      <div className="space-y-1">
        {steps.map((s, i) => (
          <div key={i}>{s}</div>
        ))}
      </div>
    );
  }

  const objective = rawLines[0] ?? '';
  const steps = rawLines.slice(1).map(l => {
    const m = l.match(/^(\d+)[\.)]\s*(.*)$/);
    return m ? `${m[1]}. ${m[2]}` : l;
  });

  return (
    <div className="space-y-1">
      {objective && <div>{objective}</div>}
      {steps.map((s, i) => (
        <div key={i}>{s}</div>
      ))}
    </div>
  );
}
