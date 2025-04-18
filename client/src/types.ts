export type LLMProvider = 'claude' | 'openai' | 'gemini' | 'grok';

export interface Chat {
  id: number;
  title: string;
  createdAt: string;
}

// Legacy Message interface
export interface Message {
  id: number;
  chatId: number;
  content: string;
  role: 'user' | 'assistant';
  modelId: LLMProvider | null;
  createdAt: string;
}

// New Turn interface for branching conversations
export interface Turn {
  id: string;
  chatId: number;
  parentTurnId: string | null;
  branchId: string;
  role: 'user' | 'assistant';
  model: LLMProvider | null;
  content: string;
  timestamp: string;
}

// Branch model represents a conversation path
export interface Branch {
  id: string;
  provider: LLMProvider | null;
  isCurrent: boolean;
}

export interface ApiKeyStatus {
  provider: LLMProvider;
  hasKey: boolean;
}

export interface LLMProviderConfig {
  id: LLMProvider;
  name: string;
  color: string;
  bgColor: string;
  darkBgColor: string;
  borderColor: string;
}

export const LLM_PROVIDERS: Record<LLMProvider, LLMProviderConfig> = {
  claude: {
    id: 'claude',
    name: 'Claude',
    color: 'rgb(140, 98, 245)',
    bgColor: 'rgb(238, 232, 255)',
    darkBgColor: 'rgba(140, 98, 245, 0.1)',
    borderColor: 'rgba(140, 98, 245, 0.3)'
  },
  openai: {
    id: 'openai',
    name: 'OpenAI',
    color: 'rgb(116, 170, 156)',
    bgColor: 'rgb(232, 243, 241)',
    darkBgColor: 'rgba(116, 170, 156, 0.1)',
    borderColor: 'rgba(116, 170, 156, 0.3)'
  },
  gemini: {
    id: 'gemini',
    name: 'Gemini',
    color: 'rgb(66, 133, 244)',
    bgColor: 'rgb(232, 241, 255)',
    darkBgColor: 'rgba(66, 133, 244, 0.1)',
    borderColor: 'rgba(66, 133, 244, 0.3)'
  },
  grok: {
    id: 'grok',
    name: 'Grok',
    color: 'rgb(225, 48, 108)',
    bgColor: 'rgb(255, 232, 240)',
    darkBgColor: 'rgba(225, 48, 108, 0.1)',
    borderColor: 'rgba(225, 48, 108, 0.3)'
  }
};
