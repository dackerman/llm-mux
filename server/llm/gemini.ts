import { GoogleGenerativeAI } from "@google/generative-ai";

export async function generateGeminiResponse(prompt: string, apiKey: string): Promise<string> {
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

    const result = await model.generateContent(prompt);
    const response = result.response;
    return response.text();
  } catch (error) {
    console.error("Error calling Google Gemini API:", error);
    throw new Error(`Failed to generate response from Gemini: ${error.message}`);
  }
}
