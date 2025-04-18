import { db } from './db';
import { IStorage } from './storage';
import { eq, desc, and, or, inArray } from 'drizzle-orm';
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
    // First delete all messages and turns associated with the chat
    await db.delete(messages).where(eq(messages.chatId, id));
    await db.delete(turns).where(eq(turns.chatId, id));
    
    // Then delete the chat
    const result = await db.delete(chats).where(eq(chats.id, id)).returning();
    return result.length > 0;
  }

  // Message management (Legacy)
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
  
  // Turn management (New branching conversation model)
  async getTurns(chatId: number): Promise<Turn[]> {
    return await db.select()
      .from(turns)
      .where(eq(turns.chatId, chatId))
      .orderBy(turns.timestamp);
  }

  async getTurnsByBranch(chatId: number, branchId: string): Promise<Turn[]> {
    return await db.select()
      .from(turns)
      .where(
        and(
          eq(turns.chatId, chatId),
          or(
            eq(turns.branchId, branchId),
            eq(turns.branchId, 'root')
          )
        )
      )
      .orderBy(turns.timestamp);
  }

  async createTurn(insertTurn: InsertTurn): Promise<Turn> {
    const result = await db.insert(turns).values({
      ...insertTurn,
      timestamp: new Date()
    }).returning();
    
    // If this is a user turn, update chat title for the first message
    if (insertTurn.role === 'user') {
      const userTurns = await db.select()
        .from(turns)
        .where(
          and(
            eq(turns.chatId, insertTurn.chatId),
            eq(turns.role, 'user')
          )
        );
      
      if (userTurns.length === 1) {
        const title = insertTurn.content.slice(0, 30) + (insertTurn.content.length > 30 ? '...' : '');
        await this.updateChatTitle(insertTurn.chatId, title);
      }
    }
    
    return result[0];
  }

  async getLastUserTurn(chatId: number): Promise<Turn | undefined> {
    const result = await db.select()
      .from(turns)
      .where(
        and(
          eq(turns.chatId, chatId),
          eq(turns.role, 'user')
        )
      )
      .orderBy(desc(turns.timestamp))
      .limit(1);
    
    return result[0];
  }

  async getBranchTurns(chatId: number, branchId: string): Promise<Turn[]> {
    // Get all turns from the specified chat
    const allTurnsForChat = await db.select()
      .from(turns)
      .where(eq(turns.chatId, chatId));
    
    // Filter in JavaScript rather than SQL for complex conditions
    const rootTurns = allTurnsForChat.filter(turn => turn.branchId === 'root');
    const rootTurnIds = rootTurns.map(turn => turn.id);
    
    // Get turns from the specific branch
    const branchTurns = allTurnsForChat.filter(turn => 
      turn.branchId === branchId || 
      (turn.role === 'assistant' && turn.parentTurnId && rootTurnIds.includes(turn.parentTurnId))
    );
    
    // Combine, deduplicate and sort
    const combinedTurns = [...rootTurns, ...branchTurns];
    const uniqueTurns = Array.from(
      new Map(combinedTurns.map(turn => [turn.id, turn])).values()
    );
    
    return uniqueTurns.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
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