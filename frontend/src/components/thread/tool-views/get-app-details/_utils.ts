import { extractToolData } from '../utils';

export interface AppDetails {
  name: string;
  app_slug: string;
  description: string;
  logo_url: string;
  auth_type: string;
  is_verified: boolean;
  url?: string | null;
  tags?: string[];
  pricing?: string;
  setup_instructions?: string;
  available_actions?: any[];
  available_triggers?: any[];
}

export interface GetAppDetailsData {
  app_slug: string | null;
  message: string | null;
  app: AppDetails | null;
  success?: boolean;
  timestamp?: string;
}

const parseContent = (content: any): any => {
  if (typeof content === 'string') {
    try {
      return JSON.parse(content);
    } catch (e) {
      return content;
    }
  }
  return content;
};

const extractFromNewFormat = (content: any): GetAppDetailsData => {
  const parsedContent = parseContent(content);
  
  if (!parsedContent || typeof parsedContent !== 'object') {
    return { app_slug: null, message: null, app: null, success: undefined, timestamp: undefined };
  }

  if ('tool_execution' in parsedContent && typeof parsedContent.tool_execution === 'object') {
    const toolExecution = parsedContent.tool_execution;
    const args = toolExecution.arguments || {};
    
    let parsedOutput = toolExecution.result?.output;
    if (typeof parsedOutput === 'string') {
      try {
        parsedOutput = JSON.parse(parsedOutput);
      } catch (e) {
      }
    }
    parsedOutput = parsedOutput || {};

    const extractedData = {
      app_slug: args.app_slug || null,
      message: parsedOutput.message || null,
      app: parsedOutput.app || null,
      success: toolExecution.result?.success,
      timestamp: toolExecution.execution_details?.timestamp
    };

    return extractedData;
  }

  if ('parameters' in parsedContent && 'output' in parsedContent) {
    const extractedData = {
      app_slug: parsedContent.parameters?.app_slug || null,
      message: parsedContent.output?.message || null,
      app: parsedContent.output?.app || null,
      success: parsedContent.success,
      timestamp: undefined
    };

    return extractedData;
  }

  if ('role' in parsedContent && 'content' in parsedContent) {
    return extractFromNewFormat(parsedContent.content);
  }

  return { app_slug: null, message: null, app: null, success: undefined, timestamp: undefined };
};

const extractFromLegacyFormat = (content: any): Omit<GetAppDetailsData, 'success' | 'timestamp'> => {
  const toolData = extractToolData(content);
  
  if (toolData.toolResult) {
    const args = toolData.arguments || {};
    
    return {
      app_slug: args.app_slug || null,
      message: null,
      app: null
    };
  }

  return {
    app_slug: null,
    message: null,
    app: null
  };
};

export function extractGetAppDetailsData(
  assistantContent: any,
  toolContent: any,
  isSuccess: boolean,
  toolTimestamp?: string,
  assistantTimestamp?: string
): {
  app_slug: string | null;
  message: string | null;
  app: AppDetails | null;
  actualIsSuccess: boolean;
  actualToolTimestamp?: string;
  actualAssistantTimestamp?: string;
} {
  let data: GetAppDetailsData;
  
  if (toolContent) {
    data = extractFromNewFormat(toolContent);
    if (data.success !== undefined || data.app) {
      return {
        ...data,
        actualIsSuccess: data.success !== undefined ? data.success : isSuccess,
        actualToolTimestamp: data.timestamp || toolTimestamp,
        actualAssistantTimestamp: assistantTimestamp
      };
    }
  }

  if (assistantContent) {
    data = extractFromNewFormat(assistantContent);
    if (data.success !== undefined || data.app) {
      return {
        ...data,
        actualIsSuccess: data.success !== undefined ? data.success : isSuccess,
        actualToolTimestamp: toolTimestamp,
        actualAssistantTimestamp: data.timestamp || assistantTimestamp
      };
    }
  }

  const toolLegacy = extractFromLegacyFormat(toolContent);
  const assistantLegacy = extractFromLegacyFormat(assistantContent);

  const combinedData = {
    app_slug: toolLegacy.app_slug || assistantLegacy.app_slug,
    message: toolLegacy.message || assistantLegacy.message,
    app: toolLegacy.app || assistantLegacy.app,
    actualIsSuccess: isSuccess,
    actualToolTimestamp: toolTimestamp,
    actualAssistantTimestamp: assistantTimestamp
  };

  return combinedData;
} 