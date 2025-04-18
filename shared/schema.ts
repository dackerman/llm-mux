import { pgTable, text, serial, integer, timestamp, json, uuid, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const chats = pgTable("chats", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Updated schema to support branching and parallel model responses
export const turns = pgTable("turns", {
  id: uuid("id").defaultRandom().primaryKey(),
  chatId: integer("chat_id").notNull().references(() => chats.id),
  parentTurnId: uuid("parent_turn_id"), // Self-reference handled programmatically
  branchId: text("branch_id").notNull(), // 'root' or model-specific UUID
  role: text("role").notNull(), // 'user' or 'assistant'
  model: text("model"), // Only for assistant turns
  content: text("content").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

// Legacy messages table - kept for backward compatibility
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  chatId: integer("chat_id").notNull().references(() => chats.id),
  content: text("content").notNull(),
  role: text("role").notNull(), // 'user' or 'assistant'
  modelId: text("model_id"), // Which LLM sent this message
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const apiKeys = pgTable("api_keys", {
  id: serial("id").primaryKey(),
  provider: text("provider").notNull().unique(), // 'anthropic', 'openai', 'google', 'xai'
  apiKey: text("api_key").notNull(),
});

// Schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertChatSchema = createInsertSchema(chats).pick({
  title: true,
});

export const insertTurnSchema = createInsertSchema(turns).pick({
  chatId: true,
  parentTurnId: true,
  branchId: true,
  role: true,
  model: true,
  content: true,
});

export const insertMessageSchema = createInsertSchema(messages).pick({
  chatId: true,
  content: true,
  role: true,
  modelId: true,
});

export const insertApiKeySchema = createInsertSchema(apiKeys).pick({
  provider: true,
  apiKey: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Chat = typeof chats.$inferSelect;
export type InsertChat = z.infer<typeof insertChatSchema>;

export type Turn = typeof turns.$inferSelect;
export type InsertTurn = z.infer<typeof insertTurnSchema>;

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

export type ApiKey = typeof apiKeys.$inferSelect;
export type InsertApiKey = z.infer<typeof insertApiKeySchema>;

// Custom Types
export type LLMProvider = 'claude' | 'openai' | 'gemini' | 'grok';

export interface LLMResponse {
  content: string;
  provider: LLMProvider;
  timestamp: Date;
}

export const LLMProviderSchema = z.enum(['claude', 'openai', 'gemini', 'grok']);

// Role enums
export const RoleSchema = z.enum(['user', 'assistant']);
export type Role = z.infer<typeof RoleSchema>;
