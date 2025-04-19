# Streaming Responses in Hatch

Hatch now supports real-time streaming of responses from LLM providers. This feature reduces the perceived latency by displaying the model's response as it's being generated, rather than waiting for the entire response to be completed.

## How Streaming Works

When streaming is enabled:

1. Your message is sent to the selected LLM provider
2. The LLM begins generating a response
3. As each token/chunk is generated, it's immediately displayed in the UI
4. You see the response form in real-time, similar to how you would in OpenAI's ChatGPT or Anthropic's Claude

## Benefits of Streaming

- **Reduced Perceived Latency**: Even though the total generation time is the same, seeing partial results immediately makes the interaction feel much faster
- **Interrupt Long Responses**: If you notice the AI is going in the wrong direction, you can cancel the stream
- **More Natural Interaction**: Mimics a more human-like conversation flow as you watch the response form

## Using Streaming in Hatch

### Automatic Streaming for All Conversations

Streaming is automatically enabled for all conversations in Hatch, whether you're using a single model or comparing multiple models:

- **Single Model Streaming**: When only one model is selected, you'll see the response stream in a single box.
- **Multi-Model Streaming**: When multiple models are selected, you'll see parallel streaming boxes with fixed heights showing each model's response as it's generated. All responses stream simultaneously, letting you compare them in real-time.

### Comparing Multiple Models with Streaming

One of the most powerful features of Hatch is the ability to watch multiple AI models generate their responses in parallel:

- Each model has its own streaming box with a colored border matching the model's identity
- Content scrolls automatically to keep the most recent output visible
- View different response styles and speeds side-by-side
- Cancel individual streams or all streams at once

### Limitations

- Not all providers may support streaming with the same level of performance.

### Streaming Status Indicators

When responses are being streamed:

#### Single Model
- A green pulsing indicator appears at the top of the streaming preview
- The text area is disabled until the stream completes
- A "Cancel Stream" button allows you to stop the generation

#### Multiple Models
- Each model's box shows its own streaming status with a pulsing indicator
- Each individual stream can be canceled separately
- A "Cancel All Streams" button lets you stop all generations at once
- The text area is disabled until all streams complete
- A status indicator shows "Streaming responses" when in progress

## Technical Implementation

Streaming is implemented using Server-Sent Events (SSE) on the backend and the Fetch API's streaming capabilities on the frontend. Each token/chunk from the LLM provider is sent as a separate event, allowing for real-time updates.

When a stream is complete, the full response is saved to the database to ensure conversation history remains intact.