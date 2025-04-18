import { type LLMProvider } from "@shared/schema";
import { generateAnthropicResponse } from "./anthropic";
import { generateOpenAIResponse } from "./openai";
import { generateGeminiResponse } from "./gemini";
import { generateXAIResponse } from "./xai";

export async function generateLLMResponse(
  provider: LLMProvider,
  prompt: string,
  apiKey: string
): Promise<string> {
  try {
    switch (provider) {
      case "claude":
        return await generateAnthropicResponse(prompt, apiKey);
      case "openai":
        return await generateOpenAIResponse(prompt, apiKey);
      case "gemini":
        return await generateGeminiResponse(prompt, apiKey);
      case "grok":
        return await generateXAIResponse(prompt, apiKey);
      default:
        throw new Error(`Unsupported LLM provider: ${provider}`);
    }
  } catch (error) {
    console.error(`Error generating ${provider} response:`, error);
    throw error;
  }
}
