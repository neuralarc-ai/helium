import React from 'react';
import {
  ExternalLink,
  CheckCircle,
  AlertTriangle,
  Computer
} from 'lucide-react';
import { ToolViewProps } from '../types';
import {
  formatTimestamp,
} from '../utils';
import { extractExposePortData } from './_utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from "@/components/ui/scroll-area";
import { LoadingState } from '../shared/LoadingState';
import { Button } from '@/components/ui/button';

// Create a temporary 8000-port variant of a Daytona proxy URL like 8080-<rest>.proxy.daytona.works
const toPort8000 = (input?: string | null): string | null => {
  try {
    if (!input) return null;
    const u = new URL(input);
    const host = u.hostname;
    const m = host.match(/^(\d+)-(.*\.proxy\.daytona\.works)$/);
    if (m) {
      const rest = m[2];
      u.hostname = `8000-${rest}`;
      u.protocol = 'https:'; // keep https scheme
      u.port = '';
      return u.toString();
    }
    return null;
  } catch {
    return null;
  }
};

// Extract the numeric port from a Daytona proxy host like 8080-<rest>.proxy.daytona.works
const extractPortFromDaytonaUrl = (input?: string | null): number | null => {
  try {
    if (!input) return null;
    const u = new URL(input);
    const m = u.hostname.match(/^(\d+)-.*\.proxy\.daytona\.works$/);
    if (m) return parseInt(m[1], 10);
    return null;
  } catch {
    return null;
  }
};

// Normalize any Daytona proxy URLs found in freeform text to use 8080 prefix.
// Optionally adjust 'port 8000' to 'port 8080' when the primary link is 8080-canonical.
const canonicalizeExposeMessage = (text?: string | null, primaryUrl?: string | null): string | null => {
  if (!text) return text ?? null;
  let out = text;
  // Replace any Daytona proxy host prefix to 8080-
  out = out.replace(/https:\/\/(\d+)-((?:[A-Za-z0-9-]+)\.proxy\.daytona\.works)/g, 'https://8080-$2');
  // If our main url uses 8080- prefix, align textual 'port 8000' mentions
  try {
    if (primaryUrl) {
      const u = new URL(primaryUrl);
      if (/^8080-/.test(u.hostname)) {
        out = out.replace(/port\s*8000/gi, 'port 8080');
      }
    }
  } catch {}
  return out;
};

export function ExposePortToolView({
  assistantContent,
  toolContent,
  isSuccess = true,
  isStreaming = false,
  assistantTimestamp,
  toolTimestamp,
}: ToolViewProps) {

  const {
    port,
    url,
    message,
    actualIsSuccess,
    actualToolTimestamp
  } = extractExposePortData(
    assistantContent,
    toolContent,
    isSuccess,
    toolTimestamp,
    assistantTimestamp
  );

  const tempUrl8000 = toPort8000(url);
  const displayMessage = canonicalizeExposeMessage(message, url);
  const displayPort = extractPortFromDaytonaUrl(url) ?? port ?? null;

  return (
    <Card className="gap-0 flex border shadow-none p-0 rounded-lg flex-col h-full overflow-hidden bg-card">
      <CardHeader className="h-9 bg-gradient-to-t from-zinc-50/80 to-zinc-200/70 dark:from-zinc-900/90 dark:to-zinc-800/90 text-center backdrop-blur-lg border-b p-2 px-4 space-y-2 rounded-t-lg">
        <div className="flex flex-row items-center justify-between">
          <div className="flex items-center w-full justify-center gap-1">
            <Computer className="w-4 h-4 text-muted-foreground" />
            <div>
              <CardTitle className="text-sm font-semibold text-muted-foreground">
                Port Exposure
              </CardTitle>
            </div>
          </div>

          {/* {!isStreaming && (
            <Badge
              variant="secondary"
              className={
                actualIsSuccess
                  ? "bg-gradient-to-b from-emerald-200 to-emerald-100 text-emerald-700 dark:from-emerald-800/50 dark:to-emerald-900/60 dark:text-emerald-300"
                  : "bg-gradient-to-b from-rose-200 to-rose-100 text-rose-700 dark:from-rose-800/50 dark:to-rose-900/60 dark:text-rose-300"
              }
            >
              {actualIsSuccess ? (
                <CheckCircle className="h-3.5 w-3.5 mr-1" />
              ) : (
                <AlertTriangle className="h-3.5 w-3.5 mr-1" />
              )}
              {actualIsSuccess ? 'Port exposed successfully' : 'Failed to expose port'}
            </Badge>
          )} */}
        </div>
      </CardHeader>

      <CardContent className="p-0 h-full flex-1 overflow-hidden relative bg-transparent shadow-none">
        {isStreaming ? (
          <LoadingState
            icon={Computer}
            iconColor="text-emerald-500 dark:text-emerald-400"
            bgColor="bg-gradient-to-b from-emerald-100 to-emerald-50 shadow-inner dark:from-emerald-800/40 dark:to-emerald-900/60 dark:shadow-emerald-950/20"
            title="Exposing port"
            filePath={port?.toString()}
            showProgress={true}
          />
        ) : (
          <ScrollArea className="h-full w-full">
            <div className=" py-0 space-y-6">
              <div>
                <div className="p-4">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-zinc-800 dark:text-zinc-200 mb-2">
                        Open in Browser
                      </h3>
                      {url ? (
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-md font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-2 mb-3 break-all max-w-full"
                        >
                          {url}
                          <ExternalLink className="flex-shrink-0 h-3.5 w-3.5" />
                        </a>
                      ) : (
                        <div className="text-sm text-zinc-500 dark:text-zinc-400 mb-3">
                          Waiting for public URL...
                        </div>
                      )}

                      {/* temp 8000 link moved below the green permanence note */}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex flex-col gap-1.5">
                      <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        Port Details
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <Badge variant="outline" className="bg-zinc-50 dark:bg-zinc-800 font-mono">
                          Port: {displayPort ?? '—'}
                        </Badge>
                      </div>
                    </div>

                    {displayMessage && (
                      <div className="text-sm text-zinc-600 dark:text-zinc-400">
                        {displayMessage}
                      </div>
                    )}

                    {url && tempUrl8000 && (
                      <div className="mt-2">
                        <a
                          href={tempUrl8000}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-2 break-all max-w-full"
                        >
                          {tempUrl8000}
                          <ExternalLink className="flex-shrink-0 h-3.5 w-3.5" />
                        </a>
                        <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                          Temporary link (port 8000)
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>
        )}
      </CardContent>

      <div className="px-4 py-2 h-10 bg-gradient-to-r from-zinc-50/90 to-zinc-100/90 dark:from-zinc-900/90 dark:to-zinc-800/90 backdrop-blur-sm border-t border-zinc-200 dark:border-zinc-800 flex justify-between items-center gap-4">
        <div className="h-full flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
          {!isStreaming && displayPort && (
            <Badge variant="outline">
              <Computer className="h-3 w-3 mr-1" />
              Port {displayPort}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:block text-xs text-zinc-500 dark:text-zinc-400">
            {actualToolTimestamp && formatTimestamp(actualToolTimestamp)}
          </div>
          <Button asChild size="sm" variant={url ? 'default' : 'secondary'} disabled={!url}>
            <a href={url || '#'} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1">
              Open in Browser
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </Button>
        </div>
      </div>
    </Card>
  );
}
