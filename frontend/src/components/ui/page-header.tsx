'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Ripple } from '@/components/ui/ripple';

interface PageHeaderProps {
  icon: LucideIcon;
  children: React.ReactNode;
  backgroundImage?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ icon: Icon, children, backgroundImage }) => {
  return (
    <div 
      className="relative overflow-hidden rounded-3xl flex items-center justify-center border bg-background"
      style={backgroundImage ? {
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      } : {}}
    >
      {/* Overlay for better text readability when background image is present */}
      {backgroundImage && (
        <div className="absolute inset-0 bg-black/20" />
      )}
      
      <div className="relative px-8 py-16 text-center z-10">
        <div className="mx-auto max-w-3xl space-y-6">
          <div className="inline-flex items-center justify-center rounded-full bg-muted/80 backdrop-blur-sm p-3">
            <Icon className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-4xl font-semibold tracking-tight text-foreground">
            {children}
          </h1>
        </div>
      </div>
    </div>
  );
}; 