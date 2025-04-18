import { FormEvent, useState } from "react";
import { LLMProvider } from "@/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

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
  const queryClient = useQueryClient();

  // Mutation for sending a new message using the turn-based API
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

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!message.trim() || isSubmitting || isDisabled) return;
    
    try {
      setIsSubmitting(true);
      await sendMessageMutation.mutateAsync(message);
      setMessage('');
      onMessageSent();
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="sticky bottom-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 py-3 px-4">
      <div className="max-w-3xl mx-auto">
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
              disabled={isDisabled || isSubmitting}
            />
            
            <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-700 p-2">
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {selectedModels.length > 0 ? (
                  <span>Comparing with: {selectedModels.map(m => m.charAt(0).toUpperCase() + m.slice(1)).join(', ')}</span>
                ) : (
                  <span>No models selected</span>
                )}
              </div>
            </div>
          </div>
          
          <Button 
            type="submit" 
            disabled={!message.trim() || isDisabled || isSubmitting}
            className="h-11 px-4"
          >
            {isSubmitting ? (
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