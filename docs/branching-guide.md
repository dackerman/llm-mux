# Hatch - LLM Branching Guide

## Introduction to LLM Branching

Hatch's core feature is its innovative branching system, allowing you to compare responses from multiple AI models simultaneously and continue conversations with the model of your choice. This guide explains how to use this powerful functionality to enhance your AI interactions.

## Understanding the Branching Model

Traditional chat applications facilitate a linear conversation with a single AI model. Hatch takes a different approach by introducing a branching conversation model:

- Each user message can spawn multiple AI responses from different models
- Any of these responses can be selected as the starting point for the next part of the conversation
- The conversation history is maintained independently for each branch, allowing for path-specific context

This enables you to compare model performance, explore different conversation directions, and maintain multiple parallel discussions from a single conversation starting point.

## Key Concepts

### Branches

A branch represents a specific conversation path with a particular AI model. Each branch maintains its own context and history, allowing for more coherent multi-turn conversations.

### Turns

Turns are individual messages in the conversation, tagged with:
- Which branch they belong to
- Their parent turn (the message they're responding to)
- The role (user or assistant)
- The model generating the response (for assistant turns)

### Main Branch vs. Comparison Branches

- **Main Branch**: The primary conversation path you're currently following
- **Comparison Branches**: Alternative responses from different models that you can view or switch to

## How to Use Branching in Hatch

### Starting a Conversation

1. Begin by selecting a model from the dropdown menu (or use the default selected model)
2. Type your message in the input area and hit send
3. The AI will respond, establishing the first branch of conversation

### Comparing Responses from Multiple Models

1. After receiving a response, look for the "Compare with..." button below your most recent message
2. Click this button to open the comparison dialog
3. Select multiple AI models you'd like to compare
4. Click "Compare" to generate responses from all selected models
5. View the responses side by side (desktop) or in an accordion view (mobile)

### Continuing with a Specific Response

1. After generating multiple responses, review each model's answer
2. To continue with a particular model's response, click the "Continue with this response" button under that model's answer
3. The conversation will now follow that specific branch, maintaining context with that model

### Understanding the Visual Interface

- **Horizontal Cards (Desktop)**: On larger screens, multiple model responses appear as side-by-side cards, allowing for easy comparison
- **Accordion View (Mobile)**: On mobile devices, responses are stacked vertically to maximize readability
- **Color Coding**: Each model has a distinct color to help you identify which model generated each response
- **Branch Indicators**: The current active branch is visually highlighted

### Advanced Usage Tips

#### Comparing at Any Point

You can generate comparative responses at any point in the conversation. Simply click the "Compare with..." button under any of your messages to branch at that specific point.

#### Multiple Branch Points

You can create multiple branch points throughout a conversation, allowing for a tree-like structure of possible conversation paths.

#### Branch Navigation

As you continue down a specific branch, previous branch points remain accessible. You can always navigate back to explore alternative paths.

## Use Cases for Branching

### Model Evaluation and Comparison

Compare how different AI models handle the same query to determine which performs best for your specific needs.

Example:
```
User: "What are the ethical implications of autonomous vehicles?"
[Compare responses from Claude, GPT, Gemini, and Grok]
```

### Finding Optimal Responses

Generate multiple responses to find the most helpful or accurate one before continuing.

Example:
```
User: "How would you implement a quick sort algorithm in Python?"
[Compare responses from multiple models]
[Continue with the most comprehensive explanation]
```

### Exploring Different Perspectives

Use different models to explore varied viewpoints on complex topics.

Example:
```
User: "What might be the economic impact of a four-day work week?"
[Compare how different models analyze this question]
[Continue with the model that provides the most nuanced perspective]
```

### Specialized Tasks

Different models may excel at different tasks. Use branching to select the best model for each specific type of query.

Example:
```
User: "Explain quantum computing"
[Find the model that provides the clearest explanation]
```

## Troubleshooting

### Missing API Keys

If certain models don't generate responses, you may need to add API keys in the settings menu. Each model requires its own API key:

- Claude: Anthropic API key
- GPT: OpenAI API key
- Gemini: Google API key
- Grok: X (formerly Twitter) API key

### Error Messages

If a model returns an error, you'll see an error message in place of its response. Common issues include:
- Exceeding token limits
- Network connectivity problems
- API usage restrictions

Try refreshing or simplifying your query if you encounter errors.

## Conclusion

Hatch's branching functionality offers a new way to interact with multiple AI models simultaneously. By comparing responses and continuing conversations along specific branches, you can harness the strengths of each model and explore different conversational paths from a single starting point.

Happy exploring!