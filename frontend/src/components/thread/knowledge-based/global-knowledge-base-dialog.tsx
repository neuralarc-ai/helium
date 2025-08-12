'use client';

import React from 'react';
import { Globe, Info } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { GlobalKnowledgeBaseManager } from './global-knowledge-base-manager';

interface GlobalKnowledgeBaseDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export const GlobalKnowledgeBaseDialog = ({ 
  isOpen, 
  onOpenChange 
}: GlobalKnowledgeBaseDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-full h-[80vh] flex flex-col p-0">
        <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-2">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Globe className="h-5 w-5" />
            Global Knowledge Base
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-4">
          <div className="flex items-start gap-3 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-200">
            <Info className="h-4 w-4 mt-0.5" />
            <span>
              You can add files in PDF, DOCX, CSV, or TXT format. During the beta, up to 15 files can be attached per knowledge base.
            </span>
          </div>
          <GlobalKnowledgeBaseManager />
        </div>
      </DialogContent>
    </Dialog>
  );
};
