import Anthropic from '@anthropic-ai/sdk';
import { ConversationMessage, StreamCompletionHandler } from './index';

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

    // Format history into plain text for Claude if we have any
    let promptText = prompt;
    
    if (conversationHistory.length > 0) {
      // Build a string-based conversation history since we're having typing issues
      let conversationText = "Here's our conversation so far:\n\n";
      
      for (const msg of conversationHistory) {
        const role = msg.role === 'user' ? 'Human' : 'Assistant';
        conversationText += `${role}: ${msg.content}\n\n`;
      }
      
      // Add the current prompt
      conversationText += `Human: ${prompt}\n\nAssistant:`;
      promptText = conversationText;
    }

    // Anthropic's system prompt to maintain context
    const systemPrompt = "You are Claude, an intelligent AI assistant made by Anthropic. Respond to the user based on the conversation history provided. Be helpful, harmless, and honest.";

    // Use a simpler approach with a single prompt message
    const response = await anthropic.messages.create({
      max_tokens: 1024,
      messages: [{ role: 'user', content: promptText }],
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

/**
 * Stream a response from Anthropic's API using Server-Sent Events
 */
export async function streamAnthropicResponse(
  prompt: string,
  apiKey: string,
  conversationHistory: ConversationMessage[] = [],
  onChunk: StreamCompletionHandler,
  onComplete: () => void,
  onError: (error: Error) => void
): Promise<void> {
  try {
    const anthropic = new Anthropic({
      apiKey,
    });

    // Format history into plain text for Claude if we have any
    let promptText = prompt;
    
    if (conversationHistory.length > 0) {
      // Build a string-based conversation history since we're having typing issues
      let conversationText = "Here's our conversation so far:\n\n";
      
      for (const msg of conversationHistory) {
        const role = msg.role === 'user' ? 'Human' : 'Assistant';
        conversationText += `${role}: ${msg.content}\n\n`;
      }
      
      // Add the current prompt
      conversationText += `Human: ${prompt}\n\nAssistant:`;
      promptText = conversationText;
    }

    // Anthropic's system prompt to maintain context
    const systemPrompt = "You are Claude, an intelligent AI assistant made by Anthropic. Respond to the user based on the conversation history provided. Be helpful, harmless, and honest.";

    // Stream the response
    const stream = await anthropic.messages.create({
      max_tokens: 1024,
      messages: [{ role: 'user', content: promptText }],
      model: 'claude-3-7-sonnet-20250219',
      system: systemPrompt,
      stream: true,
    });

    // Process each chunk as it arrives
    let accumulatedResponse = "";
    for await (const chunk of stream) {
      // Handle the chunk based on its structure
      if (chunk.type === 'content_block_delta' && chunk.delta) {
        // Type narrowing with a type guard
        const delta = chunk.delta as any;
        if (delta.text) {
          accumulatedResponse += delta.text;
          onChunk(delta.text);
        }
      }
    }

    // Signal completion
    onComplete();
    return;
  } catch (error: any) {
    console.error("Error streaming from Anthropic API:", error);
    onError(new Error(`Failed to stream response from Claude: ${error.message}`));
  }
}
