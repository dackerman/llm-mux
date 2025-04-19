import { Response } from 'express';
import { LLMProvider, Turn } from '@shared/schema';
import { IStorage } from '../storage';
import { 
  generateLLMResponseFromTurns as generateLLMResponseFromTurnsRaw,
  streamLLMResponseFromTurns as streamLLMResponseFromTurnsRaw,
  ConversationMessage,
  StreamCompletionHandler
} from '../llm';
import { CustomError, NotFoundError } from '../utils/errors';

/**
 * Service for handling LLM-related operations
 */
export class LLMService {
  constructor(private storage: IStorage) {}

  /**
   * Generate a response from a specific LLM provider using the Turn model
   * @param provider LLM provider to use
   * @param chatId Chat ID to generate response for
   * @param branchId Branch ID for the conversation
   * @param parentTurnId Parent turn ID for the response
   * @returns Promise resolving to the generated response content
   * @throws CustomError if generation fails
   */
  async generateResponse(
    provider: LLMProvider,
    chatId: number,
    branchId: string,
    parentTurnId: string | null
  ): Promise<string> {
    try {
      // Validate chat exists
      const chat = await this.storage.getChat(chatId);
      if (!chat) {
        throw new NotFoundError(`Chat with ID ${chatId} not found`);
      }

      // Get turn history for this branch
      const turns = await this.storage.getTurnsByBranch(chatId, branchId);
      
      // Generate the response
      const responseContent = await generateLLMResponseFromTurnsRaw(provider, turns, parentTurnId);
      return responseContent;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new CustomError(
        `Failed to generate response from ${provider} for chat ${chatId}`,
        500,
        error
      );
    }
  }

  /**
   * Stream a response from a specific LLM provider
   * @param provider LLM provider to use
   * @param prompt User's prompt content
   * @param apiKey API key for the provider
   * @param res Express Response object to stream to
   * @param conversationHistory Turn history for this conversation
   * @param contextWindowSize Maximum number of turns to include
   * @throws CustomError if streaming fails
   */
  async streamResponse(
    provider: LLMProvider,
    prompt: string,
    apiKey: string,
    res: Response,
    conversationHistory: Turn[] = [],
    contextWindowSize: number = 10,
    onChunk?: StreamCompletionHandler,
    onError?: (error: Error) => void,
    assistantTurnId?: string
  ): Promise<void> {
    try {
      // Stream the response using the raw function
      await streamLLMResponseFromTurnsRaw(
        provider,
        prompt,
        apiKey,
        res,
        conversationHistory,
        contextWindowSize,
        onChunk,
        onError,
        assistantTurnId
      );
    } catch (error) {
      throw new CustomError(
        `Failed to stream response from ${provider}`,
        500,
        error
      );
    }
  }
  
  /**
   * Stream a response for a specific chat and branch
   * @param provider LLM provider to use
   * @param chatId Chat ID to generate response for
   * @param branchId Branch ID for the conversation
   * @param parentTurnId Parent turn ID for the response
   * @param res Express Response object to stream to
   * @param onChunk Optional handler for each streamed chunk
   * @param onError Optional handler for errors
   * @param assistantTurnId Optional ID for the assistant turn
   * @throws CustomError if streaming fails
   */
  async streamResponseForChat(
    provider: LLMProvider,
    chatId: number,
    branchId: string,
    parentTurnId: string | null,
    res: Response,
    onChunk?: StreamCompletionHandler,
    onError?: (error: Error) => void,
    assistantTurnId?: string
  ): Promise<void> {
    try {
      // Validate chat exists
      const chat = await this.storage.getChat(chatId);
      if (!chat) {
        throw new NotFoundError(`Chat with ID ${chatId} not found`);
      }

      // Get turn history for this branch
      const turns = await this.storage.getTurnsByBranch(chatId, branchId);
      
      // Get the parent turn to extract the prompt
      const parentTurn = turns.find(t => t.id === parentTurnId);
      if (!parentTurn) {
        throw new NotFoundError(`Turn with ID ${parentTurnId} not found`);
      }
      
      // Get API key
      const apiKey = await this.storage.getApiKey(provider);
      if (!apiKey) {
        throw new CustomError(`API key for ${provider} is not set`, 400);
      }
      
      // Stream the response
      await this.streamResponse(
        provider,
        parentTurn.content,
        apiKey,
        res,
        turns,
        10,
        onChunk,
        onError,
        assistantTurnId
      );
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new CustomError(
        `Failed to stream response from ${provider} for chat ${chatId}`,
        500,
        error
      );
    }
  }

  /**
   * Check if an API key is set for a provider
   * @param provider LLM provider to check
   * @returns Promise resolving to boolean indicating if the key exists
   * @throws CustomError if check fails
   */
  async hasApiKey(provider: LLMProvider): Promise<boolean> {
    try {
      const apiKey = await this.storage.getApiKey(provider);
      return !!apiKey;
    } catch (error) {
      throw new CustomError(`Failed to check API key for ${provider}`, 500, error);
    }
  }

  /**
   * Set an API key for a provider
   * @param provider LLM provider to set key for
   * @param apiKey API key to set
   * @returns Promise resolving when key is set
   * @throws CustomError if setting fails
   */
  async setApiKey(provider: LLMProvider, apiKey: string): Promise<void> {
    try {
      await this.storage.setApiKey(provider, apiKey);
    } catch (error) {
      throw new CustomError(`Failed to set API key for ${provider}`, 500, error);
    }
  }
}