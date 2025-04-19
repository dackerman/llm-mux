import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { ConversationMessage, StreamCompletionHandler } from './index';

export async function generateGeminiResponse(
  prompt: string, 
  apiKey: string,
  conversationHistory: ConversationMessage[] = []
): Promise<string> {
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-pro",
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
      ],
    });

    // Start a chat session if we have conversation history
    if (conversationHistory.length > 0) {
      const chat = model.startChat({
        history: conversationHistory.map(msg => ({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }],
        })),
        generationConfig: {
          maxOutputTokens: 1024,
        },
      });

      // Send the current prompt to the chat session
      const result = await chat.sendMessage(prompt);
      const response = result.response;
      return response.text();
    } else {
      // If no history, just generate a simple response
      const result = await model.generateContent(prompt);
      const response = result.response;
      return response.text();
    }
  } catch (error: any) {
    console.error("Error calling Google Gemini API:", error);
    throw new Error(`Failed to generate response from Gemini: ${error.message}`);
  }
}

/**
 * Stream a response from Google's Gemini API using Server-Sent Events
 */
export async function streamGeminiResponse(
  prompt: string,
  apiKey: string,
  conversationHistory: ConversationMessage[] = [],
  onChunk: StreamCompletionHandler,
  onComplete: () => void,
  onError: (error: Error) => void
): Promise<void> {
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-pro",
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
      ],
    });

    // Start a chat session if we have conversation history
    if (conversationHistory.length > 0) {
      const chat = model.startChat({
        history: conversationHistory.map(msg => ({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }],
        })),
        generationConfig: {
          maxOutputTokens: 1024,
        },
      });

      // Send the current prompt to the chat session and stream the response
      const result = await chat.sendMessageStream(prompt);
      let accumulatedResponse = "";
      
      for await (const chunk of result.stream) {
        if (chunk.text && typeof chunk.text === 'string') {
          accumulatedResponse += chunk.text;
          onChunk(chunk.text);
        } else if (chunk.text && typeof chunk.text === 'function') {
          const textContent = chunk.text();
          if (textContent) {
            accumulatedResponse += textContent;
            onChunk(textContent);
          }
        }
      }

      // Signal completion
      onComplete();
      return;
    } else {
      // If no history, just generate a simple streaming response
      const result = await model.generateContentStream(prompt);
      let accumulatedResponse = "";
      
      for await (const chunk of result.stream) {
        const text = chunk.text ? chunk.text() : '';
        if (text) {
          accumulatedResponse += text;
          onChunk(text);
        }
      }

      // Signal completion
      onComplete();
      return;
    }
  } catch (error: any) {
    console.error("Error streaming from Google Gemini API:", error);
    onError(new Error(`Failed to stream response from Gemini: ${error.message}`));
  }
}
