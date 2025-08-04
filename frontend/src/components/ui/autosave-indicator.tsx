import React from 'react';
import { Loader2, Check, AlertCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AutosaveStatus } from '@/hooks/use-autosave';

interface AutosaveIndicatorProps {
  status: AutosaveStatus;
  lastSaveTime?: Date | null;
  className?: string;
  showTimestamp?: boolean;
}

export const AutosaveIndicator: React.FC<AutosaveIndicatorProps> = ({
  status,
  lastSaveTime,
  className,
  showTimestamp = true
}) => {
  const formatLastSaveTime = (time: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - time.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins === 1) return '1 minute ago';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    
    return time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusDisplay = () => {
    switch (status) {
      case 'saving':
        return {
          icon: <Loader2 className="h-3 w-3 animate-spin" />,
          text: 'Saving...',
          className: 'text-blue-600 dark:text-blue-400'
        };
      case 'saved':
        return {
          icon: <Check className="h-3 w-3" />,
          text: 'Saved',
          className: 'text-green-600 dark:text-green-400'
        };
      case 'error':
        return {
          icon: <AlertCircle className="h-3 w-3" />,
          text: 'Error saving',
          className: 'text-red-600 dark:text-red-400'
        };
      case 'idle':
      default:
        if (lastSaveTime && showTimestamp) {
          return {
            icon: <Clock className="h-3 w-3" />,
            text: `Saved ${formatLastSaveTime(lastSaveTime)}`,
            className: 'text-muted-foreground'
          };
        }
        return null;
    }
  };

  const statusDisplay = getStatusDisplay();

  if (!statusDisplay) {
    return null;
  }

  return (
    <div className={cn(
      'flex items-center gap-1.5 text-xs font-medium transition-colors',
      statusDisplay.className,
      className
    )}>
      {statusDisplay.icon}
      <span>{statusDisplay.text}</span>
    </div>
  );
}; 