import { FormEvent, useState, useEffect } from "react";
import { LLMProvider } from "@/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useStreaming } from "@/hooks/use-streaming";
import { useToast } from "@/hooks/use-toast";

interface BranchInputAreaProps {
  chatId: number;
  branchId: string;
  parentTurnId?: string | null;
  selectedModels: LLMProvider[];
  onMessageSent: () => void;
  isDisabled?: boolean;
}

export function BranchInputArea({ 
  chatId, 
  branchId,
  parentTurnId,
  selectedModels, 
  onMessageSent, 
  isDisabled = false 
}: BranchInputAreaProps) {
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [enableStreaming, setEnableStreaming] = useState(true); // Default to using streaming
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Get streaming functionality
  const {
    isStreaming,
    streamedContent,
    error: streamingError,
    startStream,
    cancelStream
  } = useStreaming();

  // Handle streaming errors
  useEffect(() => {
    if (streamingError) {
      toast({
        title: "Streaming Error",
        description: streamingError,
        variant: "destructive"
      });
    }
  }, [streamingError, toast]);

  // Standard mutation for sending a message to multiple models
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      return apiRequest('POST', `/api/chats/${chatId}/turns`, {
        content,
        branchId,
        parentTurnId,
        selectedModels
      });
    },
    onSuccess: async () => {
      // Invalidate cached turns to reflect new messages
      queryClient.invalidateQueries({ queryKey: [`/api/chats/${chatId}/turns`] });
      queryClient.invalidateQueries({ queryKey: [`/api/chats/${chatId}/branches/${branchId}`] });
    }
  });

  // Handle saving the streamed response
  const saveStreamedResponseMutation = useMutation({
    mutationFn: async ({ provider, content }: { provider: LLMProvider, content: string }) => {
      return apiRequest('POST', `/api/chats/${chatId}/turns`, {
        content: `Streamed response: ${content}`,
        branchId,
        parentTurnId: null, // This would need to be updated with the actual user turn ID
        model: provider,
        role: 'assistant'
      });
    },
    onSuccess: () => {
      // Invalidate queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: [`/api/chats/${chatId}/turns`] });
      queryClient.invalidateQueries({ queryKey: [`/api/chats/${chatId}/branches/${branchId}`] });
    }
  });

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!message.trim() || isSubmitting || isDisabled) return;
    
    try {
      setIsSubmitting(true);
      
      // If we're using streaming and have only one model selected
      if (enableStreaming && selectedModels.length === 1) {
        // Create a user turn (this will be handled by the streaming endpoint)
        // Start streaming with the first (and only) selected model
        startStream({
          chatId,
          content: message,
          branchId,
          parentTurnId,
          provider: selectedModels[0],
          onComplete: (fullResponse: string) => {
            // The streaming endpoint handles saving the response,
            // we just need to refresh the queries
            queryClient.invalidateQueries({ queryKey: [`/api/chats/${chatId}/turns`] });
            queryClient.invalidateQueries({ queryKey: [`/api/chats/${chatId}/branches/${branchId}`] });
            onMessageSent();
          }
        });
        
        // Clear the input message
        setMessage('');
      } else {
        // Use the standard non-streaming approach for multiple models
        await sendMessageMutation.mutateAsync(message);
        setMessage('');
        onMessageSent();
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
    } finally {
      if (!isStreaming) {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="sticky bottom-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 py-3 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Streaming preview */}
        {isStreaming && streamedContent && (
          <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md">
            <div className="flex items-center mb-2">
              <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2"></span>
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                Streaming from {selectedModels[0].charAt(0).toUpperCase() + selectedModels[0].slice(1)}...
              </span>
            </div>
            <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">
              {streamedContent}
            </div>
          </div>
        )}
        
        <form onSubmit={handleSendMessage} className="flex items-end gap-2">
          <div className="flex-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
            <Textarea
              placeholder="Type a message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                // Submit on Enter (without Shift key)
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(e);
                }
              }}
              className="min-h-20 p-3 bg-transparent border-0 resize-none focus-visible:ring-0 focus-visible:ring-offset-0"
              disabled={isDisabled || isSubmitting || isStreaming}
            />
            
            <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-700 p-2">
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {selectedModels.length > 0 ? (
                  <span>
                    Comparing with: {selectedModels.map(m => m.charAt(0).toUpperCase() + m.slice(1)).join(', ')}
                    {selectedModels.length === 1 && (
                      <label className="ml-3 inline-flex items-center">
                        <input 
                          type="checkbox"
                          checked={enableStreaming}
                          onChange={() => setEnableStreaming(!enableStreaming)}
                          className="form-checkbox h-3 w-3 text-blue-500"
                        />
                        <span className="ml-1">Stream</span>
                      </label>
                    )}
                  </span>
                ) : (
                  <span>No models selected</span>
                )}
              </div>
              
              {isStreaming && (
                <button 
                  type="button"
                  onClick={cancelStream}
                  className="text-xs text-red-500 hover:text-red-600 transition-colors"
                >
                  Cancel Stream
                </button>
              )}
            </div>
          </div>
          
          <Button 
            type="submit" 
            disabled={!message.trim() || isDisabled || isSubmitting || isStreaming}
            className="h-11 px-4"
          >
            {isSubmitting || isStreaming ? (
              <span className="material-icons animate-spin">progress_activity</span>
            ) : (
              <span className="material-icons">send</span>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}