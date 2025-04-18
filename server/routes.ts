import express, { type Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage-pg-setup";
import { z } from "zod";
import { insertChatSchema, insertMessageSchema, LLMProviderSchema } from "@shared/schema";
import { generateLLMResponse } from "./llm";

export async function registerRoutes(app: Express): Promise<Server> {
  // API routes prefix
  const apiRouter = express.Router();
  app.use("/api", apiRouter);

  // Chat routes
  apiRouter.get("/chats", async (req: Request, res: Response) => {
    try {
      const chats = await storage.getChats();
      res.json(chats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch chats" });
    }
  });

  apiRouter.post("/chats", async (req: Request, res: Response) => {
    try {
      const validatedData = insertChatSchema.parse(req.body);
      const chat = await storage.createChat(validatedData);
      res.status(201).json(chat);
    } catch (error) {
      res.status(400).json({ message: "Invalid chat data" });
    }
  });

  apiRouter.get("/chats/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const chat = await storage.getChat(id);
      
      if (!chat) {
        return res.status(404).json({ message: "Chat not found" });
      }
      
      res.json(chat);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch chat" });
    }
  });

  apiRouter.delete("/chats/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteChat(id);
      
      if (!success) {
        return res.status(404).json({ message: "Chat not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete chat" });
    }
  });

  // Message routes
  apiRouter.get("/chats/:chatId/messages", async (req: Request, res: Response) => {
    try {
      const chatId = parseInt(req.params.chatId);
      const messages = await storage.getMessages(chatId);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  apiRouter.post("/chats/:chatId/messages", async (req: Request, res: Response) => {
    try {
      const chatId = parseInt(req.params.chatId);
      
      // Check if chat exists
      const chat = await storage.getChat(chatId);
      if (!chat) {
        return res.status(404).json({ message: "Chat not found" });
      }
      
      // Validate request
      const messageRequestSchema = z.object({
        content: z.string().min(1),
        selectedModels: z.array(LLMProviderSchema)
      });
      
      const { content, selectedModels } = messageRequestSchema.parse(req.body);
      
      // Create user message
      const userMessage = await storage.createMessage({
        chatId,
        content,
        role: "user",
        modelId: null
      });
      
      // Get existing conversation history for context
      const existingMessages = await storage.getMessages(chatId);
      
      // Generate LLM responses in parallel
      const llmPromises = selectedModels.map(async (provider) => {
        try {
          const apiKey = await storage.getApiKey(provider);
          
          if (!apiKey) {
            return {
              provider,
              success: false,
              error: "API key not configured"
            };
          }
          
          // Pass conversation history to the LLM for context
          const response = await generateLLMResponse(provider, content, apiKey, existingMessages);
          
          // Save model response to storage
          await storage.createMessage({
            chatId,
            content: response,
            role: "assistant",
            modelId: provider
          });
          
          return {
            provider,
            success: true
          };
        } catch (error: any) {
          console.error(`Error with ${provider}:`, error);
          
          // Store the error message as a model response
          const errorMessage = error.message || "Failed to generate response";
          await storage.createMessage({
            chatId,
            content: `Error: ${errorMessage}`,
            role: "assistant",
            modelId: provider
          });
          
          return {
            provider,
            success: false,
            error: errorMessage
          };
        }
      });
      
      // Wait for all LLM responses
      const results = await Promise.all(llmPromises);
      
      // Get all messages for the chat, including new responses
      const messages = await storage.getMessages(chatId);
      
      res.status(201).json({
        userMessage,
        results,
        messages
      });
    } catch (error: any) {
      console.error("Message error:", error);
      res.status(400).json({ message: "Failed to process message", error: error.message || "Unknown error" });
    }
  });

  // API key routes
  apiRouter.get("/api-keys/:provider", async (req: Request, res: Response) => {
    try {
      const provider = req.params.provider;
      const validatedProvider = LLMProviderSchema.parse(provider);
      
      const apiKey = await storage.getApiKey(validatedProvider);
      res.json({ provider, hasKey: !!apiKey });
    } catch (error) {
      res.status(400).json({ message: "Invalid provider" });
    }
  });

  apiRouter.post("/api-keys", async (req: Request, res: Response) => {
    try {
      const apiKeySchema = z.object({
        provider: LLMProviderSchema,
        apiKey: z.string().min(1)
      });
      
      const { provider, apiKey } = apiKeySchema.parse(req.body);
      await storage.setApiKey(provider, apiKey);
      
      res.status(201).json({ provider, success: true });
    } catch (error) {
      res.status(400).json({ message: "Invalid API key data" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
