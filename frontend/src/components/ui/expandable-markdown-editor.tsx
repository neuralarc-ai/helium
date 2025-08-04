import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "./textarea";
import { cn } from "@/lib/utils";
import { Edit2, Expand, Save, X } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ExpandableMarkdownEditorProps {
  value: string;
  onSave: (value: string) => void;
  className?: string;
  placeholder?: string;
  title?: string;
  disabled?: boolean;
  autosave?: boolean;
  autosaveDelay?: number;
}

export const ExpandableMarkdownEditor: React.FC<ExpandableMarkdownEditorProps> = ({ 
  value, 
  onSave, 
  className = '', 
  placeholder = 'Click to edit...',
  title = 'Edit Instructions',
  disabled = false,
  autosave = false,
  autosaveDelay = 1000
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const autosaveTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  // Autosave effect
  useEffect(() => {
    if (!autosave || !isEditing || editValue === value) return;

    // Clear existing timeout
    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
    }

    // Set new timeout for autosave
    autosaveTimeoutRef.current = setTimeout(() => {
      onSave(editValue);
    }, autosaveDelay);

    return () => {
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
      }
    };
  }, [editValue, value, onSave, autosave, autosaveDelay, isEditing]);

  const handleSave = () => {
    onSave(editValue);
    setIsEditing(false);
    setIsDialogOpen(false);
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleCancel();
    } else if (e.key === 'Enter' && e.metaKey) {
      handleSave();
    }
  };

  const openDialog = () => {
    setIsDialogOpen(true);
    setIsEditing(false);
  };

  const startEditing = () => {
    setIsEditing(true);
  };

  const renderMarkdown = (content: string, isPreview = false) => (
    <ReactMarkdown 
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => <h1 className="text-lg font-semibold mb-2">{children}</h1>,
        h2: ({ children }) => <h2 className="text-base font-semibold mb-2">{children}</h2>,
        h3: ({ children }) => <h3 className="text-sm font-semibold mb-1">{children}</h3>,
        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
        ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
        li: ({ children }) => <li className="text-sm">{children}</li>,
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
  );

  return (
    <>
      <div className={cn('relative', className)}>
        <div 
          className="group relative pb-4 border rounded-2xl bg-muted/30 hover:opacity-80 transition-colors cursor-pointer overflow-hidden"
          onClick={openDialog}
        >
          <div className="p-4 max-h-32 overflow-hidden">
            {value ? (
              <div className="prose prose-sm dark:prose-invert max-w-none text-sm">
                {renderMarkdown(value, true)}
              </div>
            ) : (
              <div className="text-muted-foreground italic text-sm">
                {placeholder}
              </div>
            )}
          </div>
          {value && value.length > 200 && (
            <div className="absolute bottom-2 left-4 text-xs text-muted-foreground/60 z-10">
              .........
            </div>
          )}
          <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
            <Button
              size="sm"
              className="h-6 w-6 p-0 shadow-sm"
              onClick={(e) => {
                e.stopPropagation();
                openDialog();
              }}
            >
              <Expand className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] w-[95vw] md:w-full flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{title}</span>
              {!isEditing && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={startEditing}
                  className="h-7 mr-4"
                >
                  <Edit2 className="h-3 w-3" />
                  Edit
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden">
            {isEditing ? (
              <div className="h-full flex flex-col gap-2">
                <ScrollArea className="flex-1 h-[500px]">
                  <textarea
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="w-full h-[500px] rounded-xl bg-muted/30 p-4 resize-none"
                    style={{ minHeight: '300px' }}
                    disabled={disabled}
                  />
                </ScrollArea>
                <div className="text-xs text-muted-foreground/50 flex-shrink-0">
                  Markdown supported • Cmd+Enter to save • Esc to cancel
                </div>
              </div>
            ) : (
              <ScrollArea className="flex-1 h-[500px]">
                <div className="pr-4">
                  {value ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      {renderMarkdown(value)}
                    </div>
                  ) : (
                    <div className="text-muted-foreground italic text-center py-8">
                      {placeholder}
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}
          </div>

          {isEditing && (
            <DialogFooter>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCancel}
                className="h-8"
              >
                <X className="h-3 w-3" />
                Cancel
              </Button>
              <Button
                size="sm"
                variant="default"
                onClick={handleSave}
                className="h-8"
              >
                <Save className="h-3 w-3" />
                Save
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}; 