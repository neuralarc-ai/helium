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
  RefreshCw,
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
  useGlobalKnowledgeBaseEntries,
  useCreateGlobalKnowledgeBaseEntry,
  useUpdateGlobalKnowledgeBaseEntry,
  useDeleteGlobalKnowledgeBaseEntry,
  useUploadGlobalFile,
  CreateKnowledgeBaseEntryRequest,
  KnowledgeBaseEntry,
  UpdateKnowledgeBaseEntryRequest,
} from '@/hooks/react-query/knowledge-base/use-global-knowledge-base-queries';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { toast } from 'sonner';

interface GlobalKnowledgeBaseManagerProps {
  // No props needed for global knowledge base
}

interface EditDialogData {
  entry?: KnowledgeBaseEntry;
  isOpen: boolean;
}

interface DetailsDialogData {
  entry: KnowledgeBaseEntry | null;
  isOpen: boolean;
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

const GlobalKnowledgeBaseSkeleton = () => (
    <div className="space-y-6">
        <div className="space-y-4">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-32" />
        </div>
        <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                </div>
            ))}
        </div>
    </div>
);

export const GlobalKnowledgeBaseManager = ({}: GlobalKnowledgeBaseManagerProps) => {
  const ENTRY_LIMIT = 14;
  const [editDialog, setEditDialog] = useState<EditDialogData>({ isOpen: false });
  const [detailsDialog, setDetailsDialog] = useState<DetailsDialogData>({ isOpen: false, entry: null });
  const [searchTerm, setSearchTerm] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [isFormDragOver, setIsFormDragOver] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ file: File; content: string; entryId?: string }>>([]);
  const [previewFiles, setPreviewFiles] = useState<Array<{ file: File; content?: string; status: 'pending' | 'processing' | 'ready' | 'error'; error?: string }>>([]);
  const [isUploading, setIsUploading] = useState(false);
  const formFileInputRef = useRef<HTMLInputElement>(null);
  const [isMultiSelect, setIsMultiSelect] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);

  // Global knowledge base queries
  const {
    data: globalEntriesResponse,
    isLoading: isLoadingGlobal,
    error: globalError,
    refetch: refetchGlobal
  } = useGlobalKnowledgeBaseEntries({ includeInactive: showInactive });

  const globalEntries = globalEntriesResponse?.entries || [];
  const atLimit = (globalEntries?.length || 0) >= ENTRY_LIMIT;

  const createGlobalMutation = useCreateGlobalKnowledgeBaseEntry();
  const updateGlobalMutation = useUpdateGlobalKnowledgeBaseEntry();
  const deleteGlobalMutation = useDeleteGlobalKnowledgeBaseEntry();
  const uploadFileMutation = useUploadGlobalFile();
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
        await deleteGlobalMutation.mutateAsync(id);
      }
      clearSelection();
      setIsMultiSelect(false);
      setIsBulkDeleteOpen(false);
      refetchGlobal();
    } catch (e) {
      console.error(e);
    }
  };


  // Filter entries based on search term
  const filteredEntries = globalEntries.filter(entry =>
    entry.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (entry.description && entry.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
    entry.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenCreateDialog = () => {
    if (atLimit) {
      toast.error(`Limit reached: maximum ${ENTRY_LIMIT} files in beta`);
      return;
    }
    setEditDialog({ isOpen: true });
  };

  const handleOpenEditDialog = (entry: KnowledgeBaseEntry) => {
    setEditDialog({ entry, isOpen: true });
  };

  const handleCloseDialog = () => {
    setEditDialog({ isOpen: false });
    setUploadedFiles([]);
    setPreviewFiles([]);
    setIsUploading(false);
  };

  const handleOpenDetailsDialog = (entry: KnowledgeBaseEntry) => {
    setDetailsDialog({ entry, isOpen: true });
  };

  const handleCloseDetailsDialog = () => {
    setDetailsDialog({ isOpen: false, entry: null });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    
    try {
      // First, upload any preview files that need backend processing (PDF/CSV)
      const previewFilesToUpload = previewFiles.filter(fileData => {
        const isPdf = fileData.file.type.includes('pdf') || fileData.file.name.toLowerCase().endsWith('.pdf');
        const isCsv = fileData.file.type.includes('csv') || fileData.file.name.toLowerCase().endsWith('.csv');
        return (isPdf || isCsv) && fileData.status === 'ready';
      });

      if (previewFilesToUpload.length > 0) {
        setIsUploading(true);
        
        // Upload preview files one by one using the user-provided name
        const customName = formData.get('name') as string;
        
        for (const fileData of previewFilesToUpload) {
          try {
            const response = await uploadFileMutation.mutateAsync({ 
              file: fileData.file, 
              customName: customName 
            });
            if (response && response.success) {
              toast.success(`Successfully uploaded and extracted text from ${fileData.file.name}`);
              // Remove from preview files
              setPreviewFiles(prev => prev.filter(f => f.file !== fileData.file));
            } else {
              throw new Error('Failed to upload file');
            }
          } catch (error) {
            console.error('Error uploading preview file:', error);
            toast.error(`Failed to upload file: ${fileData.file.name}`);
            setIsUploading(false);
            return; // Stop the submission process
          }
        }
        
        setIsUploading(false);
        
        // After uploading preview files, refresh and close dialog
        refetchGlobal();
        handleCloseDialog();
        return;
      }

      // If no preview files to upload, proceed with regular form submission
      // Check if we have any non-PDF files that need to be processed
      const nonPdfFiles = uploadedFiles.filter(fileData => 
        !fileData.file.type.includes('pdf') && !fileData.file.name.toLowerCase().endsWith('.pdf')
      );
      
      // Combine form content with uploaded non-PDF file content
      let combinedContent = formData.get('content') as string || '';
      
      if (nonPdfFiles.length > 0) {
        const fileContents = nonPdfFiles.map(file => file.content).join('\n\n');
        if (combinedContent) {
          combinedContent = `${combinedContent}\n\n--- File Contents ---\n\n${fileContents}`;
        } else {
          combinedContent = fileContents;
        }
      }
      
      // Validate that we have either content, files, or preview files ready to upload
      if (!combinedContent.trim() && uploadedFiles.length === 0 && previewFilesToUpload.length === 0) {
        toast.error('Please provide either content or upload files');
        return;
      }
      
      // Description is now optional
      const description = formData.get('description') as string;
      
      // Sanitize the combined content to remove any problematic characters
      const sanitizedContent = combinedContent
        .replace(/\u0000/g, '') // Remove null bytes
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove other control characters
        .replace(/\r\n/g, '\n') // Normalize line endings
        .replace(/\r/g, '\n'); // Normalize line endings
      
      if (!sanitizedContent.trim() && uploadedFiles.length === 0) {
        toast.error('Content is empty after sanitization. Please check your file content.');
        return;
      }
      
      const entryData: CreateKnowledgeBaseEntryRequest = {
        name: formData.get('name') as string,
        description: formData.get('description') as string || undefined,
        content: sanitizedContent,
        usage_context: (formData.get('usage_context') as string) || 'always',
        is_active: true
      };

      if (editDialog.entry) {
        // Update existing entry
        await updateGlobalMutation.mutateAsync({
          entryId: editDialog.entry.entry_id,
          entryData: entryData as UpdateKnowledgeBaseEntryRequest
        });
      } else {
        // Create new entry
        await createGlobalMutation.mutateAsync(entryData);
      }
      
      handleCloseDialog();
      refetchGlobal();
    } catch (error) {
      console.error('Error saving global knowledge base entry:', error);
      setIsUploading(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    try {
      if (atLimit) {
        toast.error(`Limit reached: maximum ${ENTRY_LIMIT} files in beta`);
        return;
      }
      // Add file to preview list first
      const fileId = Math.random().toString(36).substr(2, 9);
      // Prevent duplicates across preview and uploaded
      const dupKey = `${file.name}|${file.size}`;
      const exists =
        previewFiles.some(f => f.file.name === file.name && f.file.size === file.size) ||
        uploadedFiles.some(f => f.file.name === file.name && f.file.size === file.size);
      // Also prevent duplicates against existing KB entries by filename or name
      const existsInEntries = globalEntries.some(e => {
        const entryName = (e.name || '').toLowerCase();
        const entryFilename = (e as any).source_metadata?.filename?.toLowerCase?.() || '';
        const filenameLower = file.name.toLowerCase();
        return entryName === filenameLower || entryFilename === filenameLower;
      });
      if (exists) {
        toast.error('File already exists');
        return;
      }
      if (existsInEntries) {
        toast.error('File already exists');
        return;
      }
      setPreviewFiles(prev => [...prev, { file, status: 'processing' }]);

      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf') ||
          file.type === 'text/csv' || file.name.toLowerCase().endsWith('.csv')) {
        // For PDF and CSV files, just add to preview without uploading yet
        setPreviewFiles(prev => prev.map(f => 
          f.file === file ? { ...f, status: 'ready' } : f
        ));
      } else {
        // For other files, read as text and add to both preview and uploaded files
        try {
          const content = await readFileContent(file);
          // Re-check duplicate by content hash-equivalent (length+name heuristic)
          const filenameLower = file.name.toLowerCase();
          const existsByName = globalEntries.some(e => (e.name || '').toLowerCase() === filenameLower);
          if (existsByName) {
            toast.error('File already exists');
            setPreviewFiles(prev => prev.filter(f => f.file !== file));
            return;
          }
          setUploadedFiles(prev => [...prev, { file, content }]);
          setPreviewFiles(prev => prev.map(f => 
            f.file === file ? { ...f, content, status: 'ready' } : f
          ));
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          setPreviewFiles(prev => prev.map(f => 
            f.file === file ? { ...f, status: 'error', error: errorMessage } : f
          ));
          throw error;
        }
      }
      
    } catch (error) {
      console.error('Error processing file:', error);
      toast.error(`Failed to process file: ${file.name}`);
    }
  };

  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          // Sanitize content to remove null bytes and other problematic characters
          const sanitizedContent = content
            .replace(/\u0000/g, '') // Remove null bytes
            .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove other control characters
            .replace(/\r\n/g, '\n') // Normalize line endings
            .replace(/\r/g, '\n'); // Normalize line endings
          resolve(sanitizedContent);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      
      // Read as text for non-PDF files
      reader.readAsText(file);
    });
  };

  const handleDelete = async (entryId: string) => {
    try {
      await deleteGlobalMutation.mutateAsync(entryId);
      refetchGlobal();
    } catch (error) {
      console.error('Error deleting global knowledge base entry:', error);
    }
  };

  const handleToggleActive = async (entry: KnowledgeBaseEntry) => {
    try {
      await updateGlobalMutation.mutateAsync({
        entryId: entry.entry_id,
        entryData: { is_active: !entry.is_active }
      });
      refetchGlobal();
    } catch (error) {
      console.error('Error toggling global knowledge base entry:', error);
    }
  };

  const getUsageContextConfig = (context: string) => {
    return USAGE_CONTEXT_OPTIONS.find(option => option.value === context) || USAGE_CONTEXT_OPTIONS[0];
  };



  const handleFormDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsFormDragOver(true);
  };

  const handleFormDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsFormDragOver(false);
  };

  const handleFormDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsFormDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    for (const file of files) {
      await handleFileUpload(file);
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
      
      // Get the current name from the form field
      const nameInput = document.querySelector('input[name="name"]') as HTMLInputElement;
      const customName = nameInput?.value || file.name;
      // Guard: prevent duplicate by name against existing entries
      const nameLower = customName.toLowerCase();
      const existsByName = globalEntries.some(e => (e.name || '').toLowerCase() === nameLower);
      const existsByFilename = globalEntries.some(e => (e as any).source_metadata?.filename?.toLowerCase?.() === file.name.toLowerCase());
      if (existsByName) {
        toast.error('File already exists');
        setIsUploading(false);
        return;
      }
      if (existsByFilename) {
        toast.error('File already exists');
        setIsUploading(false);
        return;
      }
      
      // Use the backend file upload endpoint for PDFs and CSVs
      const response = await uploadFileMutation.mutateAsync({ 
        file, 
        customName: customName 
      });
      
      if (response && response.success) {
        // The backend upload creates a knowledge base entry directly
        toast.success(`Successfully uploaded and extracted text from ${file.name}`);
        // Remove from preview and refresh the knowledge base list
        setPreviewFiles(prev => prev.filter(f => f.file !== file));
        refetchGlobal();
      } else {
        throw new Error('Failed to upload file');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error(`Failed to upload file: ${file.name}`);
      // Update preview file status to error
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      setPreviewFiles(prev => prev.map(f => 
        f.file === file ? { ...f, status: 'error', error: errorMessage } : f
      ));
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveFileFromPreview = (file: File) => {
    setPreviewFiles(prev => prev.filter(f => f.file !== file));
    setUploadedFiles(prev => prev.filter(f => f.file !== file));
  };

  const getFileIcon = (file: File) => {
    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      return FileText;
    }
    if (file.type === 'text/csv' || file.name.toLowerCase().endsWith('.csv')) {
      return FileCode;
    }
    if (file.type.startsWith('image/')) {
      return ImageIcon;
    }
    if (file.name.toLowerCase().endsWith('.zip')) {
      return FileArchive;
    }
    return File;
  };

  if (isLoadingGlobal) {
    return <GlobalKnowledgeBaseSkeleton />;
  }

  if (globalError) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-red-600">
          <AlertCircle className="h-5 w-5" />
          <span>Error loading global knowledge base</span>
        </div>
        <Button onClick={() => refetchGlobal()} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      {/* <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg p-4 border border-blue-500/20">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <Globe className="h-5 w-5 text-blue-400" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-black mb-2">Global Knowledge Base</h2>
            <p className="text-sm text-black/60 mb-3">
              Add knowledge entries that will be available across all your chat threads. Specify when each piece of knowledge should be used, 
              and your AI will automatically include this information in relevant conversations.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500"></div>
                <span className="text-black/60">Available in all chats</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                <span className="text-black/60">Automatic context injection</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-purple-500"></div>
                <span className="text-black/60">No need to re-add per thread</span>
              </div>
            </div>
          </div>
        </div>
      </div> */}
      {/* Search and Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search knowledge entries..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <div className="flex items-center gap-2 ">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowInactive(!showInactive)}
            className={`${showInactive ? "bg-accent" : ""} rounded-md cursor-pointer`} 
          >
            {showInactive ? "Hide Inactive" : "Show Inactive"}
          </Button>
          <Button
            variant={isMultiSelect ? "default" : "outline"}
            size="sm"
            onClick={() => { setIsMultiSelect(v => !v); if (isMultiSelect) clearSelection(); }}
            className="rounded-md cursor-pointer"
          >
            {isMultiSelect ? "Cancel Select" : "Select"}
          </Button>
          {isMultiSelect && selectedIds.size > 0 && (
            <Button size="sm" className="bg-red-600 text-white rounded-md" onClick={() => setIsBulkDeleteOpen(true)}>
              Delete ({selectedIds.size})
            </Button>
          )}
          <Button onClick={handleOpenCreateDialog} size="sm" className="rounded-md cursor-pointer bg-[#0ac5b2]" disabled={atLimit}>
            <Plus className="h-4 w-4 mr-2" />
            Add Knowledge
          </Button>
        </div>
      </div>



      {/* Knowledge Base Entries */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            Global Knowledge Entries ({filteredEntries.length})
          </h3>
        </div>

        {filteredEntries.length === 0 ? (
          <div className="text-center py-12">
            <Book className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No global knowledge entries</h3>
            <p className="text-muted-foreground mb-4">
              Create your first global knowledge base entry with usage context to get started.
            </p>
            <Button onClick={handleOpenCreateDialog} className="rounded-md cursor-pointer bg-[#0ac5b2]">
              <Plus className="h-4 w-4 mr-2" />
              Add Knowledge
            </Button>
          </div>
        ) : (
          filteredEntries.map((entry) => {
            const contextConfig = getUsageContextConfig(entry.usage_context);
            const ContextIcon = contextConfig.icon;
            return (
              <Tooltip key={entry.entry_id}>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      "group border rounded-lg p-4 transition-all cursor-pointer",
                      entry.is_active 
                        ? "border-border bg-card hover:border-border/80" 
                        : "border-border/50 bg-muted/30 opacity-70"
                    )}
                    onClick={() => isMultiSelect ? toggleSelect(entry.entry_id) : handleOpenDetailsDialog(entry)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-center gap-2">
                         {/* <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" /> */}
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
                          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800">
                            <Globe className="h-3 w-3 mr-1" />
                            Global
                          </Badge>
                          {!entry.is_active && (
                            <Badge variant="secondary" className="text-xs">
                              <EyeOff className="h-3 w-3 mr-1" />
                              Disabled
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {entry.description || 'No usage context provided'}
                        </p>
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
                          <DropdownMenuItem 
                            onClick={(e) => { e.stopPropagation(); handleDelete(entry.entry_id); }}
                            className="text-red-600"
                          >
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
          })
        )}
      </div>

      {/* Details Dialog */}
      <Dialog open={detailsDialog.isOpen} onOpenChange={handleCloseDetailsDialog}>
        <DialogContent className="max-w-6xl max-h-[92vh] overflow-y-auto">
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
                    <pre className="text-sm whitespace-pre-wrap break-words font-mono">
                      {detailsDialog.entry.content}
                    </pre>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">
                      No content available for this entry
                    </p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Status:</span>
                  <Badge variant={detailsDialog.entry.is_active ? "default" : "secondary"} className="ml-2">
                    {detailsDialog.entry.is_active ? "Active" : "Disabled"}
                  </Badge>
                </div>
                <div>
                  <span className="font-medium">Usage Context:</span>
                  <Badge variant="outline" className="ml-2">
                    {getUsageContextConfig(detailsDialog.entry.usage_context || 'always').label}
                  </Badge>
                </div>
                <div>
                  <span className="font-medium">Created:</span>
                  <span className="ml-2 text-muted-foreground">
                    {detailsDialog.entry.created_at ? new Date(detailsDialog.entry.created_at).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="font-medium">Updated:</span>
                  <span className="ml-2 text-muted-foreground">
                    {detailsDialog.entry.updated_at ? new Date(detailsDialog.entry.updated_at).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
              </div>
              {detailsDialog.entry.content_tokens && (
                <div>
                  <span className="font-medium">Content Tokens:</span>
                  <span className="ml-2 text-muted-foreground">
                    ~{detailsDialog.entry.content_tokens.toLocaleString()}
                  </span>
                </div>
              )}
              {/* Additional metadata for debugging */}
              {detailsDialog.entry.source_metadata && (
                <div>
                  <h4 className="font-medium mb-2">File Information</h4>
                  <div className="text-sm text-muted-foreground space-y-1">
                    {detailsDialog.entry.source_metadata.filename && (
                      <div>
                        <span className="font-medium">Original Filename:</span>
                        <span className="ml-2">{detailsDialog.entry.source_metadata.filename}</span>
                      </div>
                    )}
                    {detailsDialog.entry.source_metadata.file_size && (
                      <div>
                        <span className="font-medium">File Size:</span>
                        <span className="ml-2">{Math.round(detailsDialog.entry.source_metadata.file_size / 1024)}KB</span>
                      </div>
                    )}
                    {detailsDialog.entry.source_metadata.extraction_method && (
                      <div>
                        <span className="font-medium">Extraction Method:</span>
                        <span className="ml-2">{detailsDialog.entry.source_metadata.extraction_method}</span>
                      </div>
                    )}
                  </div>
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

      {/* Create/Edit Dialog */}
      <Dialog open={editDialog.isOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto ">
          <DialogHeader>
            <DialogTitle>
              {editDialog.entry ? 'Edit Global Knowledge Entry' : 'Add Global Knowledge Entry'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name" className="mb-2 text-lg">Name</Label>
              <Input
                id="name"
                name="name"
                defaultValue={editDialog.entry?.name}
                placeholder="Enter a name for this knowledge entry"
                required
              />
            </div>
            <div>
              <Label htmlFor="description" className="mb-2 text-lg">Helium will diffuse this knowledge effectively when... (Optional)</Label>
              <Input 
                id="description"
                name="description"
                defaultValue={editDialog.entry?.description}
                placeholder="Describe when this knowledge should be used (e.g., 'Use for onboarding', 'Reference for compliance questions', etc.)"
              />
            </div>

            {/* File Upload Section */}
            <div>
              <Label className="text-lg">Attach Files (Optional)</Label>
              <div
                className={cn(
                  "border-2 border-dashed rounded-lg p-4 text-center transition-colors mt-2",
                  isFormDragOver
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                )}
                onDragOver={handleFormDragOver}
                onDragLeave={handleFormDragLeave}
                onDrop={handleFormDrop}
              >
                <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-2">
                  Drop files here or click to browse
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => formFileInputRef.current?.click()}
                >
                  Choose Files
                </Button>
                <input
                  ref={formFileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={async (e) => {
                    const files = Array.from(e.target.files || []);
                    for (const file of files) {
                      await handleFileUpload(file);
                    }
                    // Clear the input
                    if (e.target) {
                      (e.target as HTMLInputElement).value = '';
                    }
                  }}
                />
              </div>
              
              {/* Display preview files */}
              {previewFiles.length > 0 && (
                <div className="mt-4 space-y-2">
                  <Label className="text-sm font-medium text-lg">File Preview:</Label>
                  <div className="space-y-2">
                    {previewFiles.map((fileData, index) => {
                      const FileIcon = getFileIcon(fileData.file);
                      const isPdf = fileData.file.type.includes('pdf') || fileData.file.name.toLowerCase().endsWith('.pdf');
                      const isCsv = fileData.file.type.includes('csv') || fileData.file.name.toLowerCase().endsWith('.csv');
                      const needsUpload = isPdf || isCsv;
                      
                      return (
                        <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-md border">
                          <div className="flex items-center gap-3 flex-1">
                            <FileIcon className="h-5 w-5 text-muted-foreground" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium truncate">{fileData.file.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  ({Math.round(fileData.file.size / 1024)}KB)
                                </span>
                                {isPdf && (
                                  <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800">
                                    PDF
                                  </Badge>
                                )}
                                {isCsv && (
                                  <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
                                    CSV
                                  </Badge>
                                )}
                              </div>
                              {fileData.status === 'processing' && (
                                <div className="flex items-center gap-2 mt-1">
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                  <span className="text-xs text-muted-foreground">Processing...</span>
                                </div>
                              )}
                              {fileData.status === 'error' && (
                                <div className="flex items-center gap-2 mt-1">
                                  <AlertCircle className="h-3 w-3 text-red-500" />
                                  <span className="text-xs text-red-600">{fileData.error || 'Error processing file'}</span>
                                </div>
                              )}
                              {/* {fileData.status === 'ready' && needsUpload && (
                                <span className="text-xs text-amber-600 mt-1 block">Ready to upload - click the upload button</span>
                              )} */}
                              {fileData.status === 'ready' && !needsUpload && (
                                <span className="text-xs text-green-600 mt-1 block">Content loaded - will be included in entry</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {needsUpload && fileData.status === 'ready' && (
                              <Button
                                type="button"
                                size="sm"
                                variant="default"
                                onClick={() => handleUploadFileFromPreview(fileData.file)}
                                disabled={isUploading}
                                className="text-xs"
                              >
                                {isUploading ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <>
                                    <Upload className="h-3 w-3 mr-1" />
                                    Upload
                                  </>
                                )}
                              </Button>
                            )}
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveFileFromPreview(fileData.file)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Display uploaded files that are ready for form submission */}
              {uploadedFiles.length > 0 && (
                <div className="mt-4 space-y-2">
                  <Label className="text-sm font-medium mb-2 text-lg">Content Files (will be included in entry):</Label>
                  <div className="space-y-2">
                    {uploadedFiles.map((fileData, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-green-50 border border-green-200 rounded-md dark:bg-green-900/20 dark:border-green-800">
                        <div className="flex items-center gap-2">
                          <File className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-medium">{fileData.file.name}</span>
                          <span className="text-xs text-muted-foreground">
                            ({Math.round(fileData.content.length / 1024)}KB content)
                          </span>
                          <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
                            Ready
                          </Badge>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setUploadedFiles(prev => prev.filter((_, i) => i !== index));
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Info message for file uploads */}
              
            </div>

            <div>
              <Label htmlFor="content" className="mb-2 text-lg">Content (Optional)</Label>
              <Textarea
                id="content"
                name="content"
                defaultValue={editDialog.entry?.content}
                placeholder="Enter additional knowledge content (optional - files will be automatically included)..."
                rows={8}
              />
            </div>
            <div>
              <Label htmlFor="usage_context" className="mb-2 text-lg">Usage Context</Label>
              <Select name="usage_context" defaultValue={editDialog.entry?.usage_context || 'always'}>
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
                <strong>Always Active:</strong> Always included in AI context • <strong>Contextual:</strong> Included when relevant • <strong>On Request:</strong> Only when specifically requested
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={createGlobalMutation.isPending || updateGlobalMutation.isPending || isUploading}>
                {createGlobalMutation.isPending || updateGlobalMutation.isPending || isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    {isUploading ? 'Uploading Files...' : (editDialog.entry ? 'Updating...' : 'Creating...')}
                  </>
                ) : (
                  editDialog.entry ? 'Update' : 'Create'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

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
};
