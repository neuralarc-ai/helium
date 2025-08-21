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
  useKnowledgeBaseContext,
  CreateKnowledgeBaseEntryRequest,
  KnowledgeBaseEntry,
  UpdateKnowledgeBaseEntryRequest,
} from '@/hooks/react-query/knowledge-base/use-knowledge-base-queries';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { toast } from 'sonner';

interface KnowledgeBaseManagerProps {
  threadId: string;
}

interface EditDialogData {
  entry?: KnowledgeBaseEntry;
  isOpen: boolean;
}

interface DetailsDialogData {
  entry: KnowledgeBaseEntry | null;
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
  const ENTRY_LIMIT = 14;
  const [editDialog, setEditDialog] = useState<EditDialogData>({ isOpen: false });
  const [deleteEntryId, setDeleteEntryId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [droppedFiles, setDroppedFiles] = useState<DroppedFile[]>([]);
  const [previewFile, setPreviewFile] = useState<DroppedFile | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [detailsDialog, setDetailsDialog] = useState<DetailsDialogData>({ isOpen: false, entry: null });
  const contentTextareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState<CreateKnowledgeBaseEntryRequest>({
    name: '',
    description: '',
    content: '',
    usage_context: 'always',
  });
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ file: File; content: string }>>([]);
  const [previewFiles, setPreviewFiles] = useState<Array<{ file: File; content?: string; status: 'pending' | 'processing' | 'ready' | 'error'; error?: string }>>([]);
  const [isMultiSelect, setIsMultiSelect] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);

  const { data: knowledgeBase, isLoading, error, refetch } = useKnowledgeBaseEntries(threadId, showInactive);
  const { data: kbContext, refetch: refetchKbContext, isLoading: isLoadingContext } = useKnowledgeBaseContext(threadId, 16000);
  const createMutation = useCreateKnowledgeBaseEntry();
  const updateMutation = useUpdateKnowledgeBaseEntry();
  const deleteMutation = useDeleteKnowledgeBaseEntry();
  const uploadMutation = useUploadThreadFiles();

  const entries = knowledgeBase?.entries ?? [];
  const atLimit = (entries?.length || 0) >= ENTRY_LIMIT;
  const toggleSelect = (entryId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(entryId)) next.delete(entryId); else next.add(entryId);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const handleBulkDelete = async () => {
    try {
      const ids = Array.from(selectedIds);
      for (const id of ids) {
        await deleteMutation.mutateAsync(id);
      }
      clearSelection();
      setIsMultiSelect(false);
      setIsBulkDeleteOpen(false);
      refetch();
    } catch (e) {
      console.error(e);
    }
  };

  const filteredEntries = entries.filter((entry) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      entry.name.toLowerCase().includes(q) ||
      (entry.description && entry.description.toLowerCase().includes(q)) ||
      entry.content.toLowerCase().includes(q)
    );
  });

  const handleOpenCreateDialog = () => {
    if (atLimit) {
      toast.error(`Limit reached: maximum ${ENTRY_LIMIT} files in beta`);
      return;
    }
    setFormData({ name: '', description: '', content: '', usage_context: 'always' });
    setUploadedFiles([]);
    setPreviewFiles([]);
    uploadingSetRef.current.clear();
    setEditDialog({ isOpen: true });
  };

  const handleOpenEditDialog = (entry: KnowledgeBaseEntry) => {
    setFormData({
      name: entry.name,
      description: entry.description,
      content: entry.content,
      usage_context: entry.usage_context,
    });
    setUploadedFiles([]);
    setEditDialog({ isOpen: true, entry });
  };

  const handleCloseDialog = () => {
    setEditDialog({ isOpen: false });
    setUploadedFiles([]);
    setIsUploading(false);
    setPreviewFiles([]);
    uploadingSetRef.current.clear();
  };

  const handleOpenDetailsDialog = (entry: KnowledgeBaseEntry) => {
    setDetailsDialog({ entry, isOpen: true });
  };

  const handleCloseDetailsDialog = () => {
    setDetailsDialog({ isOpen: false, entry: null });
  };

  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = (e.target?.result as string) || '';
          const sanitized = content
            .replace(/\u0000/g, '')
            .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n');
          resolve(sanitized);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  };

  // Prevent duplicate concurrent uploads of same file name+size
  const uploadingSetRef = useRef<Set<string>>(new Set());

  const handleFileUpload = async (file: File) => {
    try {
      if (atLimit) {
        toast.error(`Limit reached: maximum ${ENTRY_LIMIT} files in beta`);
        return;
      }
      if (isUploading) {
        // Prevent overlapping uploads; user can queue after current finishes
        return;
      }
      setIsUploading(true);
      const lower = file.name.toLowerCase();
      const isPdf = file.type === 'application/pdf' || lower.endsWith('.pdf');
      const isCsv = file.type === 'text/csv' || lower.endsWith('.csv');
      const isDocx =
        file.type ===
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        lower.endsWith('.docx');
      const isTextLike = file.type.startsWith('text/') || /\.(txt|md|json|log|csv)$/i.test(lower);

      const uploadKey = `${file.name}|${file.size}`;
      // Reject duplicates already queued or added or existing entries
      const existsInEntries = entries.some(e => {
        const entryName = (e.name || '').toLowerCase();
        const entryFilename = (e as any).source_metadata?.filename?.toLowerCase?.() || '';
        const filenameLower = file.name.toLowerCase();
        return entryName === filenameLower || entryFilename === filenameLower;
      });
      if (
        uploadingSetRef.current.has(uploadKey) ||
        previewFiles.some((pf) => pf.file.name === file.name && pf.file.size === file.size) ||
        uploadedFiles.some((uf) => uf.file.name === file.name && uf.file.size === file.size) ||
        existsInEntries
      ) {
        toast.error('File already exists');
        return;
      }
      uploadingSetRef.current.add(uploadKey);

      // Check if file is supported for vector processing
      const isVectorSupported = isPdf || isCsv || isDocx;

      if (isVectorSupported) {
        // Add to preview list for vector processing
        setPreviewFiles((prev) => prev.concat({ file, status: 'ready' }));
        toast.success(`Added ${file.name} for vector processing`);
      } else {
        // Read content client-side and include in the form content
        const content = await readFileContent(file);
        setUploadedFiles((prev) => prev.concat({ file, content }));
        toast.success(`Added ${file.name} as inline text content`);
      }
    } catch (err: any) {
      // If backend cannot process the file, attempt a graceful fallback for text-like files
      const msg = String(err?.message || 'Failed to process file');
      if (/(unsupported file format|No extractable content|Failed to process file|Error extracting PDF)/i.test(msg)) {
        try {
          // Only fallback for text-like files to avoid binary junk
          const lower = file.name.toLowerCase();
          const isTextLike = file.type.startsWith('text/') || /\.(txt|md|json|log|csv)$/i.test(lower);
          if (isTextLike) {
            const content = await readFileContent(file);
            setUploadedFiles((prev) => prev.concat({ file, content }));
            toast.info(`Backend couldn't extract ${file.name}. Added as inline text content instead.`);
          } else {
            toast.error('Unsupported file format for auto-extraction. Please convert to PDF/TXT/CSV or paste content manually.');
          }
        } catch (readErr) {
          toast.error('Could not read file content locally. Please convert to text and retry.');
        }
      } else if (msg.includes('source_metadata')) {
        toast.error('Upload failed due to unsupported fields. Please try again.');
      } else {
        toast.error(msg);
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleUploadFileFromPreview = async (file: File) => {
    try {
      setIsUploading(true);
      if (atLimit) {
        toast.error(`Limit reached: maximum ${ENTRY_LIMIT} files in beta`);
        setIsUploading(false);
        return;
      }
      const customName = (formData.name || '').trim() || undefined;
      // Prevent duplicate by name vs existing entries
      const nameLower = (customName || file.name).toLowerCase();
      const existsByName = entries.some(e => (e.name || '').toLowerCase() === nameLower);
      if (existsByName) {
        toast.error('File already exists');
        setIsUploading(false);
        return;
      }
      
      // Use the vector knowledge base API for supported file types
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);
      formDataUpload.append('kb_type', 'thread');
      formDataUpload.append('thread_id', threadId);
      
      try {
        const response = await fetch('/api/vector-kb/upload-document', {
          method: 'POST',
          body: formDataUpload,
        });
        
        if (response.ok) {
          const result = await response.json();
          toast.success(`Successfully uploaded ${file.name} for vector processing`);
          setPreviewFiles((prev) => prev.filter((pf) => pf.file !== file));
          await refetch();
          await refetchKbContext();
        } else {
          const errorData = await response.json();
          throw new Error(errorData.detail || 'Upload failed');
        }
      } catch (error) {
        console.error('Error uploading file:', error);
        toast.error(`Failed to upload file: ${file.name}`);
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveFileFromPreview = (file: File) => {
    setPreviewFiles((prev) => prev.filter((pf) => pf.file !== file));
    const uploadKey = `${file.name}|${file.size}`;
    uploadingSetRef.current.delete(uploadKey);
  };

  const getFileIcon = (filename: string) => {
    const lower = filename.toLowerCase();
    if (lower.endsWith('.pdf')) return FileText;
    if (lower.endsWith('.csv')) return FileCode;
    if (lower.endsWith('.docx')) return FileText;
    if (/(png|jpg|jpeg|gif|webp)$/i.test(lower)) return ImageIcon;
    if (lower.endsWith('.zip')) return FileArchive;
    return File;
  };

  const handleFormDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleFormDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleFormDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (isUploading) return;
    const files = Array.from(e.dataTransfer.files || []);
    // Process sequentially to avoid overlapping network calls
    for (const f of files) {
      // Skip zero-byte files
      if (f.size === 0) continue;
      await handleFileUpload(f);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Merge any uploaded non-PDF/CSV file contents into the content body
    const nonPdfText = uploadedFiles.map((f) => f.content).filter(Boolean).join('\n\n');
    let combinedContent = formData.content || '';
    if (nonPdfText) {
      combinedContent = combinedContent
        ? `${combinedContent}\n\n--- File Contents ---\n\n${nonPdfText}`
        : nonPdfText;
    }

    if (!combinedContent.trim() && uploadedFiles.length === 0 && previewFiles.length === 0) {
      toast.error('Please provide content or upload files');
      return;
    }

    const payload: CreateKnowledgeBaseEntryRequest | UpdateKnowledgeBaseEntryRequest = {
      name: formData.name,
      description: formData.description,
      content: combinedContent,
      usage_context: formData.usage_context,
    };

    try {
      // Upload any queued preview files first
      if (previewFiles.length > 0) {
        for (const pf of previewFiles) {
          await handleUploadFileFromPreview(pf.file);
        }
      }

      // If there is no inline content and no in-form uploaded text files,
      // and we only uploaded files via preview, then we're done.
      if (!combinedContent.trim() && uploadedFiles.length === 0) {
        toast.success('Files uploaded successfully');
        handleCloseDialog();
        refetch();
        refetchKbContext();
        return;
      }

      if (editDialog.entry) {
        await updateMutation.mutateAsync({ entryId: editDialog.entry.entry_id, data: payload as UpdateKnowledgeBaseEntryRequest });
        toast.success('Knowledge entry updated');
      } else {
        await createMutation.mutateAsync({ threadId, data: payload as CreateKnowledgeBaseEntryRequest });
        toast.success('Knowledge entry created');
      }
      handleCloseDialog();
      refetch();
      refetchKbContext();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save knowledge entry');
    }
  };

  const handleDelete = async (entryId: string) => {
    try {
      await deleteMutation.mutateAsync(entryId);
      toast.success('Knowledge entry deleted');
      setDeleteEntryId(null);
      refetch();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete entry');
    }
  };

  const handleToggleActive = async (entry: KnowledgeBaseEntry) => {
    try {
      await updateMutation.mutateAsync({ entryId: entry.entry_id, data: { is_active: !entry.is_active } });
      refetch();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update entry');
    }
  };

  const handleSetUsageContext = async (
    entry: KnowledgeBaseEntry,
    usage: 'always' | 'contextual' | 'on_request',
  ) => {
    try {
      await updateMutation.mutateAsync({ entryId: entry.entry_id, data: { usage_context: usage } });
      toast.success(`Set usage context to ${usage.replace('_', ' ')}`);
      refetch();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update usage context');
    }
  };

  const getUsageContextConfig = (context: string) => {
    return USAGE_CONTEXT_OPTIONS.find((o) => o.value === context) || USAGE_CONTEXT_OPTIONS[0];
  };

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
     

      {/* 
      <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg p-4 border border-blue-500/20">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <BookOpen className="h-5 w-5 text-blue-400" />
          </div>
          <div className="mt-2 max-h-32 overflow-y-auto whitespace-pre-wrap text-blue-200">
            {kbContext.context.length > 500 ? kbContext.context.slice(0, 500) + '…' : kbContext.context}
          </div>
        </div>
      </div>
      */}

      {/* Search and Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex-1 max-w-lg">
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
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowInactive((v) => !v)}
            className={showInactive ? 'bg-accent' : ''}
          >
            {showInactive ? 'Hide Inactive' : 'Show Inactive'}
          </Button>
          <Button
            variant={isMultiSelect ? 'default' : 'outline'}
            size="sm"
            onClick={() => { setIsMultiSelect(v => !v); if (isMultiSelect) clearSelection(); }}
          >
            {isMultiSelect ? 'Cancel Select' : 'Select'}
          </Button>
          {isMultiSelect && selectedIds.size > 0 && (
            <Button size="sm" className="bg-red-600 text-white" onClick={() => setIsBulkDeleteOpen(true)}>
              Delete ({selectedIds.size})
            </Button>
          )}
          <Button
            size="sm"
            onClick={handleOpenCreateDialog}
            className="cursor-pointer rounded-md bg-[#0ac5b2]"
            disabled={atLimit}
          >
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
      ) : filteredEntries.length === 0 ? (
        <div className="text-center py-12">
          <div className="mx-auto w-24 h-24 bg-muted/50 rounded-full flex items-center justify-center mb-4">
           <FileText className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">No Knowledge Entries</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Add knowledge entries to provide your agent with context, guidelines, and information it should always remember.
          </p>
          <Button className="gap-2 cursor-pointer rounded-md bg-[#0ac5b2]" onClick={handleOpenCreateDialog}>
            <Plus className="h-4 w-4" />
            Create Your First Entry
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredEntries.map((entry) => {
            const contextConfig = getUsageContextConfig(entry.usage_context);
            const ContextIcon = contextConfig.icon;
            return (
              <Tooltip key={entry.entry_id}>
                <TooltipTrigger asChild>
                  <div
                    className={cn('group border rounded-lg p-4 transition-all cursor-pointer', entry.is_active ? 'border-border bg-card hover:border-border/80' : 'border-border/50 bg-muted/30 opacity-70')}
                    onClick={() => isMultiSelect ? toggleSelect(entry.entry_id) : handleOpenDetailsDialog(entry)}
                  >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      {isMultiSelect && (
                        <input
                          type="checkbox"
                          className="h-4 w-4"
                          checked={selectedIds.has(entry.entry_id)}
                          onChange={() => toggleSelect(entry.entry_id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      )}
                      <h3 className="font-medium truncate">{entry.name}</h3>
                      <Badge variant="outline" className={`text-xs ${contextConfig.color}`}>
                        <ContextIcon className="h-3 w-3 mr-1" />
                        {contextConfig.label}
                      </Badge>
                      {!entry.is_active && (
                        <Badge variant="secondary" className="text-xs">
                          <EyeOff className="h-3 w-3 mr-1" />
                          Disabled
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">{entry.description || 'No usage context provided'}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>Created {new Date(entry.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100"
                          onClick={(e) => e.stopPropagation()}
                        >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleOpenEditDialog(entry); }}>
                        <Edit2 className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleToggleActive(entry); }}>
                        {entry.is_active ? (
                          <>
                            <EyeOff className="h-4 w-4 mr-2" />
                            Disable
                          </>
                        ) : (
                          <>
                            <Eye className="h-4 w-4 mr-2" />
                            Enable
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleSetUsageContext(entry, 'always'); }}>
                        <Eye className="h-4 w-4 mr-2" />
                        Set Always Active
                      </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleSetUsageContext(entry, 'contextual'); }}>
                        <Eye className="h-4 w-4 mr-2" />
                        Set Contextual
                      </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleSetUsageContext(entry, 'on_request'); }}>
                        <EyeOff className="h-4 w-4 mr-2" />
                        Set On Request Only
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setDeleteEntryId(entry.entry_id); }} className="text-red-600">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Click to view details and usage context</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={editDialog.isOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editDialog.entry ? 'Edit Thread Knowledge Entry' : 'Add Thread Knowledge Entry'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name" className="text-lg mb-2">Name</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                placeholder="Enter a name for this knowledge entry"
                required
              />
            </div>
            <div>
              <Label htmlFor="description" className="text-lg mb-2">Helium will diffuse this knowledge effectively when... (Optional)</Label>
              <Input
                id="description"
                name="description"
                value={formData.description}
                onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                placeholder="Describe when this knowledge should be used"
              />
            </div>

            {/* File Upload Section */}
            <div>
              <Label className="text-lg mb-2">Attach Files (Optional)</Label>
              <div
                className={cn(
                  'border-2 border-dashed rounded-lg p-4 text-center transition-colors mt-2',
                  isDragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50',
                )}
                onDragOver={handleFormDragOver}
                onDragLeave={handleFormDragLeave}
                onDrop={handleFormDrop}
                aria-disabled={isUploading}
                style={isUploading ? { pointerEvents: 'none', opacity: 0.6 } : undefined}
              >
                <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-2">Drop files here or click to browse</p>
                <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                  Choose Files
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.docx,.csv,.txt,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/csv"
                  className="hidden"
                  onChange={async (e) => {
                    const files = Array.from(e.target.files || []);
                    for (const f of files) {
                      await handleFileUpload(f);
                    }
                    if (e.target) (e.target as HTMLInputElement).value = '';
                  }}
                  disabled={isUploading}
                />
              </div>

              {/* Preview files queued for backend extraction */}
              {previewFiles.length > 0 && (
                <div className="mt-4 space-y-2">
                  <Label className="text-sm font-medium">Files to Upload:</Label>
                  <div className="space-y-2">
                    {previewFiles.map((pf, idx) => {
                      const Icon = getFileIcon(pf.file.name);
                      return (
                        <div key={idx} className="flex items-center justify-between p-2 bg-muted rounded-md">
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium truncate max-w-[240px]">{pf.file.name}</span>
                            <span className="text-xs text-muted-foreground">({Math.round(pf.file.size / 1024)}KB)</span>
                            {pf.status === 'processing' && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                            {pf.status === 'error' && <span className="text-xs text-red-500">{pf.error || 'Error'}</span>}
                          </div>
                          <div className="flex items-center gap-2">
                            <Button type="button" variant="outline" size="sm" onClick={() => handleUploadFileFromPreview(pf.file)} disabled={isUploading}>
                              Upload
                            </Button>
                            <Button type="button" variant="ghost" size="sm" onClick={() => handleRemoveFileFromPreview(pf.file)}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Display uploaded (in-form) files */}
              {uploadedFiles.length > 0 && (
                <div className="mt-4 space-y-2">
                  <Label className="text-sm font-medium">Uploaded Files:</Label>
                  <div className="space-y-2">
                    {uploadedFiles.map((fileData, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-muted rounded-md">
                        <div className="flex items-center gap-2">
                          <File className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">{fileData.file.name}</span>
                          <span className="text-xs text-muted-foreground">({Math.round(fileData.content.length / 1024)}KB)</span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const file = fileData.file;
                            setUploadedFiles((prev) => prev.filter((_, i) => i !== idx));
                            const uploadKey = `${file.name}|${file.size}`;
                            uploadingSetRef.current.delete(uploadKey);
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="content" className="text-lg mb-2">Content (Optional)</Label>
              <Textarea
                id="content"
                name="content"
                value={formData.content}
                onChange={(e) => setFormData((p) => ({ ...p, content: e.target.value }))}
                placeholder="Enter the knowledge content (optional if files uploaded and processed)..."
                rows={8}
                required={uploadedFiles.length === 0 && previewFiles.length === 0}
              />
            </div>
            <div>
              <Label htmlFor="usage_context" className="text-lg mb-2">Usage Context</Label>
              <Select
                value={formData.usage_context}
                onValueChange={(v) => setFormData((p) => ({ ...p, usage_context: v as any }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="always">Always Active</SelectItem>
                  <SelectItem value="contextual">Contextual</SelectItem>
                  <SelectItem value="on_request">On Request Only</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                <strong>Always Active:</strong> Always included • <strong>Contextual:</strong> Included when relevant • <strong>On Request:</strong> Only when specifically requested
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending || isUploading}>
                {createMutation.isPending || updateMutation.isPending || isUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : editDialog.entry ? (
                  'Update'
                ) : (
                  'Create'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={detailsDialog.isOpen} onOpenChange={handleCloseDetailsDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {detailsDialog.entry?.name || 'Loading...'}
            </DialogTitle>
          </DialogHeader>
          {detailsDialog.entry ? (
            <div className="space-y-6">
              <div>
                <h4 className="font-medium mb-2">Usage Context</h4>
                <p className="text-sm text-muted-foreground">
                  {detailsDialog.entry.description || 'No usage context provided'}
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-2">Content</h4>
                <div className="bg-muted/30 rounded-lg p-4 max-h-96 overflow-y-auto border">
                  {detailsDialog.entry.content ? (
                    <pre className="text-sm whitespace-pre-wrap break-words font-mono">{detailsDialog.entry.content}</pre>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No content available for this entry</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Status:</span>
                  <Badge variant={detailsDialog.entry.is_active ? 'default' : 'secondary'} className="ml-2">
                    {detailsDialog.entry.is_active ? 'Active' : 'Disabled'}
                  </Badge>
                </div>
                <div>
                  <span className="font-medium">Usage Context:</span>
                  <Badge variant="outline" className="ml-2">
                    {getUsageContextConfig(detailsDialog.entry.usage_context).label}
                  </Badge>
                </div>
                <div>
                  <span className="font-medium">Created:</span>
                  <span className="ml-2 text-muted-foreground">{new Date(detailsDialog.entry.created_at).toLocaleDateString()}</span>
                </div>
                <div>
                  <span className="font-medium">Updated:</span>
                  <span className="ml-2 text-muted-foreground">{new Date(detailsDialog.entry.updated_at).toLocaleDateString()}</span>
                </div>
              </div>
              {detailsDialog.entry.content_tokens && (
                <div>
                  <span className="font-medium">Content Tokens:</span>
                  <span className="ml-2 text-muted-foreground">~{detailsDialog.entry.content_tokens.toLocaleString()}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Loading entry details...</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteEntryId} onOpenChange={(open) => !open && setDeleteEntryId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Knowledge Entry</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this entry? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteEntryId && handleDelete(deleteEntryId)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={isBulkDeleteOpen} onOpenChange={(open) => { if (!open) setIsBulkDeleteOpen(false); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Selected Entries</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {selectedIds.size} selected entr{selectedIds.size === 1 ? 'y' : 'ies'}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsBulkDeleteOpen(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className="bg-red-600 text-white">
              Delete ({selectedIds.size})
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
