'use client';

import React from 'react';
import { Bot } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';

export const AgentsPageHeader = () => {
  return (
    <PageHeader icon={Bot} backgroundImage="/header-2.png">
      <div className="space-y-4">
        <div className="text-4xl font-semibold text-white tracking-tight">
          <span className="text-white">AI Agents</span> = <span className="text-white">AI Employees</span>
        </div>
        <p className="text-lg text-white/80 max-w-2xl mx-auto leading-relaxed">
          Explore and create your own custom agents that combine{' '}
          <span className="text-white/80 font-medium">integrations</span>,{' '}
          <span className="text-white/80 font-medium">instructions</span>,{' '}
          <span className="text-white/80 font-medium">knowledge</span>,{' '}
          <span className="text-white/80 font-medium">triggers</span> and{' '}
          <span className="text-white/80 font-medium">workflows</span>.
        </p>
      </div>
    </PageHeader>
  );
};
