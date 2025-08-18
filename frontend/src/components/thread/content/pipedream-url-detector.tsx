import React from 'react';
import { ExternalLink } from 'lucide-react';
import { Markdown } from '@/components/ui/markdown';
import { PipedreamConnectButton } from './pipedream-connect-button';

interface PipedreamUrlDetectorProps {
  content: string;
  className?: string;
}

interface PipedreamUrl {
  url: string;
  appSlug: string | null;
  startIndex: number;
  endIndex: number;
}

function extractAppSlugFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname === 'pipedream.com' && urlObj.pathname === '/_static/connect.html') {
      const params = new URLSearchParams(urlObj.search);
      return params.get('app');
    }
  } catch (e) {
  }
  return null;
}

function detectPipedreamUrls(content: string): PipedreamUrl[] {
  const pipedreamUrlRegex = /https:\/\/pipedream\.com\/_static\/connect\.html\?[^\s)]+/g;
  const urls: PipedreamUrl[] = [];
  let match;

  while ((match = pipedreamUrlRegex.exec(content)) !== null) {
    const url = match[0];
    const appSlug = extractAppSlugFromUrl(url);
    
    urls.push({
      url,
      appSlug,
      startIndex: match.index,
      endIndex: match.index + url.length
    });
  }

  return urls;
}

interface DaytonaUrl {
  url: string;
  startIndex: number;
  endIndex: number;
}

function detectDaytonaProxyUrls(content: string): DaytonaUrl[] {
  const daytonaUrlRegex = /https?:\/\/(?:[\w.-]+\.)?proxy\.daytona\.work[^\s)"']*/g;
  const urls: DaytonaUrl[] = [];
  let match: RegExpExecArray | null;
  while ((match = daytonaUrlRegex.exec(content)) !== null) {
    const url = match[0];
    urls.push({ url, startIndex: match.index, endIndex: match.index + url.length });
  }
  return urls;
}

function hasConnectionLinkPattern(content: string, url: PipedreamUrl): boolean {
  const beforeUrl = content.substring(Math.max(0, url.startIndex - 50), url.startIndex);
  return /Connection\s+Link:\s*$/i.test(beforeUrl);
}

export const PipedreamUrlDetector: React.FC<PipedreamUrlDetectorProps> = ({ 
  content, 
  className 
}) => {
  const pipedreamUrls = detectPipedreamUrls(content);
  const daytonaUrls = detectDaytonaProxyUrls(content);

  if (pipedreamUrls.length === 0 && daytonaUrls.length === 0) {
    return (
      <Markdown className={className}>
        {content}
      </Markdown>
    );
  }

  type Match = { type: 'pipedream'; start: number; end: number; data: PipedreamUrl } | { type: 'daytona'; start: number; end: number; data: DaytonaUrl };
  const matches: Match[] = [
    ...pipedreamUrls.map((u) => ({ type: 'pipedream' as const, start: u.startIndex, end: u.endIndex, data: u })),
    ...daytonaUrls.map((u) => ({ type: 'daytona' as const, start: u.startIndex, end: u.endIndex, data: u })),
  ].sort((a, b) => a.start - b.start);

  const contentParts: React.ReactNode[] = [];
  let lastIndex = 0;

  matches.forEach((m, idx) => {
    if (m.start > lastIndex) {
      const textBefore = content.substring(lastIndex, m.start);
      let cleanedTextBefore = textBefore;
      if (m.type === 'pipedream') {
        cleanedTextBefore = hasConnectionLinkPattern(content, m.data)
          ? textBefore.replace(/Connection\s+Link:\s*$/i, '').trim()
          : textBefore;
      }

      if (cleanedTextBefore.trim()) {
        contentParts.push(
          <Markdown key={`text-${idx}-${lastIndex}`} className={className}>
            {cleanedTextBefore}
          </Markdown>
        );
      }
    }

    if (m.type === 'pipedream') {
      const pd = m.data as PipedreamUrl;
      contentParts.push(
        <PipedreamConnectButton
          key={`pipedream-${idx}`}
          url={pd.url}
          appSlug={pd.appSlug || undefined}
        />
      );
    } else {
      const dt = m.data as DaytonaUrl;
      contentParts.push(
        <span
          key={`daytona-${idx}`}
          role="link"
          tabIndex={0}
          onClick={() => {
            try {
              window.open(dt.url, '_blank', 'noopener,noreferrer');
            } catch (e) {}
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              try { window.open(dt.url, '_blank', 'noopener,noreferrer'); } catch (e2) {}
            }
          }}
          className="text-blue-600 dark:text-blue-300 underline cursor-pointer"
          aria-label="Open link in a new tab"
          title="Open link in a new tab"
        >
          Click here to open the link
        </span>
      );
    }

    lastIndex = m.end;
  });

  if (lastIndex < content.length) {
    const remainingText = content.substring(lastIndex);
    if (remainingText.trim()) {
      contentParts.push(
        <Markdown key={`text-end-${lastIndex}`} className={className}>
          {remainingText}
        </Markdown>
      );
    }
  }

  return <>{contentParts}</>;
};