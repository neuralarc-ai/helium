import React, { useState } from 'react';
import {
  CheckCircle,
  AlertTriangle,
  ExternalLink,
  Loader2,
  Code,
  Eye,
  File,
} from 'lucide-react';
import {
  extractFilePath,
  extractFileContent,
  extractStreamingFileContent,
  formatTimestamp,
  getToolTitle,
  normalizeContentToString,
  extractToolData,
} from '../utils';
import {
  MarkdownRenderer,
  processUnicodeContent,
} from '@/components/file-renderers/markdown-renderer';
import { CsvRenderer } from '@/components/file-renderers/csv-renderer';
import { cn } from '@/lib/utils';
import { useTheme } from 'next-themes';
import { CodeBlockCode } from '@/components/ui/code-block';
import { constructHtmlPreviewUrl } from '@/lib/utils/url';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

import {
  getLanguageFromFileName,
  getOperationType,
  getOperationConfigs,
  getFileIcon,
  processFilePath,
  getFileName,
  getFileExtension,
  isFileType,
  hasLanguageHighlighting,
  splitContentIntoLines,
  type FileOperation,
  type OperationConfig,
} from './_utils';
import { ToolViewProps } from '../types';
import { GenericToolView } from '../GenericToolView';
import { LoadingState } from '../shared/LoadingState';

