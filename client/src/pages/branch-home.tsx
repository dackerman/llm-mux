import { useState, useEffect } from "react";
import { LLMProvider, Turn, Branch } from "@/types";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { TurnMessage, TurnSystemMessage } from "@/components/turn-message";
import { BranchInputArea } from "@/components/branch-input-area";
import { SettingsModal } from "@/components/settings-modal";
import { ModelSelectionDialog } from "@/components/model-selection-dialog";
import { CompareModelsDialog } from "@/components/compare-models-dialog";
import { Sidebar } from "@/components/sidebar";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { useTheme } from "@/hooks/use-theme";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function BranchHome() {
  const [theme, setTheme] = useTheme();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isModelSelectionOpen, setIsModelSelectionOpen] = useState(false);
  const [isCompareDialogOpen, setIsCompareDialogOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentUserTurnId, setCurrentUserTurnId] = useState<string | null>(null);
  const [selectedModels, setSelectedModels] = useLocalStorage<LLMProvider[]>('selectedModels', ['claude', 'gemini']);
  const [currentChatId, setCurrentChatId] = useState<number>(1);
  const [currentBranchId, setCurrentBranchId] = useState<string>('root');
  const [branches, setBranches] = useState<Branch[]>([
    { id: 'root', provider: null, isCurrent: true }
  ]);

  // Get all chats
  const { data: chats } = useQuery({
    queryKey: ['/api/chats'],
    queryFn: async () => {
      const response = await fetch('/api/chats');
      if (!response.ok) throw new Error('Failed to fetch chats');
      return response.json();
    }
  });

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
    onSuccess: async (response) => {
      const newChat = await response.json();
      setCurrentChatId(newChat.id);
      setCurrentBranchId('root');
      queryClient.invalidateQueries({ queryKey: ['/api/chats'] });
    }
  });

  const handleCreateNewChat = async () => {
    await createChatMutation.mutateAsync();
  };

  // Fetch all turns for the current chat
  const { 
    data: allTurns, 
    isLoading: isLoadingAllTurns,
    refetch: refetchAllTurns 
  } = useQuery({
    queryKey: [`/api/chats/${currentChatId}/turns`],
    queryFn: async () => {
      const response = await fetch(`/api/chats/${currentChatId}/turns`);
      if (!response.ok) throw new Error('Failed to fetch turns');
      return response.json() as Promise<Turn[]>;
    },
    enabled: !!currentChatId
  });

  // Fetch turns for the current branch
  const { 
    data: branchTurns, 
    isLoading: isLoadingBranchTurns,
    refetch: refetchBranchTurns 
  } = useQuery({
    queryKey: [`/api/chats/${currentChatId}/branches/${currentBranchId}`],
    queryFn: async () => {
      const response = await fetch(`/api/chats/${currentChatId}/branches/${currentBranchId}`);
      if (!response.ok) throw new Error('Failed to fetch branch turns');
      return response.json() as Promise<Turn[]>;
    },
    enabled: !!currentChatId && !!currentBranchId
  });

  // Compare models mutation
  const compareModelsMutation = useMutation({
    mutationFn: async ({ turnId, models }: { turnId: string, models: LLMProvider[] }) => {
      return apiRequest('POST', `/api/chats/${currentChatId}/compare`, {
        userTurnId: turnId,
        selectedModels: models
      });
    },
    onSuccess: async () => {
      // Invalidate cached turns to reflect new messages
      refetchAllTurns();
      refetchBranchTurns();
      toast({
        title: "Comparison Complete",
        description: "Multiple model responses have been generated for your message.",
      });
    }
  });

  // Check for API keys on initial load and ensure we have a chat
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

  // Create a default chat if none exist
  useEffect(() => {
    if (chats && chats.length === 0) {
      // No chats exist, create one
      handleCreateNewChat();
    } else if (chats && chats.length > 0) {
      // Use the most recent chat
      setCurrentChatId(chats[0].id);
    }
  }, [chats]);

  // Update branches based on turns data
  useEffect(() => {
    if (allTurns) {
      // Extract unique branch IDs from turns
      const branchMap = new Map<string, LLMProvider | null>();
      
      // First, add the root branch
      branchMap.set('root', null);
      
      // Then add model-specific branches
      allTurns.forEach(turn => {
        if (turn.role === 'assistant' && turn.branchId !== 'root') {
          branchMap.set(turn.branchId, turn.model);
        }
      });
      
      // Convert to branch objects array
      const branchArray: Branch[] = Array.from(branchMap.entries()).map(([id, provider]) => ({
        id,
        provider,
        isCurrent: id === currentBranchId
      }));
      
      setBranches(branchArray);
    }
  }, [allTurns, currentBranchId]);

  // Get the latest user turn for the "Compare with..." feature
  const latestUserTurn = branchTurns?.filter(turn => turn.role === 'user')
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

  // Group assistant turns by parent turn ID for multi-model responses
  const groupedTurns: Record<string, Turn[]> = {};
  branchTurns?.forEach(turn => {
    if (turn.role === 'assistant' && turn.parentTurnId) {
      if (!groupedTurns[turn.parentTurnId]) {
        groupedTurns[turn.parentTurnId] = [];
      }
      groupedTurns[turn.parentTurnId].push(turn);
    }
  });

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

  const handleContinueWithBranch = (branchId: string) => {
    setCurrentBranchId(branchId);
    // Clear any in-progress comparison
    setCurrentUserTurnId(null);
  };

  const handleCompareWithModels = (turnId: string) => {
    setCurrentUserTurnId(turnId);
    setIsCompareDialogOpen(true);
  };

  const handleCompareSubmit = (models: LLMProvider[]) => {
    if (currentUserTurnId) {
      compareModelsMutation.mutate({ 
        turnId: currentUserTurnId, 
        models
      });
    }
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
            
            {/* Title and Branch Info */}
            <div className="flex items-center">
              <h1 className="text-lg font-semibold mr-2">Hatch</h1>
              
              {/* Models Button */}
              <Button
                variant="outline"
                onClick={() => setIsModelSelectionOpen(true)}
                className="flex items-center space-x-1"
              >
                <span className="material-icons text-sm">smart_toy</span>
                <span>Models ({selectedModels.length})</span>
              </Button>
              
              {/* Branch Selector (if branches > 1) */}
              {branches.length > 1 && (
                <div className="ml-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      // Trigger a branch selection modal or dropdown
                      // For simplicity, just toggle back to root for now
                      setCurrentBranchId('root');
                    }}
                    className="flex items-center space-x-1"
                  >
                    <span className="material-icons text-sm">fork_right</span>
                    <span>{branches.find(b => b.id === currentBranchId)?.provider || 'Main'}</span>
                  </Button>
                </div>
              )}
            </div>
            
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

        {/* Chat Container */}
        <div className="flex-1 overflow-y-auto px-4 py-4 chat-container">
          <div className="max-w-3xl mx-auto">
            <div className="flex flex-col space-y-4 pb-20">
              {/* Welcome message if no turns */}
              {(!branchTurns || branchTurns.length === 0) && (
                <TurnSystemMessage content="Welcome to Hatch! Select the AI models you want to use and ask a question to compare their responses." />
              )}

              {/* Display turns */}
              {branchTurns && branchTurns.map(turn => {
                // Skip assistant turns as they'll be handled with their parent user turn
                if (turn.role === 'assistant') return null;
                
                // For user turns
                if (turn.role === 'user') {
                  const isLatestUserTurn = turn.id === latestUserTurn?.id;
                  const assistantResponses = groupedTurns[turn.id] || [];
                  
                  return (
                    <div key={turn.id} className="space-y-4">
                      {/* User message */}
                      <TurnMessage
                        turn={turn}
                        isLatestUserTurn={isLatestUserTurn}
                        onCompareWithModels={handleCompareWithModels}
                      />
                      
                      {/* Assistant responses - either as a single message or grouped for comparison */}
                      {assistantResponses.length === 1 ? (
                        <TurnMessage
                          turn={assistantResponses[0]}
                          onContinueWithBranch={
                            // Only allow continuing with branches in this branch is not default
                            currentBranchId === 'root' && assistantResponses[0].branchId !== 'root' 
                              ? handleContinueWithBranch 
                              : undefined
                          }
                        />
                      ) : assistantResponses.length > 1 ? (
                        <TurnMessage
                          turn={assistantResponses[0]} // Use any turn as the base
                          branches={assistantResponses}
                          onContinueWithBranch={handleContinueWithBranch}
                        />
                      ) : null}
                    </div>
                  );
                }
                
                return null;
              })}
            </div>
          </div>
        </div>

        {/* Input Area */}
        <BranchInputArea 
          chatId={currentChatId}
          branchId={currentBranchId}
          parentTurnId={latestUserTurn?.id}
          selectedModels={selectedModels} 
          onMessageSent={() => {
            refetchAllTurns();
            refetchBranchTurns();
          }} 
          isDisabled={selectedModels.length === 0 || isLoadingBranchTurns}
        />
      </div>

      {/* Settings Modal */}
      <SettingsModal 
        isOpen={isSettingsModalOpen} 
        onClose={() => setIsSettingsModalOpen(false)} 
      />
      
      {/* Model Selection Dialog */}
      <ModelSelectionDialog
        isOpen={isModelSelectionOpen}
        onClose={() => setIsModelSelectionOpen(false)}
        selectedModels={selectedModels}
        onModelsChange={setSelectedModels}
        apiKeyStatuses={apiKeyStatuses}
      />
      
      {/* Compare Models Dialog */}
      <CompareModelsDialog
        isOpen={isCompareDialogOpen}
        onClose={() => setIsCompareDialogOpen(false)}
        onCompare={handleCompareSubmit}
        apiKeyStatuses={apiKeyStatuses}
        availableModels={['claude', 'openai', 'gemini', 'grok']}
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