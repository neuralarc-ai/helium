import React from 'react';
import { cn } from '@/lib/utils';

interface StreamingIndicatorProps {
  type: 'loading' | 'streaming';
  className?: string;
}

export const StreamingIndicator: React.FC<StreamingIndicatorProps> = ({ 
  type, 
  className 
}) => {
  if (type === 'loading') {
    return (
      <div className={cn("flex items-center gap-1", className)}>
        <div 
          className="h-1.5 w-1.5 rounded-full bg-primary/60"
          style={{
            animation: 'wave 1.4s ease-in-out infinite',
            animationDelay: '0ms'
          }}
        />
        <div 
          className="h-1.5 w-1.5 rounded-full bg-primary/60"
          style={{
            animation: 'wave 1.4s ease-in-out infinite',
            animationDelay: '0.2s'
          }}
        />
        <div 
          className="h-1.5 w-1.5 rounded-full bg-primary/60"
          style={{
            animation: 'wave 1.4s ease-in-out infinite',
            animationDelay: '0.4s'
          }}
        />
      </div>
    );
  }

  if (type === 'streaming') {
    return (
      <div className={cn("flex items-center", className)}>
        <div className="h-2 w-2 rounded-full bg-primary animate-pulse mr-1" />
      </div>
    );
  }

  return null;
};
