/**
 * Test setup and utility functions
 * This file contains utilities for setting up tests
 * and mock implementations for common dependencies
 */

import { IStorage } from '../storage';
import { User, Chat, Message, Turn, ApiKey, InsertUser, InsertChat, InsertMessage, InsertTurn } from '@shared/schema';

/**
 * Mock storage implementation for testing
 * This implementation uses in-memory maps and can be reset between tests
 */
export class MockStorage implements IStorage {
  private users: Map<number, User>;
  private chats: Map<number, Chat>;
  private messages: Map<number, Message[]>;
  private turns: Map<number, Turn[]>;
  private apiKeys: Map<string, string>;
  
  private userId: number;
  private chatId: number;
  private messageId: number;
  
  constructor() {
    this.reset();
  }
  
  /**
   * Reset the storage to initial state
   * Call this between tests to ensure isolation
   */
  reset(): void {
    this.users = new Map();
    this.chats = new Map();
    this.messages = new Map();
    this.turns = new Map();
    this.apiKeys = new Map();
    
    this.userId = 1;
    this.chatId = 1;
    this.messageId = 1;
  }
  
  /**
   * Add test data to the storage
   * @param data Test data to add
   */
  addTestData(data: {
    users?: User[];
    chats?: Chat[];
    messages?: { chatId: number; messages: Message[] }[];
    turns?: { chatId: number; turns: Turn[] }[];
    apiKeys?: { provider: string; key: string }[];
  }): void {
    if (data.users) {
      for (const user of data.users) {
        this.users.set(user.id, user);
      }
    }
    
    if (data.chats) {
      for (const chat of data.chats) {
        this.chats.set(chat.id, chat);
      }
    }
    
    if (data.messages) {
      for (const { chatId, messages } of data.messages) {
        this.messages.set(chatId, messages);
      }
    }
    
    if (data.turns) {
      for (const { chatId, turns } of data.turns) {
        this.turns.set(chatId, turns);
      }
    }
    
    if (data.apiKeys) {
      for (const { provider, key } of data.apiKeys) {
        this.apiKeys.set(provider, key);
      }
    }
  }
  
  // IStorage interface implementation
  
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }
  
  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  
  // Chat methods
  async getChats(): Promise<Chat[]> {
    return Array.from(this.chats.values());
  }
  
  async getChat(id: number): Promise<Chat | undefined> {
    return this.chats.get(id);
  }
  
  async createChat(insertChat: InsertChat): Promise<Chat> {
    const id = this.chatId++;
    const createdAt = new Date();
    const chat: Chat = { ...insertChat, id, createdAt };
    this.chats.set(id, chat);
    return chat;
  }
  
  async updateChatTitle(id: number, title: string): Promise<Chat | undefined> {
    const chat = this.chats.get(id);
    if (!chat) return undefined;
    
    const updatedChat = { ...chat, title };
    this.chats.set(id, updatedChat);
    return updatedChat;
  }
  
  async deleteChat(id: number): Promise<boolean> {
    const deleted = this.chats.delete(id);
    this.messages.delete(id);
    this.turns.delete(id);
    return deleted;
  }
  
  // Message methods
  async getMessages(chatId: number): Promise<Message[]> {
    return this.messages.get(chatId) || [];
  }
  
  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = this.messageId++;
    const createdAt = new Date();
    const message: Message = { ...insertMessage, id, createdAt };
    
    const chatMessages = this.messages.get(message.chatId) || [];
    chatMessages.push(message);
    this.messages.set(message.chatId, chatMessages);
    
    return message;
  }
  
  // Turn methods
  async getTurns(chatId: number): Promise<Turn[]> {
    return this.turns.get(chatId) || [];
  }
  
  async getTurnsByBranch(chatId: number, branchId: string): Promise<Turn[]> {
    const chatTurns = this.turns.get(chatId) || [];
    
    if (branchId === 'root') {
      // For the root branch, return only root turns and one set of assistant responses
      const userTurns = chatTurns.filter(turn => turn.role === 'user' && turn.branchId === 'root');
      const result: Turn[] = [...userTurns];
      
      for (const userTurn of userTurns) {
        const responses = chatTurns.filter(turn => 
          turn.role === 'assistant' && turn.parentTurnId === userTurn.id
        );
        if (responses.length > 0) {
          const defaultResponse = responses.find(r => r.branchId === r.model) || responses[0];
          result.push(defaultResponse);
        }
      }
      
      return result;
    } else {
      // For a specific model branch, return only the root user turns and this model's responses
      return chatTurns.filter(turn => 
        turn.branchId === branchId || 
        (turn.branchId === 'root' && turn.role === 'user') ||
        (turn.role === 'assistant' && turn.model === branchId)
      );
    }
  }
  
  async createTurn(insertTurn: InsertTurn): Promise<Turn> {
    const timestamp = new Date();
    const turn: Turn = {
      ...insertTurn,
      id: insertTurn.id || crypto.randomUUID(),
      timestamp
    };
    
    const chatTurns = this.turns.get(turn.chatId) || [];
    chatTurns.push(turn);
    this.turns.set(turn.chatId, chatTurns);
    
    return turn;
  }
  
  async getLastUserTurn(chatId: number): Promise<Turn | undefined> {
    const chatTurns = this.turns.get(chatId) || [];
    return chatTurns
      .filter(turn => turn.role === 'user')
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
  }
  
  async getBranchTurns(chatId: number, branchId: string): Promise<Turn[]> {
    return this.getTurnsByBranch(chatId, branchId);
  }
  
  // API key methods
  async getApiKey(provider: string): Promise<string | undefined> {
    return this.apiKeys.get(provider);
  }
  
  async setApiKey(provider: string, apiKey: string): Promise<ApiKey> {
    this.apiKeys.set(provider, apiKey);
    return {
      id: 0,
      provider,
      apiKey
    };
  }
}