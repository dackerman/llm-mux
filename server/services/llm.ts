import { Response } from 'express';
import { LLMProvider, Turn } from '@shared/schema';
import { IStorage } from '../storage';
import { 
  generateLLMResponseFromTurns as generateLLMResponseFromTurnsRaw,
  streamLLMResponseFromTurns as streamLLMResponseFromTurnsRaw,
  ConversationMessage
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
   * @param chatId Chat ID to generate response for
   * @param branchId Branch ID for the conversation
   * @param parentTurnId Parent turn ID for the response
   * @param res Express Response object to stream to
   * @throws CustomError if streaming fails
   */
  async streamResponse(
    provider: LLMProvider,
    chatId: number,
    branchId: string,
    parentTurnId: string | null,
    res: Response
  ): Promise<void> {
    try {
      // Validate chat exists
      const chat = await this.storage.getChat(chatId);
      if (!chat) {
        throw new NotFoundError(`Chat with ID ${chatId} not found`);
      }

      // Get turn history for this branch
      const turns = await this.storage.getTurnsByBranch(chatId, branchId);
      
      // Stream the response
      await streamLLMResponseFromTurnsRaw(provider, turns, parentTurnId, res);
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