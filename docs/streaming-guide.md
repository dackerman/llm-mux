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

### Enabling/Disabling Streaming

By default, streaming is enabled for single-model conversations. When you select only one model, you'll see a "Stream" checkbox in the input area that allows you to toggle streaming on or off.

### Limitations

- Streaming currently works only when a single model is selected. When comparing multiple models, the standard (non-streaming) approach is used.
- Not all providers may support streaming with the same level of performance.

### Streaming Status Indicators

When a response is being streamed:

- A green pulsing indicator appears at the top of the streaming preview
- The text area is disabled until the stream completes
- A "Cancel Stream" button allows you to stop the generation at any point

## Technical Implementation

Streaming is implemented using Server-Sent Events (SSE) on the backend and the Fetch API's streaming capabilities on the frontend. Each token/chunk from the LLM provider is sent as a separate event, allowing for real-time updates.

When a stream is complete, the full response is saved to the database to ensure conversation history remains intact.