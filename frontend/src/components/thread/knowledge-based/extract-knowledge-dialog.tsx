'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, BookOpen, MessageSquare, Play, Info } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useExtractThreadKnowledge } from '@/hooks/react-query/knowledge-base/use-knowledge-base-queries';
import { toast } from 'sonner';

interface ExtractKnowledgeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  threadId: string;
  threadName?: string;
  onSuccess?: () => void;
}

const USAGE_CONTEXT_OPTIONS = [
  { 
    value: 'always', 
    label: 'Always Active', 
    description: 'This knowledge will always be available to the agent',
    color: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800'
  },
  { 
    value: 'on_request', 
    label: 'On Request', 
    description: 'This knowledge will only be used when specifically requested',
    color: 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-800'
  },
  { 
    value: 'contextual', 
    label: 'Contextual', 
    description: 'This knowledge will be used when contextually relevant',
    color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800'
  },
] as const;

export function ExtractKnowledgeDialog({
  isOpen,
  onClose,
  threadId,
  threadName,
  onSuccess
}: ExtractKnowledgeDialogProps) {
  const [formData, setFormData] = useState({
    entry_name: threadName ? `Knowledge from: ${threadName}` : 'Extracted Knowledge',
    description: '',
    usage_context: 'always' as 'always' | 'on_request' | 'contextual',
    include_messages: true,
    include_agent_runs: true,
    max_messages: 50
  });

  const extractMutation = useExtractThreadKnowledge();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.entry_name.trim()) {
      toast.error('Please provide a name for the knowledge entry');
      return;
    }

    try {
      await extractMutation.mutateAsync({
        threadId,
        data: {
          thread_id: threadId,
          entry_name: formData.entry_name,
          description: formData.description || undefined,
          usage_context: formData.usage_context,
          include_messages: formData.include_messages,
          include_agent_runs: formData.include_agent_runs,
          max_messages: formData.max_messages
        }
      });
      
      toast.success('Knowledge extracted and saved successfully!');
      onSuccess?.();
      handleClose();
    } catch (error) {
      console.error('Error extracting knowledge:', error);
      toast.error('Failed to extract knowledge from thread');
    }
  };

  const handleClose = () => {
    setFormData({
      entry_name: threadName ? `Knowledge from: ${threadName}` : 'Extracted Knowledge',
      description: '',
      usage_context: 'always',
      include_messages: true,
      include_agent_runs: true,
      max_messages: 50
    });
    onClose();
  };

  const getUsageContextConfig = (context: string) => {
    return USAGE_CONTEXT_OPTIONS.find(option => option.value === context) || USAGE_CONTEXT_OPTIONS[0];
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Extract Knowledge from Thread
          </DialogTitle>
          <DialogDescription>
            Save important information from this conversation to your knowledge base. 
            This knowledge will be available to your agent in future conversations.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto">
          <form onSubmit={handleSubmit} className="space-y-6 p-1">
            <div className="space-y-2">
              <Label htmlFor="entry_name" className="text-sm font-medium">Knowledge Entry Name *</Label>
              <Input
                id="entry_name"
                value={formData.entry_name}
                onChange={(e) => setFormData(prev => ({ ...prev, entry_name: e.target.value }))}
                placeholder="e.g., Project Requirements, API Documentation, Meeting Notes"
                required
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe what this knowledge contains and when it should be used..."
                className="w-full"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="usage_context" className="text-sm font-medium">Usage Context</Label>
              <Select
                value={formData.usage_context}
                onValueChange={(value: 'always' | 'on_request' | 'contextual') => 
                  setFormData(prev => ({ ...prev, usage_context: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {USAGE_CONTEXT_OPTIONS.map((option) => {
                    const config = getUsageContextConfig(option.value);
                    return (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex flex-col items-start gap-1">
                          <div className="font-medium">{option.label}</div>
                          <div className="text-xs text-muted-foreground">{option.description}</div>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4">
              <Label className="text-sm font-medium">Content to Extract</Label>
              
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include_messages"
                    checked={formData.include_messages}
                    onCheckedChange={(checked) => 
                      setFormData(prev => ({ ...prev, include_messages: checked as boolean }))
                    }
                  />
                  <Label htmlFor="include_messages" className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Include conversation messages
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include_agent_runs"
                    checked={formData.include_agent_runs}
                    onCheckedChange={(checked) => 
                      setFormData(prev => ({ ...prev, include_agent_runs: checked as boolean }))
                    }
                  />
                  <Label htmlFor="include_agent_runs" className="flex items-center gap-2">
                    <Play className="h-4 w-4" />
                    Include agent execution details
                  </Label>
                </div>
              </div>

              {formData.include_messages && (
                <div className="space-y-2">
                  <Label htmlFor="max_messages" className="text-sm font-medium">Maximum Messages to Include</Label>
                  <Select
                    value={formData.max_messages.toString()}
                    onValueChange={(value) => 
                      setFormData(prev => ({ ...prev, max_messages: parseInt(value) }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="25">25 messages</SelectItem>
                      <SelectItem value="50">50 messages</SelectItem>
                      <SelectItem value="100">100 messages</SelectItem>
                      <SelectItem value="200">200 messages</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="bg-muted/50 p-4 rounded-lg">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="space-y-2">
                  <p className="text-sm font-medium">What will be extracted?</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {formData.include_messages && (
                      <li>• Conversation messages (up to {formData.max_messages} most recent)</li>
                    )}
                    {formData.include_agent_runs && (
                      <li>• Agent execution details and configurations</li>
                    )}
                    <li>• Thread metadata and context</li>
                  </ul>
                  <p className="text-xs text-muted-foreground">
                    The extracted content will be automatically formatted and optimized for use in future conversations.
                  </p>
                </div>
              </div>
            </div>
          </form>
        </div>

        <DialogFooter className="flex-shrink-0">
          <Button type="button" variant="outline" onClick={handleClose} disabled={extractMutation.isPending}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            onClick={handleSubmit}
            disabled={!formData.entry_name.trim() || extractMutation.isPending}
            className="gap-2"
          >
            {extractMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <BookOpen className="h-4 w-4" />
            )}
            Extract Knowledge
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
