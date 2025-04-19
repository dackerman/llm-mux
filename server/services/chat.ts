import { IStorage } from '../storage';
import { Chat, InsertChat, Turn, InsertTurn } from '@shared/schema';
import { CustomError, NotFoundError } from '../utils/errors';

/**
 * Service for handling chat-related operations
 */
export class ChatService {
  constructor(private storage: IStorage) {}

  /**
   * Get all chats
   * @returns Promise resolving to array of chats
   * @throws CustomError if retrieval fails
   */
  async getChats(): Promise<Chat[]> {
    try {
      return await this.storage.getChats();
    } catch (error) {
      throw new CustomError('Failed to fetch chats', 500, error);
    }
  }

  /**
   * Get a specific chat by ID
   * @param id Chat ID to retrieve
   * @returns Promise resolving to the chat or undefined if not found
   * @throws CustomError if retrieval fails
   */
  async getChat(id: number): Promise<Chat> {
    try {
      const chat = await this.storage.getChat(id);
      if (!chat) {
        throw new NotFoundError(`Chat with ID ${id} not found`);
      }
      return chat;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new CustomError(`Failed to fetch chat with ID ${id}`, 500, error);
    }
  }

  /**
   * Create a new chat
   * @param chatData Data for the new chat
   * @returns Promise resolving to the created chat
   * @throws CustomError if creation fails
   */
  async createChat(chatData: InsertChat): Promise<Chat> {
    try {
      return await this.storage.createChat(chatData);
    } catch (error) {
      throw new CustomError('Failed to create chat', 500, error);
    }
  }

  /**
   * Delete a chat by ID
   * @param id Chat ID to delete
   * @returns Promise resolving to boolean indicating success
   * @throws NotFoundError if chat doesn't exist
   * @throws CustomError for other errors
   */
  async deleteChat(id: number): Promise<boolean> {
    try {
      const chat = await this.storage.getChat(id);
      if (!chat) {
        throw new NotFoundError(`Chat with ID ${id} not found`);
      }
      
      const success = await this.storage.deleteChat(id);
      return success;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new CustomError(`Failed to delete chat with ID ${id}`, 500, error);
    }
  }

  /**
   * Update a chat's title
   * @param id Chat ID to update
   * @param title New title for the chat
   * @returns Promise resolving to the updated chat
   * @throws NotFoundError if chat doesn't exist
   * @throws CustomError for other errors
   */
  async updateChatTitle(id: number, title: string): Promise<Chat> {
    try {
      const chat = await this.storage.getChat(id);
      if (!chat) {
        throw new NotFoundError(`Chat with ID ${id} not found`);
      }
      
      const updatedChat = await this.storage.updateChatTitle(id, title);
      if (!updatedChat) {
        throw new CustomError(`Failed to update chat with ID ${id}`, 500);
      }
      
      return updatedChat;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new CustomError(`Failed to update chat with ID ${id}`, 500, error);
    }
  }

  /**
   * Get all turns for a chat
   * @param chatId Chat ID to retrieve turns for
   * @returns Promise resolving to array of turns
   * @throws CustomError if retrieval fails
   */
  async getTurns(chatId: number): Promise<Turn[]> {
    try {
      const chat = await this.storage.getChat(chatId);
      if (!chat) {
        throw new NotFoundError(`Chat with ID ${chatId} not found`);
      }
      
      return await this.storage.getTurns(chatId);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new CustomError(`Failed to fetch turns for chat ID ${chatId}`, 500, error);
    }
  }

  /**
   * Get turns for a specific branch
   * @param chatId Chat ID to retrieve turns for
   * @param branchId Branch ID to filter by
   * @returns Promise resolving to array of turns
   * @throws CustomError if retrieval fails
   */
  async getTurnsByBranch(chatId: number, branchId: string): Promise<Turn[]> {
    try {
      const chat = await this.storage.getChat(chatId);
      if (!chat) {
        throw new NotFoundError(`Chat with ID ${chatId} not found`);
      }
      
      return await this.storage.getTurnsByBranch(chatId, branchId);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new CustomError(
        `Failed to fetch turns for chat ID ${chatId} and branch ${branchId}`, 
        500, 
        error
      );
    }
  }

  /**
   * Create a new turn
   * @param turnData Data for the new turn
   * @returns Promise resolving to the created turn
   * @throws CustomError if creation fails
   */
  async createTurn(turnData: InsertTurn): Promise<Turn> {
    try {
      const chat = await this.storage.getChat(turnData.chatId);
      if (!chat) {
        throw new NotFoundError(`Chat with ID ${turnData.chatId} not found`);
      }
      
      return await this.storage.createTurn(turnData);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new CustomError('Failed to create turn', 500, error);
    }
  }

  /**
   * Get the most recent user turn for a chat
   * @param chatId Chat ID to retrieve the last user turn for
   * @returns Promise resolving to the last user turn or undefined if none exists
   * @throws CustomError if retrieval fails
   */
  async getLastUserTurn(chatId: number): Promise<Turn | undefined> {
    try {
      const chat = await this.storage.getChat(chatId);
      if (!chat) {
        throw new NotFoundError(`Chat with ID ${chatId} not found`);
      }
      
      return await this.storage.getLastUserTurn(chatId);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new CustomError(`Failed to fetch last user turn for chat ID ${chatId}`, 500, error);
    }
  }
}