import express, { type Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage-pg-setup";
import { z } from "zod";
import { insertChatSchema, insertMessageSchema, insertTurnSchema, LLMProviderSchema } from "@shared/schema";
import crypto from "crypto";
import { createServices, ServiceRegistry } from "./services";
import { asyncHandler } from "./middleware/async-handler";
import { errorHandler } from "./middleware/error-handler";
import { CustomError, ValidationError } from "./utils/errors";

// Create services and inject storage dependency
const services = createServices(storage);

export async function registerRoutes(app: Express): Promise<Server> {
  // API routes prefix
  const apiRouter = express.Router();
  app.use("/api", apiRouter);

  // Chat routes
  apiRouter.get("/chats", asyncHandler(async (req: Request, res: Response) => {
    const chats = await services.chatService.getChats();
    res.json(chats);
  }));

  apiRouter.post("/chats", asyncHandler(async (req: Request, res: Response) => {
    try {
      const validatedData = insertChatSchema.parse(req.body);
      const chat = await services.chatService.createChat(validatedData);
      res.status(201).json(chat);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError('Invalid chat data', error);
      }
      throw error;
    }
  }));

  apiRouter.get("/chats/:id", asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const chat = await services.chatService.getChat(id);
    res.json(chat);
  }));

  apiRouter.delete("/chats/:id", asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const success = await services.chatService.deleteChat(id);
    res.json({ success });
  }));

  apiRouter.get("/chats/:chatId/messages", asyncHandler(async (req: Request, res: Response) => {
    const chatId = parseInt(req.params.chatId);
    // Since this is legacy functionality, we still use the storage directly
    const messages = await storage.getMessages(chatId);
    res.json(messages);
  }));

  apiRouter.post("/chats/:chatId/messages", asyncHandler(async (req: Request, res: Response) => {
    try {
      const chatId = parseInt(req.params.chatId);
      
      // First, validate that the chat exists
      await services.chatService.getChat(chatId);
      
      // Validate the message data
      const validatedData = insertMessageSchema.parse({
        ...req.body,
        chatId
      });
      
      // Create the message (using storage directly as this is legacy functionality)
      const message = await storage.createMessage(validatedData);
      
      // If this is a user message, generate an AI response
      if (message.role === 'user' && message.modelId) {
        const responseMessage = await storage.createMessage({
          chatId: message.chatId,
          role: 'assistant',
          content: await services.llmService.generateResponse(
            message.modelId,
            chatId,
            'root', // Legacy messages don't use branching
            message.id.toString()
          ),
          modelId: message.modelId
        });
        
        res.status(201).json({
          userMessage: message,
          responseMessage
        });
      } else {
        res.status(201).json(message);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError('Invalid message data', error);
      }
      throw error;
    }
  }));

  apiRouter.get("/chats/:chatId/turns", asyncHandler(async (req: Request, res: Response) => {
    const chatId = parseInt(req.params.chatId);
    const turns = await services.chatService.getTurns(chatId);
    res.json(turns);
  }));

  apiRouter.get("/chats/:chatId/branches/:branchId", asyncHandler(async (req: Request, res: Response) => {
    const chatId = parseInt(req.params.chatId);
    const branchId = req.params.branchId;
    
    console.log(`Fetching branch turns for chat ID: ${chatId} branch ID: ${branchId}`);
    const turns = await services.chatService.getTurnsByBranch(chatId, branchId);
    console.log(`Retrieved branch turns:`, turns);
    
    res.json(turns);
  }));

  apiRouter.post("/chats/:chatId/turns", asyncHandler(async (req: Request, res: Response) => {
    try {
      const chatId = parseInt(req.params.chatId);
      
      // First, validate that the chat exists
      await services.chatService.getChat(chatId);
      
      // Validate the turn data
      const validatedData = insertTurnSchema.parse({
        ...req.body,
        chatId
      });
      
      // Create the turn
      const turn = await services.chatService.createTurn(validatedData);
      
      // If this is a user turn and models are provided, generate AI responses
      if (turn.role === 'user' && req.body.models && Array.isArray(req.body.models)) {
        const models = req.body.models;
        
        // Validate each model
        for (const model of models) {
          if (!LLMProviderSchema.safeParse(model).success) {
            throw new ValidationError(`Invalid model: ${model}`);
          }
          
          // Check if API key is set
          const hasKey = await services.llmService.hasApiKey(model);
          if (!hasKey) {
            throw new ValidationError(`API key for ${model} is not set`);
          }
        }
        
        // Generate a unique branch ID for each model response
        const assistantTurns = await Promise.all(models.map(async (model) => {
          const responseContent = await services.llmService.generateResponse(
            model,
            chatId,
            model, // Use model name as branch ID
            turn.id
          );
          
          return services.chatService.createTurn({
            chatId,
            parentTurnId: turn.id,
            branchId: model,
            role: 'assistant',
            model,
            content: responseContent
          });
        }));
        
        res.status(201).json({
          userTurn: turn,
          assistantTurns
        });
      } else {
        res.status(201).json(turn);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError('Invalid turn data', error);
      }
      throw error;
    }
  }));

  apiRouter.post("/chats/:chatId/compare", asyncHandler(async (req: Request, res: Response) => {
    try {
      const chatId = parseInt(req.params.chatId);
      const { turnId, models } = req.body;
      
      if (!turnId || !models || !Array.isArray(models)) {
        throw new ValidationError('Missing required fields: turnId and models array');
      }
      
      // First, validate that the chat exists
      await services.chatService.getChat(chatId);
      
      // Find the parent turn
      const turns = await services.chatService.getTurns(chatId);
      const parentTurn = turns.find(t => t.id === turnId);
      
      if (!parentTurn) {
        throw new ValidationError(`Turn with ID ${turnId} not found`);
      }
      
      // Validate each model
      for (const model of models) {
        if (!LLMProviderSchema.safeParse(model).success) {
          throw new ValidationError(`Invalid model: ${model}`);
        }
        
        // Check if API key is set
        const hasKey = await services.llmService.hasApiKey(model);
        if (!hasKey) {
          throw new ValidationError(`API key for ${model} is not set`);
        }
      }
      
      // Generate a response for each model
      const assistantTurns = await Promise.all(models.map(async (model) => {
        const responseContent = await services.llmService.generateResponse(
          model,
          chatId,
          model, // Use model name as branch ID
          parentTurn.id
        );
        
        return services.chatService.createTurn({
          chatId,
          parentTurnId: parentTurn.id,
          branchId: model,
          role: 'assistant',
          model,
          content: responseContent
        });
      }));
      
      res.status(201).json(assistantTurns);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError('Invalid request data', error);
      }
      throw error;
    }
  }));

  apiRouter.post("/chats/:chatId/stream", asyncHandler(async (req: Request, res: Response) => {
    const chatId = parseInt(req.params.chatId);
    const { content, parentTurnId, models } = req.body;
    
    if (!content || !models || !Array.isArray(models) || models.length === 0) {
      throw new ValidationError('Missing required fields: content and models array');
    }
    
    // First, validate that the chat exists
    await services.chatService.getChat(chatId);
    
    // Set up SSE stream
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    // Generate a unique ID for the user turn
    const userTurnId = crypto.randomUUID();
    
    // Create user turn
    const userTurn = await services.chatService.createTurn({
      chatId,
      id: userTurnId,
      parentTurnId: parentTurnId || null,
      branchId: 'root',
      role: 'user',
      model: null,
      content
    });
    
    // Send the user turn ID to the client
    res.write(`data: ${JSON.stringify({ event: 'userTurn', data: { id: userTurnId } })}\n\n`);
    
    // Process each model asynchronously
    for (const model of models) {
      // Validate model
      if (!LLMProviderSchema.safeParse(model).success) {
        res.write(`data: ${JSON.stringify({ 
          event: 'error', 
          data: { 
            model, 
            error: `Invalid model: ${model}` 
          } 
        })}\n\n`);
        continue;
      }
      
      // Check if API key is set
      const hasKey = await services.llmService.hasApiKey(model);
      if (!hasKey) {
        res.write(`data: ${JSON.stringify({ 
          event: 'error', 
          data: { 
            model, 
            error: `API key for ${model} is not set` 
          } 
        })}\n\n`);
        continue;
      }
      
      // Generate turn ID for the assistant response
      const assistantTurnId = crypto.randomUUID();
      
      // Send the turn ID to the client
      res.write(`data: ${JSON.stringify({ 
        event: 'turnStart', 
        data: { 
          id: assistantTurnId, 
          model, 
          parentTurnId: userTurnId 
        } 
      })}\n\n`);
      
      try {
        // Create an empty assistant turn to start with
        await services.chatService.createTurn({
          chatId,
          id: assistantTurnId,
          parentTurnId: userTurnId,
          branchId: model,
          role: 'assistant',
          model,
          content: ''
        });
        
        // Create custom response handlers for the stream
        const onChunk = (chunk: string) => {
          res.write(`data: ${JSON.stringify({ 
            event: 'chunk', 
            data: { 
              id: assistantTurnId, 
              model, 
              content: chunk 
            } 
          })}\n\n`);
        };
        
        const onError = (error: Error) => {
          res.write(`data: ${JSON.stringify({ 
            event: 'error', 
            data: { 
              id: assistantTurnId, 
              model, 
              error: error.message 
            } 
          })}\n\n`);
        };
        
        // Generate and stream the response
        try {
          // Get turns for this branch
          const branchTurns = await services.chatService.getTurnsByBranch(chatId, model);
          
          // Stream directly using raw streaming function (later we can refactor this into the service)
          await streamLLMResponseFromTurnsRaw(
            model,
            branchTurns,
            userTurnId,
            res,
            onChunk,
            onError,
            assistantTurnId
          );
          
          // Send completion event
          res.write(`data: ${JSON.stringify({ 
            event: 'turnEnd', 
            data: { 
              id: assistantTurnId, 
              model 
            } 
          })}\n\n`);
        } catch (streamError) {
          onError(streamError instanceof Error ? streamError : new Error(String(streamError)));
        }
      } catch (turnError) {
        res.write(`data: ${JSON.stringify({ 
          event: 'error', 
          data: { 
            model, 
            error: turnError instanceof Error ? turnError.message : String(turnError)
          } 
        })}\n\n`);
      }
    }
    
    // End the stream once all models have been processed
    res.write(`data: ${JSON.stringify({ event: 'done' })}\n\n`);
    res.end();
  }));

  apiRouter.get("/api-keys/:provider", asyncHandler(async (req: Request, res: Response) => {
    const provider = req.params.provider;
    
    // Validate provider
    if (!LLMProviderSchema.safeParse(provider).success) {
      throw new ValidationError(`Invalid provider: ${provider}`);
    }
    
    const hasKey = await services.llmService.hasApiKey(provider);
    res.json({ hasKey });
  }));

  apiRouter.post("/api-keys", asyncHandler(async (req: Request, res: Response) => {
    const { provider, apiKey } = req.body;
    
    if (!provider || !apiKey) {
      throw new ValidationError('Missing required fields: provider and apiKey');
    }
    
    // Validate provider
    if (!LLMProviderSchema.safeParse(provider).success) {
      throw new ValidationError(`Invalid provider: ${provider}`);
    }
    
    await services.llmService.setApiKey(provider, apiKey);
    res.json({ success: true });
  }));

  // Register error handler middleware
  app.use(errorHandler);

  // Create HTTP server
  const httpServer = createServer(app);
  
  return httpServer;
}