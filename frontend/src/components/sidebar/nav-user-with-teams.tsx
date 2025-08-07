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

export function NavUserWithTeams({
  user,
  onUserUpdate,
}: {
  user: {
    name: string;
    email: string;
    avatar: string;
  };
  onUserUpdate?: (updatedUser: { name: string; email: string; avatar: string }) => void;
}) {
  const router = useRouter();
  const { isMobile } = useSidebar();
  const { data: accounts } = useAccounts();
  const [showNewTeamDialog, setShowNewTeamDialog] = React.useState(false);
  const [showEditNameDialog, setShowEditNameDialog] = React.useState(false);
  const [editName, setEditName] = React.useState(user.name);
  const [isUpdating, setIsUpdating] = React.useState(false);
  const { theme, setTheme } = useTheme();
  const { enabled: customAgentsEnabled, loading: flagLoading } = useFeatureFlag("custom_agents");
  const { refreshUser } = useAuth();

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
          first_name: editName.trim().split(' ')[0] // Also update first_name for consistency
        }
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
          name: editName.trim()
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
                  <div className="flex items-center gap-2 px-1.5 py-1.5 text-left text-sm">
                    <Avatar className="h-8 w-8 rounded-lg">
                      <AvatarImage src={user.avatar} alt={user.name} />
                      <AvatarFallback className="rounded-lg">
                        {getInitials(user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-medium flex items-center gap-1">
                        {user.name}
                        <Pencil
                          className="w-3 h-3 cursor-pointer text-muted-foreground/80 hover:text-foreground"
                          onClick={e => {
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
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                {/* Teams Section */}
                {personalAccount && (
                  <>
                    <DropdownMenuLabel className="text-muted-foreground text-xs">
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
                      <div className="flex size-6 items-center justify-center rounded-xs border">
                        <Command className="size-4 shrink-0" />
                      </div>
                      {personalAccount.name}
                      <DropdownMenuShortcut>⌘1</DropdownMenuShortcut>
                    </DropdownMenuItem>
                  </>
                )}

                {teamAccounts?.length > 0 && (
                  <>
                    <DropdownMenuLabel className="text-muted-foreground text-xs mt-2">
                      Teams
                    </DropdownMenuLabel>
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
                        <div className="flex size-6 items-center justify-center rounded-xs border">
                          <AudioWaveform className="size-4 shrink-0" />
                        </div>
                        {team.name}
                        <DropdownMenuShortcut>⌘{index + 2}</DropdownMenuShortcut>
                      </DropdownMenuItem>
                    ))}
                  </>
                )}

                <DropdownMenuSeparator />

                {/* Create Team Option */}
                <DropdownMenuItem
                  onClick={() => setShowNewTeamDialog(true)}
                  className="gap-2 p-2"
                >
                  <Plus className="size-4 shrink-0" />
                  Create Team
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                {/* User Settings Section */}
                <DropdownMenuGroup>
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
                  {isLocalMode() && <DropdownMenuItem asChild>
                    <Link href="/settings/env-manager">
                      <KeyRound className="h-4 w-4" />
                      Local .Env Manager
                    </Link>
                  </DropdownMenuItem>}
                  <DropdownMenuItem
                    onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                  >
                    <div className="flex items-center gap-2">
                      <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                      <span>{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem className='text-destructive focus:text-destructive focus:bg-destructive/10' onClick={handleLogout}>
                  <LogOut className="h-4 w-4 text-destructive" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>

        <DialogContent className="sm:max-w-[425px] border-subtle dark:border-white/10 bg-card-bg dark:bg-background-secondary rounded-2xl shadow-custom">
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
            <DialogDescription>Update your display name as it appears across the app.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveName} className="space-y-4">
            <Input
              value={editName}
              onChange={e => setEditName(e.target.value)}
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
              <Button 
                type="submit" 
                disabled={!editName.trim() || isUpdating}
              >
                {isUpdating ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
