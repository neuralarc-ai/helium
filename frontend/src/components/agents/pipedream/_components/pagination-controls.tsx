import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import type { PaginationControlsProps } from '../types';

export const PaginationControls: React.FC<PaginationControlsProps> = ({
  isLoading,
  paginationHistory,
  hasMore,
  onPrevPage,
  onNextPage
}) => {
  return (
    <div className="absolute bottom-0 left-0 right-0 z-10 border-t px-4 py-3 bg-background">
      <div className="flex items-center justify-end gap-4">
        <div className="flex items-center gap-2">
          <Button
            onClick={onPrevPage}
            disabled={isLoading || paginationHistory.length === 0}
            variant="outline"
            size="sm"
            className="h-9 px-3"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <div className="flex flex-col items-center gap-1 px-4 py-2 text-sm rounded-lg border">
            <div className="font-medium text-gray-900 dark:text-white">
              Page {paginationHistory.length + 1}
            </div>
          </div>
          <Button
            onClick={onNextPage}
            disabled={isLoading || !hasMore}
            variant="outline"
            size="sm"
            className="h-9 px-3"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}; 