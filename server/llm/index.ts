import { type LLMProvider, type Message } from "@shared/schema";
import { generateAnthropicResponse } from "./anthropic";
import { generateOpenAIResponse } from "./openai";
import { generateGeminiResponse } from "./gemini";
import { generateXAIResponse } from "./xai";

/**
 * Interface for a conversation message in a chat history
 */
export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  modelId?: LLMProvider | null;
}

/**
 * Maximum number of messages to include in the conversation history
 * This can be adjusted or made configurable per provider if needed
 */
const DEFAULT_CONTEXT_WINDOW_SIZE = 10;

export async function generateLLMResponse(
  provider: LLMProvider,
  prompt: string,
  apiKey: string,
  conversationHistory: Message[] = [],
  contextWindowSize: number = DEFAULT_CONTEXT_WINDOW_SIZE
): Promise<string> {
  try {
    // Format conversation history into a standard format
    const formattedHistory = formatConversationHistory(conversationHistory, provider, contextWindowSize);
    
    // Add the current prompt
    const fullConversation: ConversationMessage[] = [
      ...formattedHistory,
      { role: 'user', content: prompt }
    ];
    
    switch (provider) {
      case "claude":
        return await generateAnthropicResponse(prompt, apiKey, fullConversation);
      case "openai":
        return await generateOpenAIResponse(prompt, apiKey, fullConversation);
      case "gemini":
        return await generateGeminiResponse(prompt, apiKey, fullConversation);
      case "grok":
        return await generateXAIResponse(prompt, apiKey, fullConversation);
      default:
        throw new Error(`Unsupported LLM provider: ${provider}`);
    }
  } catch (error) {
    console.error(`Error generating ${provider} response:`, error);
    throw error;
  }
}

/**
 * Format conversation history for the specific provider
 * This ensures we only include the most recent messages within the context window
 */
function formatConversationHistory(
  messages: Message[], 
  currentProvider: LLMProvider,
  contextWindowSize: number
): ConversationMessage[] {
  if (!messages || messages.length === 0) {
    return [];
  }

  // Sort messages by creation date (oldest first)
  const sortedMessages = [...messages].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
  
  // Limit to recent messages based on context window size
  const recentMessages = sortedMessages.slice(-contextWindowSize);
  
  // Convert to conversation format
  return recentMessages.map(msg => ({
    role: msg.role as 'user' | 'assistant',
    content: msg.content
  }));
}
