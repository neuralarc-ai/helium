import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, TrendingUp, Star, ArrowRight, ArrowLeft } from 'lucide-react';
import { AppCard } from './app-card';
import { getCategoryEmoji } from '../utils';
import type { AppsGridProps } from '../types';

export const AppsGrid: React.FC<AppsGridProps> = ({
  apps,
  selectedCategory,
  mode = 'full',
  isLoading,
  currentAgentId,
  agent,
  agentPipedreamProfiles = [],
  onAppSelected,
  onConnectApp,
  onConfigureTools,
  onCategorySelect,
  onBrowseMore,
  onBackToPopular
}) => {
  const getSectionTitle = () => {
    if (selectedCategory === 'All') {
      return mode === 'profile-only' ? 'Available Apps' : 'Popular';
    }
    return selectedCategory;
  };

  const getSectionIcon = () => {
    if (selectedCategory === 'All') {
      return <TrendingUp className="h-4 w-4 text-orange-600 dark:text-orange-400" />;
    }
    return <span className="text-lg">{getCategoryEmoji(selectedCategory)}</span>;
  };

  const getSectionBadge = () => {
    if (selectedCategory === 'All') {
      return (
        <Badge variant="secondary" className="bg-orange-50 text-orange-700 border-orange-200 dark:border-orange-900 dark:bg-orange-900/20 dark:text-orange-400 text-xs">
          <Star className="h-3 w-3 mr-1" />
          {mode === 'profile-only' ? 'Connect' : 'Recommended'}
        </Badge>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span className="text-sm text-gray-600 dark:text-gray-400">Loading integrations...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {getSectionIcon()}
            <h2 className="text-md font-medium text-gray-900 dark:text-white">
              {getSectionTitle()}
            </h2>
            {getSectionBadge()}
          </div>
          
          <div className="flex items-center gap-2">
            {onBackToPopular && (
              <Button
                variant="outline"
                size="sm"
                onClick={onBackToPopular}
                className="text-xs"
              >
                <ArrowLeft className="h-3 w-3 mr-1" />
                Back to Popular
              </Button>
            )}
            {onBrowseMore && (
              <Button
                variant="outline"
                size="sm"
                onClick={onBrowseMore}
                className="text-xs"
              >
                Browse More
                <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {apps.map((app) => (
          <AppCard 
            key={`${app.name_slug}-${currentAgentId || 'default'}`} 
            app={app}
            mode={mode}
            currentAgentId={currentAgentId}
            agentName={agent?.name}
            agentPipedreamProfiles={agentPipedreamProfiles}
            onAppSelected={onAppSelected}
            onConnectApp={onConnectApp}
            onConfigureTools={onConfigureTools}
            handleCategorySelect={onCategorySelect}
          />
        ))}
      </div>
    </>
  );
}; 