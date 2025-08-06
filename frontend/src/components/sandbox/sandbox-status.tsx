'use client';

import React, { useState, useEffect } from 'react';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SandboxStatusProps {
  projectId: string;
  className?: string;
}

type SandboxStatus = 'creating' | 'ready' | 'failed' | 'unknown';

export function SandboxStatus({ projectId, className }: SandboxStatusProps) {
  const [status, setStatus] = useState<SandboxStatus>('unknown');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const checkSandboxStatus = async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}`);
        if (response.ok) {
          const project = await response.json();
          const sandboxInfo = project.sandbox || {};
          const sandboxStatus = sandboxInfo.status || 'unknown';
          
          setStatus(sandboxStatus);
          setError(sandboxInfo.error || null);
          
          // Stop polling if sandbox is ready or failed
          if (sandboxStatus === 'ready' || sandboxStatus === 'failed') {
            if (intervalId) {
              clearInterval(intervalId);
            }
          }
        }
      } catch (err) {
        console.error('Error checking sandbox status:', err);
        setStatus('unknown');
      }
    };

    // Check immediately
    checkSandboxStatus();

    // Poll every 3 seconds if status is creating
    if (status === 'creating' || status === 'unknown') {
      intervalId = setInterval(checkSandboxStatus, 3000);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [projectId, status]);

  if (status === 'ready') {
    return (
      <div className={cn("flex items-center gap-2 text-green-600", className)}>
        <CheckCircle className="h-4 w-4" />
        <span className="text-sm">Environment ready</span>
      </div>
    );
  }

  if (status === 'creating') {
    return (
      <div className={cn("flex items-center gap-2 text-blue-600", className)}>
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Setting up environment...</span>
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div className={cn("flex items-center gap-2 text-red-600", className)}>
        <AlertCircle className="h-4 w-4" />
        <span className="text-sm">Environment setup failed</span>
        {error && (
          <span className="text-xs text-muted-foreground">({error})</span>
        )}
      </div>
    );
  }

  return null;
}