export function FileOperationToolView({
  assistantContent,
  toolContent,
  assistantTimestamp,
  toolTimestamp,
  isSuccess = true,
  isStreaming = false,
  name,
  project,
}: ToolViewProps) {
  const { resolvedTheme } = useTheme();
  const isDarkTheme = resolvedTheme === 'dark';

  const operation = getOperationType(name, assistantContent);
  const configs = getOperationConfigs();
  const config = configs[operation];
  const Icon = config.icon;

  let filePath: string | null = null;
  let fileContent: string | null = null;

  const assistantToolData = extractToolData(assistantContent);
  const toolToolData = extractToolData(toolContent);

  if (assistantToolData.toolResult) {
    filePath = assistantToolData.filePath;
    fileContent = assistantToolData.fileContent;
  } else if (toolToolData.toolResult) {
    filePath = toolToolData.filePath;
    fileContent = toolToolData.fileContent;
  }

  if (!filePath) {
    filePath = extractFilePath(assistantContent);
  }

  if (!fileContent && operation !== 'delete') {
    fileContent = isStreaming
      ? extractStreamingFileContent(
        assistantContent,
        operation === 'create' ? 'create-file' : operation === 'edit' ? 'edit-file' : 'full-file-rewrite',
      ) || ''
      : extractFileContent(
        assistantContent,
        operation === 'create' ? 'create-file' : operation === 'edit' ? 'edit-file' : 'full-file-rewrite',
      );
  }

  const toolTitle = getToolTitle(name || `file-${operation}`);
  const processedFilePath = processFilePath(filePath);
  const fileName = getFileName(processedFilePath);
  const fileExtension = getFileExtension(fileName);

  const isMarkdown = isFileType.markdown(fileExtension);
  const isHtml = isFileType.html(fileExtension);
  const isCsv = isFileType.csv(fileExtension);

  const language = getLanguageFromFileName(fileName);
  const hasHighlighting = hasLanguageHighlighting(language);
  const contentLines = splitContentIntoLines(fileContent);

  const htmlPreviewUrl =
    isHtml && project?.sandbox?.sandbox_url && processedFilePath
      ? constructHtmlPreviewUrl(project.sandbox.sandbox_url, processedFilePath)
      : undefined;

  const FileIcon = getFileIcon(fileName);

  if (!isStreaming && !processedFilePath && !fileContent) {
    return (
      <GenericToolView
        name={name || `file-${operation}`}
        assistantContent={assistantContent}
        toolContent={toolContent}
        assistantTimestamp={assistantTimestamp}
        toolTimestamp={toolTimestamp}
        isSuccess={isSuccess}
        isStreaming={isStreaming}
      />
    );
  }

  const renderFilePreview = () => {
    if (!fileContent) {
      return (
        <div className="flex items-center justify-center h-full p-12">
          <div className="text-center">
            <FileIcon className="h-12 w-12 mx-auto mb-4 text-zinc-400" />
            <p className="text-sm text-zinc-500 dark:text-zinc-400">No content to preview</p>
          </div>
        </div>
      );
    }

    if (isHtml && htmlPreviewUrl) {
      return (
        <div className="flex flex-col h-[calc(100vh-16rem)] pt-4">
          <iframe
            src={htmlPreviewUrl}
            title={`HTML Preview of ${fileName}`}
            className="flex-grow border-0"
            sandbox="allow-same-origin allow-scripts"
          />
        </div>
      );
    }

    if (isMarkdown) {
      return (
        <div className="p-1 py-0 prose dark:prose-invert prose-zinc max-w-none chat-markdown">
          <MarkdownRenderer
            content={processUnicodeContent(fileContent)}
          />
        </div>
      );
    }

    if (isCsv) {
      return (
        <div className="h-full w-full p-4">
          <div className="h-[calc(100vh-17rem)] w-full bg-muted/20 border rounded-xl overflow-auto">
            <CsvRenderer content={processUnicodeContent(fileContent)} />
          </div>
        </div>
      );
    }

    return (
      <div className="p-4">
        <div className='w-full h-full bg-muted/20 border rounded-xl px-4 py-2 pb-6'>
          <pre className="text-sm font-mono text-zinc-800 dark:text-zinc-300 whitespace-pre-wrap break-words">
            {processUnicodeContent(fileContent)}
          </pre>
        </div>
      </div>
    );
  };

  const renderDeleteOperation = () => (
    <div className="flex flex-col items-center justify-center h-full py-12 px-6 bg-gradient-to-b from-white to-zinc-50 dark:from-zinc-950 dark:to-zinc-900">
      <div className={cn("w-20 h-20 rounded-full flex items-center justify-center mb-6", config.bgColor)}>
        <Icon className={cn("h-10 w-10", config.color)} />
      </div>
      <h3 className="text-xl font-semibold mb-6 text-zinc-900 dark:text-zinc-100">
        File Deleted
      </h3>
      <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 w-full max-w-md text-center mb-4 shadow-sm">
        <code className="text-sm font-mono text-zinc-700 dark:text-zinc-300 break-all">
          {processedFilePath || 'Unknown file path'}
        </code>
      </div>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        This file has been permanently removed
      </p>
    </div>
  );

  const renderSourceCode = () => {
    if (!fileContent) {
      return (
        <div className="flex items-center justify-center h-full p-12">
          <div className="text-center">
            <FileIcon className="h-12 w-12 mx-auto mb-4 text-zinc-400" />
            <p className="text-sm text-zinc-500 dark:text-zinc-400">No source code to display</p>
          </div>
        </div>
      );
    }

    if (hasHighlighting) {
      return (
        <div className="relative py-2">
          <div className="absolute left-0 top-0 bottom-0 w-12 border-r border-zinc-200 dark:border-zinc-800 z-10 flex flex-col bg-zinc-50 dark:bg-zinc-900">
            {contentLines.map((_, idx) => (
              <div
                key={idx}
                className="h-6 text-right pr-3 text-xs font-mono text-zinc-500 dark:text-zinc-500 select-none"
              >
                {idx + 1}
              </div>
            ))}
          </div>
          <div className="pl-12">
            <CodeBlockCode
              code={processUnicodeContent(fileContent)}
              language={language}
              className="text-sm"
            />
          </div>
        </div>
      );
    }

    return (
      <div className="min-w-full table">
        {contentLines.map((line, idx) => (
          <div
            key={idx}
            className={cn("table-row transition-colors", config.hoverColor)}
          >
            <div className="table-cell text-right pr-3 pl-6 py-0.5 text-xs font-mono text-zinc-500 dark:text-zinc-500 select-none w-12 border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
              {idx + 1}
            </div>
            <div className="table-cell pl-3 py-0.5 pr-4 text-xs font-mono whitespace-pre-wrap text-zinc-800 dark:text-zinc-300">
              {processUnicodeContent(line) || ' '}
            </div>
          </div>
        ))}
        <div className="table-row h-4"></div>
      </div>
    );
  };

  return (
    <Card className="flex border shadow-none border-t border-b-0 border-x-0 p-0 rounded-none flex-col h-full overflow-hidden bg-card">
      <Tabs defaultValue={'preview'} className="w-full h-full">
        <CardHeader className="h-10 bg-[linear-gradient(90deg,_#FF6FD8_0%,_#38E8FF_100%)] border-b p-2 px-4 rounded-lg mx-4 mt-2 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2 mt-4">
            <Icon className="h-5 w-5 text-white" />
            <CardTitle className="text-base font-medium text-white">
              {toolTitle}
            </CardTitle>
          </div>
          <div className='flex items-center gap-x-2 mt-4'>
            {isHtml && htmlPreviewUrl && !isStreaming && (
              <Button variant="outline" className="h-7 px-5 text-xs rounded-full bg-white dark:bg-muted/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 shadow-none font-medium" asChild>
                <a href={htmlPreviewUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Open in Browser
                </a>
              </Button>
            )}
            <TabsList className="h-7 bg-white/60 dark:bg-muted/60 border border-border/50 p-0.5 gap-x-2 rounded-full flex items-center">
              <TabsTrigger
                value="code"
                className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full transition-all [&[data-state=active]]:bg-white [&[data-state=active]]:dark:bg-primary/10 [&[data-state=active]]:text-foreground hover:bg-background/50 text-muted-foreground shadow-none"
              >
                <Code className="h-4 w-4" />
                Source
              </TabsTrigger>
              <TabsTrigger
                value="preview"
                className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full transition-all [&[data-state=active]]:bg-white [&[data-state=active]]:dark:bg-primary/10 [&[data-state=active]]:text-foreground hover:bg-background/50 text-muted-foreground shadow-none"
              >
                <Eye className="h-4 w-4" />
                Preview
              </TabsTrigger>
            </TabsList>
          </div>
        </CardHeader>

        <CardContent className="p-0 -my-2 h-full flex-1 overflow-hidden relative">
          <TabsContent value="code" className="flex-1 h-full mt-0 p-0 overflow-hidden">
            <ScrollArea className="h-screen w-full min-h-0">
              {isStreaming && !fileContent ? (
                <LoadingState
                  icon={Icon}
                  iconColor={config.color}
                  bgColor={config.bgColor}
                  title={config.progressMessage}
                  filePath={processedFilePath || 'Processing file...'}
                  subtitle="Please wait while the file is being processed"
                  showProgress={false}
                />
              ) : operation === 'delete' ? (
                <div className="flex flex-col items-center justify-center h-full py-12 px-6">
                  <div className={cn("w-20 h-20 rounded-full flex items-center justify-center mb-6", config.bgColor)}>
                    <Icon className={cn("h-10 w-10", config.color)} />
                  </div>
                  <h3 className="text-xl font-semibold mb-6 text-zinc-900 dark:text-zinc-100">
                    Delete Operation
                  </h3>
                  <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 w-full max-w-md text-center">
                    <code className="text-sm font-mono text-zinc-700 dark:text-zinc-300 break-all">
                      {processedFilePath || 'Unknown file path'}
                    </code>
                  </div>
                </div>
              ) : (
                renderSourceCode()
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="preview" className="w-full flex-1 h-full mt-0 p-0 overflow-hidden">
            <ScrollArea className="h-full w-full min-h-0">
              {isStreaming && !fileContent ? (
                <LoadingState
                  icon={Icon}
                  iconColor={config.color}
                  bgColor={config.bgColor}
                  title={config.progressMessage}
                  filePath={processedFilePath || 'Processing file...'}
                  subtitle="Please wait while the file is being processed"
                  showProgress={false}
                />
              ) : operation === 'delete' ? (
                renderDeleteOperation()
              ) : (
                renderFilePreview()
              )}
              {isStreaming && fileContent && (
                <div className="sticky bottom-4 right-4 float-right mr-4 mb-4">
                  <Badge className="bg-blue-500/90 text-white border-none shadow-lg animate-pulse">
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    Streaming...
                  </Badge>
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </CardContent>

        <div className="px-4 py-2 h-10 bg-gradient-to-r from-zinc-50/90 to-zinc-100/90 dark:from-zinc-900/90 dark:to-zinc-800/90 backdrop-blur-sm border-t border-zinc-200 dark:border-zinc-800 flex justify-between items-center gap-4">
          <div className="h-full flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
            <Badge variant="outline" className="py-0.5 h-6">
              <FileIcon className="h-3 w-3" />
              {hasHighlighting ? language.toUpperCase() : fileExtension.toUpperCase() || 'TEXT'}
            </Badge>
          </div>

          <div className="text-xs text-zinc-500 dark:text-zinc-400">
            {toolTimestamp && !isStreaming
              ? formatTimestamp(toolTimestamp)
              : assistantTimestamp
                ? formatTimestamp(assistantTimestamp)
                : ''}
          </div>
        </div>
      </Tabs>
    </Card>
  );
}