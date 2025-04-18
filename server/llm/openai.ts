import OpenAI from "openai";
import { ConversationMessage } from './index';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024
export async function generateOpenAIResponse(
  prompt: string, 
  apiKey: string,
  conversationHistory: ConversationMessage[] = []
): Promise<string> {
  try {
    const openai = new OpenAI({ apiKey });

    // Convert our conversation history format to OpenAI's format
    const messages: ChatCompletionMessageParam[] = conversationHistory.map(msg => ({
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content
    }));

    // If there's no history, just use the prompt directly
    if (messages.length === 0) {
      messages.push({ role: "user", content: prompt });
    }

    // Add system message for context
    const systemMessage: ChatCompletionMessageParam = {
      role: "system", 
      content: "You are GPT-4o, a large language model by OpenAI. Respond to the user based on the conversation history provided."
    };

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [systemMessage, ...messages],
    });

    return response.choices[0].message.content || "";
  } catch (error: any) {
    console.error("Error calling OpenAI API:", error);
    throw new Error(`Failed to generate response from OpenAI: ${error.message}`);
  }
}
