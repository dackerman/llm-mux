import { FormEvent, useState, useEffect } from "react";
import { LLMProvider } from "@/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useStreaming } from "@/hooks/use-streaming";
import { useMultiStreaming } from "@/hooks/use-multi-streaming";
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
  // Always use streaming for model responses - no toggle needed
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Get single model streaming functionality
  const {
    isStreaming,
    streamedContent,
    error: streamingError,
    startStream,
    cancelStream
  } = useStreaming();
  
  // Get multi-model streaming functionality
  const {
    streams,
    isAnyStreaming,
    error: multiStreamError,
    startMultiStream,
    cancelStream: cancelMultiStream,
    cancelAllStreams
  } = useMultiStreaming();

  // Handle streaming errors
  useEffect(() => {
    if (streamingError) {
      toast({
        title: "Streaming Error",
        description: streamingError,
        variant: "destructive"
      });
    }
    
    if (multiStreamError) {
      toast({
        title: "Multi-Streaming Error",
        description: multiStreamError,
        variant: "destructive"
      });
    }
  }, [streamingError, multiStreamError, toast]);

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

  // We don't need this mutation anymore as all responses are saved by the server

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!message.trim() || isSubmitting || isDisabled) return;
    
    try {
      setIsSubmitting(true);
      
      // Always use streaming for better UX, whether single or multiple models
      if (selectedModels.length === 1) {
        // When only one model is selected, use single-model streaming
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
      } else if (selectedModels.length > 1) {
        // When multiple models are selected, use multi-model streaming
        startMultiStream({
          chatId,
          content: message,
          branchId,
          parentTurnId,
          providers: selectedModels,
          onComplete: (results) => {
            // The streaming endpoint handles saving the responses,
            // we just need to refresh the queries
            queryClient.invalidateQueries({ queryKey: [`/api/chats/${chatId}/turns`] });
            queryClient.invalidateQueries({ queryKey: [`/api/chats/${chatId}/branches/${branchId}`] });
            onMessageSent();
          }
        });
      } else {
        // No models selected - should not happen with UI constraints
        toast({
          title: "Error",
          description: "Please select at least one AI model before sending a message.",
          variant: "destructive"
        });
        setIsSubmitting(false);
        return;
      }
      
      // Clear the input message
      setMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
      setIsSubmitting(false);
    }
  };

  return (
    <div className="sticky bottom-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 py-3 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Single Model Streaming preview */}
        {isStreaming && streamedContent && selectedModels.length === 1 && (
          <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md">
            <div className="flex items-center mb-2">
              <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2"></span>
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                Streaming from {selectedModels[0].charAt(0).toUpperCase() + selectedModels[0].slice(1)}...
              </span>
            </div>
            <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words overflow-auto max-h-60">
              {streamedContent}
            </div>
          </div>
        )}
        
        {/* Multi-Model Streaming preview */}
        {isAnyStreaming && Object.keys(streams).length > 0 && (
          <div className="mb-4 grid gap-4 grid-cols-1 md:grid-cols-2">
            {Object.entries(streams).map(([provider, stream]) => (
              <div 
                key={provider}
                className={`p-4 bg-gray-50 dark:bg-gray-800 border-2 rounded-md overflow-hidden
                  ${provider === 'openai' ? 'border-emerald-300 dark:border-emerald-800' : ''}
                  ${provider === 'claude' ? 'border-orange-300 dark:border-orange-800' : ''}
                  ${provider === 'gemini' ? 'border-blue-300 dark:border-blue-800' : ''}
                  ${provider === 'grok' ? 'border-purple-300 dark:border-purple-800' : ''}
                `}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    {stream.isStreaming && (
                      <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2"></span>
                    )}
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      {provider.charAt(0).toUpperCase() + provider.slice(1)}
                      {stream.isStreaming ? ' (streaming...)' : ' (complete)'}
                    </span>
                  </div>
                  {stream.isStreaming && (
                    <button 
                      type="button"
                      onClick={() => cancelMultiStream(provider as LLMProvider)}
                      className="text-xs text-red-500 hover:text-red-600 transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                </div>
                <div 
                  className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words overflow-auto"
                  style={{ maxHeight: '150px', minHeight: '100px' }}
                >
                  {stream.content || 'Starting stream...'}
                </div>
              </div>
            ))}
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
              disabled={isDisabled || isSubmitting || isStreaming || isAnyStreaming}
            />
            
            <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-700 p-2">
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {selectedModels.length > 0 ? (
                  <span>
                    {selectedModels.length === 1 ? (
                      <>
                        Using: <span className="font-medium">{selectedModels[0].charAt(0).toUpperCase() + selectedModels[0].slice(1)}</span>
                        {isStreaming && <span className="ml-2 text-green-500">• Streaming response</span>}
                      </>
                    ) : (
                      <>
                        Comparing with: {selectedModels.map(m => m.charAt(0).toUpperCase() + m.slice(1)).join(', ')}
                        {isAnyStreaming && <span className="ml-2 text-green-500">• Streaming responses</span>}
                      </>
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
              
              {isAnyStreaming && (
                <button 
                  type="button"
                  onClick={cancelAllStreams}
                  className="text-xs text-red-500 hover:text-red-600 transition-colors"
                >
                  Cancel All Streams
                </button>
              )}
            </div>
          </div>
          
          <Button 
            type="submit" 
            disabled={!message.trim() || isDisabled || isSubmitting || isStreaming || isAnyStreaming}
            className="h-11 px-4"
          >
            {isSubmitting || isStreaming || isAnyStreaming ? (
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