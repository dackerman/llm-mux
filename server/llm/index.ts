import { type LLMProvider, type Message, type Turn } from "@shared/schema";
import { generateAnthropicResponse, streamAnthropicResponse } from "./anthropic";
import { generateOpenAIResponse, streamOpenAIResponse } from "./openai";
import { generateGeminiResponse, streamGeminiResponse } from "./gemini";
import { generateXAIResponse, streamXAIResponse } from "./xai";
import { Response } from "express";

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

/**
 * Interface for streaming response handler
 */
export type StreamCompletionHandler = (chunk: string) => void;

/**
 * Generate a response from a specific LLM provider using legacy Message model
 * @deprecated Use generateLLMResponseFromTurns instead
 */
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
 * Generate a response from a specific LLM provider using the new Turn model
 * with support for branching conversations
 */
export async function generateLLMResponseFromTurns(
  provider: LLMProvider,
  prompt: string,
  apiKey: string,
  conversationHistory: Turn[] = [],
  contextWindowSize: number = DEFAULT_CONTEXT_WINDOW_SIZE
): Promise<string> {
  try {
    // Format conversation history into a standard format
    const formattedHistory = formatTurnsHistory(conversationHistory, contextWindowSize);
    
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
 * Format legacy conversation history for the specific provider
 * @deprecated Use formatTurnsHistory instead
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

/**
 * Format turns history into the conversation message format
 * This ensures we only include the most relevant turns within the context window
 */
function formatTurnsHistory(
  turns: Turn[],
  contextWindowSize: number
): ConversationMessage[] {
  if (!turns || turns.length === 0) {
    return [];
  }

  // Sort turns by timestamp (oldest first)
  const sortedTurns = [...turns].sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
  );
  
  // Limit to recent turns based on context window size
  const recentTurns = sortedTurns.slice(-contextWindowSize);
  
  // Convert to conversation format
  return recentTurns.map(turn => ({
    role: turn.role as 'user' | 'assistant',
    content: turn.content,
    modelId: turn.model as LLMProvider | null
  }));
}

/**
 * Stream a response from a specific LLM provider using the Turn model
 * with support for branching conversations
 */
export async function streamLLMResponseFromTurns(
  provider: LLMProvider,
  prompt: string,
  apiKey: string,
  res: Response,
  conversationHistory: Turn[] = [],
  contextWindowSize: number = DEFAULT_CONTEXT_WINDOW_SIZE
): Promise<void> {
  try {
    // Format conversation history into a standard format
    const formattedHistory = formatTurnsHistory(conversationHistory, contextWindowSize);
    
    // Add the current prompt
    const fullConversation: ConversationMessage[] = [
      ...formattedHistory,
      { role: 'user', content: prompt }
    ];
    
    // Set up SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });
    
    // Handler for streaming chunks
    const onChunk = (chunk: string) => {
      res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
    };
    
    // Handler for end of stream
    const onComplete = () => {
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    };
    
    // Error handler
    const onError = (error: Error) => {
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    };
    
    // Stream the response based on the provider
    switch (provider) {
      case "claude":
        await streamAnthropicResponse(prompt, apiKey, fullConversation, onChunk, onComplete, onError);
        break;
      case "openai":
        await streamOpenAIResponse(prompt, apiKey, fullConversation, onChunk, onComplete, onError);
        break;
      case "gemini":
        await streamGeminiResponse(prompt, apiKey, fullConversation, onChunk, onComplete, onError);
        break;
      case "grok":
        await streamXAIResponse(prompt, apiKey, fullConversation, onChunk, onComplete, onError);
        break;
      default:
        onError(new Error(`Unsupported LLM provider: ${provider}`));
    }
  } catch (error: any) {
    console.error(`Error streaming ${provider} response:`, error);
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
}
