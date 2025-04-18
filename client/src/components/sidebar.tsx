import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Chat } from "@/types";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

interface SidebarProps {
  currentChatId: number;
  onChatSelect: (chatId: number) => void;
  onNewChat: () => void;
}

export function Sidebar({ currentChatId, onChatSelect, onNewChat }: SidebarProps) {
  const queryClient = useQueryClient();
  
  // Fetch chat history
  const { data: chats, isLoading } = useQuery({
    queryKey: ['/api/chats'],
    queryFn: async () => {
      const response = await fetch('/api/chats');
      if (!response.ok) throw new Error('Failed to fetch chats');
      return response.json() as Promise<Chat[]>;
    }
  });

  // Delete chat mutation
  const deleteChatMutation = useMutation({
    mutationFn: async (chatId: number) => {
      return apiRequest('DELETE', `/api/chats/${chatId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/chats'] });
    }
  });

  const handleDeleteChat = async (chatId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this chat?')) {
      await deleteChatMutation.mutateAsync(chatId);
      
      // If we deleted the current chat, create a new one
      if (chatId === currentChatId) {
        onNewChat();
      }
    }
  };

  return (
    <div className="flex flex-col w-64 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      {/* App Logo/Title */}
      <div className="flex items-center h-16 px-4 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-xl font-semibold">LLM Compare</h1>
      </div>
      
      {/* Chat History */}
      <div className="flex flex-col flex-grow overflow-y-auto">
        <div className="flex-grow p-4">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Chat History</h2>
          
          {isLoading ? (
            // Loading skeleton
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center space-x-2">
                  <Skeleton className="h-8 w-full" />
                </div>
              ))}
            </div>
          ) : (
            // Chat list
            <div>
              {chats && chats.length > 0 ? (
                chats.map(chat => (
                  <button
                    key={chat.id}
                    className={`w-full text-left py-2 px-3 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 mb-1 text-sm truncate flex justify-between items-center ${
                      chat.id === currentChatId ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : ''
                    }`}
                    onClick={() => onChatSelect(chat.id)}
                  >
                    <span className="truncate flex-1">{chat.title}</span>
                    <span 
                      onClick={(e) => handleDeleteChat(chat.id, e)}
                      className="material-icons text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 opacity-0 group-hover:opacity-100"
                    >
                      delete
                    </span>
                  </button>
                ))
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">No chats yet</p>
              )}
            </div>
          )}
        </div>
        
        {/* New Chat Button */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <Button 
            variant="default" 
            className="w-full flex items-center justify-center"
            onClick={onNewChat}
          >
            <span className="material-icons text-sm mr-2">add</span>
            New Chat
          </Button>
        </div>
      </div>
    </div>
  );
}
