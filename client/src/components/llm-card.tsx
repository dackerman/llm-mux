import { useState } from "react";
import { LLMProvider, LLM_PROVIDERS } from "@/types";

interface LLMCardProps {
  provider: LLMProvider;
  isSelected: boolean;
  onToggle: () => void;
}

export function LLMCard({ provider, isSelected, onToggle }: LLMCardProps) {
  const config = LLM_PROVIDERS[provider];
  
  return (
    <div 
      className={`border rounded-lg p-3 flex flex-col items-center cursor-pointer hover:shadow-md transition ${
        isSelected 
          ? `bg-${provider}-50 dark:bg-${provider}-900/10 border-${provider}/30` 
          : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'
      }`}
      style={{
        backgroundColor: isSelected ? `${config.bgColor}` : '',
        borderColor: isSelected ? `${config.borderColor}` : ''
      }}
      onClick={onToggle}
    >
      <div 
        className="w-8 h-8 rounded-full flex items-center justify-center text-white mb-2"
        style={{ backgroundColor: config.color }}
      >
        <span className="material-icons text-sm">smart_toy</span>
      </div>
      <h3 
        className="font-medium text-sm"
        style={{ color: config.color }}
      >
        {config.name}
      </h3>
      <div className="mt-2 w-full flex items-center justify-center">
        {isSelected ? (
          <div 
            className="w-4 h-4 rounded-full flex items-center justify-center"
            style={{ backgroundColor: config.color }}
          >
            <span className="material-icons text-white text-[10px]">check</span>
          </div>
        ) : (
          <div className="w-4 h-4 rounded-full border border-gray-300 dark:border-gray-500"></div>
        )}
      </div>
    </div>
  );
}
