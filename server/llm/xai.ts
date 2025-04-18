import OpenAI from "openai";

export async function generateXAIResponse(prompt: string, apiKey: string): Promise<string> {
  try {
    const openai = new OpenAI({ 
      baseURL: "https://api.x.ai/v1", 
      apiKey 
    });

    const response = await openai.chat.completions.create({
      model: "grok-2-1212",
      messages: [{ role: "user", content: prompt }],
    });

    return response.choices[0].message.content || "";
  } catch (error: any) {
    console.error("Error calling xAI (Grok) API:", error);
    
    // Check for specific error types
    if (error.status === 403 && error.error && typeof error.error === 'string' && error.error.includes("credits")) {
      throw new Error("The xAI (Grok) account requires credits to be purchased. Please update your account or try a different model.");
    } else if (error.status === 401) {
      throw new Error("Invalid xAI API key. Please check your API key and try again.");
    } else {
      throw new Error(`Failed to generate response from Grok: ${error.message || 'Unknown error'}`);
    }
  }
}
