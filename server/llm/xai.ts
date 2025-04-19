import OpenAI from "openai";
import { ConversationMessage, StreamCompletionHandler } from './index';

export async function generateXAIResponse(
  prompt: string, 
  apiKey: string,
  conversationHistory: ConversationMessage[] = []
): Promise<string> {
  try {
    const openai = new OpenAI({ 
      baseURL: "https://api.x.ai/v1", 
      apiKey 
    });

    // Convert our conversation history format to OpenAI-compatible format
    // Use explicit type for OpenAI API compatibility
    const messages: Array<{role: 'user' | 'assistant' | 'system', content: string}> = conversationHistory.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content
    }));

    // If there's no history, just use the prompt directly
    if (messages.length === 0) {
      messages.push({ role: "user", content: prompt });
    }

    // Add system message for context
    const systemMessage: {role: 'system', content: string} = {
      role: "system",
      content: "You are Grok, an advanced AI assistant by xAI. Respond to the user based on the conversation history provided."
    };

    const response = await openai.chat.completions.create({
      model: "grok-3-beta",
      messages: [systemMessage, ...messages],
    });

    return response.choices[0].message.content || "";
  } catch (error: any) {
    console.error("Error calling xAI (Grok) API:", error);
    
    // Check for specific error types
    if (error.status === 403 && error.error && typeof error.error === 'string' && error.error.includes("credits")) {
      throw new Error("The xAI (Grok) account requires credits to be purchased. Please update your account or try a different model.");
    } else if (error.status === 401) {
      throw new Error("Invalid xAI API key. Please check your API key and try again.");
    } else if (error.status === 404 || (error.message && error.message.includes("model"))) {
      throw new Error(`Model 'grok-3-beta' not found or unavailable. Please check if the model name is correct.`);
    } else {
      throw new Error(`Failed to generate response from Grok: ${error.message || 'Unknown error'}`);
    }
  }
}

/**
 * Stream a response from xAI's API using Server-Sent Events
 * xAI uses the OpenAI-compatible streaming API
 */
export async function streamXAIResponse(
  prompt: string,
  apiKey: string,
  conversationHistory: ConversationMessage[] = [],
  onChunk: StreamCompletionHandler,
  onComplete: () => void,
  onError: (error: Error) => void
): Promise<void> {
  try {
    const openai = new OpenAI({ 
      baseURL: "https://api.x.ai/v1", 
      apiKey 
    });

    // Convert our conversation history format to OpenAI-compatible format
    const messages: Array<{role: 'user' | 'assistant' | 'system', content: string}> = conversationHistory.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content
    }));

    // If there's no history, just use the prompt directly
    if (messages.length === 0) {
      messages.push({ role: "user", content: prompt });
    }

    // Add system message for context
    const systemMessage: {role: 'system', content: string} = {
      role: "system",
      content: "You are Grok, an advanced AI assistant by xAI. Respond to the user based on the conversation history provided."
    };

    // Create a streaming completion
    const stream = await openai.chat.completions.create({
      model: "grok-3-beta",
      messages: [systemMessage, ...messages],
      stream: true,
    });

    // Process each chunk as it arrives
    let accumulatedResponse = "";
    for await (const chunk of stream) {
      if (chunk.choices[0]?.delta?.content) {
        const content = chunk.choices[0].delta.content;
        accumulatedResponse += content;
        onChunk(content);
      }
    }

    // Signal completion
    onComplete();
    return;
  } catch (error: any) {
    console.error("Error streaming from xAI (Grok) API:", error);
    
    // Check for specific error types
    if (error.status === 403 && error.error && typeof error.error === 'string' && error.error.includes("credits")) {
      onError(new Error("The xAI (Grok) account requires credits to be purchased. Please update your account or try a different model."));
    } else if (error.status === 401) {
      onError(new Error("Invalid xAI API key. Please check your API key and try again."));
    } else if (error.status === 404 || (error.message && error.message.includes("model"))) {
      onError(new Error(`Model 'grok-3-beta' not found or unavailable. Please check if the model name is correct.`));
    } else {
      onError(new Error(`Failed to stream response from Grok: ${error.message || 'Unknown error'}`));
    }
  }
}
