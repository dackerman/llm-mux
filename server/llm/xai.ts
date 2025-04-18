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
  } catch (error) {
    console.error("Error calling xAI (Grok) API:", error);
    throw new Error(`Failed to generate response from Grok: ${error.message}`);
  }
}
