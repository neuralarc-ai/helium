'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Clock, 
  MoreVertical,
  AlertCircle,
  FileText,
  Eye,
  EyeOff,
  Globe,
  Search,
  Loader2,
  Upload,
  X,
  File,
  ImageIcon,
  FileCode,
  FileArchive,
  Book,
  BookOpen,
  Lightbulb,
} from 'lucide-react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  useKnowledgeBaseEntries,
  useCreateKnowledgeBaseEntry,
  useUpdateKnowledgeBaseEntry,
  useDeleteKnowledgeBaseEntry,
  useUploadThreadFiles,
  CreateKnowledgeBaseEntryRequest,
  KnowledgeBaseEntry,
  UpdateKnowledgeBaseEntryRequest,
} from '@/hooks/react-query/knowledge-base/use-knowledge-base-queries';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

interface KnowledgeBaseManagerProps {
  threadId: string;
}

interface EditDialogData {
  entry?: KnowledgeBaseEntry;
  isOpen: boolean;
}

interface DroppedFile {
  id: string;
  file: File;
  content?: string;
  type: 'text' | 'image' | 'code' | 'other';
}

const USAGE_CONTEXT_OPTIONS = [
  { 
    value: 'always', 
    label: 'Always Active', 
    icon: Eye,
    color: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800'
  },
  { 
    value: 'contextual', 
    label: 'Contextual', 
    icon: Eye,
    color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800'
  },
  { 
    value: 'on_request', 
    label: 'On Request Only', 
    icon: EyeOff,
    color: 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-800'
  },
] as const;

const KnowledgeBaseSkeleton = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="relative w-full">
          <Skeleton className="h-10 w-full" />
        </div>
        <Skeleton className="h-10 w-32 ml-4" />
      </div>

      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="border rounded-lg p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-5 w-20" />
                </div>
                <Skeleton className="h-4 w-64" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                  <Skeleton className="h-4 w-16" />
                </div>
              </div>
              <Skeleton className="h-8 w-8" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );

export const KnowledgeBaseManager = ({ threadId }: KnowledgeBaseManagerProps) => {
  const [editDialog, setEditDialog] = useState<EditDialogData>({ isOpen: false });
  const [deleteEntryId, setDeleteEntryId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [droppedFiles, setDroppedFiles] = useState<DroppedFile[]>([]);
  const [previewFile, setPreviewFile] = useState<DroppedFile | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const contentTextareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState<CreateKnowledgeBaseEntryRequest>({
    name: '',
    description: '',
    content: '',
    usage_context: 'always',
  });

  const { data: knowledgeBase, isLoading, error } = useKnowledgeBaseEntries(threadId);
  const createMutation = useCreateKnowledgeBaseEntry();
  const updateMutation = useUpdateKnowledgeBaseEntry();
  const deleteMutation = useDeleteKnowledgeBaseEntry();
  const uploadMutation = useUploadThreadFiles();

  // Show global knowledge base view if no thread is selected
  if (!threadId) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <div className="mx-auto w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Book className="h-10 w-10 text-primary" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Global Knowledge Base</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            View and manage knowledge base entries across all your chat threads.
          </p>
        </div>
        
        <div className="bg-muted/30 rounded-lg p-6">
          <h4 className="font-medium mb-4 flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            How to Use Knowledge Base
          </h4>
          <div className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center text-xs font-medium text-primary mt-0.5">
                1
              </div>
              <div>
                <p className="font-medium text-foreground">Open a Chat Thread</p>
                <p>Start a new conversation or open an existing thread to access thread-specific knowledge base entries.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center text-xs font-medium text-primary mt-0.5">
                2
              </div>
              <div>
                <p className="font-medium text-foreground">Add Knowledge Entries</p>
                <p>Click the Knowledge Base button in the sidebar to add context, guidelines, and information for your agent.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center text-xs font-medium text-primary mt-0.5">
                3
              </div>
              <div>
                <p className="font-medium text-foreground">Agent Uses Knowledge</p>
                <p>Your agent will automatically use the knowledge base entries as context when responding to questions.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center mt-0.5">
              <BookOpen className="h-3 w-3 text-white" />
            </div>
            <div>
              <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">Knowledge Base is Working!</h4>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                The knowledge base system is active and ready to use. Open any chat thread to start adding and managing knowledge entries.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg p-4 border border-blue-500/20">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <BookOpen className="h-5 w-5 text-blue-400" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-white mb-2">Thread Knowledge Base</h2>
            <p className="text-sm text-white/70 mb-3">
              Add knowledge entries specific to this chat thread. This information will only be available in this conversation.
            </p>
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Lightbulb className="h-4 w-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-white/80">
                  <p className="font-medium mb-1">💡 Pro Tip</p>
                  <p>
                    For information you want available in <strong>all chats</strong>, use the 
                    <strong className="text-blue-400"> Global Knowledge Base</strong> instead. 
                    You can access it from the sidebar or dashboard.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search knowledge entries..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Knowledge
          </Button>
        </div>
      </div>

      {isLoading ? (
        <KnowledgeBaseSkeleton />
      ) : error ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
            <p className="text-sm text-red-600 dark:text-red-400">Failed to load knowledge base</p>
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="mx-auto w-24 h-24 bg-muted/50 rounded-full flex items-center justify-center mb-4">
            <FileText className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">No Knowledge Entries</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Add knowledge entries to provide your agent with context, guidelines, and information it should always remember.
          </p>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Create Your First Entry
          </Button>
        </div>
      )}
    </div>
  );
}
