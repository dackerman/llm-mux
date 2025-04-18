import { useState, useRef, FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { LLMProvider, LLM_PROVIDERS } from "@/types";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface InputAreaProps {
  chatId: number;
  selectedModels: LLMProvider[];
  onMessageSent: () => void;
  isDisabled?: boolean;
}

export function InputArea({ chatId, selectedModels, onMessageSent, isDisabled = false }: InputAreaProps) {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      return apiRequest('POST', `/api/chats/${chatId}/messages`, { 
        content, 
        selectedModels 
      });
    },
    onSuccess: () => {
      setMessage("");
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
      onMessageSent();
    }
  });

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!message.trim() || selectedModels.length === 0 || isDisabled) {
      return;
    }
    
    await sendMessageMutation.mutateAsync(message);
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    
    // Auto-resize the textarea
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  };

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
      <div className="max-w-3xl mx-auto">
        <form className="relative" onSubmit={handleSendMessage}>
          <Textarea
            ref={textareaRef}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg py-3 pl-4 pr-16 resize-none dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Ask something..."
            rows={3}
            value={message}
            onChange={handleTextareaChange}
            disabled={isDisabled || sendMessageMutation.isPending}
          />
          
          <div className="absolute right-3 bottom-3 flex items-center space-x-1">
            <Button
              type="submit"
              size="icon"
              className="bg-blue-500 text-white p-1.5 rounded-full hover:bg-blue-600"
              disabled={!message.trim() || selectedModels.length === 0 || isDisabled || sendMessageMutation.isPending}
            >
              <span className="material-icons text-xl">send</span>
            </Button>
          </div>
          
          {/* Model indicator badges */}
          {selectedModels.length > 0 && (
            <div className="flex items-center space-x-2 mt-2 flex-wrap">
              {selectedModels.map(provider => {
                const config = LLM_PROVIDERS[provider];
                return (
                  <span 
                    key={provider}
                    className="px-2 py-0.5 text-xs rounded-full border mb-1"
                    style={{ 
                      backgroundColor: `${config.color}10`, 
                      color: config.color,
                      borderColor: `${config.color}33`
                    }}
                  >
                    {config.name}
                  </span>
                );
              })}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
