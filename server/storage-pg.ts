import { db } from './db';
import { IStorage } from './storage';
import { eq, desc, and, or } from 'drizzle-orm';
import {
  User, InsertUser,
  Chat, InsertChat,
  Message, InsertMessage,
  ApiKey, InsertApiKey,
  Turn, InsertTurn,
  users, chats, messages, apiKeys, turns
} from '@shared/schema';

export class PostgresStorage implements IStorage {
  // User management
  async getUser(id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }

  // Chat management
  async getChats(): Promise<Chat[]> {
    return await db.select().from(chats).orderBy(chats.createdAt);
  }

  async getChat(id: number): Promise<Chat | undefined> {
    const result = await db.select().from(chats).where(eq(chats.id, id)).limit(1);
    return result[0];
  }

  async createChat(insertChat: InsertChat): Promise<Chat> {
    const result = await db.insert(chats).values({
      ...insertChat,
      createdAt: new Date()
    }).returning();
    return result[0];
  }

  async updateChatTitle(id: number, title: string): Promise<Chat | undefined> {
    const result = await db.update(chats)
      .set({ title })
      .where(eq(chats.id, id))
      .returning();
    return result[0];
  }

  async deleteChat(id: number): Promise<boolean> {
    // First delete all messages associated with the chat
    await db.delete(messages).where(eq(messages.chatId, id));
    
    // Then delete the chat
    const result = await db.delete(chats).where(eq(chats.id, id)).returning();
    return result.length > 0;
  }

  // Message management
  async getMessages(chatId: number): Promise<Message[]> {
    return await db.select()
      .from(messages)
      .where(eq(messages.chatId, chatId))
      .orderBy(messages.createdAt);
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const result = await db.insert(messages).values({
      ...insertMessage,
      createdAt: new Date()
    }).returning();
    return result[0];
  }

  // API key management
  async getApiKey(provider: string): Promise<string | undefined> {
    const result = await db.select()
      .from(apiKeys)
      .where(eq(apiKeys.provider, provider))
      .limit(1);
    
    return result[0]?.apiKey;
  }

  async setApiKey(provider: string, apiKey: string): Promise<ApiKey> {
    // First try to update
    const updateResult = await db.update(apiKeys)
      .set({ apiKey })
      .where(eq(apiKeys.provider, provider))
      .returning();
    
    if (updateResult.length > 0) {
      return updateResult[0];
    }
    
    // If no rows were updated, insert a new row
    const insertResult = await db.insert(apiKeys)
      .values({ provider, apiKey })
      .returning();
    
    return insertResult[0];
  }
}