import express, { type Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage-pg-setup";
import { z } from "zod";
import { insertChatSchema, insertMessageSchema, insertTurnSchema, LLMProviderSchema } from "@shared/schema";
import { generateLLMResponse, generateLLMResponseFromTurns } from "./llm";
import crypto from "crypto";

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

  // Turn-based API routes for branching conversations
  apiRouter.get("/chats/:chatId/turns", async (req: Request, res: Response) => {
    try {
      const chatId = parseInt(req.params.chatId);
      const turns = await storage.getTurns(chatId);
      res.json(turns);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch turns" });
    }
  });

  apiRouter.get("/chats/:chatId/branches/:branchId", async (req: Request, res: Response) => {
    try {
      const chatId = parseInt(req.params.chatId);
      const branchId = req.params.branchId;
      const turns = await storage.getBranchTurns(chatId, branchId);
      res.json(turns);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch branch" });
    }
  });

  // Add a user turn
  apiRouter.post("/chats/:chatId/turns", async (req: Request, res: Response) => {
    try {
      const chatId = parseInt(req.params.chatId);
      
      // Check if chat exists
      const chat = await storage.getChat(chatId);
      if (!chat) {
        return res.status(404).json({ message: "Chat not found" });
      }
      
      // Validate request
      const turnRequestSchema = z.object({
        content: z.string().min(1),
        branchId: z.string(),
        parentTurnId: z.string().optional(),
        selectedModels: z.array(LLMProviderSchema)
      });
      
      const { content, branchId, parentTurnId, selectedModels } = turnRequestSchema.parse(req.body);
      
      // Create user turn
      const userTurn = await storage.createTurn({
        chatId,
        content,
        role: "user",
        branchId,
        parentTurnId,
        model: null
      });
      
      // Get existing conversation for this branch
      const conversationHistory = await storage.getBranchTurns(chatId, branchId);
      
      // Generate LLM responses in parallel for each selected model
      const llmPromises = selectedModels.map(async (provider) => {
        try {
          const apiKey = await storage.getApiKey(provider);
          
          if (!apiKey) {
            return {
              provider,
              success: false,
              error: "API key not configured",
              turnId: null
            };
          }
          
          // Generate a unique branch ID for this model's responses if not already in the root branch
          const modelBranchId = branchId === 'root' ? provider : branchId;
          
          // Pass conversation history to the LLM for context
          const response = await generateLLMResponseFromTurns(
            provider, 
            content, 
            apiKey, 
            conversationHistory
          );
          
          // Save model response to storage as a turn
          const assistantTurn = await storage.createTurn({
            chatId,
            content: response,
            role: "assistant",
            branchId: modelBranchId,
            parentTurnId: userTurn.id,
            model: provider
          });
          
          return {
            provider,
            success: true,
            turnId: assistantTurn.id,
            branchId: modelBranchId
          };
        } catch (error: any) {
          console.error(`Error with ${provider}:`, error);
          
          // Generate a unique branch ID for this model
          const modelBranchId = branchId === 'root' ? provider : branchId;
          
          // Store the error message as a model turn
          const errorMessage = error.message || "Failed to generate response";
          const errorTurn = await storage.createTurn({
            chatId,
            content: `Error: ${errorMessage}`,
            role: "assistant",
            branchId: modelBranchId,
            parentTurnId: userTurn.id,
            model: provider
          });
          
          return {
            provider,
            success: false,
            error: errorMessage,
            turnId: errorTurn.id,
            branchId: modelBranchId
          };
        }
      });
      
      // Wait for all LLM responses
      const results = await Promise.all(llmPromises);
      
      // Get all turns for the chat, including new responses
      const turns = await storage.getTurns(chatId);
      
      res.status(201).json({
        userTurn,
        results,
        turns
      });
    } catch (error: any) {
      console.error("Turn error:", error);
      res.status(400).json({ message: "Failed to process turn", error: error.message || "Unknown error" });
    }
  });

  // Request fan-out to multiple models from an existing user turn
  apiRouter.post("/chats/:chatId/compare", async (req: Request, res: Response) => {
    try {
      const chatId = parseInt(req.params.chatId);
      
      // Validate request
      const compareRequestSchema = z.object({
        userTurnId: z.string(),
        selectedModels: z.array(LLMProviderSchema)
      });
      
      const { userTurnId, selectedModels } = compareRequestSchema.parse(req.body);
      
      // Get the user turn
      const turns = await storage.getTurns(chatId);
      const userTurn = turns.find(turn => turn.id === userTurnId && turn.role === 'user');
      
      if (!userTurn) {
        return res.status(404).json({ message: "User turn not found" });
      }
      
      // Get conversation history leading up to this turn
      const conversationHistory = await storage.getBranchTurns(chatId, userTurn.branchId);
      
      // Generate LLM responses in parallel for each selected model
      const llmPromises = selectedModels.map(async (provider) => {
        try {
          const apiKey = await storage.getApiKey(provider);
          
          if (!apiKey) {
            return {
              provider,
              success: false,
              error: "API key not configured",
              turnId: null
            };
          }
          
          // Each model gets its own branch ID
          const modelBranchId = provider;
          
          // Pass conversation history to the LLM for context
          const response = await generateLLMResponseFromTurns(
            provider, 
            userTurn.content, 
            apiKey, 
            conversationHistory
          );
          
          // Save model response as a turn
          const assistantTurn = await storage.createTurn({
            chatId,
            content: response,
            role: "assistant",
            branchId: modelBranchId,
            parentTurnId: userTurn.id,
            model: provider
          });
          
          return {
            provider,
            success: true,
            turnId: assistantTurn.id,
            branchId: modelBranchId
          };
        } catch (error: any) {
          console.error(`Error with ${provider}:`, error);
          
          // Store the error message as a model turn
          const errorMessage = error.message || "Failed to generate response";
          const errorTurn = await storage.createTurn({
            chatId,
            content: `Error: ${errorMessage}`,
            role: "assistant",
            branchId: provider,
            parentTurnId: userTurn.id,
            model: provider
          });
          
          return {
            provider,
            success: false,
            error: errorMessage,
            turnId: errorTurn.id,
            branchId: provider
          };
        }
      });
      
      // Wait for all LLM responses
      const results = await Promise.all(llmPromises);
      
      res.status(201).json({
        results
      });
    } catch (error: any) {
      console.error("Compare error:", error);
      res.status(400).json({ message: "Failed to compare models", error: error.message || "Unknown error" });
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
