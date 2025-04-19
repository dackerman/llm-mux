/**
 * Unit tests for ChatService
 */

import { ChatService } from '../services/chat';
import { MockStorage } from './setup';
import { NotFoundError } from '../utils/errors';

describe('ChatService', () => {
  // Test setup
  let mockStorage: MockStorage;
  let chatService: ChatService;
  
  beforeEach(() => {
    // Reset mock storage and create fresh chat service instance before each test
    mockStorage = new MockStorage();
    chatService = new ChatService(mockStorage);
  });
  
  describe('getChats', () => {
    it('should return all chats', async () => {
      // Setup test data
      mockStorage.addTestData({
        chats: [
          { id: 1, title: 'Chat 1', createdAt: new Date() },
          { id: 2, title: 'Chat 2', createdAt: new Date() }
        ]
      });
      
      // Execute test
      const chats = await chatService.getChats();
      
      // Verify results
      expect(chats).toHaveLength(2);
      expect(chats[0].title).toBe('Chat 1');
      expect(chats[1].title).toBe('Chat 2');
    });
    
    it('should return empty array when no chats exist', async () => {
      // Execute test
      const chats = await chatService.getChats();
      
      // Verify results
      expect(chats).toHaveLength(0);
    });
  });
  
  describe('getChat', () => {
    it('should return chat by ID', async () => {
      // Setup test data
      mockStorage.addTestData({
        chats: [
          { id: 1, title: 'Chat 1', createdAt: new Date() }
        ]
      });
      
      // Execute test
      const chat = await chatService.getChat(1);
      
      // Verify results
      expect(chat).toBeDefined();
      expect(chat!.id).toBe(1);
      expect(chat!.title).toBe('Chat 1');
    });
    
    it('should throw NotFoundError when chat does not exist', async () => {
      // Execute test & verify results
      await expect(chatService.getChat(999)).rejects.toThrow(NotFoundError);
    });
  });
  
  describe('createChat', () => {
    it('should create a new chat', async () => {
      // Execute test
      const chat = await chatService.createChat({ title: 'New Chat' });
      
      // Verify results
      expect(chat).toBeDefined();
      expect(chat.id).toBe(1);
      expect(chat.title).toBe('New Chat');
      
      // Verify chat was stored
      const storedChat = await mockStorage.getChat(1);
      expect(storedChat).toBeDefined();
      expect(storedChat!.title).toBe('New Chat');
    });
  });
  
  describe('deleteChat', () => {
    it('should delete an existing chat', async () => {
      // Setup test data
      mockStorage.addTestData({
        chats: [
          { id: 1, title: 'Chat 1', createdAt: new Date() }
        ]
      });
      
      // Execute test
      const result = await chatService.deleteChat(1);
      
      // Verify results
      expect(result).toBe(true);
      
      // Verify chat was removed
      await expect(chatService.getChat(1)).rejects.toThrow(NotFoundError);
    });
    
    it('should throw NotFoundError when trying to delete non-existent chat', async () => {
      // Execute test & verify results
      await expect(chatService.deleteChat(999)).rejects.toThrow(NotFoundError);
    });
  });
  
  describe('updateChatTitle', () => {
    it('should update chat title', async () => {
      // Setup test data
      mockStorage.addTestData({
        chats: [
          { id: 1, title: 'Chat 1', createdAt: new Date() }
        ]
      });
      
      // Execute test
      const updatedChat = await chatService.updateChatTitle(1, 'Updated Title');
      
      // Verify results
      expect(updatedChat).toBeDefined();
      expect(updatedChat!.id).toBe(1);
      expect(updatedChat!.title).toBe('Updated Title');
      
      // Verify chat was updated in storage
      const storedChat = await mockStorage.getChat(1);
      expect(storedChat).toBeDefined();
      expect(storedChat!.title).toBe('Updated Title');
    });
    
    it('should throw NotFoundError when trying to update non-existent chat', async () => {
      // Execute test & verify results
      await expect(chatService.updateChatTitle(999, 'New Title')).rejects.toThrow(NotFoundError);
    });
  });
});