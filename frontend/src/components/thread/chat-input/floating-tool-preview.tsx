import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronUp, CheckCircle, Check } from 'lucide-react';
import { getUserFriendlyToolName } from '@/components/thread/utils';
import { cn } from '@/lib/utils';

export interface ToolCallInput {
  assistantCall: {
    content?: string;
    name?: string;
    timestamp?: string;
  };
  toolResult?: {
    content?: string;
    isSuccess?: boolean;
    timestamp?: string;
  };
  messages?: any[];
}

interface FloatingToolPreviewProps {
  toolCalls: ToolCallInput[];
  currentIndex: number;
  onExpand: () => void;
  agentName?: string;
  isVisible: boolean;
  // Indicators for multiple notification types (not tool calls)
  showIndicators?: boolean;
  indicatorIndex?: number;
  indicatorTotal?: number;
  onIndicatorClick?: (index: number) => void;
}

const FLOATING_LAYOUT_ID = 'tool-panel-float';
const CONTENT_LAYOUT_ID = 'tool-panel-content';

// Function to extract meaningful task description from tool call content
const extractTaskDescription = (toolCall: ToolCallInput): string => {
  const content = toolCall.assistantCall?.content;
  if (!content) return 'Tool Call';

  try {
    // Try to parse as JSON first
    const parsed = typeof content === 'string' ? JSON.parse(content) : content;
    
    // Check if it's the new structured format
    if (parsed && typeof parsed === 'object') {
      // If it has a content field, use that
      if (parsed.content && typeof parsed.content === 'string') {
        return parsed.content;
      }
      
      // If it has tool_calls, extract the first one's description
      if (parsed.tool_calls && Array.isArray(parsed.tool_calls) && parsed.tool_calls.length > 0) {
        const firstToolCall = parsed.tool_calls[0];
        if (firstToolCall.function?.description) {
          return firstToolCall.function.description;
        }
        if (firstToolCall.function?.arguments) {
          const args = typeof firstToolCall.function.arguments === 'string' 
            ? JSON.parse(firstToolCall.function.arguments) 
            : firstToolCall.function.arguments;
          
          // Look for common task description fields
          if (args.task || args.description || args.prompt || args.query) {
            return args.task || args.description || args.prompt || args.query;
          }
        }
      }
    }
  } catch (e) {
    // If JSON parsing fails, treat as string
  }

  // If it's a string, try to extract meaningful content
  if (typeof content === 'string') {
    // Remove XML tags and extract content
    const cleanContent = content
      .replace(/<[^>]*>/g, '') // Remove XML tags
      .replace(/function_calls?/gi, '') // Remove function_calls text
      .replace(/tool_calls?/gi, '') // Remove tool_calls text
      .trim();
    
    if (cleanContent && cleanContent.length > 10) {
      // Truncate if too long
      return cleanContent.length > 100 
        ? cleanContent.substring(0, 100) + '...' 
        : cleanContent;
    }
  }

  // Fallback to tool name if no meaningful description found
  const toolName = toolCall.assistantCall?.name || 'Tool Call';
  return getUserFriendlyToolName(toolName);
};

// Function to check if task is completed
const isTaskCompleted = (toolCall: ToolCallInput): boolean => {
  return toolCall.toolResult?.content && toolCall.toolResult.content !== 'STREAMING';
};

export const FloatingToolPreview: React.FC<FloatingToolPreviewProps> = ({
  toolCalls,
  currentIndex,
  onExpand,
  agentName,
  isVisible,
  showIndicators = false,
  indicatorIndex = 0,
  indicatorTotal = 1,
  onIndicatorClick,
}) => {
  const [isExpanding, setIsExpanding] = React.useState(false);
  const currentToolCall = toolCalls[currentIndex];
  const totalCalls = toolCalls.length;

  React.useEffect(() => {
    if (isVisible) {
      setIsExpanding(false);
    }
  }, [isVisible]);

  if (!currentToolCall || totalCalls === 0) return null;

  const taskDescription = extractTaskDescription(currentToolCall);
  const isCompleted = isTaskCompleted(currentToolCall);

  const handleClick = () => {
    setIsExpanding(true);
    requestAnimationFrame(() => {
      onExpand();
    });
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          layoutId={FLOATING_LAYOUT_ID}
          layout
          transition={{
            layout: {
              type: "spring",
              stiffness: 300,
              damping: 30
            }
          }}
          className="-mb-2 w-full"
          style={{ pointerEvents: 'auto' }}
        >
          <motion.div
            layoutId={CONTENT_LAYOUT_ID}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-[0px_12px_32px_0px_rgba(0,0,0,0.05)] p-3 w-full cursor-pointer group transition-colors"
            onClick={handleClick}
            style={{ opacity: isExpanding ? 0 : 1 }}
          >
            <div className="flex items-center justify-between">
              {/* Task description - full width, no truncation */}
              <div className="flex-1 min-w-0" style={{ opacity: isExpanding ? 0 : 1 }}>
                <motion.div layoutId="tool-title" className="flex items-center gap-2">
                  {isCompleted && (
                    <div className="w-5 h-5 rounded-full bg-helium-teal flex items-center justify-center flex-shrink-0">
                      <Check className="h-3 w-3 text-white" />
                    </div>
                  )}
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 leading-tight">
                    {isCompleted ? "Task Completed" : taskDescription}
                  </h4>
                </motion.div>
              </div>

              {/* Step count and expand button */}
              <div className="flex items-center gap-3 flex-shrink-0" style={{ opacity: isExpanding ? 0 : 1 }}>
                {/* Step count */}
                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                  {currentIndex + 1} / {totalCalls}
                </span>

                {/* Expand button */}
                <ChevronUp className="h-4 w-4 text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}; 