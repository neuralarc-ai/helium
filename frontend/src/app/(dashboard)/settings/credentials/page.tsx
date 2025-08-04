'use client';

import React, { useEffect, useState } from 'react';
import { 
  Zap
} from 'lucide-react';
import { PipedreamConnectionsSection } from '../../../../components/agents/pipedream/pipedream-connections-section';
import { useRouter } from 'next/navigation';
import { useFeatureFlag } from '@/lib/feature-flags';
import { PageHeader } from '@/components/ui/page-header';

export default function AppProfilesPage() {
  const { enabled: customAgentsEnabled, loading: flagLoading } = useFeatureFlag("custom_agents");
  const router = useRouter();
  const [selectedApp, setSelectedApp] = useState<{ app_slug: string; app_name: string } | null>(null);
  
  useEffect(() => {
    if (!flagLoading && !customAgentsEnabled) {
      router.replace("/dashboard");
    }
  }, [flagLoading, customAgentsEnabled, router]);

  const handleAppSelection = (app: { app_slug: string; app_name: string }) => {
    setSelectedApp(app);
  };

  if (flagLoading) {
    return (
      <div className="container mx-auto max-w-4xl px-6 py-6">
        <div className="space-y-6">
          <div className="animate-pulse space-y-4">
            <div className="h-32 bg-muted rounded-3xl"></div>
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="h-32 bg-muted rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!customAgentsEnabled) {
    return null;
  }

  return (
    <div className="container mx-auto max-w-4xl px-6 py-6">
      <div className="space-y-6">
        <PageHeader icon={Zap}>
          <span className="text-primary">App Credentials</span>
        </PageHeader>
        
        <PipedreamConnectionsSection onConnectNewApp={handleAppSelection} />
      </div>
    </div>
  );
} 