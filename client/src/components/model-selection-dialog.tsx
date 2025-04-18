import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LLMProvider, LLM_PROVIDERS } from "@/types";
import { LLMCard } from "@/components/llm-card";
import { useToast } from "@/hooks/use-toast";

interface ModelSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  selectedModels: LLMProvider[];
  onModelsChange: (models: LLMProvider[]) => void;
  apiKeyStatuses: { provider: LLMProvider; hasKey: boolean }[] | undefined;
}

export function ModelSelectionDialog({ 
  isOpen, 
  onClose, 
  selectedModels, 
  onModelsChange,
  apiKeyStatuses 
}: ModelSelectionDialogProps) {
  const { toast } = useToast();
  const [tempSelectedModels, setTempSelectedModels] = useState<LLMProvider[]>([...selectedModels]);

  // Reset selection when dialog opens
  useEffect(() => {
    if (isOpen) {
      setTempSelectedModels([...selectedModels]);
    }
  }, [isOpen, selectedModels]);

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
    
    setTempSelectedModels(prev => {
      if (prev.includes(provider)) {
        return prev.filter(model => model !== provider);
      } else {
        return [...prev, provider];
      }
    });
  };

  const handleSave = () => {
    onModelsChange(tempSelectedModels);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Select Models</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <div className="grid grid-cols-2 gap-3">
            <LLMCard 
              provider="claude" 
              isSelected={tempSelectedModels.includes('claude')} 
              onToggle={() => toggleModel('claude')} 
            />
            <LLMCard 
              provider="openai" 
              isSelected={tempSelectedModels.includes('openai')} 
              onToggle={() => toggleModel('openai')} 
            />
            <LLMCard 
              provider="gemini" 
              isSelected={tempSelectedModels.includes('gemini')} 
              onToggle={() => toggleModel('gemini')} 
            />
            <LLMCard 
              provider="grok" 
              isSelected={tempSelectedModels.includes('grok')} 
              onToggle={() => toggleModel('grok')} 
            />
          </div>
        </div>
        <DialogFooter className="flex items-center justify-end space-x-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Apply Selection
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}