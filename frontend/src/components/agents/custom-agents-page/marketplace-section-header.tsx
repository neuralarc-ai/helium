'use client';

import React from 'react';
import { Shield } from 'lucide-react';

interface MarketplaceSectionHeaderProps {
  title: string;
  subtitle: string;
  icon?: React.ReactNode;
}

export const MarketplaceSectionHeader = ({ 
  title, 
  subtitle, 
  icon = <Shield className="h-5 w-5 text-white" /> 
}: MarketplaceSectionHeaderProps) => {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg">
        {icon}
      </div>
      <div>
        <h2 className="text-xl font-semibold text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}; 