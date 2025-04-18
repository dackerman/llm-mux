import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LLMCard } from "@/components/llm-card";
import { LLMProvider } from "@/types";
import { useToast } from "@/hooks/use-toast";

interface CompareModelsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCompare: (models: LLMProvider[]) => void;
  apiKeyStatuses: { provider: LLMProvider; hasKey: boolean }[] | undefined;
  availableModels: LLMProvider[];
}

export function CompareModelsDialog({
  isOpen,
  onClose,
  onCompare,
  apiKeyStatuses,
  availableModels
}: CompareModelsDialogProps) {
  const { toast } = useToast();
  const [selectedModels, setSelectedModels] = useState<LLMProvider[]>([]);

  // Reset selected models when dialog opens or available models change
  useEffect(() => {
    setSelectedModels([]);
  }, [isOpen, availableModels]);

  const toggleModel = (provider: LLMProvider) => {
    if (!apiKeyStatuses) return;
    
    const providerStatus = apiKeyStatuses.find(status => status.provider === provider);
    
    if (!providerStatus?.hasKey) {
      toast({
        title: "API Key Required",
        description: `Please configure an API key for ${provider} in settings.`,
        variant: "destructive"
      });
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

  const handleCompare = () => {
    if (selectedModels.length === 0) {
      toast({
        title: "No Models Selected",
        description: "Please select at least one model to compare.",
        variant: "destructive"
      });
      return;
    }
    
    onCompare(selectedModels);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Compare with Models</DialogTitle>
          <DialogDescription>
            Select the AI models you want to compare for this message.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-2 gap-3 py-4">
          {(['claude', 'openai', 'gemini', 'grok'] as LLMProvider[]).map(provider => (
            <LLMCard
              key={provider}
              provider={provider}
              isSelected={selectedModels.includes(provider)}
              onToggle={() => toggleModel(provider)}
            />
          ))}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button 
            onClick={handleCompare}
            disabled={selectedModels.length === 0}
          >
            Compare {selectedModels.length > 0 ? `(${selectedModels.length})` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}