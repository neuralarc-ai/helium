'use client';

import React from 'react';
import { Bot } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';

export const AgentsPageHeader = () => {
  return (
    <PageHeader icon={Bot}>
      <div className="space-y-4">
        <div className="text-4xl font-semibold tracking-tight">
          <span className="text-primary">AI Agents</span> = <span className="text-primary">AI Employees</span>
        </div>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Explore and create your own custom agents that combine{' '}
          <span className="text-foreground font-medium">integrations</span>,{' '}
          <span className="text-foreground font-medium">instructions</span>,{' '}
          <span className="text-foreground font-medium">knowledge</span>,{' '}
          <span className="text-foreground font-medium">triggers</span> and{' '}
          <span className="text-foreground font-medium">workflows</span>.
        </p>
      </div>
    </PageHeader>
  );
};
