import Anthropic from '@anthropic-ai/sdk';
import { ConversationMessage } from './index';

// the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
export async function generateAnthropicResponse(
  prompt: string,
  apiKey: string,
  conversationHistory: ConversationMessage[] = []
): Promise<string> {
  try {
    const anthropic = new Anthropic({
      apiKey,
    });

    // Convert our conversation history format to Anthropic's format
    const messages = conversationHistory.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content
    }));

    // If there's no history, just use the prompt directly
    if (messages.length === 0) {
      messages.push({ role: 'user', content: prompt });
    }

    // Anthropic's system prompt to maintain context
    const systemPrompt = "You are Claude, an intelligent AI assistant made by Anthropic. Respond to the user based on the conversation history provided. Be helpful, harmless, and honest.";

    const response = await anthropic.messages.create({
      max_tokens: 1024,
      messages,
      model: 'claude-3-7-sonnet-20250219',
      system: systemPrompt
    });

    // Handle response content safely
    if (response.content && response.content.length > 0) {
      const firstContent = response.content[0];
      if ('text' in firstContent) {
        return firstContent.text;
      }
    }
    return "";
  } catch (error: any) {
    console.error("Error calling Anthropic API:", error);
    throw new Error(`Failed to generate response from Claude: ${error.message}`);
  }
}
