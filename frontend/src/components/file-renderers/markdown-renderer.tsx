'use client';

import React, { forwardRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { CodeRenderer } from './code-renderer';

// Process Unicode escape sequences in content
export const processUnicodeContent = (content: string): string => {
  if (!content) return '';

  // Process \uXXXX Unicode escape sequences (BMP characters)
  const bmpProcessed = content.replace(
    /\\u([0-9a-fA-F]{4})/g,
    (_, codePoint) => {
      return String.fromCharCode(parseInt(codePoint, 16));
    },
  );

  // Process \uXXXXXXXX Unicode escape sequences (supplementary plane characters)
  return bmpProcessed.replace(/\\u([0-9a-fA-F]{8})/g, (_, codePoint) => {
    const highSurrogate = parseInt(codePoint.substring(0, 4), 16);
    const lowSurrogate = parseInt(codePoint.substring(4, 8), 16);
    return String.fromCharCode(highSurrogate, lowSurrogate);
  });
};

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export const MarkdownRenderer = forwardRef<
  HTMLDivElement,
  MarkdownRendererProps
>(({ content, className }, ref) => {
  // Process Unicode escape sequences in the content
  const processedContent = processUnicodeContent(content);

  return (
    <ScrollArea className={cn('w-full h-full rounded-md relative', className)}>
      <div
        className="p-4 px-6 markdown prose prose-sm dark:prose-invert max-w-none chat-markdown"
        ref={ref}
      >
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeRaw, rehypeSanitize]}
          components={{
            code(props) {
              const { className, children, ...rest } = props;
              const match = /language-(\w+)/.exec(className || '');

              // Check if it's an inline code block by examining the node type
              const isInline = !className || !match;

              if (isInline) {
                return (
                  <code className={className} {...rest}>
                    {children}
                  </code>
                );
              }

              return (
                <CodeRenderer
                  content={String(children).replace(/\n$/, '')}
                  language={match ? match[1] : ''}
                />
              );
            },
            // Style other elements as needed
            h1: ({ node, ...props }) => (
              <h1 className="text-2xl font-bold my-4 libre-baskerville-bold" {...props} />
            ),
            h2: ({ node, ...props }) => (
              <h2 className="text-xl font-bold my-3" {...props} />
            ),
            h3: ({ node, ...props }) => (
              <h3 className="text-lg font-bold my-2" {...props} />
            ),
            a: ({ node, ...props }) => (
              <a className="text-primary hover:underline" {...props} />
            ),
            p: ({ node, ...props }) => (
              <p className="my-2" {...props} />
            ),
            ul: ({ node, ...props }) => (
              <ul className="list-disc my-2" {...props} />
            ),
            ol: ({ node, ...props }) => (
              <ol className="list-decimal my-2" {...props} />
            ),
            li: ({ node, ...props }) => {
              // Check if this is a task list item (contains [x] or [ ])
              const content = props.children as string;
              const isTaskList = typeof content === 'string' && /^\[[ x]\]\s/.test(content);
              
              if (isTaskList) {
                const isCompleted = content.startsWith('[x]');
                const taskText = content.replace(/^\[[ x]\]\s/, '');
                
                return (
                  <li className="flex items-start gap-3 my-2" {...props}>
                    <div className="flex-shrink-0 mt-0.5">
                      {isCompleted ? (
                        <div className="w-4 h-4 rounded border-2 border-green-500 bg-green-500 flex items-center justify-center">
                          <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      ) : (
                        <div className="w-4 h-4 rounded border-2 border-zinc-400 dark:border-zinc-600 bg-transparent" />
                      )}
                    </div>
                    <span className={cn(
                      "flex-1",
                      isCompleted && "text-green-700 dark:text-green-300 line-through"
                    )}>
                      {taskText}
                    </span>
                  </li>
                );
              }
              
              return <li className="my-1" {...props} />;
            },
            blockquote: ({ node, ...props }) => (
              <blockquote
                className="border-l-4 border-muted pl-4 italic my-2"
                {...props}
              />
            ),
            img: ({ node, ...props }) => (
              <img
                className="max-w-full h-auto rounded-md my-2"
                {...props}
                alt={props.alt || ''}
              />
            ),
            pre: ({ node, ...props }) => (
              <pre className="p-0 my-2 bg-transparent" {...props} />
            ),
            table: ({ node, ...props }) => (
              <table
                className="w-full border-collapse my-3 text-sm"
                {...props}
              />
            ),
            th: ({ node, ...props }) => (
              <th
                className="border border-slate-300 dark:border-zinc-700 px-3 py-2 text-left font-semibold bg-slate-100 dark:bg-zinc-800"
                {...props}
              />
            ),
            td: ({ node, ...props }) => (
              <td
                className="border border-slate-300 dark:border-zinc-700 px-3 py-2"
                {...props}
              />
            ),
          }}
        >
          {processedContent}
        </ReactMarkdown>
      </div>
    </ScrollArea>
  );
});

MarkdownRenderer.displayName = 'MarkdownRenderer';
