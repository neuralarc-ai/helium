import { extractToolData, normalizeContentToString } from '../utils';

export interface ExposePortData {
  port: number | null;
  url: string | null;
  message: string | null;
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

// Canonicalize Daytona proxy subdomain to ensure consistent displayed/used URL
// Force links to use the 8080 Daytona proxy host (and https) for uniformity
export const canonicalizeExposeUrl = (input: string): string => {
  try {
    const u = new URL(input);
    const host = u.hostname;
    // Match leading port segment like 8080-abc.proxy.daytona.works
    const m = host.match(/^(\d+)-(.*\.proxy\.daytona\.works)$/);
    if (m) {
      const rest = m[2];
      u.hostname = `8080-${rest}`;
      u.protocol = 'https:'; // canonical choice to match daytona 8080
      // Clear default port if any so URL stays clean
      u.port = '';
      return u.toString();
    }
    return input;
  } catch {
    return input;
  }
};

const extractFromNewFormat = (content: any): { 
  port: number | null; 
  url: string | null;
  message: string | null;
  success?: boolean; 
  timestamp?: string;
} => {
  const parsedContent = parseContent(content);
  
  if (!parsedContent || typeof parsedContent !== 'object') {
    return { port: null, url: null, message: null, success: undefined, timestamp: undefined };
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

    const extractedData = {
      port: args.port ? parseInt(args.port, 10) : (parsedOutput?.port ? parseInt(parsedOutput.port, 10) : null),
      url: parsedOutput?.url || null,
      message: parsedOutput?.message || parsedContent.summary || null,
      success: toolExecution.result?.success,
      timestamp: toolExecution.execution_details?.timestamp
    };

    console.log('ExposePortToolView: Extracted from new format:', {
      port: extractedData.port,
      hasUrl: !!extractedData.url,
      hasMessage: !!extractedData.message,
      success: extractedData.success
    });
    
    return extractedData;
  }

  // Support the structured tool result format: { tool_name|xml_tag_name, parameters, result }
  if (('tool_name' in parsedContent) || ('xml_tag_name' in parsedContent)) {
    const parameters = (parsedContent as any).parameters || {};
    let result = (parsedContent as any).result || undefined;

    // Newer payloads may be nested under a content field
    if (!result && 'content' in parsedContent && typeof (parsedContent as any).content === 'object') {
      const inner = (parsedContent as any).content;
      result = inner.result || result;
    }

    let output = result?.output;
    if (typeof output === 'string') {
      try { output = JSON.parse(output); } catch {}
    }

    // Prefer explicit numbers in parameters or output; otherwise check result directly
    const port = parameters.port ? parseInt(String(parameters.port), 10)
      : (output?.port ? parseInt(String(output.port), 10)
      : (result?.port ? parseInt(String(result.port), 10) : null));

    const extractedData = {
      port,
      url: output?.url || result?.url || (parameters as any).url || null,
      message: output?.message || result?.message || (parsedContent as any).summary || null,
      success: result?.success,
      timestamp: result?.timestamp || (parsedContent as any).timestamp
    };

    console.log('ExposePortToolView: Extracted from structured format:', {
      port: extractedData.port,
      hasUrl: !!extractedData.url,
      hasMessage: !!extractedData.message,
      success: extractedData.success
    });

    return extractedData;
  }

  if ('role' in parsedContent && 'content' in parsedContent) {
    return extractFromNewFormat(parsedContent.content);
  }

  return { port: null, url: null, message: null, success: undefined, timestamp: undefined };
};

const extractPortFromAssistantContent = (content: string | object | undefined | null): number | null => {
  const contentStr = normalizeContentToString(content);
  if (!contentStr) return null;
  
  try {
    const match = contentStr.match(/<expose-port>\s*(\d+)\s*<\/expose-port>/);
    return match ? parseInt(match[1], 10) : null;
  } catch (e) {
    console.error('Failed to extract port number:', e);
    return null;
  }
};

const extractFromLegacyFormat = (content: any): { 
  port: number | null; 
  url: string | null;
  message: string | null;
} => {
  const toolData = extractToolData(content);
  
  if (toolData.toolResult && toolData.arguments) {
    console.log('ExposePortToolView: Extracted from legacy format (extractToolData):', {
      port: toolData.arguments.port
    });
    
    return {
      port: toolData.arguments.port ? parseInt(toolData.arguments.port, 10) : null,
      url: null,
      message: null
    };
  }

  const contentStr = normalizeContentToString(content);
  if (!contentStr) {
    return { port: null, url: null, message: null };
  }
  try {
    const parsed = JSON.parse(contentStr);
    if (parsed.url && parsed.port) {
      return {
        port: parseInt(parsed.port, 10),
        url: parsed.url,
        message: parsed.message || null
      };
    }
  } catch (e) {
  }
  
  try {
    const toolResultMatch = contentStr.match(/ToolResult\(success=(?:True|true),\s*output='((?:[^'\\]|\\.)*)'\)/);
    if (toolResultMatch) {
      let jsonStr = toolResultMatch[1];
      
      jsonStr = jsonStr
        .replace(/\\\\n/g, '\n')
        .replace(/\\\\"/g, '"')
        .replace(/\\n/g, '\n')
        .replace(/\\"/g, '"')
        .replace(/\\'/g, "'")
        .replace(/\\\\/g, '\\');
      
      const result = JSON.parse(jsonStr);
      return {
        port: result.port ? parseInt(result.port, 10) : null,
        url: result.url || null,
        message: result.message || null
      };
    }
    
    const simpleMatch = contentStr.match(/output='([^']+)'/);
    if (simpleMatch) {
      const jsonStr = simpleMatch[1]
        .replace(/\\n/g, '\n')
        .replace(/\\"/g, '"');
      const result = JSON.parse(jsonStr);
      return {
        port: result.port ? parseInt(result.port, 10) : null,
        url: result.url || null,
        message: result.message || null
      };
    }
    
    return { port: null, url: null, message: null };
  } catch (e) {
    console.error('Failed to parse tool content:', e);
    console.error('Tool content was:', contentStr);
    return { port: null, url: null, message: null };
  }
};

// Normalize exposed URLs so that directory-like paths end with index.html
export const normalizeExposeUrl = (input: string): string => {
  try {
    const u = new URL(input);
    const pathname = u.pathname || '/';

    const lastSeg = pathname.split('/').filter(Boolean).pop() || '';
    const hasExtension = !!lastSeg && /\.[^/.]+$/.test(lastSeg);
    const endsWithIndex = pathname.endsWith('/index.html') || pathname.endsWith('index.html');

    if (endsWithIndex || hasExtension) {
      return u.toString();
    }

    u.pathname = pathname.endsWith('/') ? `${pathname}index.html` : `${pathname}/index.html`;
    return u.toString();
  } catch {
    if (!input) return input;
    if (input.endsWith('/index.html') || input.endsWith('index.html')) return input;
    if (input.endsWith('/')) return input + 'index.html';
    return input + '/index.html';
  }
};

export function extractExposePortData(
  assistantContent: any,
  toolContent: any,
  isSuccess: boolean,
  toolTimestamp?: string,
  assistantTimestamp?: string
): {
  port: number | null;
  url: string | null;
  message: string | null;
  actualIsSuccess: boolean;
  actualToolTimestamp?: string;
  actualAssistantTimestamp?: string;
} {
  let port: number | null = null;
  let url: string | null = null;
  let message: string | null = null;
  let actualIsSuccess = isSuccess;
  let actualToolTimestamp = toolTimestamp;
  let actualAssistantTimestamp = assistantTimestamp;

  const assistantNewFormat = extractFromNewFormat(assistantContent);
  const toolNewFormat = extractFromNewFormat(toolContent);

  console.log('ExposePortToolView: Format detection results:', {
    assistantNewFormat: {
      hasPort: !!assistantNewFormat.port,
      hasUrl: !!assistantNewFormat.url,
      hasMessage: !!assistantNewFormat.message
    },
    toolNewFormat: {
      hasPort: !!toolNewFormat.port,
      hasUrl: !!toolNewFormat.url,
      hasMessage: !!toolNewFormat.message
    }
  });

  if (assistantNewFormat.port || assistantNewFormat.url || assistantNewFormat.message) {
    port = assistantNewFormat.port;
    url = assistantNewFormat.url ? canonicalizeExposeUrl(normalizeExposeUrl(assistantNewFormat.url)) : null;
    message = assistantNewFormat.message;
    if (assistantNewFormat.success !== undefined) {
      actualIsSuccess = assistantNewFormat.success;
    }
    if (assistantNewFormat.timestamp) {
      actualAssistantTimestamp = assistantNewFormat.timestamp;
    }
    console.log('ExposePortToolView: Using assistant new format data');
  } else if (toolNewFormat.port || toolNewFormat.url || toolNewFormat.message) {
    port = toolNewFormat.port;
    url = toolNewFormat.url ? canonicalizeExposeUrl(normalizeExposeUrl(toolNewFormat.url)) : null;
    message = toolNewFormat.message;
    if (toolNewFormat.success !== undefined) {
      actualIsSuccess = toolNewFormat.success;
    }
    if (toolNewFormat.timestamp) {
      actualToolTimestamp = toolNewFormat.timestamp;
    }
    console.log('ExposePortToolView: Using tool new format data');
  } else {
    const assistantLegacy = extractFromLegacyFormat(assistantContent);
    const toolLegacy = extractFromLegacyFormat(toolContent);

    port = assistantLegacy.port || toolLegacy.port;
    const legacyUrl = assistantLegacy.url || toolLegacy.url || null;
    url = legacyUrl ? canonicalizeExposeUrl(normalizeExposeUrl(legacyUrl)) : null;
    message = assistantLegacy.message || toolLegacy.message;
    
    if (!port) {
      const assistantPort = extractPortFromAssistantContent(assistantContent);
      if (assistantPort) {
        port = assistantPort;
      }
    }
    
    console.log('ExposePortToolView: Using legacy format data:', {
      port,
      hasUrl: !!url,
      hasMessage: !!message
    });
  }

  console.log('ExposePortToolView: Final extracted data:', {
    port,
    hasUrl: !!url,
    hasMessage: !!message,
    actualIsSuccess
  });

  return {
    port,
    url,
    message,
    actualIsSuccess,
    actualToolTimestamp,
    actualAssistantTimestamp
  };
} 