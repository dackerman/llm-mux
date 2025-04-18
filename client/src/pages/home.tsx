import { useState, useEffect } from "react";
import { LLMProvider, Message, Chat } from "@/types";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { LLMCard } from "@/components/llm-card";
import { ChatMessage, SystemMessage } from "@/components/chat-message";
import { InputArea } from "@/components/input-area";
import { SettingsModal } from "@/components/settings-modal";
import { Sidebar } from "@/components/sidebar";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { useTheme } from "@/hooks/use-theme";

export default function Home() {
  const [theme, setTheme] = useTheme();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedModels, setSelectedModels] = useLocalStorage<LLMProvider[]>('selectedModels', ['claude', 'gemini']);
  const [currentChatId, setCurrentChatId] = useState<number>(1);

  // API key status query
  const { data: apiKeyStatuses } = useQuery({
    queryKey: ['/api/api-keys'],
    queryFn: async () => {
      const providers: LLMProvider[] = ['claude', 'openai', 'gemini', 'grok'];
      
      const results = await Promise.all(
        providers.map(async (provider) => {
          try {
            const response = await fetch(`/api/api-keys/${provider}`);
            if (!response.ok) throw new Error('Failed to fetch API key status');
            return await response.json();
          } catch (error) {
            console.error(`Error fetching ${provider} API key status:`, error);
            return { provider, hasKey: false };
          }
        })
      );
      
      return results;
    }
  });

  // Create a new chat
  const createChatMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/chats', { title: 'New Conversation' });
    },
    onSuccess: (response) => {
      const newChat = response.json();
      setCurrentChatId(newChat.id);
      queryClient.invalidateQueries({ queryKey: ['/api/chats'] });
    }
  });

  const handleCreateNewChat = async () => {
    await createChatMutation.mutateAsync();
  };

  // Fetch current chat messages
  const { 
    data: messages, 
    isLoading: isLoadingMessages,
    refetch: refetchMessages 
  } = useQuery({
    queryKey: [`/api/chats/${currentChatId}/messages`],
    queryFn: async () => {
      const response = await fetch(`/api/chats/${currentChatId}/messages`);
      if (!response.ok) throw new Error('Failed to fetch messages');
      return response.json() as Promise<Message[]>;
    },
    enabled: !!currentChatId
  });

  // Check for API keys on initial load
  useEffect(() => {
    if (apiKeyStatuses) {
      const configuredProviders = apiKeyStatuses.filter(status => status.hasKey).map(status => status.provider);
      
      if (configuredProviders.length === 0) {
        setIsSettingsModalOpen(true);
        toast({
          title: "API Keys Required",
          description: "Please configure at least one API key to use the application.",
          variant: "destructive"
        });
      }
      
      // Update selected models based on available API keys
      setSelectedModels(prev => prev.filter(model => 
        configuredProviders.includes(model as LLMProvider)
      ));
    }
  }, [apiKeyStatuses]);

  const toggleModel = (provider: LLMProvider) => {
    if (!apiKeyStatuses) return;
    
    const providerStatus = apiKeyStatuses.find(status => status.provider === provider);
    
    if (!providerStatus?.hasKey) {
      toast({
        title: "API Key Required",
        description: `Please configure an API key for ${provider} in settings.`,
        variant: "destructive"
      });
      setIsSettingsModalOpen(true);
      return;
    }
    
    setSelectedModels(prev => {
      if (prev.includes(provider)) {
        return prev.filter(model => model !== provider);
      } else {
        return [...prev, provider];
      }
    });
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar (hidden on mobile) */}
      <div className="hidden md:flex md:flex-shrink-0">
        <Sidebar 
          currentChatId={currentChatId} 
          onChatSelect={setCurrentChatId} 
          onNewChat={handleCreateNewChat} 
        />
      </div>

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between h-16 px-4">
            {/* Mobile Toggle Sidebar */}
            <button 
              className="md:hidden text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            >
              <span className="material-icons">menu</span>
            </button>
            
            {/* Title (Mobile) */}
            <h1 className="md:hidden text-lg font-semibold">LLM Compare</h1>

            {/* Model Selection Label */}
            <h2 className="hidden md:block text-lg font-medium">Select LLM Models</h2>
            
            {/* Right Header Actions */}
            <div className="flex items-center space-x-3">
              {/* API Settings Button */}
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700"
                onClick={() => setIsSettingsModalOpen(true)}
              >
                <span className="material-icons">settings</span>
              </Button>
              
              {/* Theme Toggle */}
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700"
                onClick={toggleTheme}
              >
                <span className="material-icons dark:hidden">dark_mode</span>
                <span className="material-icons hidden dark:block">light_mode</span>
              </Button>
            </div>
          </div>
        </header>

        {/* Model Selector */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <LLMCard 
              provider="claude" 
              isSelected={selectedModels.includes('claude')} 
              onToggle={() => toggleModel('claude')} 
            />
            <LLMCard 
              provider="openai" 
              isSelected={selectedModels.includes('openai')} 
              onToggle={() => toggleModel('openai')} 
            />
            <LLMCard 
              provider="gemini" 
              isSelected={selectedModels.includes('gemini')} 
              onToggle={() => toggleModel('gemini')} 
            />
            <LLMCard 
              provider="grok" 
              isSelected={selectedModels.includes('grok')} 
              onToggle={() => toggleModel('grok')} 
            />
          </div>
        </div>

        {/* Chat Container */}
        <div className="flex-1 overflow-y-auto px-4 py-4 chat-container">
          <div className="max-w-3xl mx-auto">
            <div className="flex flex-col space-y-4 pb-20">
              {/* Welcome message if no messages */}
              {(!messages || messages.length === 0) && (
                <SystemMessage content="Welcome to LLM Compare! Select the AI models you want to use and ask a question to compare their responses." />
              )}

              {/* Display messages */}
              {messages && messages.map(message => (
                <ChatMessage key={message.id} message={message} />
              ))}
            </div>
          </div>
        </div>

        {/* Input Area */}
        <InputArea 
          chatId={currentChatId} 
          selectedModels={selectedModels} 
          onMessageSent={refetchMessages} 
          isDisabled={selectedModels.length === 0 || isLoadingMessages}
        />
      </div>

      {/* Settings Modal */}
      <SettingsModal 
        isOpen={isSettingsModalOpen} 
        onClose={() => setIsSettingsModalOpen(false)} 
      />
      
      {/* Mobile Sidebar (hidden by default) */}
      {isSidebarOpen && (
        <div className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-50">
          <div className="flex h-full">
            <div className="w-64 bg-white dark:bg-gray-800 h-full">
              <Sidebar 
                currentChatId={currentChatId} 
                onChatSelect={(id) => {
                  setCurrentChatId(id);
                  setIsSidebarOpen(false);
                }} 
                onNewChat={() => {
                  handleCreateNewChat();
                  setIsSidebarOpen(false);
                }} 
              />
            </div>
            <div 
              className="flex-1" 
              onClick={() => setIsSidebarOpen(false)}
            ></div>
          </div>
        </div>
      )}
    </div>
  );
}
