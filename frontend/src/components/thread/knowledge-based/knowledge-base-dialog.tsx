'use client';

import React, { useState } from 'react';
import { Book } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { KnowledgeBaseManager } from './knowledge-base-manager';

interface KnowledgeBaseDialogProps {
  threadId: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export const KnowledgeBaseDialog = ({ 
  threadId, 
  isOpen, 
  onOpenChange 
}: KnowledgeBaseDialogProps) => {
  // Prevent accidental double-open race causing double renders of child upload handlers
  const handleOpenChange = (open: boolean) => {
    onOpenChange(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl w-full h-[80vh] flex flex-col p-0">
        <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-2">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Book className="h-5 w-5" />
            Thread Knowledge Base
            <span className="text-xs bg-blue-500/10 text-blue-400 px-2 py-1 rounded-full ml-2">
              Thread-Specific
            </span>
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          <KnowledgeBaseManager threadId={threadId} />
        </div>
      </DialogContent>
    </Dialog>
  );
};
