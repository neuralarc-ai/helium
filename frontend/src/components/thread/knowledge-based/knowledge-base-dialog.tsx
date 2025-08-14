'use client';

import React, { useState } from 'react';
import { Book, FileText, Info } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { KnowledgeBaseManager } from './knowledge-base-manager';
import { useGlobalKnowledgeBaseEntries } from '@/hooks/react-query/knowledge-base/use-global-knowledge-base-queries';

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

  const [showGlobal, setShowGlobal] = useState(false);
  const { data: globalKb } = useGlobalKnowledgeBaseEntries({ includeInactive: false });

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl w-full h-[80vh] flex flex-col p-0">
        <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-2">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Book className="h-5 w-5" />
            Thread Knowledge Base
            <span className="text-xs bg-helium-pink/20 text-helium-pink/80 px-2 py-1 rounded-full ml-2">
              Thread-Specific
            </span>
          </DialogTitle>
          <div className="mt-2">
            <div className="inline-flex items-center rounded-md  bg-background">
              <Button
                type="button"
                variant={!showGlobal ? 'default' : 'outline'}
                size="sm"
                className="h-8 rounded-md rounded-r-none"
                onClick={() => setShowGlobal(false)}
                aria-pressed={!showGlobal}
              >
                Thread
              </Button>
              <Button
                type="button"
                variant={showGlobal ? 'default' : 'outline'}
                size="sm"
                className="h-8 rounded-md rounded-l-none"
                onClick={() => setShowGlobal(true)}
                aria-pressed={showGlobal}
              >
                Global
              </Button>
            </div>
          </div>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-4">
          <div className="flex items-start gap-3 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-200">
            <Info className="h-4 w-4 mt-0.5" />
            <span>
              You can add files in PDF, DOCX, CSV, or TXT format. During the beta, up to 14 files can be attached per knowledge base.
            </span>
          </div>
          {showGlobal && (
            <div className="rounded-lg border border-border bg-muted/40 p-5">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-base">Global Knowledge (read-only)</span>
                  <Badge variant="outline">{globalKb?.entries?.length ?? 0}</Badge>
                </div>
              </div>
              <div className="space-y-3 max-h-[50vh] overflow-y-auto">
                {(globalKb?.entries ?? []).map((e) => (
                  <div key={e.entry_id} className="flex items-start gap-3 p-3 rounded-md border bg-card shadow-sm">
                    {/* <FileText className="h-4 w-4 text-muted-foreground mt-0.5" /> */}
                    <div className="min-w-0">
                      <div className="text-[0.95rem] font-medium break-words">{e.name}</div>
                    </div>
                  </div>
                ))}
                {(globalKb?.entries?.length ?? 0) === 0 && (
                  <div className="text-sm text-muted-foreground">No global entries</div>
                )}
              </div>
            </div>
          )}

          <KnowledgeBaseManager threadId={threadId} />
        </div>
      </DialogContent>
    </Dialog>
  );
};
