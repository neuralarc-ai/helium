'use client';

import React, {
  useState,
  useRef,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from 'react';
import { useAgents } from '@/hooks/react-query/agents/use-agents';

import { Card, CardContent } from '@/components/ui/card';
import { handleFiles } from './file-upload-handler';
import { MessageInput } from './message-input';
import { AttachmentGroup } from '../attachment-group';
import { useModelSelection } from './_use-model-selection';
import { useFileDelete } from '@/hooks/react-query/files';
import { useQueryClient } from '@tanstack/react-query';
import { projectKeys } from '@/hooks/react-query/sidebar/keys';
import { threadKeys } from '@/hooks/react-query/threads/keys';
import { ToolCallInput } from './floating-tool-preview';
import { ChatSnack } from './chat-snack';
import { Brain, Zap, Workflow, Database } from 'lucide-react';
import { FaGoogle, FaDiscord } from 'react-icons/fa';
import { SiNotion } from 'react-icons/si';
import { AgentConfigModal } from '@/components/agents/agent-config-modal';
import { PipedreamRegistry } from '@/components/agents/pipedream/pipedream-registry';
import { pipedreamApi } from '@/hooks/react-query/pipedream/utils';
import { usePipedreamProfiles } from '@/hooks/react-query/pipedream/use-pipedream-profiles';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useSubscriptionWithStreaming } from '@/hooks/react-query/subscriptions/use-subscriptions';
import { isLocalMode } from '@/lib/config';
import { BillingModal } from '@/components/billing/billing-modal';
import { useRouter } from 'next/navigation';
import { BorderBeam } from '@/components/magicui/border-beam';
import { toast } from 'sonner';
import { createProject, createThread, addUserMessage, startAgent } from '@/lib/api';
import { createClient } from '@/lib/supabase/client';

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || '';

// Helper function to check if we're in production mode
const isProductionMode = (): boolean => {
  const envMode = process.env.NEXT_PUBLIC_ENV_MODE?.toLowerCase();
  return envMode === 'production';
};

export interface ChatInputHandles {
  getPendingFiles: () => File[];
  clearPendingFiles: () => void;
}

export interface ChatInputProps {
  onSubmit: (
    message: string,
    options?: { model_name?: string; enable_thinking?: boolean },
  ) => void;
  placeholder?: string;
  loading?: boolean;
  disabled?: boolean;
  isAgentRunning?: boolean;
  onStopAgent?: () => void;
  autoFocus?: boolean;
  value?: string;
  onChange?: (value: string) => void;
  onFileBrowse?: () => void;
  sandboxId?: string;
  hideAttachments?: boolean;
  selectedAgentId?: string;
  onAgentSelect?: (agentId: string | undefined) => void;
  agentName?: string;
  messages?: any[];
  bgColor?: string;
  toolCalls?: ToolCallInput[];
  toolCallIndex?: number;
  showToolPreview?: boolean;
  onExpandToolPreview?: () => void;
  isLoggedIn?: boolean;
  enableAdvancedConfig?: boolean;
  onConfigureAgent?: (agentId: string) => void;
  hideAgentSelection?: boolean;
  defaultShowSnackbar?: 'tokens' | 'upgrade' | false;
  showToLowCreditUsers?: boolean;
  agentMetadata?: {
    is_suna_default?: boolean;
  };
  // Optional context to append tool operations to an existing project/thread instead of creating new
  contextProjectId?: string;
  contextThreadId?: string;
}

export interface UploadedFile {
  name: string;
  path: string;
  size: number;
  type: string;
  localUrl?: string;
}



