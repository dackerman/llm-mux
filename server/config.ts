/**
 * Application configuration
 * Centralizes all environment variables and default values
 */

// Server configuration
export const SERVER_PORT = parseInt(process.env.PORT || '5000', 10);
export const NODE_ENV = process.env.NODE_ENV || 'development';
export const IS_PRODUCTION = NODE_ENV === 'production';
export const IS_DEVELOPMENT = NODE_ENV === 'development';
export const IS_TEST = NODE_ENV === 'test';

// Database configuration
export const DATABASE_URL = process.env.DATABASE_URL;
export const DATABASE_SSL = IS_PRODUCTION;
export const DATABASE_MAX_CONNECTIONS = parseInt(process.env.DATABASE_MAX_CONNECTIONS || '10', 10);
export const DATABASE_IDLE_TIMEOUT = parseInt(process.env.DATABASE_IDLE_TIMEOUT || '30000', 10);

// LLM configuration
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
export const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
export const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
export const XAI_API_KEY = process.env.XAI_API_KEY;

// Default context window sizes
export const DEFAULT_CONTEXT_WINDOW_SIZE = 10;
export const OPENAI_CONTEXT_WINDOW_SIZE = parseInt(process.env.OPENAI_CONTEXT_WINDOW_SIZE || '10', 10);
export const ANTHROPIC_CONTEXT_WINDOW_SIZE = parseInt(process.env.ANTHROPIC_CONTEXT_WINDOW_SIZE || '10', 10);
export const GEMINI_CONTEXT_WINDOW_SIZE = parseInt(process.env.GEMINI_CONTEXT_WINDOW_SIZE || '10', 10);
export const XAI_CONTEXT_WINDOW_SIZE = parseInt(process.env.XAI_CONTEXT_WINDOW_SIZE || '10', 10);

// Application configuration
export const MAX_MESSAGE_LENGTH = parseInt(process.env.MAX_MESSAGE_LENGTH || '100000', 10);
export const MAX_REQUEST_SIZE = process.env.MAX_REQUEST_SIZE || '5mb';

/**
 * Get LLM-specific context window size based on provider
 * @param provider LLM provider name
 * @returns Context window size for the provider
 */
export function getContextWindowSize(provider: string): number {
  switch (provider) {
    case 'openai':
      return OPENAI_CONTEXT_WINDOW_SIZE;
    case 'claude':
      return ANTHROPIC_CONTEXT_WINDOW_SIZE;
    case 'gemini':
      return GEMINI_CONTEXT_WINDOW_SIZE;
    case 'grok':
      return XAI_CONTEXT_WINDOW_SIZE;
    default:
      return DEFAULT_CONTEXT_WINDOW_SIZE;
  }
}

/**
 * Get API key for a specific LLM provider from environment
 * @param provider LLM provider name
 * @returns API key for the provider or undefined if not set
 */
export function getApiKeyFromEnv(provider: string): string | undefined {
  switch (provider) {
    case 'openai':
      return OPENAI_API_KEY;
    case 'claude':
      return ANTHROPIC_API_KEY;
    case 'gemini':
      return GEMINI_API_KEY;
    case 'grok':
      return XAI_API_KEY;
    default:
      return undefined;
  }
}