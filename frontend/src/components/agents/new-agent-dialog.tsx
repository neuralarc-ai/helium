'use client';

import React, { useState, useRef } from 'react';
import { Loader2, Plus, FileJson, Code } from 'lucide-react';
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
import { useCreateNewAgent } from '@/hooks/react-query/agents/use-agents';
import { JsonImportDialog } from './json-import-dialog';
import { toast } from 'sonner';

interface NewAgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function NewAgentDialog({ open, onOpenChange, onSuccess }: NewAgentDialogProps) {
  const [showJsonImport, setShowJsonImport] = useState(false);
  const [jsonImportText, setJsonImportText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createNewAgentMutation = useCreateNewAgent();

  const handleCreateNewAgent = () => {
    createNewAgentMutation.mutate(undefined, {
      onSuccess: () => {
        onOpenChange(false);
        onSuccess?.();
      },
      onError: () => {
        // Keep dialog open on error so user can see the error and try again
        // The useCreateNewAgent hook already shows error toasts
      }
    });
  };

  const handleFileImport = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      toast.error('Please select a JSON file');
      return;
    }

    try {
      const fileContent = await file.text();
      setJsonImportText(fileContent);
      setShowJsonImport(true);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      toast.error('Failed to read file');
    }
  };

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      setShowJsonImport(false);
      setJsonImportText('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
    onOpenChange(open);
  };

  const isLoading = createNewAgentMutation.isPending;

  return (
    <AlertDialog open={open} onOpenChange={handleDialogClose}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Create New Agent</AlertDialogTitle>
          <AlertDialogDescription>
            This will create a new agent that you can customize and configure.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4">
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">
              This will create a new agent with a default name and description that you can customize later.
            </div>
            <div className="text-center w-full flex gap-2 items-center">
              <div
                onClick={handleFileImport}
                className="overflow-hidden text-xs gap-2 items-center w-full h-16 border border-input bg-background hover:bg-muted/30 transition-colors rounded-xl cursor-pointer flex disabled:cursor-not-allowed disabled:opacity-50"
                role="button"
                tabIndex={isLoading ? -1 : 0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (!isLoading) handleFileImport();
                  }
                }}
              >
                <div className='bg-muted h-full aspect-square flex items-center justify-center'>
                  <FileJson className="h-6 w-6" />
                </div>
                Import from file
              </div>
              <div
                onClick={() => !isLoading && setShowJsonImport(true)}
                className="overflow-hidden text-xs w-full items-center gap-2 h-16 border border-input bg-background hover:bg-muted/30 transition-colors rounded-xl cursor-pointer flex disabled:cursor-not-allowed disabled:opacity-50"
                role="button"
                tabIndex={isLoading ? -1 : 0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (!isLoading) setShowJsonImport(true);
                  }
                }}
              >
                <div className='bg-muted h-full aspect-square flex items-center justify-center'>
                  <Code className="h-6 w-6" />
                </div>
                Import from JSON
              </div>
            </div>
          </div>
          
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleCreateNewAgent}
            disabled={isLoading}
            className="min-w-[100px]"
          >
            {createNewAgentMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                Create Agent
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
      <JsonImportDialog
        open={showJsonImport}
        onOpenChange={setShowJsonImport}
        initialJsonText={jsonImportText}
        onSuccess={(agentId) => {
          setShowJsonImport(false);
          onOpenChange(false);
          onSuccess?.();
        }}
      />
    </AlertDialog>
  );
}