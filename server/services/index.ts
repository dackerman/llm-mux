import { IStorage } from '../storage';
import { ChatService } from './chat';
import { LLMService } from './llm';

/**
 * Service registry that holds all service instances
 * This enables proper dependency injection and makes testing easier
 */
export class ServiceRegistry {
  chatService: ChatService;
  llmService: LLMService;

  constructor(storage: IStorage) {
    this.chatService = new ChatService(storage);
    this.llmService = new LLMService(storage);
  }
}

/**
 * Create a service registry with the provided storage
 * @param storage Storage implementation to use
 * @returns Service registry instance
 */
export function createServices(storage: IStorage): ServiceRegistry {
  return new ServiceRegistry(storage);
}