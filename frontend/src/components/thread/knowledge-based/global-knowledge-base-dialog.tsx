'use client';

import React from 'react';
import { Globe } from 'lucide-react';
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
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          <GlobalKnowledgeBaseManager />
        </div>
      </DialogContent>
    </Dialog>
  );
};
