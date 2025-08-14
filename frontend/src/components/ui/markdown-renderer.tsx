import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ 
  content, 
  className = '' 
}) => {
  return (
    <div className={cn('prose prose-sm dark:prose-invert max-w-none chat-markdown', className)}>
      <ReactMarkdown 
        remarkPlugins={[remarkGfm]}
        components={{
          // Custom styling for markdown elements
          h1: ({ children }) => <h1 className="text-lg font-semibold mb-2 libre-baskerville-bold">{children}</h1>,
          h2: ({ children }) => <h2 className="text-base font-semibold mb-2">{children}</h2>,
          h3: ({ children }) => <h3 className="text-sm font-semibold mb-1">{children}</h3>,
          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
          ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
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
          code: ({ children, className }) => {
            const isInline = !className?.includes('language-');
            return isInline ? (
              <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono">{children}</code>
            ) : (
              <code className={cn('block bg-muted p-2 rounded text-xs font-mono overflow-x-auto', className)}>
                {children}
              </code>
            );
          },
          pre: ({ children }) => <pre className="bg-muted p-2 rounded text-xs font-mono overflow-x-auto mb-2">{children}</pre>,
          blockquote: ({ children }) => <blockquote className="border-l-4 border-muted-foreground/20 pl-4 italic mb-2">{children}</blockquote>,
          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          hr: () => <hr className="my-4 border-muted-foreground/20" />,
          table: ({ children }) => (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse border border-muted-foreground/20 mb-2">
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border border-muted-foreground/20 px-2 py-1 bg-muted font-semibold text-left text-xs">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-muted-foreground/20 px-2 py-1 text-xs">
              {children}
            </td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}; 