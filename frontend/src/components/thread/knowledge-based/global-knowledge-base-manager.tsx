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
  const [editDialog, setEditDialog] = useState<EditDialogData>({ isOpen: false });
  const [searchTerm, setSearchTerm] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [isFormDragOver, setIsFormDragOver] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ file: File; content: string; entryId?: string }>>([]);
  const [isUploading, setIsUploading] = useState(false);
  const formFileInputRef = useRef<HTMLInputElement>(null);

  // Global knowledge base queries
  const {
    data: globalEntriesResponse,
    isLoading: isLoadingGlobal,
    error: globalError,
    refetch: refetchGlobal
  } = useGlobalKnowledgeBaseEntries({ includeInactive: showInactive });

  const globalEntries = globalEntriesResponse?.entries || [];

  const createGlobalMutation = useCreateGlobalKnowledgeBaseEntry();
  const updateGlobalMutation = useUpdateGlobalKnowledgeBaseEntry();
  const deleteGlobalMutation = useDeleteGlobalKnowledgeBaseEntry();
  const uploadFileMutation = useUploadGlobalFile();

  // Filter entries based on search term
  const filteredEntries = globalEntries.filter(entry =>
    entry.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (entry.description && entry.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
    entry.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenCreateDialog = () => {
    setEditDialog({ isOpen: true });
  };

  const handleOpenEditDialog = (entry: KnowledgeBaseEntry) => {
    setEditDialog({ entry, isOpen: true });
  };

  const handleCloseDialog = () => {
    setEditDialog({ isOpen: false });
    setUploadedFiles([]);
    setIsUploading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    
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
    
    // Validate that we have either content or files
    if (!combinedContent.trim() && uploadedFiles.length === 0) {
      toast.error('Please provide either content or upload files');
      return;
    }
    
    // Validate description is provided
    const description = formData.get('description') as string;
    if (!description?.trim()) {
      toast.error('Please describe when this knowledge should be used');
      return;
    }
    
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

    try {
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
    }
  };

  const handleFileUpload = async (file: File) => {
    try {
      setIsUploading(true);
      
      // For PDF files, we need to use the backend upload endpoint to extract text properly
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        // Use the backend file upload endpoint for PDFs
        const response = await uploadFileMutation.mutateAsync(file);
        
        if (response && response.success) {
          // The backend upload creates a knowledge base entry directly
          // We don't need to add it to uploadedFiles since it's already in the KB
          toast.success(`Successfully uploaded and extracted text from ${file.name}`);
          // Refresh the knowledge base list to show the new entry
          refetchGlobal();
        } else {
          throw new Error('Failed to upload PDF file');
        }
      } else {
        // For non-PDF files, read as text
        const content = await readFileContent(file);
        setUploadedFiles(prev => [...prev, { file, content }]);
      }
      
    } catch (error) {
      console.error('Error processing file:', error);
      toast.error(`Failed to process file: ${file.name}`);
    } finally {
      setIsUploading(false);
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
      <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg p-4 border border-blue-500/20">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <Globe className="h-5 w-5 text-blue-400" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-white mb-2">Global Knowledge Base</h2>
            <p className="text-sm text-white/70 mb-3">
              Add knowledge entries that will be available across all your chat threads. Specify when each piece of knowledge should be used, 
              and your AI will automatically include this information in relevant conversations.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500"></div>
                <span className="text-white/60">Available in all chats</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                <span className="text-white/60">Automatic context injection</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-purple-500"></div>
                <span className="text-white/60">No need to re-add per thread</span>
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
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowInactive(!showInactive)}
            className={showInactive ? "bg-accent" : ""}
          >
            {showInactive ? "Hide Inactive" : "Show Inactive"}
          </Button>
          <Button onClick={handleOpenCreateDialog} size="sm">
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
            <Button onClick={handleOpenCreateDialog}>
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
                      "group border rounded-lg p-4 transition-all",
                      entry.is_active 
                        ? "border-border bg-card hover:border-border/80" 
                        : "border-border/50 bg-muted/30 opacity-70"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
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
                          <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenEditDialog(entry)}>
                            <Edit2 className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleActive(entry)}>
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
                            onClick={() => handleDelete(entry.entry_id)}
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

      {/* Create/Edit Dialog */}
      <Dialog open={editDialog.isOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editDialog.entry ? 'Edit Global Knowledge Entry' : 'Add Global Knowledge Entry'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                defaultValue={editDialog.entry?.name}
                placeholder="Enter a name for this knowledge entry"
                required
              />
            </div>
            <div>
              <Label htmlFor="description">Helium will diffuse this knowledge effectively when...</Label>
              <Input
                id="description"
                name="description"
                defaultValue={editDialog.entry?.description}
                placeholder="Describe when this knowledge should be used (e.g., 'Use for onboarding', 'Reference for compliance questions', etc.)"
                required
              />
            </div>

            {/* File Upload Section */}
            <div>
              <Label>Attach Files (Optional)</Label>
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
              
              {/* Display uploaded files */}
              {uploadedFiles.length > 0 && (
                <div className="mt-4 space-y-2">
                  <Label className="text-sm font-medium">Uploaded Files:</Label>
                  <div className="space-y-2">
                    {uploadedFiles.map((fileData, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-md">
                        <div className="flex items-center gap-2">
                          <File className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">{fileData.file.name}</span>
                          <span className="text-xs text-muted-foreground">
                            ({Math.round(fileData.content.length / 1024)}KB)
                          </span>
                          {fileData.file.type.includes('pdf') || fileData.file.name.toLowerCase().endsWith('.pdf') ? (
                            <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
                              PDF
                            </Badge>
                          ) : null}
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
              
              {/* Show message for PDF files that were uploaded directly */}
              {uploadedFiles.some(fileData => 
                fileData.file.type.includes('pdf') || fileData.file.name.toLowerCase().endsWith('.pdf')
              ) && (
                <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md dark:bg-blue-900/20 dark:border-blue-800">
                  <p className="text-xs text-blue-700 dark:text-blue-400">
                    <strong>Note:</strong> PDF files are automatically processed and extracted by the backend. 
                    The extracted text will be included in your knowledge base entry.
                  </p>
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="content">Content</Label>
              <Textarea
                id="content"
                name="content"
                defaultValue={editDialog.entry?.content}
                placeholder="Enter additional knowledge content (optional - files will be automatically included)..."
                rows={8}
                required={uploadedFiles.length === 0}
              />
            </div>
            <div>
              <Label htmlFor="usage_context">Usage Context</Label>
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
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  editDialog.entry ? 'Update' : 'Create'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Knowledge Entry</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this global knowledge base entry? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleDelete(editDialog.entry?.entry_id || '')}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
