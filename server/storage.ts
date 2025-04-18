import { 
  users, 
  type User, 
  type InsertUser, 
  chats, 
  messages, 
  apiKeys,
  turns,
  type Chat, 
  type InsertChat, 
  type Message, 
  type InsertMessage,
  type ApiKey,
  type InsertApiKey,
  type LLMProvider,
  type Turn,
  type InsertTurn
} from "@shared/schema";

export interface IStorage {
  // User management
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Chat management
  getChats(): Promise<Chat[]>;
  getChat(id: number): Promise<Chat | undefined>;
  createChat(chat: InsertChat): Promise<Chat>;
  updateChatTitle(id: number, title: string): Promise<Chat | undefined>;
  deleteChat(id: number): Promise<boolean>;
  
  // Legacy Message management
  getMessages(chatId: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  
  // Turn management (for branching conversation model)
  getTurns(chatId: number): Promise<Turn[]>;
  getTurnsByBranch(chatId: number, branchId: string): Promise<Turn[]>;
  createTurn(turn: InsertTurn): Promise<Turn>;
  getLastUserTurn(chatId: number): Promise<Turn | undefined>;
  getBranchTurns(chatId: number, branchId: string): Promise<Turn[]>;
  
  // API key management
  getApiKey(provider: string): Promise<string | undefined>;
  setApiKey(provider: string, apiKey: string): Promise<ApiKey>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private chats: Map<number, Chat>;
  private messages: Map<number, Message[]>;
  private turns: Map<number, Turn[]>; // Indexed by chatId
  private apiKeys: Map<string, string>;
  currentUserId: number;
  currentChatId: number;
  currentMessageId: number;

  constructor() {
    this.users = new Map();
    this.chats = new Map();
    this.messages = new Map();
    this.turns = new Map();
    this.apiKeys = new Map();
    this.currentUserId = 1;
    this.currentChatId = 1;
    this.currentMessageId = 1;
    
    // Initialize with a default chat
    const defaultChat: Chat = {
      id: this.currentChatId,
      title: "New Conversation",
      createdAt: new Date(),
    };
    this.chats.set(defaultChat.id, defaultChat);
    this.messages.set(defaultChat.id, []);
    this.turns.set(defaultChat.id, []);

    // Set sample API keys (These are invalid and will be replaced by environment variables)
    this.apiKeys.set('claude', process.env.ANTHROPIC_API_KEY || '');
    this.apiKeys.set('openai', process.env.OPENAI_API_KEY || '');
    this.apiKeys.set('gemini', process.env.GEMINI_API_KEY || '');
    this.apiKeys.set('grok', process.env.XAI_API_KEY || '');
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Chat methods
  async getChats(): Promise<Chat[]> {
    return Array.from(this.chats.values()).sort((a, b) => 
      b.createdAt.getTime() - a.createdAt.getTime()
    );
  }

  async getChat(id: number): Promise<Chat | undefined> {
    return this.chats.get(id);
  }

  async createChat(insertChat: InsertChat): Promise<Chat> {
    const id = this.currentChatId++;
    const chat: Chat = { 
      ...insertChat, 
      id, 
      createdAt: new Date() 
    };
    this.chats.set(id, chat);
    this.messages.set(id, []);
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
    if (!this.chats.has(id)) return false;
    
    this.chats.delete(id);
    this.messages.delete(id);
    this.turns.delete(id);
    return true;
  }

  // Message methods (Legacy)
  async getMessages(chatId: number): Promise<Message[]> {
    return this.messages.get(chatId) || [];
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const chatId = insertMessage.chatId;
    if (!this.messages.has(chatId)) {
      this.messages.set(chatId, []);
    }
    
    const id = this.currentMessageId++;
    const message: Message = {
      ...insertMessage,
      id,
      createdAt: new Date(),
      modelId: insertMessage.modelId || null
    };
    
    const chatMessages = this.messages.get(chatId) || [];
    chatMessages.push(message);
    this.messages.set(chatId, chatMessages);
    
    // Update chat title if this is the first user message
    if (message.role === 'user' && chatMessages.filter(m => m.role === 'user').length === 1) {
      const title = message.content.slice(0, 30) + (message.content.length > 30 ? '...' : '');
      this.updateChatTitle(chatId, title);
    }
    
    return message;
  }

  // Turn methods (New branching conversation model)
  async getTurns(chatId: number): Promise<Turn[]> {
    return this.turns.get(chatId) || [];
  }

  async getTurnsByBranch(chatId: number, branchId: string): Promise<Turn[]> {
    const chatTurns = this.turns.get(chatId) || [];
    return chatTurns.filter(turn => turn.branchId === branchId || turn.branchId === 'root');
  }

  async createTurn(insertTurn: InsertTurn): Promise<Turn> {
    const chatId = insertTurn.chatId;
    if (!this.turns.has(chatId)) {
      this.turns.set(chatId, []);
    }

    // Generate a UUID for the new turn
    const id = crypto.randomUUID();
    
    const turn: Turn = {
      ...insertTurn,
      id,
      timestamp: new Date(),
      parentTurnId: insertTurn.parentTurnId || null,
      model: insertTurn.model || null
    };
    
    const chatTurns = this.turns.get(chatId) || [];
    chatTurns.push(turn);
    this.turns.set(chatId, chatTurns);
    
    // Update chat title if this is the first user turn
    if (turn.role === 'user' && chatTurns.filter(t => t.role === 'user').length === 1) {
      const title = turn.content.slice(0, 30) + (turn.content.length > 30 ? '...' : '');
      this.updateChatTitle(chatId, title);
    }
    
    return turn;
  }

  async getLastUserTurn(chatId: number): Promise<Turn | undefined> {
    const chatTurns = this.turns.get(chatId) || [];
    return [...chatTurns]
      .filter(turn => turn.role === 'user')
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];
  }

  async getBranchTurns(chatId: number, branchId: string): Promise<Turn[]> {
    const allTurns = this.turns.get(chatId) || [];
    
    // Get all turns that are in the root branch or the specified branch
    return allTurns.filter(turn => 
      turn.branchId === 'root' || turn.branchId === branchId
    ).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  // API key methods
  async getApiKey(provider: string): Promise<string | undefined> {
    return this.apiKeys.get(provider);
  }

  async setApiKey(provider: string, apiKey: string): Promise<ApiKey> {
    this.apiKeys.set(provider, apiKey);
    return {
      id: 0, // Not relevant for memory storage
      provider,
      apiKey
    };
  }
}

export const storage = new MemStorage();
