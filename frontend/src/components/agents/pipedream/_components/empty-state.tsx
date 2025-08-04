import React from 'react';
import { Button } from '@/components/ui/button';
import { Filter } from 'lucide-react';
import type { EmptyStateProps } from '../types';

export const EmptyState: React.FC<EmptyStateProps> = ({
  selectedCategory,
  mode = 'full',
  onClearFilters
}) => {
  const getEmptyMessage = () => {
    if (selectedCategory !== 'All') {
      return `No ${mode === 'profile-only' ? 'apps' : 'integrations'} found in "${selectedCategory}" category. Try a different category or search term.`;
    }
    return mode === 'profile-only'
      ? "Try adjusting your search criteria or browse available apps."
      : "Try adjusting your search criteria or browse our popular integrations.";
  };

  return (
    <div className="text-center py-8">
      <div className="text-4xl mb-3">🔍</div>
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
        No integrations found
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 max-w-md mx-auto">
        {getEmptyMessage()}
      </p>
      <Button
        onClick={onClearFilters}
        variant="outline"
        size="sm"
        className="bg-primary hover:bg-primary/90 text-white"
      >
        <Filter className="h-4 w-4 mr-2" />
        Clear Filters
      </Button>
    </div>
  );
}; 