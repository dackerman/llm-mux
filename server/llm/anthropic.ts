import Anthropic from '@anthropic-ai/sdk';

// the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
export async function generateAnthropicResponse(prompt: string, apiKey: string): Promise<string> {
  try {
    const anthropic = new Anthropic({
      apiKey,
    });

    const response = await anthropic.messages.create({
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
      model: 'claude-3-7-sonnet-20250219',
    });

    return response.content[0]?.text || "";
  } catch (error) {
    console.error("Error calling Anthropic API:", error);
    throw new Error(`Failed to generate response from Claude: ${error.message}`);
  }
}
