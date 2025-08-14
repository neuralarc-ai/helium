'use client'

import React from 'react';
import {
  CheckCircle,
  AlertTriangle,
  Clock,
  Wrench,
  Settings,
  FileText,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { ToolViewProps } from './types';
import { formatTimestamp, getToolTitle, extractToolData } from './utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from "@/components/ui/scroll-area";
import { LoadingState } from './shared/LoadingState';
import { Separator } from '@/components/ui/separator';

export function GenericToolView({
  name = 'generic-tool',
  assistantContent,
  toolContent,
  assistantTimestamp,
  toolTimestamp,
  isSuccess = true,
  isStreaming = false,
}: ToolViewProps) {
  const toolTitle = getToolTitle(name);

  const formatContent = (content: any) => {
    if (!content) return null;

    // Use the new parser for backwards compatibility
    const { toolResult } = extractToolData(content);

    if (toolResult) {
      return {
        tool: toolResult.xmlTagName || toolResult.functionName,
        arguments: toolResult.arguments || {},
        output: toolResult.toolOutput || '',
        success: toolResult.isSuccess,
        summary: toolResult.summary || '',
        timestamp: toolResult.timestamp,
      };
    }

    // Fallback to legacy format handling
    if (typeof content === 'object') {
      // Check for direct structured format (legacy)
      if ('tool_name' in content || 'xml_tag_name' in content) {
        return {
          tool: content.tool_name || content.xml_tag_name || 'unknown',
          arguments: content.parameters || {},
          output: content.result || '',
          success: content.success !== false,
        };
      }

      // Check if it has a content field that might contain the structured data (legacy)
      if ('content' in content && typeof content.content === 'object') {
        const innerContent = content.content;
        if ('tool_name' in innerContent || 'xml_tag_name' in innerContent) {
          return {
            tool: innerContent.tool_name || innerContent.xml_tag_name || 'unknown',
            arguments: innerContent.parameters || {},
            output: innerContent.result || '',
            success: innerContent.success !== false,
          };
        }
      }

      // Fall back to old format handling
      if (content.content && typeof content.content === 'string') {
        return { output: content.content };
      }
      return { output: JSON.stringify(content, null, 2) };
    }

    if (typeof content === 'string') {
      try {
        const parsedJson = JSON.parse(content);
        return { output: JSON.stringify(parsedJson, null, 2) };
      } catch (e) {
        return { output: content };
      }
    }

    return { output: String(content) };
  };

  const formattedAssistantContent = React.useMemo(
    () => formatContent(assistantContent),
    [assistantContent],
  );
  const formattedToolContent = React.useMemo(
    () => formatContent(toolContent),
    [toolContent],
  );

  const renderArguments = (args: Record<string, any>) => {
    if (!args || Object.keys(args).length === 0) return null;

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-black dark:text-white">
          <Settings className="h-4 w-4 text-purple-500 dark:text-purple-400" />
          Parameters
        </div>
        <div className="bg-accent rounded-xl border p-4 space-y-3">
          {Object.entries(args).map(([key, value]) => (
            <div key={key} className="space-y-2">
              <div className="text-xs font-semibold text-black dark:text-white uppercase tracking-wide">
                {key.replace(/_/g, ' ')}
              </div>
              <div className="bg-background rounded-lg border p-3">
                {renderValue(value)}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderOutput = (output: string, title: string = 'Output') => {
    if (!output) return null;

    // Try to parse JSON for better formatting
    let parsedOutput;
    try {
      parsedOutput = typeof output === 'string' ? JSON.parse(output) : output;
    } catch {
      parsedOutput = output;
    }

    return (
      <div className="space-y-4">
        {typeof parsedOutput === 'object' && parsedOutput !== null ? (
          <div className="bg-accent rounded-xl border p-4 space-y-4">
            {Object.entries(parsedOutput).map(([key, value]) => (
              <div key={key} className="space-y-2">
                <div className="text-xs font-semibold text-black dark:text-white uppercase tracking-wide">
                  {key.replace(/_/g, ' ')}
                </div>
                <div className="bg-background rounded-lg border p-3">
                  {renderValue(value)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-muted/50 rounded-xl border p-4">
              <div className="text-base text-black dark:text-white whitespace-pre-wrap break-words">
                {renderValue(parsedOutput)}
              </div>
          </div>
        )}
      </div>
    );
  };

  const renderValue = (value: any): React.ReactNode => {
    if (value === null || value === undefined) {
      return <span className="text-zinc-400 dark:text-zinc-500 italic">null</span>;
    }
    
    if (typeof value === 'boolean') {
      return (
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
          value 
            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
        }`}>
          {value ? '✓ True' : '✗ False'}
        </span>
      );
    }
    
    if (typeof value === 'number') {
      return <span className="font-mono text-black dark:text-white">{value}</span>;
    }
    
    if (typeof value === 'string') {
      // Check if it's a URL
      if (value.startsWith('http://') || value.startsWith('https://')) {
        return (
          <a 
            href={value} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-black dark:text-white hover:text-gray-700 dark:hover:text-gray-300 underline break-all"
          >
            {value}
          </a>
        );
      }
      // Check if it's JSON
      try {
        const parsed = JSON.parse(value);
        if (typeof parsed === 'object') {
          return (
            <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded p-2">
              <pre className="text-xs text-zinc-700 dark:text-zinc-300 overflow-x-auto">
                {JSON.stringify(parsed, null, 2)}
              </pre>
            </div>
          );
        }
      } catch {
        // Not JSON, treat as regular string
      }
      return <span className="text-zinc-700 dark:text-zinc-300">{value}</span>;
    }
    
    if (Array.isArray(value)) {
      return (
        <div className="space-y-1">
          {value.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <span className="text-xs text-black dark:text-white font-mono">[{index}]</span>
              <div className="flex-1">{renderValue(item)}</div>
            </div>
          ))}
        </div>
      );
    }
    
    if (typeof value === 'object') {
      return (
        <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded p-2">
          <pre className="text-xs text-black dark:text-white overflow-x-auto">
            {JSON.stringify(value, null, 2)}
          </pre>
        </div>
      );
    }
    
    return <span className="text-black dark:text-white">{String(value)}</span>;
  };

  const renderSummary = (summary: string) => {
    if (!summary) return null;

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-black dark:text-white">
          <CheckCircle2 className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
          Summary
        </div>
        <div className="bg-muted/50 rounded-xl border p-4">
            <div className="text-base text-black dark:text-white">
              {summary}
            </div>
        </div>
      </div>
    );
  };

  const renderErrorOutput = (output: string) => {
    if (!output) return null;

    // Try to parse the error output to extract meaningful information
    let errorInfo = {
      type: 'general',
      message: output,
      details: null,
      suggestions: []
    };

    try {
      // Check if it's a JSON error
      if (output.includes('Error parsing arguments:') || output.includes('Error executing')) {
        const errorMatch = output.match(/Error (?:parsing arguments|executing [^:]+):\s*(.*)/);
        if (errorMatch) {
          errorInfo.type = 'execution';
          errorInfo.message = errorMatch[1];
          
          // Try to extract validation errors
          try {
            const jsonMatch = output.match(/\[([\s\S]*)\]/);
            if (jsonMatch) {
              const validationErrors = JSON.parse(jsonMatch[1]);
              errorInfo.details = validationErrors;
              errorInfo.suggestions = [
                'Check parameter types and formats',
                'Verify required fields are provided',
                'Ensure data matches expected schema'
              ];
            }
          } catch {
            // If JSON parsing fails, keep the original message
          }
        }
      } else if (output.includes('Error')) {
        // Handle any other error format
        errorInfo.type = 'general';
        errorInfo.message = output.replace(/^Error\s*:?\s*/i, '');
        errorInfo.suggestions = [
          'Review the input parameters',
          'Check if all required fields are provided',
          'Verify the data format matches expectations'
        ];
      }
    } catch {
      // If any parsing fails, use the original output
    }

    return (
      <div className="space-y-4">
        <div className="bg-accent rounded-xl border p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <div className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
                <AlertTriangle className="h-3 w-3 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            
            <div className="flex-1 space-y-3">
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-black dark:text-white">
                  {errorInfo.type === 'execution' ? 'Parameter Validation' : 'Processing Notice'}
                </h4>
                <div className="text-sm text-black dark:text-white leading-relaxed">
                  {errorInfo.message}
                </div>
              </div>

              {errorInfo.details && (
                <div className="space-y-2">
                  <div className="text-xs font-medium text-black dark:text-white uppercase tracking-wide">
                    Field Issues
                  </div>
                  <div className="bg-background rounded-lg border p-2 space-y-1">
                    {Array.isArray(errorInfo.details) ? errorInfo.details.map((detail: any, index: number) => (
                      <div key={index} className="flex items-start gap-2 text-xs">
                        <span className="text-amber-500 dark:text-amber-400">•</span>
                        <div className="flex-1">
                          <span className="font-medium text-black dark:text-white">
                            {detail.path?.join('.') || 'Field'}: 
                          </span>
                          <span className="text-black dark:text-white ml-1">
                            {detail.message || 'Invalid value'}
                          </span>
                        </div>
                      </div>
                    )) : (
                      <div className="text-xs text-black dark:text-white">
                        {JSON.stringify(errorInfo.details, null, 2)}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {errorInfo.suggestions.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-medium text-black dark:text-white uppercase tracking-wide">
                    Next Steps
                  </div>
                  <div className="bg-background rounded-lg border p-2">
                    <ul className="space-y-1">
                      {errorInfo.suggestions.map((suggestion, index) => (
                        <li key={index} className="flex items-start gap-2 text-xs">
                          <span className="text-amber-500 dark:text-amber-400">•</span>
                          <span className="text-black dark:text-white">{suggestion}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className="gap-0 flex border shadow-none border-t border-b-0 border-x-0 p-0 rounded-none flex-col h-full overflow-hidden bg-card">
      <CardHeader className="h-10 bg-[linear-gradient(90deg,_#FF6FD8_0%,_#38E8FF_100%)] backdrop-blur-sm border-b p-2 px-4 space-y-2 rounded-md mx-4 mt-2">
        <div className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Wrench className="w-5 h-5 text-white" />
            <div>
              <CardTitle className="text-base font-medium text-white">
                {toolTitle}
              </CardTitle>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0 h-full flex-1 overflow-hidden relative">
        {isStreaming ? (
          <LoadingState
            icon={Wrench}
            iconColor="text-orange-500 dark:text-orange-400"
            bgColor="bg-gradient-to-b from-orange-100 to-orange-50 shadow-inner dark:from-orange-800/40 dark:to-orange-900/60 dark:shadow-orange-950/20"
            title="Executing tool"
            filePath={name}
            showProgress={true}
          />
        ) : (formattedAssistantContent || formattedToolContent) ? (
          <ScrollArea className="h-full w-full">
            <div className="p-4 space-y-6">
              {/* Tool Input/Arguments */}
              {formattedAssistantContent?.arguments && Object.keys(formattedAssistantContent.arguments).length > 0 && (
                <>
                  {renderArguments(formattedAssistantContent.arguments)}
                  <Separator />
                </>
              )}

              {/* Tool Output */}
              {formattedToolContent?.output && (
                (isSuccess && !formattedToolContent.output.includes('Error')) 
                  ? renderOutput(formattedToolContent.output, 'Result')
                  : renderErrorOutput(formattedToolContent.output)
              )}

              {/* Tool Summary */}
              {formattedToolContent?.summary && (
                <>
                  {renderSummary(formattedToolContent.summary)}
                  <Separator />
                </>
              )}

              {/* Fallback for legacy content */}
              {!formattedToolContent?.output && !formattedToolContent?.summary && formattedToolContent && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    <FileText className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                    Content
                  </div>
                  <div className="p-3 bg-zinc-50 dark:bg-zinc-900/50 rounded-lg border border-zinc-200 dark:border-zinc-800">
                    <div className="text-sm text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap break-words">
                      {typeof formattedToolContent === 'string' ? formattedToolContent : JSON.stringify(formattedToolContent, null, 2)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        ) : (
          <div className="flex flex-col items-center justify-center h-full py-12 px-6 bg-gradient-to-b from-white to-zinc-50 dark:from-zinc-950 dark:to-zinc-900">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6 bg-gradient-to-b from-zinc-100 to-zinc-50 shadow-inner dark:from-zinc-800/40 dark:to-zinc-900/60">
              <Wrench className="h-10 w-10 text-zinc-400 dark:text-zinc-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2 text-zinc-900 dark:text-zinc-100">
              No Content Available
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center max-w-md">
              This tool execution did not produce any input or output content to display.
            </p>
          </div>
        )}
      </CardContent>

      <div className="px-4 py-2 h-10 bg-gradient-to-r from-zinc-50/90 to-zinc-100/90 dark:from-zinc-900/90 dark:to-zinc-800/90 backdrop-blur-sm border-t border-zinc-200 dark:border-zinc-800 flex justify-between items-center gap-4">
        <div className="h-full flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
          {!isStreaming && (formattedAssistantContent || formattedToolContent) && (
            <Badge variant="outline" className="h-6 py-0.5 bg-zinc-50 dark:bg-zinc-900">
              <Wrench className="h-3 w-3" />
              Tool
            </Badge>
          )}
        </div>

        <div className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
          <Clock className="h-3.5 w-3.5" />
          {toolTimestamp && !isStreaming
            ? formatTimestamp(toolTimestamp)
            : assistantTimestamp
              ? formatTimestamp(assistantTimestamp)
              : ''}
        </div>
      </div>
    </Card>
  );
}