export const ChatInput = forwardRef<ChatInputHandles, ChatInputProps>(
  (
    {
      onSubmit,
      placeholder = 'Assign tasks or ask anything...',
      loading = false,
      disabled = false,
      isAgentRunning = false,
      onStopAgent,
      autoFocus = true,
      value: controlledValue,
      onChange: controlledOnChange,
      onFileBrowse,
      sandboxId,
      hideAttachments = false,
      selectedAgentId,
      onAgentSelect,
      agentName,
      messages = [],
      bgColor = 'bg-card',
      toolCalls = [],
      toolCallIndex = 0,
      showToolPreview = false,
      onExpandToolPreview,
      isLoggedIn = true,
      enableAdvancedConfig = false,
      onConfigureAgent,
      hideAgentSelection = false,
      defaultShowSnackbar = false,
      showToLowCreditUsers = true,
      agentMetadata,
      contextProjectId,
      contextThreadId,
    },
    ref,
  ) => {
    const isControlled =
      controlledValue !== undefined && controlledOnChange !== undefined;
    const router = useRouter();

    const [uncontrolledValue, setUncontrolledValue] = useState('');
    const value = isControlled ? controlledValue : uncontrolledValue;

    const isSunaAgent = agentMetadata?.is_suna_default || false;

    const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
    const [pendingFiles, setPendingFiles] = useState<File[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [isDraggingOver, setIsDraggingOver] = useState(false);
    const [configModalOpen, setConfigModalOpen] = useState(false);
    const [configModalTab, setConfigModalTab] = useState('integrations');
    const [registryDialogOpen, setRegistryDialogOpen] = useState(false);
    const [showSnackbar, setShowSnackbar] = useState(defaultShowSnackbar);
    const [userDismissedUsage, setUserDismissedUsage] = useState(false);
    const [billingModalOpen, setBillingModalOpen] = useState(false);

    const {
      selectedModel,
      setSelectedModel: handleModelChange,
      subscriptionStatus,
      allModels: modelOptions,
      canAccessModel,
      getActualModelId,
      refreshCustomModels,
    } = useModelSelection();

    const { data: subscriptionData } = useSubscriptionWithStreaming(isAgentRunning);
    const deleteFileMutation = useFileDelete();
    const queryClient = useQueryClient();

    // Automatic tool execution state
    const [selectedProfileId, setSelectedProfileId] = useState<string>('');
    const [selectedToolName, setSelectedToolName] = useState<string>('');
    const [isToolMode, setIsToolMode] = useState(false);
    const [currentProfileName, setCurrentProfileName] = useState<string>('');
    const [isExecutingTool, setIsExecutingTool] = useState(false);
    const [currentThreadId, setCurrentThreadId] = useState<string>('');
    const [currentProjectId, setCurrentProjectId] = useState<string>('');
    const { data: pdProfiles } = usePipedreamProfiles({ is_active: true });
    const enabledToolsByProfile = React.useMemo(() => {
      const map: Record<string, string[]> = {};
      (pdProfiles || []).forEach((p: any) => {
        if (p.enabled_tools && p.enabled_tools.length > 0 && p.is_connected) {
          map[p.profile_id] = p.enabled_tools;
        }
      });
      return map;
    }, [pdProfiles]);

    // Store current tool purpose and category
    const [currentToolPurpose, setCurrentToolPurpose] = useState<string>('');
    const [currentToolCategory, setCurrentToolCategory] = useState<string>('');

    // Store current tool description
    const [currentToolDescription, setCurrentToolDescription] = useState<string>('');

    // Auto-select profile/tool based on message content using keyword scoring
    useEffect(() => {
      const text = ((isControlled ? controlledValue : uncontrolledValue) || '').toLowerCase();
      if (!text.trim()) {
        setIsToolMode(false);
        setSelectedProfileId('');
        setSelectedToolName('');
        setCurrentProfileName('');
        setCurrentToolPurpose('');
        setCurrentToolCategory('');
        setCurrentToolDescription('');
        return;
      }

      // Debounce the tool selection to avoid rapid changes
      const timeoutId = setTimeout(() => {
      const profiles: any[] = (pdProfiles || []).filter((p: any) => p.is_connected && (p.enabled_tools?.length || 0) > 0);
        if (profiles.length === 0) {
          setIsToolMode(false);
          return;
        }

        // Enhanced app keyword mapping with purpose categorization
        const appKeywordMap: Record<string, { keywords: string[], purpose: string, category: string }> = {
          google_calendar: {
            keywords: ['calendar', 'event', 'invite', 'meeting', 'schedule', 'reschedule', 'appointment', 'agenda', 'reminder', 'booking'],
            purpose: 'create',
            category: 'scheduling'
          },
          google_meet: {
            keywords: ['google meet', 'meet', 'video', 'video call', 'meeting', 'conference', 'call', 'join', 'invite', 'meeting link', 'hangout'],
            purpose: 'create',
            category: 'scheduling'
          },
          google_sheets: {
            keywords: ['google sheets', 'sheets', 'sheet', 'spreadsheet', 'workbook', 'excel', 'table', 'cell', 'cells', 'row', 'column', 'formula', 'csv'],
            purpose: 'create',
            category: 'data_management'
          },
          google_drive: {
            keywords: ['drive', 'file', 'files', 'upload', 'doc', 'docs', 'folder', 'document', 'presentation', 'pdf', 'image', 'photo'],
            purpose: 'upload',
            category: 'file_management'
          },
          gmail: {
            keywords: ['gmail', 'mail', 'email', 'inbox', 'send email', 'compose', 'draft', 'message', 'correspondence', 'mailbox'],
            purpose: 'send',
            category: 'communication'
          },
          slack: {
            keywords: ['slack', 'channel', 'dm', 'message', 'post', 'team', 'workspace', 'notification', 'chat', 'communication'],
            purpose: 'send',
            category: 'communication'
          },
          notion: {
            keywords: ['notion', 'page', 'database', 'db', 'note', 'workspace', 'documentation', 'wiki', 'knowledge base'],
            purpose: 'create',
            category: 'content_creation'
          },
          github: {
            keywords: ['github', 'issue', 'pull request', 'pr', 'repo', 'repository', 'code', 'git', 'commit', 'branch', 'merge'],
            purpose: 'create',
            category: 'development'
          },
          zoom: {
            keywords: ['zoom', 'meeting', 'schedule', 'invite', 'video call', 'conference', 'webinar', 'call', 'video meeting'],
            purpose: 'create',
            category: 'scheduling'
          },
          discord: {
            keywords: ['discord', 'server', 'channel', 'message', 'bot', 'guild', 'community', 'chat server'],
            purpose: 'send',
            category: 'communication'
          },
          trello: {
            keywords: ['trello', 'board', 'card', 'list', 'task', 'project', 'kanban', 'workflow', 'management'],
            purpose: 'create',
            category: 'project_management'
          },
          asana: {
            keywords: ['asana', 'task', 'project', 'team', 'workflow', 'project management', 'assignment'],
            purpose: 'create',
            category: 'project_management'
          },
          jira: {
            keywords: ['jira', 'ticket', 'issue', 'project', 'sprint', 'agile', 'bug', 'feature request'],
            purpose: 'create',
            category: 'project_management'
          },
          figma: {
            keywords: ['figma', 'design', 'prototype', 'mockup', 'ui', 'ux', 'wireframe', 'design file'],
            purpose: 'create',
            category: 'design'
          },
          canva: {
            keywords: ['canva', 'design', 'template', 'graphic', 'presentation', 'poster', 'banner', 'social media'],
            purpose: 'create',
            category: 'design'
          },
          airtable: {
            keywords: ['airtable', 'database', 'base', 'table', 'record', 'spreadsheet', 'data management'],
            purpose: 'create',
            category: 'data_management'
          },
          zapier: {
            keywords: ['zapier', 'automation', 'workflow', 'integration', 'trigger', 'webhook', 'connect apps'],
            purpose: 'create',
            category: 'automation'
          },
          make: {
            keywords: ['make', 'automation', 'scenario', 'workflow', 'integration', 'connect', 'automate'],
            purpose: 'create',
            category: 'automation'
          },
        };

        // Enhanced tool selection heuristics by purpose and category
        const toolPurposeMap: Record<string, Array<{ match: string[]; toolContains: string; purpose: string; description: string }>> = {
        google_calendar: [
            { match: ['create', 'new', 'schedule', 'add', 'book', 'make', 'set up', 'arrange'], toolContains: 'create', purpose: 'create', description: 'Create new calendar events' },
            { match: ['update', 'reschedule', 'move', 'change', 'modify', 'edit', 'adjust', 'shift'], toolContains: 'update', purpose: 'update', description: 'Modify existing events' },
            { match: ['delete', 'remove', 'cancel', 'delete', 'erase', 'clear'], toolContains: 'delete', purpose: 'delete', description: 'Remove calendar events' },
            { match: ['list', 'show', 'find', 'upcoming', 'search', 'get', 'view', 'see', 'display'], toolContains: 'list', purpose: 'read', description: 'View calendar events' },
        ],
        google_meet: [
            { match: ['create', 'new', 'schedule', 'start', 'initiate', 'host', 'set up', 'arrange'], toolContains: 'create', purpose: 'create', description: 'Create new video meetings' },
            { match: ['join', 'enter', 'participate', 'attend', 'connect', 'access'], toolContains: 'join', purpose: 'join', description: 'Join existing meetings' },
            { match: ['invite', 'add', 'include', 'send link', 'share', 'notify'], toolContains: 'invite', purpose: 'invite', description: 'Invite participants to meetings' },
            { match: ['record', 'save', 'capture', 'store', 'archive'], toolContains: 'record', purpose: 'record', description: 'Record meeting sessions' },
            { match: ['end', 'stop', 'finish', 'close', 'terminate', 'hang up'], toolContains: 'end', purpose: 'end', description: 'End active meetings' },
        ],
        google_sheets: [
            { match: ['create', 'new', 'make', 'generate', 'build', 'set up'], toolContains: 'create', purpose: 'create', description: 'Create new spreadsheets' },
            { match: ['edit', 'modify', 'change', 'update', 'adjust', 'alter'], toolContains: 'edit', purpose: 'edit', description: 'Edit spreadsheet content' },
            { match: ['add', 'insert', 'append', 'include', 'put in'], toolContains: 'add', purpose: 'add', description: 'Add data to spreadsheets' },
            { match: ['delete', 'remove', 'clear', 'erase', 'eliminate'], toolContains: 'delete', purpose: 'delete', description: 'Remove data from spreadsheets' },
            { match: ['format', 'style', 'design', 'appearance', 'layout'], toolContains: 'format', purpose: 'format', description: 'Format spreadsheet appearance' },
            { match: ['share', 'permission', 'access', 'collaborate', 'invite'], toolContains: 'share', purpose: 'share', description: 'Share spreadsheets with others' },
            { match: ['view', 'see', 'display', 'show', 'browse', 'read'], toolContains: 'view', purpose: 'read', description: 'View spreadsheet content' },
            { match: ['export', 'download', 'save as', 'convert', 'extract'], toolContains: 'export', purpose: 'export', description: 'Export spreadsheets to other formats' },
        ],
        google_drive: [
            { match: ['upload', 'put', 'save', 'store', 'backup', 'sync'], toolContains: 'upload', purpose: 'upload', description: 'Upload existing files to Drive' },
            { match: ['create', 'new', 'make', 'generate', 'build'], toolContains: 'create', purpose: 'create', description: 'Create new files/folders from scratch' },
            { match: ['create folder', 'new folder', 'folder', 'directory', 'organize', 'group'], toolContains: 'folder', purpose: 'create', description: 'Create new folders' },
            { match: ['list', 'show', 'find', 'search', 'get', 'view', 'see', 'browse'], toolContains: 'list', purpose: 'read', description: 'List files and folders' },
            { match: ['share', 'permission', 'access', 'collaborate', 'invite', 'grant access'], toolContains: 'share', purpose: 'share', description: 'Share files and folders' },
            { match: ['download', 'get', 'retrieve', 'save locally', 'export'], toolContains: 'download', purpose: 'download', description: 'Download files' },
        ],
        gmail: [
            { match: ['send', 'email', 'mail', 'compose', 'write', 'draft', 'reply'], toolContains: 'send', purpose: 'send', description: 'Send emails' },
            { match: ['search', 'find', 'lookup', 'filter', 'sort', 'organize'], toolContains: 'search', purpose: 'read', description: 'Search emails' },
            { match: ['draft', 'compose', 'write', 'create email', 'new email'], toolContains: 'draft', purpose: 'create', description: 'Create email drafts' },
        ],
        slack: [
            { match: ['send', 'message', 'post', 'write', 'notify', 'announce'], toolContains: 'post', purpose: 'send', description: 'Send messages' },
            { match: ['create channel', 'new channel', 'channel', 'room', 'space'], toolContains: 'channel', purpose: 'create', description: 'Create channels' },
            { match: ['dm', 'direct message', 'private', 'personal', 'one-on-one'], toolContains: 'dm', purpose: 'send', description: 'Send direct messages' },
        ],
        notion: [
            { match: ['create page', 'new page', 'page', 'note', 'document', 'entry'], toolContains: 'page', purpose: 'create', description: 'Create new pages' },
            { match: ['database', 'db', 'row', 'table', 'collection', 'records'], toolContains: 'database', purpose: 'create', description: 'Create databases' },
            { match: ['workspace', 'space', 'area', 'section', 'project'], toolContains: 'workspace', purpose: 'create', description: 'Create workspaces' },
        ],
        github: [
            { match: ['create issue', 'new issue', 'bug', 'issue', 'problem', 'ticket'], toolContains: 'issue', purpose: 'create', description: 'Create issues' },
            { match: ['pull request', 'pr', 'merge', 'code review', 'contribution'], toolContains: 'pull', purpose: 'create', description: 'Create pull requests' },
            { match: ['repository', 'repo', 'code', 'project', 'source code'], toolContains: 'repo', purpose: 'create', description: 'Create repositories' },
        ],
        zoom: [
            { match: ['schedule', 'create', 'meeting', 'call', 'video call', 'conference'], toolContains: 'create', purpose: 'create', description: 'Schedule meetings' },
            { match: ['join', 'start', 'host', 'begin', 'launch', 'initiate'], toolContains: 'join', purpose: 'join', description: 'Join meetings' },
          ],
          discord: [
            { match: ['send', 'message', 'post', 'write', 'notify', 'announce'], toolContains: 'send', purpose: 'send', description: 'Send messages' },
            { match: ['create channel', 'server', 'room', 'space', 'category'], toolContains: 'channel', purpose: 'create', description: 'Create channels' },
          ],
          trello: [
            { match: ['create card', 'new card', 'task', 'item', 'entry', 'work item'], toolContains: 'card', purpose: 'create', description: 'Create cards' },
            { match: ['board', 'list', 'column', 'lane', 'swimlane'], toolContains: 'board', purpose: 'create', description: 'Create boards' },
          ],
          asana: [
            { match: ['create task', 'new task', 'task', 'work item', 'assignment', 'todo'], toolContains: 'task', purpose: 'create', description: 'Create tasks' },
            { match: ['project', 'team', 'group', 'initiative', 'campaign'], toolContains: 'project', purpose: 'create', description: 'Create projects' },
          ],
          jira: [
            { match: ['create ticket', 'new ticket', 'issue', 'bug', 'story', 'epic'], toolContains: 'issue', purpose: 'create', description: 'Create tickets' },
            { match: ['project', 'sprint', 'iteration', 'cycle', 'milestone'], toolContains: 'project', purpose: 'create', description: 'Create projects' },
          ],
          figma: [
            { match: ['create design', 'new design', 'prototype', 'mockup', 'wireframe'], toolContains: 'create', purpose: 'create', description: 'Create designs' },
            { match: ['file', 'project', 'design file', 'artboard', 'canvas'], toolContains: 'file', purpose: 'create', description: 'Create design files' },
          ],
          canva: [
            { match: ['create design', 'new design', 'template', 'layout', 'composition'], toolContains: 'create', purpose: 'create', description: 'Create graphics' },
            { match: ['design', 'graphic', 'visual', 'artwork', 'presentation'], toolContains: 'design', purpose: 'create', description: 'Create graphics' },
          ],
          airtable: [
            { match: ['create record', 'new record', 'add', 'insert', 'entry', 'row'], toolContains: 'create', purpose: 'create', description: 'Create records' },
            { match: ['database', 'base', 'table', 'collection', 'dataset'], toolContains: 'database', purpose: 'create', description: 'Create databases' },
          ],
          zapier: [
            { match: ['create zap', 'new zap', 'automation', 'workflow', 'connection'], toolContains: 'create', purpose: 'create', description: 'Create automations' },
            { match: ['workflow', 'trigger', 'action', 'step', 'process'], toolContains: 'workflow', purpose: 'create', description: 'Create workflows' },
          ],
          make: [
            { match: ['create scenario', 'new scenario', 'automation', 'workflow', 'connection'], toolContains: 'create', purpose: 'create', description: 'Create scenarios' },
            { match: ['workflow', 'trigger', 'action', 'step', 'process'], toolContains: 'workflow', purpose: 'create', description: 'Create workflows' },
          ],
        };

        // Get tool description for better user understanding
        const getToolDescription = (appSlug: string, toolName: string): string => {
          const heur = toolPurposeMap[appSlug] || [];
          for (const h of heur) {
            if (toolName.toLowerCase().includes(h.toolContains)) {
              return h.description;
            }
          }
          return `Execute ${toolName}`;
        };

        const scoreProfile = (p: any): { score: number, purpose: string, category: string } => {
        let score = 0;
          let purpose = '';
          let category = '';
        const slug = (p.app_slug || '').toLowerCase();
        const name = (p.app_name || '').toLowerCase();
          
          // Get app info
          const appInfo = appKeywordMap[slug] || appKeywordMap[name];
          if (appInfo) {
            purpose = appInfo.purpose;
            category = appInfo.category;
          }
          
          // Direct app name/slug matches get highest score
          if (slug && text.includes(slug)) score += 5;
          if (name && text.includes(name)) score += 5;
          
          // Keyword matches get medium score
          if (appInfo) {
            const kws = appInfo.keywords || [];
            kws.forEach((kw) => { 
              if (text.includes(kw)) score += 3; 
            });
          }
          
          // Prefer Google Sheets over Drive when spreadsheet-like intents are present
          const spreadsheetSignals = [
            'spreadsheet', 'sheets', 'sheet', 'workbook', 'excel', 'csv',
            'cell', 'cells', 'row', 'rows', 'column', 'columns', 'formula', 'pivot table', 'table'
          ];
          const mentionsSpreadsheet = spreadsheetSignals.some(sig => text.includes(sig));
          if (mentionsSpreadsheet) {
            if (slug === 'google_sheets' || name === 'google sheets') {
              score += 8; // strong positive bias toward Sheets
            }
            if (slug === 'google_drive' || name === 'google drive') {
              score -= 4; // de-prioritize Drive for spreadsheet intents
            }
          }

          // Tool name matches get lower score
        const tools: string[] = p.enabled_tools || [];
          tools.forEach((t) => { 
            if (text.includes(t.toLowerCase())) score += 2; 
          });
          
          // Natural language patterns get bonus points
          const naturalPatterns = [
            'i want to', 'i need to', 'can you', 'please', 'help me',
            'create a', 'make a', 'set up', 'organize', 'manage',
            'send', 'share', 'upload', 'download', 'find', 'search'
          ];
          
          naturalPatterns.forEach((pattern) => {
            if (text.includes(pattern)) score += 1;
          });
          
          // Sentence structure patterns
          const sentencePatterns = [
            'schedule a meeting', 'create an event', 'send an email',
            'upload a file', 'create a folder', 'make a note',
            'set up a', 'organize my', 'manage my', 'find my'
          ];
          
          sentencePatterns.forEach((pattern) => {
            if (text.includes(pattern)) score += 2;
          });
          
          // Purpose-specific scoring
          if (purpose === 'create' && (text.includes('create') || text.includes('make') || text.includes('new'))) {
            score += 2;
          }
          if (purpose === 'upload' && (text.includes('upload') || text.includes('add') || text.includes('save'))) {
            score += 2;
          }
          if (purpose === 'send' && (text.includes('send') || text.includes('post') || text.includes('message'))) {
            score += 2;
          }
          
          return { score, purpose, category };
      };

      // Pick highest-scoring profile above a confidence threshold
        let best = { p: null as any, s: -1, purpose: '', category: '' };
      profiles.forEach((p) => {
          const result = scoreProfile(p);
          if (result.score > best.s) best = { p, s: result.score, purpose: result.purpose, category: result.category };
        });
        
        const chosen = best.s >= 6 ? best.p : null; // Increased threshold for better accuracy

        if (chosen) {
          setIsToolMode(true);
          setSelectedProfileId(chosen.profile_id);
          setCurrentProfileName(chosen.app_name || chosen.profile_name || 'Tool');
          
        const tools: string[] = chosen.enabled_tools || [];
          
          // Enhanced tool selection logic
          let matched = null;
          let bestToolScore = -1;
          
          // First, try to find exact matches in the text
          tools.forEach((tool) => {
            const toolLower = tool.toLowerCase();
            if (text.includes(toolLower)) {
              matched = tool;
              bestToolScore = 10; // High score for exact matches
            }
          });
          
          // HARD CODED: Google Drive specific tool mappings with comprehensive catch phrases
          if (!matched && chosen.app_slug === 'google_drive') {
            // Create file from text
            const createFilePhrases = [
              'create file', 'create a file', 'create file in my drive', 'create a file in my drive',
              'make a file', 'make file', 'generate file', 'generate a file', 'new file', 'new text file',
              'create document', 'create a document', 'make document', 'make a document',
              'create text file', 'create a text file', 'make text file', 'make a text file',
              'write file', 'write a file', 'compose file', 'compose a file'
            ];
            
            // Upload file
            const uploadFilePhrases = [
              'upload file', 'upload a file', 'upload files', 'upload to drive', 'upload to my drive',
              'put file', 'put a file', 'put files',
              'save file', 'save a file', 'save files', 'store file', 'store a file', 'store files',
              'backup file', 'backup a file', 'backup files', 'sync file', 'sync a file', 'sync files',
              'import file', 'import a file', 'import files', 'move file to drive', 'move files to drive'
            ];
            
            // Share file
            const shareFilePhrases = [
              'share file', 'share a file', 'share files', 'share with', 'share document',
              'give access', 'grant access', 'permission', 'permissions', 'make public',
              'make private', 'invite', 'invite to', 'collaborate', 'collaboration',
              'set sharing', 'change sharing', 'update sharing', 'modify sharing',
              'public access', 'private access', 'restrict access', 'allow access'
            ];
            
            // Delete file
            const deleteFilePhrases = [
              'delete file', 'delete a file', 'delete files', 'remove file', 'remove a file', 'remove files',
              'trash file', 'trash a file', 'trash files', 'move to trash', 'move file to trash',
              'erase file', 'erase a file', 'erase files', 'clear file', 'clear a file', 'clear files',
              'drop file', 'drop a file', 'drop files', 'discard file', 'discard a file', 'discard files'
            ];
            
            // Download file
            const downloadFilePhrases = [
              'download file', 'download a file', 'download files', 'get file', 'get a file', 'get files',
              'save locally', 'save to computer', 'save to desktop', 'export file', 'export a file', 'export files',
              'retrieve file', 'retrieve a file', 'retrieve files', 'pull file', 'pull a file', 'pull files',
              'copy to computer', 'copy to desktop', 'backup to computer', 'backup to desktop'
            ];
            
            // Find file
            const findFilePhrases = [
              'find file', 'find a file', 'find files', 'search file', 'search for file', 'search files',
              'look for file', 'look for files', 'locate file', 'locate a file', 'locate files',
              'where is', 'where are', 'find my', 'search my', 'look up', 'lookup',
              'discover file', 'discover files', 'browse files', 'explore files'
            ];
            
            // List files
            const listFilePhrases = [
              'list files', 'list file', 'show files', 'show file', 'display files', 'display file',
              'view files', 'view file', 'see files', 'see file', 'browse', 'explore',
              'what files', 'what file', 'my files', 'all files', 'files in', 'contents of',
              'folder contents', 'directory contents', 'drive contents', 'what\'s in'
            ];
            
            // Check each category and select appropriate tool
            if (createFilePhrases.some(phrase => text.includes(phrase))) {
              const createFileFromTextTool = tools.find(tool => tool.toLowerCase().includes('create-file-from-text'));
              if (createFileFromTextTool) {
                matched = createFileFromTextTool;
                bestToolScore = 100;
              }
            } else if (uploadFilePhrases.some(phrase => text.includes(phrase))) {
              const uploadFileTool = tools.find(tool => tool.toLowerCase().includes('upload-file'));
              if (uploadFileTool) {
                matched = uploadFileTool;
                bestToolScore = 100;
              }
            } else if (shareFilePhrases.some(phrase => text.includes(phrase))) {
              const shareFileTool = tools.find(tool => tool.toLowerCase().includes('add-file-sharing-preference'));
              if (shareFileTool) {
                matched = shareFileTool;
                bestToolScore = 100;
              }
            } else if (deleteFilePhrases.some(phrase => text.includes(phrase))) {
              const deleteFileTool = tools.find(tool => tool.toLowerCase().includes('delete-file'));
              if (deleteFileTool) {
                matched = deleteFileTool;
                bestToolScore = 100;
              }
            } else if (downloadFilePhrases.some(phrase => text.includes(phrase))) {
              const downloadFileTool = tools.find(tool => tool.toLowerCase().includes('download-file'));
              if (downloadFileTool) {
                matched = downloadFileTool;
                bestToolScore = 100;
              }
            } else if (findFilePhrases.some(phrase => text.includes(phrase))) {
              const findFileTool = tools.find(tool => tool.toLowerCase().includes('find-file'));
              if (findFileTool) {
                matched = findFileTool;
                bestToolScore = 100;
              }
            } else if (listFilePhrases.some(phrase => text.includes(phrase))) {
              const listFileTool = tools.find(tool => tool.toLowerCase().includes('list-files'));
              if (listFileTool) {
                matched = listFileTool;
                bestToolScore = 100;
              }
            }
          }
          
          // HARD CODED: Gmail specific tool mappings with comprehensive catch phrases
          if (!matched && chosen.app_slug === 'gmail') {
            // Send email
            const sendEmailPhrases = [
              'send email', 'send an email', 'send mail', 'send a mail', 'send message', 'send a message',
              'email someone', 'mail someone', 'compose email', 'compose mail', 'write email', 'write mail',
              'send to', 'email to', 'mail to', 'send out', 'send off', 'dispatch email', 'dispatch mail',
              'forward email', 'forward mail', 'reply to', 'respond to', 'send response', 'send reply'
            ];
            
            // Create draft
            const createDraftPhrases = [
              'create draft', 'create a draft', 'make draft', 'make a draft', 'new draft', 'new email draft',
              'save draft', 'save as draft', 'draft email', 'draft mail', 'start draft', 'begin draft',
              'write draft', 'compose draft', 'prepare draft', 'work on draft', 'edit draft', 'modify draft'
            ];
            
            // Find email
            const findEmailPhrases = [
              'find email', 'find an email', 'find mail', 'find a mail', 'search email', 'search for email',
              'search mail', 'search for mail', 'look for email', 'look for mail', 'locate email', 'locate mail',
              'where is my email', 'where is my mail', 'find my email', 'find my mail', 'search my inbox',
              'look up email', 'look up mail', 'discover email', 'discover mail', 'browse emails', 'browse mail'
            ];
            
            // List emails/labels
            const listEmailsPhrases = [
              'list emails', 'list email', 'list mail', 'list mails', 'show emails', 'show email',
              'show mail', 'show mails', 'display emails', 'display email', 'display mail', 'display mails',
              'view emails', 'view email', 'view mail', 'view mails', 'see emails', 'see email', 'see mail',
              'my emails', 'my mail', 'all emails', 'all mail', 'emails in', 'mail in', 'inbox contents',
              'what emails', 'what mail', 'browse emails', 'explore emails', 'check emails', 'check mail'
            ];
            
            // Delete email
            const deleteEmailPhrases = [
              'delete email', 'delete an email', 'delete mail', 'delete a mail', 'remove email', 'remove an email',
              'remove mail', 'remove a mail', 'trash email', 'trash mail', 'move to trash', 'move email to trash',
              'erase email', 'erase mail', 'clear email', 'clear mail', 'drop email', 'drop mail',
              'discard email', 'discard mail', 'archive email', 'archive mail', 'move to archive'
            ];
            
            // Check each category and select appropriate tool
            if (sendEmailPhrases.some(phrase => text.includes(phrase))) {
              const sendEmailTool = tools.find(tool => tool.toLowerCase().includes('send-email'));
              if (sendEmailTool) {
                matched = sendEmailTool;
                bestToolScore = 100;
              }
            } else if (createDraftPhrases.some(phrase => text.includes(phrase))) {
              const createDraftTool = tools.find(tool => tool.toLowerCase().includes('create-draft'));
              if (createDraftTool) {
                matched = createDraftTool;
                bestToolScore = 100;
              }
            } else if (findEmailPhrases.some(phrase => text.includes(phrase))) {
              const findEmailTool = tools.find(tool => tool.toLowerCase().includes('find-email'));
              if (findEmailTool) {
                matched = findEmailTool;
                bestToolScore = 100;
              }
            } else if (listEmailsPhrases.some(phrase => text.includes(phrase))) {
              const listLabelsTool = tools.find(tool => tool.toLowerCase().includes('list-labels'));
              if (listLabelsTool) {
                matched = listLabelsTool;
                bestToolScore = 100;
              }
            } else if (deleteEmailPhrases.some(phrase => text.includes(phrase))) {
              const deleteEmailTool = tools.find(tool => tool.toLowerCase().includes('delete-email'));
              if (deleteEmailTool) {
                matched = deleteEmailTool;
                bestToolScore = 100;
              }
            }
          }
          
          // HARD CODED: Google Calendar specific tool mappings with comprehensive catch phrases
          if (!matched && chosen.app_slug === 'google_calendar') {
            // Create event
            const createEventPhrases = [
              'create event', 'create an event', 'make event', 'make an event', 'new event', 'new calendar event',
              'add event', 'add an event', 'schedule event', 'schedule an event', 'book event', 'book an event',
              'set up event', 'set up an event', 'arrange event', 'arrange an event', 'plan event', 'plan an event',
              'create meeting', 'create a meeting', 'schedule meeting', 'schedule a meeting', 'set up meeting'
            ];
            
            // Update event
            const updateEventPhrases = [
              'update event', 'update an event', 'modify event', 'modify an event', 'change event', 'change an event',
              'edit event', 'edit an event', 'adjust event', 'adjust an event', 'reschedule event', 'reschedule an event',
              'move event', 'move an event', 'shift event', 'shift an event', 'rearrange event', 'rearrange an event',
              'update meeting', 'modify meeting', 'change meeting', 'edit meeting', 'reschedule meeting'
            ];
            
            // List events
            const listEventsPhrases = [
              'list events', 'list event', 'show events', 'show event', 'display events', 'display event',
              'view events', 'view event', 'see events', 'see event', 'browse events', 'explore events',
              'my events', 'all events', 'events in', 'what events', 'what event', 'calendar contents',
              'check events', 'check event', 'find events', 'find event', 'search events', 'search event'
            ];
            
            // Get specific event
            const getEventPhrases = [
              'get event', 'get an event', 'find event', 'find an event', 'look up event', 'look up an event',
              'retrieve event', 'retrieve an event', 'fetch event', 'fetch an event', 'pull event', 'pull an event',
              'show event details', 'show event info', 'display event details', 'view event details',
              'event details', 'event info', 'event information', 'specific event', 'particular event'
            ];
            
            // Delete event
            const deleteEventPhrases = [
              'delete event', 'delete an event', 'remove event', 'remove an event', 'cancel event', 'cancel an event',
              'trash event', 'trash an event', 'erase event', 'erase an event', 'clear event', 'clear an event',
              'drop event', 'drop an event', 'discard event', 'discard an event', 'unbook event', 'unbook an event'
            ];
            
            // Add attendees to event
            const addAttendeesPhrases = [
              'add attendees', 'add attendee', 'add people', 'add person', 'invite people', 'invite person',
              'invite attendees', 'invite attendee', 'add to event', 'add people to event', 'invite to event',
              'include people', 'include person', 'add participants', 'add participant', 'invite participants',
              'add guests', 'add guest', 'invite guests', 'invite guest', 'add team members', 'add colleagues'
            ];
            
            // Check each category and select appropriate tool
            if (createEventPhrases.some(phrase => text.includes(phrase))) {
              const createEventTool = tools.find(tool => tool.toLowerCase().includes('create-event'));
              if (createEventTool) {
                matched = createEventTool;
                bestToolScore = 100;
              }
            } else if (updateEventPhrases.some(phrase => text.includes(phrase))) {
              const updateEventTool = tools.find(tool => tool.toLowerCase().includes('update-event'));
              if (updateEventTool) {
                matched = updateEventTool;
                bestToolScore = 100;
              }
            } else if (listEventsPhrases.some(phrase => text.includes(phrase))) {
              const listEventsTool = tools.find(tool => tool.toLowerCase().includes('list-events'));
              if (listEventsTool) {
                matched = listEventsTool;
                bestToolScore = 100;
              }
            } else if (getEventPhrases.some(phrase => text.includes(phrase))) {
              const getEventTool = tools.find(tool => tool.toLowerCase().includes('get-event'));
              if (getEventTool) {
                matched = getEventTool;
                bestToolScore = 100;
              }
            } else if (deleteEventPhrases.some(phrase => text.includes(phrase))) {
              const deleteEventTool = tools.find(tool => tool.toLowerCase().includes('delete-event'));
              if (deleteEventTool) {
                matched = deleteEventTool;
                bestToolScore = 100;
              }
            } else if (addAttendeesPhrases.some(phrase => text.includes(phrase))) {
              const addAttendeesTool = tools.find(tool => tool.toLowerCase().includes('add-attendees-to-event'));
              if (addAttendeesTool) {
                matched = addAttendeesTool;
                bestToolScore = 100;
              }
            }
          }
          
          // HARD CODED: Google Meet specific tool mappings with comprehensive catch phrases
          if (!matched && chosen.app_slug === 'google_meet') {
            // Create meeting
            const createMeetingPhrases = [
              'create meeting', 'create a meeting', 'make meeting', 'make a meeting', 'new meeting', 'new video meeting',
              'start meeting', 'start a meeting', 'begin meeting', 'begin a meeting', 'set up meeting', 'set up a meeting',
              'schedule meeting', 'schedule a meeting', 'book meeting', 'book a meeting', 'arrange meeting', 'arrange a meeting',
              'create video call', 'create a video call', 'start video call', 'start a video call', 'set up video call'
            ];
            
            // Join meeting
            const joinMeetingPhrases = [
              'join meeting', 'join a meeting', 'enter meeting', 'enter a meeting', 'attend meeting', 'attend a meeting',
              'participate in meeting', 'participate in a meeting', 'go to meeting', 'go to a meeting', 'access meeting',
              'connect to meeting', 'connect to a meeting', 'link to meeting', 'link to a meeting', 'open meeting', 'open a meeting'
            ];
            
            // Invite participants to meeting
            const inviteParticipantsPhrases = [
              'invite to meeting', 'invite participants', 'invite people', 'add participants', 'add people',
              'send invite link', 'share meeting link', 'add to meeting', 'include in meeting'
            ];
            
            // Record meeting
            const recordMeetingPhrases = [
              'record meeting', 'start recording', 'begin recording', 'enable recording', 'record this meeting'
            ];
            
            // End meeting
            const endMeetingPhrases = [
              'end meeting', 'stop meeting', 'finish meeting', 'close meeting', 'terminate meeting', 'hang up'
            ];
            
            // List meetings
            const listMeetingsPhrases = [
              'list meetings', 'list meeting', 'show meetings', 'show meeting', 'display meetings', 'display meeting',
              'view meetings', 'view meeting', 'see meetings', 'see meeting', 'browse meetings', 'explore meetings',
              'my meetings', 'all meetings', 'meetings in', 'what meetings', 'what meeting', 'meeting contents',
              'check meetings', 'check meeting', 'find meetings', 'find meeting', 'search meetings', 'search meeting'
            ];
            
            // Get meeting details
            const getMeetingPhrases = [
              'get meeting', 'get a meeting', 'find meeting', 'find a meeting', 'look up meeting', 'look up a meeting',
              'retrieve meeting', 'retrieve a meeting', 'fetch meeting', 'fetch a meeting', 'pull meeting', 'pull a meeting',
              'show meeting details', 'show meeting info', 'display meeting details', 'view meeting details',
              'meeting details', 'meeting info', 'meeting information', 'specific meeting', 'particular meeting'
            ];
            
            // Delete meeting
            const deleteMeetingPhrases = [
              'delete meeting', 'delete a meeting', 'remove meeting', 'remove a meeting', 'cancel meeting', 'cancel a meeting',
              'trash meeting', 'trash a meeting', 'erase meeting', 'erase a meeting', 'clear meeting', 'clear a meeting',
              'drop meeting', 'drop a meeting', 'discard meeting', 'discard a meeting', 'unbook meeting', 'unbook a meeting'
            ];
            
            // Check each category and select appropriate tool
            if (createMeetingPhrases.some(phrase => text.includes(phrase))) {
              const createMeetingTool = tools.find(tool => tool.toLowerCase().includes('create-meeting'));
              if (createMeetingTool) {
                matched = createMeetingTool;
                bestToolScore = 100;
              }
            } else if (joinMeetingPhrases.some(phrase => text.includes(phrase))) {
              const joinMeetingTool = tools.find(tool => tool.toLowerCase().includes('join-meeting'));
              if (joinMeetingTool) {
                matched = joinMeetingTool;
                bestToolScore = 100;
              }
            } else if (listMeetingsPhrases.some(phrase => text.includes(phrase))) {
              const listMeetingsTool = tools.find(tool => tool.toLowerCase().includes('list-meetings'));
              if (listMeetingsTool) {
                matched = listMeetingsTool;
                bestToolScore = 100;
              }
            } else if (getMeetingPhrases.some(phrase => text.includes(phrase))) {
              const getMeetingTool = tools.find(tool => tool.toLowerCase().includes('get-meeting'));
              if (getMeetingTool) {
                matched = getMeetingTool;
                bestToolScore = 100;
              }
            } else if (deleteMeetingPhrases.some(phrase => text.includes(phrase))) {
              const deleteMeetingTool = tools.find(tool => tool.toLowerCase().includes('delete-meeting'));
              if (deleteMeetingTool) {
                matched = deleteMeetingTool;
                bestToolScore = 100;
              }
            } else if (inviteParticipantsPhrases.some(phrase => text.includes(phrase))) {
              const inviteParticipantsTool = tools.find(tool => 
                tool.toLowerCase().includes('invite') && tool.toLowerCase().includes('meeting')
              );
              if (inviteParticipantsTool) {
                matched = inviteParticipantsTool;
                bestToolScore = 100;
              }
            } else if (recordMeetingPhrases.some(phrase => text.includes(phrase))) {
              const recordMeetingTool = tools.find(tool => 
                tool.toLowerCase().includes('record') && tool.toLowerCase().includes('meeting')
              );
              if (recordMeetingTool) {
                matched = recordMeetingTool;
                bestToolScore = 100;
              }
            } else if (endMeetingPhrases.some(phrase => text.includes(phrase))) {
              const endMeetingTool = tools.find(tool => 
                tool.toLowerCase().includes('end-meeting') || tool.toLowerCase().includes('end') && tool.toLowerCase().includes('meeting')
              );
              if (endMeetingTool) {
                matched = endMeetingTool;
                bestToolScore = 100;
              }
            }
          }
          
          // HARD CODED: Google Sheets specific tool mappings with comprehensive catch phrases
          if (!matched && chosen.app_slug === 'google_sheets') {
            // Create spreadsheet (both Drive and native Sheets)
            const createSpreadsheetPhrases = [
              'create spreadsheet', 'create a spreadsheet', 'make spreadsheet', 'make a spreadsheet', 'new spreadsheet', 'new sheet',
              'create sheet', 'create a sheet', 'make sheet', 'make a sheet', 'new google sheet', 'new google sheets',
              'create workbook', 'create a workbook', 'make workbook', 'make a workbook', 'new workbook', 'new excel file',
              'create excel', 'create an excel', 'make excel', 'make an excel', 'new excel', 'new table',
              'create from drive', 'create in drive', 'make in drive', 'new in drive', 'create spreadsheet in drive'
            ];
            
            // Update spreadsheet (both Drive and native Sheets)
            const updateSpreadsheetPhrases = [
              'update spreadsheet', 'update a spreadsheet', 'modify spreadsheet', 'modify a spreadsheet', 'change spreadsheet', 'change a spreadsheet',
              'edit spreadsheet', 'edit a spreadsheet', 'adjust spreadsheet', 'adjust a spreadsheet', 'modify sheet', 'modify a sheet',
              'update sheet', 'update a sheet', 'edit sheet', 'edit a sheet', 'change sheet', 'change a sheet',
              'update workbook', 'modify workbook', 'edit workbook', 'change workbook',
              'update in drive', 'modify in drive', 'edit in drive', 'change in drive', 'update spreadsheet in drive'
            ];
            
            // List spreadsheets (both Drive and native Sheets)
            const listSpreadsheetsPhrases = [
              'list spreadsheets', 'list spreadsheet', 'show spreadsheets', 'show spreadsheet', 'display spreadsheets', 'display spreadsheet',
              'view spreadsheets', 'view spreadsheet', 'see spreadsheets', 'see spreadsheet', 'browse spreadsheets', 'explore spreadsheets',
              'my spreadsheets', 'all spreadsheets', 'spreadsheets in', 'what spreadsheets', 'what spreadsheet', 'sheets contents',
              'check spreadsheets', 'check spreadsheet', 'find spreadsheets', 'find spreadsheet', 'search spreadsheets', 'search spreadsheet',
              'list sheets', 'list sheet', 'show sheets', 'show sheet', 'my sheets', 'all sheets',
              'list in drive', 'show in drive', 'view in drive', 'browse in drive', 'list spreadsheets in drive'
            ];
            
            // Get spreadsheet details (both Drive and native Sheets)
            const getSpreadsheetPhrases = [
              'get spreadsheet', 'get a spreadsheet', 'find spreadsheet', 'find a spreadsheet', 'look up spreadsheet', 'look up a spreadsheet',
              'retrieve spreadsheet', 'retrieve a spreadsheet', 'fetch spreadsheet', 'fetch a spreadsheet', 'pull spreadsheet', 'pull a spreadsheet',
              'show spreadsheet details', 'show spreadsheet info', 'display spreadsheet details', 'view spreadsheet details',
              'spreadsheet details', 'spreadsheet info', 'spreadsheet information', 'specific spreadsheet', 'particular spreadsheet',
              'get sheet', 'get a sheet', 'find sheet', 'find a sheet', 'sheet details', 'sheet info',
              'get from drive', 'find in drive', 'retrieve from drive', 'get spreadsheet from drive',
              'find spreadsheet by id', 'get spreadsheet by id', 'retrieve spreadsheet by id'
            ];
            
            // Delete spreadsheet (both Drive and native Sheets)
            const deleteSpreadsheetPhrases = [
              'delete spreadsheet', 'delete a spreadsheet', 'remove spreadsheet', 'remove a spreadsheet', 'trash spreadsheet', 'trash a spreadsheet',
              'erase spreadsheet', 'erase a spreadsheet', 'clear spreadsheet', 'clear a spreadsheet', 'drop spreadsheet', 'drop a spreadsheet',
              'discard spreadsheet', 'discard a spreadsheet', 'delete sheet', 'delete a sheet', 'remove sheet', 'remove a sheet',
              'delete from drive', 'remove from drive', 'trash in drive', 'delete spreadsheet from drive'
            ];
            
            // Delete worksheet
            const deleteWorksheetPhrases = [
              'delete worksheet', 'delete a worksheet', 'remove worksheet', 'remove a worksheet', 'delete tab', 'delete a tab',
              'remove tab', 'remove a tab', 'delete sheet tab', 'remove sheet tab', 'delete worksheet tab'
            ];
            
            // Add data to spreadsheet (native Sheets functionality)
            const addDataPhrases = [
              'add data', 'add data to', 'insert data', 'insert data to', 'add row', 'add rows', 'add column', 'add columns',
              'add entry', 'add entries', 'add record', 'add records', 'add information', 'add info', 'add content',
              'insert row', 'insert rows', 'insert column', 'insert columns', 'insert entry', 'insert entries',
              'add to spreadsheet', 'add to sheet', 'insert to spreadsheet', 'insert to sheet', 'add to table',
              'add cell', 'add cells', 'insert cell', 'insert cells', 'add value', 'insert value'
            ];
            
            // Update cells/data (native Sheets functionality)
            const updateDataPhrases = [
              'update cell', 'update cells', 'modify cell', 'modify cells', 'change cell', 'change cells',
              'edit cell', 'edit cells', 'update value', 'modify value', 'change value', 'edit value',
              'update data', 'modify data', 'change data', 'edit data', 'update content', 'modify content',
              'set cell', 'set cells', 'set value', 'set data', 'write to cell', 'write to cells'
            ];

            // Share spreadsheet
            const shareSpreadsheetPhrases = [
              'share spreadsheet', 'share a spreadsheet', 'share sheet', 'share a sheet', 'give access', 'grant access',
              'invite to spreadsheet', 'invite to sheet', 'collaborate on spreadsheet', 'collaborate on sheet'
            ];

            // Export spreadsheet
            const exportSpreadsheetPhrases = [
              'export spreadsheet', 'export sheet', 'download spreadsheet', 'download sheet', 'save as csv', 'export to csv',
              'save as xlsx', 'export to xlsx', 'download as', 'export as'
            ];

            // Format spreadsheet/cells
            const formatSpreadsheetPhrases = [
              'format spreadsheet', 'format sheet', 'format cells', 'apply formatting', 'set format', 'bold', 'italic', 'alignment',
              'cell color', 'background color', 'number format', 'date format'
            ];

            // View/open spreadsheet
            const viewSpreadsheetPhrases = [
              'view spreadsheet', 'open spreadsheet', 'open sheet', 'view sheet', 'show spreadsheet', 'show sheet'
            ];
            
            // Check each category and select appropriate tool
            if (createSpreadsheetPhrases.some(phrase => text.includes(phrase))) {
              const createSpreadsheetTool = tools.find(tool => tool === 'google_sheets-create-spreadsheet');
              if (createSpreadsheetTool) {
                matched = createSpreadsheetTool;
                bestToolScore = 100;
              }
            } else if (addDataPhrases.some(phrase => text.includes(phrase))) {
              const addDataTool = tools.find(tool => tool === 'google_sheets-add-multiple-rows');
              if (addDataTool) {
                matched = addDataTool;
                bestToolScore = 100;
              }
            } else if (updateSpreadsheetPhrases.some(phrase => text.includes(phrase))) {
              const updateSpreadsheetTool = tools.find(tool => tool === 'google_sheets-update-row');
              if (updateSpreadsheetTool) {
                matched = updateSpreadsheetTool;
                bestToolScore = 100;
              }
            } else if (listSpreadsheetsPhrases.some(phrase => text.includes(phrase))) {
              const listSpreadsheetsTool = tools.find(tool => tool === 'google_sheets-list-worksheets');
              if (listSpreadsheetsTool) {
                matched = listSpreadsheetsTool;
                bestToolScore = 100;
              }
            } else if (deleteSpreadsheetPhrases.some(phrase => text.includes(phrase))) {
              // Check for single row deletion vs all rows deletion
              const singleRowDeletePhrases = ['delete row', 'delete a row', 'remove row', 'remove a row', 'delete single row'];
              const allRowsDeletePhrases = ['delete all rows', 'clear all rows', 'remove all rows', 'delete rows', 'clear rows'];
              
              if (singleRowDeletePhrases.some(phrase => text.includes(phrase))) {
                const deleteSingleRowTool = tools.find(tool => tool === 'google_sheets-delete-rows');
                if (deleteSingleRowTool) {
                  matched = deleteSingleRowTool;
                  bestToolScore = 100;
                }
              } else if (allRowsDeletePhrases.some(phrase => text.includes(phrase))) {
                const clearAllRowsTool = tools.find(tool => tool === 'google_sheets-clear-rows');
                if (clearAllRowsTool) {
                  matched = clearAllRowsTool;
                  bestToolScore = 100;
                }
              }
            } else if (getSpreadsheetPhrases.some(phrase => text.includes(phrase))) {
              const getSpreadsheetTool = tools.find(tool => tool === 'google_sheets-get-spreadsheet-by-id');
              if (getSpreadsheetTool) {
                matched = getSpreadsheetTool;
                bestToolScore = 100;
              }
            } else if (deleteWorksheetPhrases.some(phrase => text.includes(phrase))) {
              const deleteWorksheetTool = tools.find(tool => tool === 'google_sheets-delete-worksheet');
              if (deleteWorksheetTool) {
                matched = deleteWorksheetTool;
                bestToolScore = 100;
              }
            } else if (shareSpreadsheetPhrases.some(phrase => text.includes(phrase))) {
              // Try native Sheets first, then Drive-based
              const shareSpreadsheetTool = tools.find(tool => 
                tool.toLowerCase().includes('share-spreadsheet') ||
                tool.toLowerCase().includes('share-file') && tool.toLowerCase().includes('spreadsheet')
              );
              if (shareSpreadsheetTool) {
                matched = shareSpreadsheetTool;
                bestToolScore = 100;
              }
            } else if (exportSpreadsheetPhrases.some(phrase => text.includes(phrase))) {
              // Try native Sheets first, then Drive-based
              const exportSpreadsheetTool = tools.find(tool => 
                tool.toLowerCase().includes('export-spreadsheet') ||
                tool.toLowerCase().includes('download-file') && tool.toLowerCase().includes('spreadsheet') ||
                tool.toLowerCase().includes('export') && tool.toLowerCase().includes('sheet')
              );
              if (exportSpreadsheetTool) {
                matched = exportSpreadsheetTool;
                bestToolScore = 100;
              }
            } else if (formatSpreadsheetPhrases.some(phrase => text.includes(phrase))) {
              const formatSpreadsheetTool = tools.find(tool => 
                tool.toLowerCase().includes('format-spreadsheet') ||
                tool.toLowerCase().includes('format-cell') ||
                tool.toLowerCase().includes('apply-formatting')
              );
              if (formatSpreadsheetTool) {
                matched = formatSpreadsheetTool;
                bestToolScore = 100;
              }
            } else if (viewSpreadsheetPhrases.some(phrase => text.includes(phrase))) {
              const viewSpreadsheetTool = tools.find(tool => 
                tool.toLowerCase().includes('view-spreadsheet') ||
                tool.toLowerCase().includes('open-spreadsheet') ||
                tool.toLowerCase().includes('get-spreadsheet')
              );
              if (viewSpreadsheetTool) {
                matched = viewSpreadsheetTool;
                bestToolScore = 100;
              }
            }
          }
          
          // If no exact match, use purpose-based selection
        if (!matched) {
            const heur = toolPurposeMap[chosen.app_slug] || toolPurposeMap[chosen.app_name?.toLowerCase() || ''] || [];
            
            // Score each tool based on user intent
            tools.forEach((tool) => {
              let toolScore = 0;
              const toolLower = tool.toLowerCase();
              
              // Check purpose-specific keywords
              heur.forEach((h) => {
                if (h.match.some((kw) => text.includes(kw))) {
                  // If tool name contains the purpose-specific keyword, give it a high score
                  if (toolLower.includes(h.toolContains)) {
                    toolScore = Math.max(toolScore, 8);
                  }
                }
              });
              
              // Check for general purpose keywords
              if (text.includes('create') && toolLower.includes('create')) toolScore = Math.max(toolScore, 7);
              if (text.includes('upload') && toolLower.includes('upload')) toolScore = Math.max(toolScore, 7);
              if (text.includes('send') && toolLower.includes('send')) toolScore = Math.max(toolScore, 7);
              if (text.includes('list') && toolLower.includes('list')) toolScore = Math.max(toolScore, 6);
              if (text.includes('search') && toolLower.includes('search')) toolScore = Math.max(toolScore, 6);
              if (text.includes('share') && toolLower.includes('share')) toolScore = Math.max(toolScore, 6);
              
              // Check for file-related keywords
              if (text.includes('file') && (toolLower.includes('file') || toolLower.includes('upload'))) toolScore = Math.max(toolScore, 5);
              if (text.includes('folder') && toolLower.includes('folder')) toolScore = Math.max(toolScore, 5);
              if (text.includes('document') && (toolLower.includes('doc') || toolLower.includes('create'))) toolScore = Math.max(toolScore, 5);
              
              if (toolScore > bestToolScore) {
                bestToolScore = toolScore;
                matched = tool;
              }
            });
          }
          
          // If still no match, default to first available tool
          if (!matched && tools.length > 0) {
            matched = tools[0];
          }
          
          if (matched) {
            setSelectedToolName(matched);
            // Set tool description
            const chosenProfile: any = (pdProfiles || []).find((p: any) => p.profile_id === chosen.profile_id);
            if (chosenProfile?.app_slug) {
              setCurrentToolDescription(getToolDescription(chosenProfile.app_slug, matched));
            }
          }
          
          // Store purpose and category for tool execution
          setCurrentToolPurpose(best.purpose);
          setCurrentToolCategory(best.category);
        } else {
          setIsToolMode(false);
          setSelectedProfileId('');
          setSelectedToolName('');
          setCurrentProfileName('');
          setCurrentToolPurpose('');
          setCurrentToolCategory('');
          setCurrentToolDescription('');
        }
      }, 300); // 300ms debounce

      return () => clearTimeout(timeoutId);
    }, [pdProfiles, controlledValue, uncontrolledValue, isControlled]);

    // Show usage preview logic:
    // - Disabled in production environment
    // - Disabled when usage goes over $5
    // - Always show to free users when showToLowCreditUsers is true (if not in production and under $5)
    // - For paid users, only show when they're at 70% or more of their cost limit (30% or below remaining) (if not in production and under $5)
    const isProduction = isProductionMode();
    const currentUsage = subscriptionData?.current_usage || 0;
    const usageOver5Dollars = currentUsage > 5;
    
    // DISABLED: Billing check functionality for production
    // const shouldShowUsage = !isLocalMode() && !isProduction && !usageOver5Dollars && subscriptionData && showToLowCreditUsers && (() => {
    //   // Free users: always show (if not in production and under $5)
    //   if (subscriptionStatus === 'no_subscription') {
    //     return true;
    //   }

    //   // Paid users: only show when at 70% or more of cost limit (if not in production and under $5)
    //   const costLimit = subscriptionData.cost_limit || 0;

    //   if (costLimit === 0) return false; // No limit set

    //   return currentUsage >= (costLimit * 0.7); // 70% or more used (30% or less remaining)
    // })();
    
    // Always return false to disable usage preview
    const shouldShowUsage = false;

    // Auto-show usage preview when we have subscription data
    useEffect(() => {
      if (shouldShowUsage && defaultShowSnackbar !== false && !userDismissedUsage && (showSnackbar === false || showSnackbar === defaultShowSnackbar)) {
        setShowSnackbar('upgrade');
      } else if (!shouldShowUsage && showSnackbar !== false) {
        setShowSnackbar(false);
      }
    }, [subscriptionData, showSnackbar, defaultShowSnackbar, shouldShowUsage, subscriptionStatus, showToLowCreditUsers, userDismissedUsage]);

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const hasLoadedFromLocalStorage = useRef(false);
    
    const { data: agentsResponse } = useAgents();
    const agents = agentsResponse?.agents || [];

    useImperativeHandle(ref, () => ({
      getPendingFiles: () => pendingFiles,
      clearPendingFiles: () => setPendingFiles([]),
    }));

    useEffect(() => {
      if (typeof window !== 'undefined' && onAgentSelect && !hasLoadedFromLocalStorage.current && agents.length > 0) {
        const urlParams = new URLSearchParams(window.location.search);
        const hasAgentIdInUrl = urlParams.has('agent_id');
        if (!selectedAgentId && !hasAgentIdInUrl) {
          const savedAgentId = localStorage.getItem('lastSelectedAgentId');
          if (savedAgentId) {
            if (savedAgentId === 'o1') {
              // When saved agent is 'o1', default to undefined (which shows o1 in the UI)
              console.log('Saved agent is o1, defaulting to undefined');
              onAgentSelect(undefined);
            } else {
              onAgentSelect(savedAgentId);
            }
          } else {
            // Default to o1 (undefined) when no agent is selected
            console.log('No saved agent preference, defaulting to o1');
            onAgentSelect(undefined);
          }
        } else {
          console.log('Skipping localStorage load:', {
            hasSelectedAgent: !!selectedAgentId,
            hasAgentIdInUrl,
            selectedAgentId
          });
        }
        hasLoadedFromLocalStorage.current = true;
      }
    }, [onAgentSelect, selectedAgentId, agents]); // Add agents to dependencies

    // Save selected agent to localStorage whenever it changes
    useEffect(() => {
      if (typeof window !== 'undefined' && agents.length > 0) {
        // Check if the selected agent is the Suna default agent
        const selectedAgent = agents.find(agent => agent.agent_id === selectedAgentId);
        const isSunaAgent = selectedAgent?.metadata?.is_suna_default || selectedAgentId === undefined;
        
        // Use 'suna' as a special key for the Suna default agent
        const keyToStore = isSunaAgent ? 'o1' : selectedAgentId;
        console.log('Saving selected agent to localStorage:', keyToStore, 'for selectedAgentId:', selectedAgentId);
        localStorage.setItem('lastSelectedAgentId', keyToStore);
      }
    }, [selectedAgentId, agents]);

    useEffect(() => {
      if (autoFocus && textareaRef.current) {
        textareaRef.current.focus();
      }
    }, [autoFocus]);

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (
        (!value.trim() && uploadedFiles.length === 0) ||
        loading ||
        (disabled && !isAgentRunning)
      )
        return;

      if (isAgentRunning && onStopAgent) {
        onStopAgent();
        return;
      }

      let message = value;

      if (uploadedFiles.length > 0) {
        const fileInfo = uploadedFiles
          .map((file) => `[Uploaded File: ${file.path}]`)
          .join('\n');
        message = message ? `${message}\n\n${fileInfo}` : fileInfo;
      }

      let baseModelName = getActualModelId(selectedModel);
      let thinkingEnabled = false;
      if (selectedModel.endsWith('-thinking')) {
        baseModelName = getActualModelId(selectedModel.replace(/-thinking$/, ''));
        thinkingEnabled = true;
      }

      // If direct tool mode is on, execute the selected tool instead of sending to agent
      if (isToolMode && selectedProfileId && selectedToolName) {
        try {
          setIsExecutingTool(true);
          
          // Determine thread/project context for tool execution
          let threadId = contextThreadId;
          let projectId = contextProjectId;

          if (!threadId || !projectId) {
            // Create thread and project for tool execution if context not provided
            const created = await createThreadForTool(
              currentToolPurpose || 'execute',
              currentToolCategory || 'general',
              currentProfileName || 'Tool'
            );
            threadId = created.threadId;
            projectId = created.projectId;
          }
          
          if (threadId) setCurrentThreadId(threadId);
          if (projectId) setCurrentProjectId(projectId);
          
          // Navigate to the thread page so the tool run appears like a normal chat
          try {
            if (threadId && projectId && !threadId.startsWith('temp-')) {
              const targetPath = `/projects/${projectId}/thread/${threadId}`;
              if (typeof window !== 'undefined') {
                const currentPath = window.location.pathname;
                if (currentPath !== targetPath) {
                  router.push(targetPath);
                } else {
                  router.refresh();
                }
              } else {
                router.push(targetPath);
              }
              // Keep sidebar thread lists in sync
              try {
                queryClient.invalidateQueries({ queryKey: threadKeys.all });
                queryClient.invalidateQueries({ queryKey: threadKeys.project(projectId) });
                queryClient.invalidateQueries({ queryKey: projectKeys.all });
              } catch {}
            }
          } catch {}
          
          // Add user message to thread
          if (threadId) await addMessageToThread(threadId, message, true);
          // Emit comprehensive user message event for immediate UI update
          try {
            if (threadId) {
              const evtUser = new CustomEvent('chat-direct-tool-user', {
                detail: {
                  role: 'user',
                  threadId,
                  projectId,
                  content: message,
                  createdAt: new Date().toISOString(),
                  isToolExecution: true,
                  toolProfile: selectedProfileId,
                  toolName: selectedToolName,
                  appName: currentProfileName,
                },
              });
              window.dispatchEvent(evtUser);
            }
          } catch {}
          
          // Create agent run for tool execution (but skip for direct tool execution to prevent recursion)
          // if (threadId) await createAgentRunForTool(threadId, currentToolPurpose || 'execute', currentToolCategory || 'general');
          
          // Build arguments by looking up tool schema and filling sensible defaults
          let args = { query: message, instruction: message } as Record<string, any>;
          let toolToExecute = selectedToolName;
          let relevantToolCandidates: string[] = [];
          const chosenProfile: any = (pdProfiles || []).find((p: any) => p.profile_id === selectedProfileId);
          if (chosenProfile?.app_slug) {
            try {
              const toolsResp = await pipedreamApi.getAppTools(chosenProfile.app_slug);
              const availableTools: any[] = toolsResp.tools || [];

              // Intent + keyword scoring across all tools to mimic agent tool choice
              const lowerMsg = (message || '').toLowerCase();
              const intents = [
                { key: 'create', rx: /(create|make|new|generate|add|build|compose|draft)/ },
                { key: 'update', rx: /(update|modify|edit|change|rename|move|reschedule)/ },
                { key: 'delete', rx: /(delete|remove|trash|erase|clear|cancel)/ },
                { key: 'list', rx: /(list|show|view|display|browse)/ },
                { key: 'search', rx: /(search|find|lookup|query|filter)/ },
                { key: 'send', rx: /(send|post|message|email|compose|draft)/ },
                { key: 'upload', rx: /(upload|save|store|backup|sync)/ },
                { key: 'share', rx: /(share|permission|access|invite|collaborate)/ },
                { key: 'download', rx: /(download|export|retrieve)/ },
              ] as const;
              const matchedIntents = intents.filter(i => i.rx.test(lowerMsg)).map(i => i.key);
              const intentRx = matchedIntents.length ? new RegExp(matchedIntents.join('|'), 'i') : null;

              const keywordGroups: Array<{ kw: RegExp; weight: number }> = [
                { kw: /(file|doc|document|txt|text)/, weight: 5 },
                { kw: /(folder|directory)/, weight: 4 },
                { kw: /(sheet|spreadsheet)/, weight: 4 },
                { kw: /(slide|presentation)/, weight: 3 },
                { kw: /(page|note)/, weight: 2 },
                { kw: /(email|mail|inbox|draft)/, weight: 4 },
                { kw: /(message|dm|channel)/, weight: 3 },
                { kw: /(permission|share)/, weight: 2 },
                { kw: /(download|export)/, weight: 2 },
                { kw: /(calendar|event|meeting|invite|schedule)/, weight: 4 },
              ];

              type Scored = { name: string; score: number };
              const scored: Scored[] = (availableTools || []).map((t: any) => {
                const n = (t.name || '').toLowerCase();
                let score = 0;
                if (!intentRx || intentRx.test(n)) score += 1;
                keywordGroups.forEach(({ kw, weight }) => {
                  if (kw.test(lowerMsg) && kw.test(n)) score += weight;
                });
                // explicit patterns
                if (/create.*file.*from.*text|create.*text.*file/.test(n) && /(text|content)/.test(lowerMsg)) score += 3;
                if (/folder/.test(n) && /(folder|directory)/.test(lowerMsg)) score += 2;
                return { name: t.name, score };
              });

              const best = scored.sort((a,b)=>b.score-a.score)[0];
              const maxScore = best ? best.score : -1;
              const threshold = Math.max(1, Math.floor(maxScore * 0.6));
              relevantToolCandidates = scored.filter(s => s.score >= threshold).map(s => s.name);
              if (best && best.score >= threshold && best.name) {
                toolToExecute = best.name;
                setSelectedToolName(best.name);
              }

              // Use the selected tool metadata for schema defaulting
              const toolMeta: any = availableTools.find((t: any) => t.name === toolToExecute);
              const schema: any = toolMeta?.inputSchema || toolMeta?.input_schema;
              if (schema && schema.properties) {
                // If specific required fields exist and are strings, fill with the whole message when undefined
                const props: any = schema.properties;
                const required: string[] = Array.isArray(schema.required) ? schema.required : [];
                const textLikeKeys = ['instruction','query','text','prompt','message','input'];
                // Ensure common text keys are present if defined
                textLikeKeys.forEach((k) => { if (props[k] && args[k] === undefined) args[k] = message; });
                // Fill required string fields with message if not present
                let missingRequired = false;
                required.forEach((key) => {
                  const prop = props[key];
                  if (!prop) return;
                  const types: string[] = Array.isArray(prop.type) ? prop.type : [prop.type];
                  if (args[key] !== undefined) return;
                  if (types.includes('string')) {
                    args[key] = message;
                  } else if (prop.default !== undefined) {
                    args[key] = prop.default;
                  } else if (types.includes('boolean')) {
                    args[key] = false;
                  } else if (types.includes('number') || types.includes('integer')) {
                    args[key] = 0;
                  } else {
                    // Unknown required type without default — safer to fallback to agent to avoid tool error
                    missingRequired = true;
                  }
                });
                if (missingRequired) {
                  toolToExecute = '';
                }
              }
            } catch {}
          }

          // If no reasonable tool match, fallback to normal agent to avoid unnecessary tools/errors
          if (!toolToExecute) {
            onSubmit(message, {
              model_name: baseModelName,
              enable_thinking: thinkingEnabled,
            });
            if (!isControlled) setUncontrolledValue('');
            setUploadedFiles([]);
            setIsExecutingTool(false);
            return;
          }
          
          toast.message('Executing tool...', { description: `${currentProfileName} - ${toolToExecute}` });
          // Emit a start event so the thread can show a loading assistant bubble
          try {
            if (threadId) {
              const evtStart = new CustomEvent('chat-direct-tool-start', {
                detail: {
                  threadId,
                  projectId,
                  tool: toolToExecute,
                  appName: currentProfileName,
                  relevantTools: relevantToolCandidates,
                  createdAt: new Date().toISOString(),
                },
              });
              window.dispatchEvent(evtStart);
            }
          } catch {}
          const resp = await pipedreamApi.executeTool(selectedProfileId, toolToExecute, args);
          
          if (resp.success) {
            const text = (function formatToolResult(result: any): string {
              try {
                if (typeof result === 'string') {
                  const trimmed = result.trim();
                  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
                    try { return formatToolResult(JSON.parse(trimmed)); } catch { return result; }
                  }
                  return result;
                }
                if (Array.isArray(result)) {
                  return result.map((item) => formatToolResult(item)).filter(Boolean).join('\n\n');
                }
                if (result && typeof result === 'object') {
                  if (Array.isArray((result as any).content)) {
                    const textParts = (result as any).content
                      .map((c: any) => (typeof c === 'string' ? c : c?.text || ''))
                      .filter((t: string) => t && t.trim() !== '');
                    if (textParts.length > 0) return textParts.join('\n\n');
                  }
                  if (typeof (result as any).text === 'string') return (result as any).text;
                  if (typeof (result as any).message === 'string') return (result as any).message;
                  if (typeof (result as any).output === 'string') return (result as any).output;
                  if (typeof (result as any).result === 'string') return (result as any).result;
                  if ((result as any).data) return formatToolResult((result as any).data);
                  return JSON.stringify(result, null, 2);
                }
                return String(result);
              } catch {
                return typeof result === 'string' ? result : JSON.stringify(result, null, 2);
              }
            })(resp.result);
            
            // Add tool result to thread as assistant message for normal rendering
            if (threadId && !threadId.startsWith('temp-')) {
              try {
                const payload: any = {
                  thread_id: threadId,
                  type: 'assistant',
                  is_llm_message: true,
                  content: JSON.stringify({ role: 'assistant', content: text }),
                  metadata: JSON.stringify({
                    tool_execution: true,
                    tool_profile: selectedProfileId,
                    tool_name: toolToExecute,
                    app_name: currentProfileName,
                    tool_purpose: currentToolPurpose,
                    tool_category: currentToolCategory,
                  })
                };
                const supabase = createClient();
                await supabase.from('messages').insert(payload);
              } catch (e) {
                console.warn('Failed to add assistant message for tool result:', e);
              }
            }
            
            // Emit a comprehensive event with both user message and tool result for immediate UI update
            try {
              const evt = new CustomEvent('chat-direct-tool-complete', { 
                detail: { 
                  userMessage: {
                    role: 'user',
                    content: message,
                    threadId: threadId,
                    projectId: projectId,
                    createdAt: new Date().toISOString(),
                  },
                  assistantMessage: {
                    role: 'assistant', 
                    content: text, 
                    tool: toolToExecute,
                    threadId: threadId,
                    projectId: projectId,
                    toolPurpose: currentToolPurpose,
                    toolCategory: currentToolCategory,
                    createdAt: new Date().toISOString(),
                  }
                } 
              });
              window.dispatchEvent(evt);
              
              // Signal done to hide any loaders
              const evtDone = new CustomEvent('chat-direct-tool-done', {
                detail: { threadId: threadId, projectId: projectId }
              });
              window.dispatchEvent(evtDone);
            } catch {}
            
            toast.success('Tool executed', { description: text.slice(0, 500) });
          } else {
            toast.error('Tool failed', { description: resp.error || 'Unknown error' });
          }
        } catch (err) {
          console.error('Direct tool execution failed', err);
          toast.error('Tool execution error');
        } finally {
          setIsExecutingTool(false);
          
          // Remove router.refresh() to prevent page refresh requirement
          // Instead, rely on custom events and query invalidation for UI updates
          
          // Refresh sidebar thread queries so updated_at/order are correct
          try {
            const pid = currentProjectId || contextProjectId;
            queryClient.invalidateQueries({ queryKey: threadKeys.all });
            if (pid) queryClient.invalidateQueries({ queryKey: threadKeys.project(pid) });
            queryClient.invalidateQueries({ queryKey: projectKeys.all });
            
            // Also invalidate messages for the current thread to ensure fresh content
            if (contextThreadId) {
              queryClient.invalidateQueries({ queryKey: threadKeys.messages(contextThreadId) });
            }
          } catch {}
          
          // Always signal done to hide loaders even on failure
          try {
            const evtDone = new CustomEvent('chat-direct-tool-done', {
              detail: { threadId: currentThreadId || contextThreadId, projectId: currentProjectId || contextProjectId }
            });
            window.dispatchEvent(evtDone);
          } catch {}
        }
      } else {
        onSubmit(message, {
          model_name: baseModelName,
          enable_thinking: thinkingEnabled,
        });
      }

      if (!isControlled) {
        setUncontrolledValue('');
      }

      setUploadedFiles([]);
    };

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      if (isControlled) {
        controlledOnChange(newValue);
      } else {
        setUncontrolledValue(newValue);
      }
    };

    const handleTranscription = (transcribedText: string) => {
      const currentValue = isControlled ? controlledValue : uncontrolledValue;
      const newValue = currentValue ? `${currentValue} ${transcribedText}` : transcribedText;

      if (isControlled) {
        controlledOnChange(newValue);
      } else {
        setUncontrolledValue(newValue);
      }
    };

    const removeUploadedFile = (index: number) => {
      const fileToRemove = uploadedFiles[index];

      // Clean up local URL if it exists
      if (fileToRemove.localUrl) {
        URL.revokeObjectURL(fileToRemove.localUrl);
      }

      // Remove from local state immediately for responsive UI
      setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
      if (!sandboxId && pendingFiles.length > index) {
        setPendingFiles((prev) => prev.filter((_, i) => i !== index));
      }

      // Check if file is referenced in existing chat messages before deleting from server
      const isFileUsedInChat = messages.some(message => {
        const content = typeof message.content === 'string' ? message.content : '';
        return content.includes(`[Uploaded File: ${fileToRemove.path}]`);
      });

      // Only delete from server if file is not referenced in chat history
      if (sandboxId && fileToRemove.path && !isFileUsedInChat) {
        deleteFileMutation.mutate({
          sandboxId,
          filePath: fileToRemove.path,
        }, {
          onError: (error) => {
            console.error('Failed to delete file from server:', error);
          }
        });
      } else if (isFileUsedInChat) {
        console.log(`Skipping server deletion for ${fileToRemove.path} - file is referenced in chat history`);
      }
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDraggingOver(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDraggingOver(false);
    };

    // Dynamic placeholder based on tool selection
    const dynamicPlaceholder = React.useMemo(() => {
      if (isToolMode && selectedProfileId && currentProfileName) {
        const toolInfo = selectedToolName ? ` (${selectedToolName})` : '';
        return `Describe what you want to do with ${currentProfileName}${toolInfo}...`;
      }
      return placeholder;
    }, [isToolMode, selectedProfileId, currentProfileName, selectedToolName, placeholder]);

    // Create thread and project for tool execution
    const createThreadForTool = async (toolPurpose: string, toolCategory: string, appName: string): Promise<{ threadId: string; projectId: string }> => {
      try {
        // Prefer backend endpoint that creates project + sandbox + thread atomically
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        const headers: Record<string, string> = {};
        if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;

        const form = new FormData();
        form.append('name', `Tool Execution: ${appName} - ${toolPurpose}`);

        const response = await fetch(`${API_URL}/threads`, {
          method: 'POST',
          headers,
          body: form,
        });

        if (!response.ok) {
          const errText = await response.text().catch(() => '');
          throw new Error(`Failed to create thread: ${response.status} ${response.statusText} ${errText}`);
        }

        const result = await response.json();
        return {
          threadId: result.thread_id,
          projectId: result.project_id,
        };
      } catch (error) {
        console.error('Error creating thread for tool:', error);
        // Fallback: create a temporary thread ID
        const tempThreadId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const tempProjectId = `temp-project-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        return { threadId: tempThreadId, projectId: tempProjectId };
      }
    };

    // Add message to thread
    const addMessageToThread = async (threadId: string, message: string, isToolExecution: boolean = false) => {
      try {
        if (threadId.startsWith('temp-')) {
          // Skip database insertion for temporary threads
          return;
        }
        await addUserMessage(threadId, message);
      } catch (error) {
        console.error('Error adding message to thread:', error);
      }
    };

    // Create agent run for tool execution
    const createAgentRunForTool = async (threadId: string, toolPurpose: string, toolCategory: string) => {
      try {
        if (threadId.startsWith('temp-')) {
          // Skip database insertion for temporary threads
          return;
        }
        await startAgent(threadId, {
          model_name: 'gpt-4o-mini',
          enable_thinking: false,
          reasoning_effort: 'low',
          stream: true,
        });
      } catch (error) {
        console.error('Error creating agent run for tool:', error);
      }
    };


    return (
      <div className="mx-auto w-full max-w-4xl relative">
        <div className="relative">
          <ChatSnack
            toolCalls={toolCalls}
            toolCallIndex={toolCallIndex}
            onExpandToolPreview={onExpandToolPreview}
            agentName={agentName}
            showToolPreview={showToolPreview}
            showUsagePreview={showSnackbar}
            subscriptionData={subscriptionData}
            onCloseUsage={() => { setShowSnackbar(false); setUserDismissedUsage(true); }}
            onOpenUpgrade={() => setBillingModalOpen(true)}
            isVisible={showToolPreview || !!showSnackbar}
          />
          <Card
            className={`-mb-2 p-0 mt-6 shadow-none w-full max-w-4xl mx-auto bg-transparent border-none overflow-visible ${enableAdvancedConfig && selectedAgentId ? '' : 'rounded-3xl'} relative`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDraggingOver(false);
              if (fileInputRef.current && e.dataTransfer.files.length > 0) {
                const files = Array.from(e.dataTransfer.files);
                handleFiles(
                  files,
                  sandboxId,
                  setPendingFiles,
                  setUploadedFiles,
                  setIsUploading,
                  messages,
                  queryClient,
                );
              }
            }}
          >
            <div className="w-full text-sm flex flex-col justify-between items-start rounded-lg">
              <CardContent className={`w-full shadow-sm p-1.5 ${enableAdvancedConfig && selectedAgentId ? 'pb-1' : 'pb-2'} ${bgColor} border-0 ${enableAdvancedConfig && selectedAgentId ? 'rounded-2xl' : 'rounded-2xl'} overflow-hidden relative`}>
              <div className="absolute inset-0 rounded-[inherit] overflow-hidden pointer-events-none">
                <BorderBeam duration={4} borderWidth={1.5} size={200} className="from-transparent via-helium-teal to-transparent"/>
                <BorderBeam duration={4} borderWidth={1.5} delay={2} size={200} className="from-transparent via-helium-pink to-transparent"/>
              </div>
                {/* Bottom tool control moved into MessageInput dropdown */}
                <AttachmentGroup
                  files={uploadedFiles || []}
                  sandboxId={sandboxId}
                  onRemove={removeUploadedFile}
                  layout="inline"
                  maxHeight="216px"
                  showPreviews={false}
                />
                <MessageInput
                  ref={textareaRef}
                  value={value}
                  onChange={handleChange}
                  onSubmit={handleSubmit}
                  onTranscription={handleTranscription}
                  placeholder={dynamicPlaceholder}
                  loading={loading || isExecutingTool}
                  disabled={disabled}
                  isAgentRunning={isAgentRunning || isExecutingTool}
                  onStopAgent={onStopAgent}
                  isDraggingOver={isDraggingOver}
                  uploadedFiles={uploadedFiles}

                  fileInputRef={fileInputRef}
                  isUploading={isUploading}
                  sandboxId={sandboxId}
                  setPendingFiles={setPendingFiles}
                  setUploadedFiles={setUploadedFiles}
                  setIsUploading={setIsUploading}
                  hideAttachments={hideAttachments}
                  messages={messages}
                  toolControl={{
                    available: (pdProfiles || []).some((p: any) => p.is_connected && (p.enabled_tools?.length || 0) > 0),
                    useDirectTool: false, // Always false in this mode
                    onUseDirectToolChange: () => {}, // No direct tool selection UI
                    profiles: (pdProfiles || [])
                      .filter((p: any) => p.is_connected && (p.enabled_tools?.length || 0) > 0)
                      .map((p: any) => ({ profile_id: p.profile_id, app_name: p.app_name, profile_name: p.profile_name })),
                    selectedProfileId,
                    onProfileChange: (v: string) => {
                      setSelectedProfileId(v);
                      setIsToolMode(false); // Reset tool mode
                      setSelectedToolName('');
                      setCurrentProfileName('');
                      setCurrentToolPurpose('');
                      setCurrentToolCategory('');
                    },
                    tools: enabledToolsByProfile[selectedProfileId] || [], // Pass actual tools for this profile
                    selectedToolName,
                    onToolChange: (t: string) => {
                      // Update the selected tool and show feedback
                      setSelectedToolName(t);
                      toast.success('Tool changed', { 
                        description: `Now using ${t} from ${currentProfileName}` 
                      });
                    },
                    toolPurpose: currentToolPurpose,
                    toolCategory: currentToolCategory,
                  }}

                  selectedModel={selectedModel}
                  onModelChange={handleModelChange}
                  modelOptions={modelOptions}
                  subscriptionStatus={subscriptionStatus}
                  canAccessModel={canAccessModel}
                  refreshCustomModels={refreshCustomModels}
                  isLoggedIn={isLoggedIn}

                  selectedAgentId={selectedAgentId}
                  onAgentSelect={onAgentSelect}
                  hideAgentSelection={hideAgentSelection}
                />
              </CardContent>

              {/* {enableAdvancedConfig && selectedAgentId && (
              <div className="w-full border-t bg-muted/20 px-4 py-1.5 rounded-b-3xl border-l border-r border-b border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto scrollbar-none">
                    <button
                      onClick={() => setRegistryDialogOpen(true)}
                      className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-all duration-200 px-2.5 py-1.5 rounded-md hover:bg-muted/50 border border-transparent hover:border-border/30 flex-shrink-0"
                    >
                      <div className="flex items-center -space-x-0.5">
                        <div className="w-5 h-5 bg-white dark:bg-muted border border-border rounded-full flex items-center justify-center shadow-sm">
                          <FaGoogle className="w-3 h-3" />
                        </div>
                        <div className="w-5 h-5 bg-white dark:bg-muted border border-border rounded-full flex items-center justify-center shadow-sm">
                          <FaDiscord className="w-3 h-3" />
                        </div>
                        <div className="w-5 h-5 bg-white dark:bg-muted border border-border rounded-full flex items-center justify-center shadow-sm">
                          <SiNotion className="w-3 h-3" />
                        </div>
                      </div>
                      <span className="text-xs font-medium">Integrations</span>
                    </button>
                    
                    <div className="w-px h-4 bg-border/60" />
                    
                    <button
                      onClick={() => router.push(`/agents/config/${selectedAgentId}?tab=configuration&accordion=instructions`)}
                      className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-all duration-200 px-2.5 py-1.5 rounded-md hover:bg-muted/50 border border-transparent hover:border-border/30 flex-shrink-0"
                    >
                      <Brain className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="text-xs font-medium">Instructions</span>
                    </button>
                    
                    <div className="w-px h-4 bg-border/60" />
                    
                    <button
                      onClick={() => router.push(`/agents/config/${selectedAgentId}?tab=configuration&accordion=knowledge`)}
                      className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-all duration-200 px-2.5 py-1.5 rounded-md hover:bg-muted/50 border border-transparent hover:border-border/30 flex-shrink-0"
                    >
                      <Database className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="text-xs font-medium">Knowledge</span>
                    </button>
                    
                    <div className="w-px h-4 bg-border/60" />
                    
                    <button
                      onClick={() => router.push(`/agents/config/${selectedAgentId}?tab=configuration&accordion=triggers`)}
                      className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-all duration-200 px-2.5 py-1.5 rounded-md hover:bg-muted/50 border border-transparent hover:border-border/30 flex-shrink-0"
                    >
                      <Zap className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="text-xs font-medium">Triggers</span>
                    </button>
                    
                    <div className="w-px h-4 bg-border/60" />
                    
                    <button
                      onClick={() => router.push(`/agents/config/${selectedAgentId}?tab=configuration&accordion=workflows`)}
                      className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-all duration-200 px-2.5 py-1.5 rounded-md hover:bg-muted/50 border border-transparent hover:border-border/30 flex-shrink-0"
                    >
                      <Workflow className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="text-xs font-medium">Workflows</span>
                    </button>
                  </div>
                </div>
              </div>
            )} */}
            </div>
          </Card>
          <AgentConfigModal
            isOpen={configModalOpen}
            onOpenChange={setConfigModalOpen}
            selectedAgentId={selectedAgentId}
            onAgentSelect={onAgentSelect}
            initialTab={configModalTab}
          />
          <Dialog open={registryDialogOpen} onOpenChange={setRegistryDialogOpen}>
            <DialogContent className="p-0 max-w-6xl max-h-[90vh] overflow-y-auto">
              <DialogHeader className="sr-only">
                <DialogTitle>Integrations</DialogTitle>
              </DialogHeader>
              <PipedreamRegistry
                showAgentSelector={true}
                selectedAgentId={selectedAgentId}
                onAgentChange={onAgentSelect}
                onToolsSelected={(profileId, selectedTools, appName, appSlug) => {
                  console.log('Tools selected:', { profileId, selectedTools, appName, appSlug });
                }}
              />
            </DialogContent>
          </Dialog>
          <BillingModal
            open={billingModalOpen}
            onOpenChange={setBillingModalOpen}
          />
        </div>
      </div>
    );
  },
);

ChatInput.displayName = 'ChatInput';