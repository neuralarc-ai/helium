import { extractToolData } from '../utils';

export interface McpServerResult {
  name: string;
  app_slug: string;
  description: string;
  logo_url: string;
  auth_type: string;
  is_verified: boolean;
  url?: string | null;
  tags?: string[];
}

export interface SearchMcpServersData {
  query: string | null;
  results: McpServerResult[];
  limit: number;
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

const extractFromNewFormat = (content: any): SearchMcpServersData => {
  const parsedContent = parseContent(content);
  
  if (!parsedContent || typeof parsedContent !== 'object') {
    return { query: null, results: [], limit: 10, success: undefined, timestamp: undefined };
  }

  if ('tool_execution' in parsedContent && typeof parsedContent.tool_execution === 'object') {
    const toolExecution = parsedContent.tool_execution;
    const args = toolExecution.arguments || {};
    
    let parsedOutput = toolExecution.result?.output;
    if (typeof parsedOutput === 'string') {
      try {
        parsedOutput = JSON.parse(parsedOutput);
      } catch (e) {
        // Keep as string if parsing fails
      }
    }

    const extractedData = {
      query: args.query || null,
      results: Array.isArray(parsedOutput) ? parsedOutput : [],
      limit: args.limit || 10,
      success: toolExecution.result?.success,
      timestamp: toolExecution.execution_details?.timestamp
    };

    console.log('SearchMcpServersToolView: Extracted from new format:', {
      query: extractedData.query,
      resultsCount: extractedData.results.length,
      success: extractedData.success
    });
    
    return extractedData;
  }

  if ('role' in parsedContent && 'content' in parsedContent) {
    return extractFromNewFormat(parsedContent.content);
  }

  return { query: null, results: [], limit: 10, success: undefined, timestamp: undefined };
};

const extractFromLegacyFormat = (content: any): Omit<SearchMcpServersData, 'success' | 'timestamp'> => {
  const toolData = extractToolData(content);
  
  if (toolData.toolResult) {
    const args = toolData.arguments || {};
    
    console.log('SearchMcpServersToolView: Extracted from legacy format (extractToolData):', {
      query: args.query,
      resultsCount: 0 
    });
    
    return {
      query: args.query || null,
      results: [],
      limit: args.limit || 10
    };
  }

  console.log('SearchMcpServersToolView: No data found in legacy format');
  
  return {
    query: null,
    results: [],
    limit: 10
  };
};

export function extractSearchMcpServersData(
  assistantContent: any,
  toolContent: any,
  isSuccess: boolean,
  toolTimestamp?: string,
  assistantTimestamp?: string
): {
  query: string | null;
  results: McpServerResult[];
  limit: number;
  actualIsSuccess: boolean;
  actualToolTimestamp?: string;
  actualAssistantTimestamp?: string;
} {
  // Try to extract from new format first
  let data: SearchMcpServersData;
  
  // Check toolContent first (usually contains the result)
  if (toolContent) {
    data = extractFromNewFormat(toolContent);
    if (data.success !== undefined || data.results.length > 0) {
      console.log('SearchMcpServersToolView: Using toolContent with new format');
      return {
        ...data,
        actualIsSuccess: data.success !== undefined ? data.success : isSuccess,
        actualToolTimestamp: data.timestamp || toolTimestamp,
        actualAssistantTimestamp: assistantTimestamp
      };
    }
  }

  // Check assistantContent 
  if (assistantContent) {
    data = extractFromNewFormat(assistantContent);
    if (data.success !== undefined || data.results.length > 0) {
      console.log('SearchMcpServersToolView: Using assistantContent with new format');
      return {
        ...data,
        actualIsSuccess: data.success !== undefined ? data.success : isSuccess,
        actualToolTimestamp: toolTimestamp,
        actualAssistantTimestamp: data.timestamp || assistantTimestamp
      };
    }
  }

  // Fallback to legacy format
  console.log('SearchMcpServersToolView: Falling back to legacy format extraction');
  
  const toolLegacy = extractFromLegacyFormat(toolContent);
  const assistantLegacy = extractFromLegacyFormat(assistantContent);

  // Combine data from both sources, preferring toolContent
  const combinedData = {
    query: toolLegacy.query || assistantLegacy.query,
    results: toolLegacy.results.length > 0 ? toolLegacy.results : assistantLegacy.results,
    limit: toolLegacy.limit || assistantLegacy.limit,
    actualIsSuccess: isSuccess,
    actualToolTimestamp: toolTimestamp,
    actualAssistantTimestamp: assistantTimestamp
  };

  console.log('SearchMcpServersToolView: Final extracted data:', {
    query: combinedData.query,
    resultsCount: combinedData.results.length,
    success: combinedData.actualIsSuccess
  });

  return combinedData;
} 