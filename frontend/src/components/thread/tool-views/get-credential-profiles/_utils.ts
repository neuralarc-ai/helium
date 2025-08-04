import { extractToolData } from '../utils';

export interface CredentialProfileItem {
  profile_id: string;
  profile_name: string;
  display_name: string;
  app_slug: string;
  app_name: string;
  external_user_id: string;
  is_connected: boolean;
  is_active: boolean;
  is_default: boolean;
  enabled_tools: string[];
  created_at: string;
  last_used_at?: string;
}

export interface GetCredentialProfilesData {
  app_slug: string | null;
  message: string | null;
  profiles: CredentialProfileItem[];
  total_count: number;
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

const extractFromNewFormat = (content: any): GetCredentialProfilesData => {
  const parsedContent = parseContent(content);
  
  if (!parsedContent || typeof parsedContent !== 'object') {
    return { 
      app_slug: null,
      message: null,
      profiles: [],
      total_count: 0,
      success: undefined,
      timestamp: undefined 
    };
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
      profiles: Array.isArray(parsedOutput.profiles) ? parsedOutput.profiles : [],
      total_count: parsedOutput.total_count || 0,
      success: toolExecution.result?.success,
      timestamp: toolExecution.execution_details?.timestamp
    };
    
    return extractedData;
  }

  if ('parameters' in parsedContent && 'output' in parsedContent) {
    const extractedData = {
      app_slug: parsedContent.parameters?.app_slug || null,
      message: parsedContent.output?.message || null,
      profiles: Array.isArray(parsedContent.output?.profiles) ? parsedContent.output.profiles : [],
      total_count: parsedContent.output?.total_count || 0,
      success: parsedContent.success,
      timestamp: undefined
    };

    return extractedData;
  }

  if ('role' in parsedContent && 'content' in parsedContent) {
    return extractFromNewFormat(parsedContent.content);
  }

  return { 
    app_slug: null,
    message: null,
    profiles: [],
    total_count: 0,
    success: undefined,
    timestamp: undefined 
  };
};

const extractFromLegacyFormat = (content: any): Omit<GetCredentialProfilesData, 'success' | 'timestamp'> => {
  const toolData = extractToolData(content);
  
  if (toolData.toolResult) {
    const args = toolData.arguments || {};
    
    return {
      app_slug: args.app_slug || null,
      message: null,
      profiles: [],
      total_count: 0
    };
  }
  
  return {
    app_slug: null,
    message: null,
    profiles: [],
    total_count: 0
  };
};

export function extractGetCredentialProfilesData(
  assistantContent: any,
  toolContent: any,
  isSuccess: boolean,
  toolTimestamp?: string,
  assistantTimestamp?: string
): {
  app_slug: string | null;
  message: string | null;
  profiles: CredentialProfileItem[];
  total_count: number;
  actualIsSuccess: boolean;
  actualToolTimestamp?: string;
  actualAssistantTimestamp?: string;
} {
  let data: GetCredentialProfilesData;
  
  if (toolContent) {
    data = extractFromNewFormat(toolContent);
    if (data.success !== undefined || data.profiles.length > 0 || data.message) {
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
    if (data.success !== undefined || data.profiles.length > 0 || data.message) {
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
    profiles: toolLegacy.profiles.length > 0 ? toolLegacy.profiles : assistantLegacy.profiles,
    total_count: toolLegacy.total_count || assistantLegacy.total_count,
    actualIsSuccess: isSuccess,
    actualToolTimestamp: toolTimestamp,
    actualAssistantTimestamp: assistantTimestamp
  };

  return combinedData;
} 