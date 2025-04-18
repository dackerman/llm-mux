import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024
export async function generateOpenAIResponse(prompt: string, apiKey: string): Promise<string> {
  try {
    const openai = new OpenAI({ apiKey });

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
    });

    return response.choices[0].message.content || "";
  } catch (error) {
    console.error("Error calling OpenAI API:", error);
    throw new Error(`Failed to generate response from OpenAI: ${error.message}`);
  }
}
