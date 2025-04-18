import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { LLMProvider, LLM_PROVIDERS } from "@/types";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [apiKeys, setApiKeys] = useState<Record<LLMProvider, string>>({
    claude: '',
    openai: '',
    gemini: '',
    grok: ''
  });

  // Fetch API key statuses
  const { data: apiKeyStatuses, isLoading } = useQuery({
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
    },
    enabled: isOpen
  });

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setApiKeys({
        claude: '',
        openai: '',
        gemini: '',
        grok: ''
      });
    }
  }, [isOpen]);

  // Save API key mutation
  const saveApiKeyMutation = useMutation({
    mutationFn: async ({ provider, apiKey }: { provider: LLMProvider, apiKey: string }) => {
      return apiRequest('POST', '/api/api-keys', { provider, apiKey });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/api-keys'] });
    }
  });

  const handleApiKeyChange = (provider: LLMProvider, value: string) => {
    setApiKeys(prev => ({
      ...prev,
      [provider]: value
    }));
  };

  const handleSave = async () => {
    // Only save keys that have been changed (not empty)
    const promises = Object.entries(apiKeys).map(async ([provider, apiKey]) => {
      if (apiKey.trim()) {
        try {
          await saveApiKeyMutation.mutateAsync({ 
            provider: provider as LLMProvider, 
            apiKey: apiKey.trim() 
          });
          return { provider, success: true };
        } catch (error) {
          console.error(`Failed to save ${provider} API key:`, error);
          return { provider, success: false };
        }
      }
      return { provider, success: true, skipped: true };
    });

    const results = await Promise.all(promises);
    const failures = results.filter(r => !r.success);

    if (failures.length > 0) {
      toast({
        title: "Error saving API keys",
        description: `Failed to save ${failures.map(f => LLM_PROVIDERS[f.provider as LLMProvider].name).join(', ')} API keys.`,
        variant: "destructive"
      });
    } else {
      toast({
        title: "API keys saved",
        description: "Your API keys have been saved successfully."
      });
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>API Settings</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4 max-h-[70vh] overflow-y-auto">
          {Object.entries(LLM_PROVIDERS).map(([providerId, config]) => {
            const provider = providerId as LLMProvider;
            const hasKey = apiKeyStatuses?.find(s => s.provider === provider)?.hasKey || false;
            
            return (
              <div key={provider} className="space-y-2">
                <Label className="block text-sm font-medium">
                  <div className="flex items-center">
                    <div 
                      className="w-6 h-6 rounded-full flex items-center justify-center text-white mr-2"
                      style={{ backgroundColor: config.color }}
                    >
                      <span className="material-icons text-xs">smart_toy</span>
                    </div>
                    {config.name} API Key
                    {hasKey && (
                      <span className="ml-2 text-xs text-green-500">(Configured)</span>
                    )}
                  </div>
                </Label>
                <Input
                  type="password"
                  placeholder={`Enter your ${config.name} API key`}
                  value={apiKeys[provider]}
                  onChange={(e) => handleApiKeyChange(provider, e.target.value)}
                />
              </div>
            );
          })}
        </div>
        <DialogFooter className="flex items-center justify-end space-x-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saveApiKeyMutation.isPending}>
            {saveApiKeyMutation.isPending ? "Saving..." : "Save Settings"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
