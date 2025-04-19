# Hatch: Multi-LLM Chat Platform

A modern web application that allows you to chat with multiple large language models simultaneously, compare their responses side-by-side, and branch conversations based on preferred responses.

![Hatch Multi-LLM Chat Platform](./screenshot.png)

## Features

- **Multi-Model Conversations**: Send a single message to multiple LLMs at once and compare their responses
- **Powerful Branching System**: Continue conversations with your preferred model's response, creating multiple parallel conversation paths
- **Streaming Responses**: Watch AI responses appear in real-time, reducing perceived latency (see [Streaming Guide](./docs/streaming-guide.md))
- **Supported Models**:
  - 🟣 **Claude** (Anthropic) - Latest Claude 3.7 Sonnet
  - 🟢 **GPT** (OpenAI) - Latest GPT-4o model
  - 🔵 **Gemini** (Google) - Latest Gemini Pro model
  - 🟠 **Grok** (xAI) - Latest Grok model
- **Clean Interface**: Focus on the conversation with a distraction-free design
- **Markdown Support**: All chat messages support rich markdown formatting for better readability
- **Persistent Storage**: Chat history and branch data saved to a PostgreSQL database
- **API Key Management**: Securely save your API keys for various providers
- **Responsive Design**: Optimized for both desktop and mobile experiences

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- API keys for at least one of the supported LLM providers:
  - Anthropic API key for Claude
  - OpenAI API key for GPT models
  - Google AI API key for Gemini
  - xAI API key for Grok

### Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables:
   ```
   DATABASE_URL=postgresql://username:password@hostname:port/database
   ANTHROPIC_API_KEY=your_anthropic_key (optional)
   OPENAI_API_KEY=your_openai_key (optional)
   GEMINI_API_KEY=your_gemini_key (optional)
   XAI_API_KEY=your_xai_key (optional)
   ```
4. Run the development server: `npm run dev`
5. Open your browser and navigate to `http://localhost:5000`

## Usage Guide

1. **Starting a New Chat**:
   - Click on the "New Chat" button in the sidebar to start a fresh conversation

2. **Selecting Models**:
   - Click on the "Models" button in the header to open the model selection dialog
   - Toggle which LLMs you want to include in the conversation
   - You need to have the appropriate API key configured for each model

3. **Sending Messages**:
   - Type your message in the input box at the bottom of the screen
   - Press Enter or click the send button to submit
   - Your message will be sent to all selected models simultaneously
   - Streaming is automatically enabled for all conversations:
     - Single model: See responses in real-time in a single stream
     - Multiple models: Watch all responses generate in parallel with the multi-stream view

4. **Using the Branching System**:
   - After receiving a response, click "Compare with..." button below your message
   - Select multiple AI models you'd like to compare
   - View responses side-by-side (desktop) or in accordion format (mobile)
   - Click "Continue with this response" under any model's response to follow that branch
   - The conversation will continue along that specific path, maintaining context with that model
   - [Read the detailed Branching Guide for more information](./docs/branching-guide.md)

5. **Managing API Keys**:
   - Click on the settings icon in the header
   - Enter your API keys for the different LLM providers
   - Keys are securely stored in the database

## Technical Architecture

### Frontend
- React with TypeScript
- Tailwind CSS with shadcn/ui components
- TanStack Query for data fetching
- Wouter for routing

### Backend
- Node.js with Express
- PostgreSQL database with Drizzle ORM
- Server-Sent Events (SSE) for streaming responses
- Modular LLM integration with providers for:
  - Anthropic Claude
  - OpenAI GPT
  - Google Gemini
  - xAI Grok

### Database Schema
- **Users**: Authentication and user management
- **Chats**: Conversation containers
- **Messages**: Legacy message storage (for backward compatibility)
- **Turns**: New message model supporting branching conversations
  - Tracks parent-child relationships between messages
  - Stores branch identifiers for conversation pathways
  - Connects messages with specific LLM models
- **API Keys**: Securely stored provider API keys

## Development

### Key Files and Directories

- `/client`: Frontend React application
  - `/src/components`: UI components
  - `/src/pages`: Application pages
  - `/src/hooks`: Custom React hooks
- `/server`: Backend Express server
  - `/llm`: LLM provider integration modules
  - `/storage.ts`: Storage interface
  - `/storage-pg.ts`: PostgreSQL storage implementation
  - `/routes.ts`: API endpoints
- `/shared`: Shared code between frontend and backend
  - `/schema.ts`: Database schema and type definitions
- `/drizzle`: Database migrations
- `/docs`: Documentation files
  - `/branching-guide.md`: Detailed guide to the LLM branching system
  - `/streaming-guide.md`: Guide to using real-time response streaming

### Running Database Migrations

The application uses Drizzle ORM for database migrations:

```bash
# Push schema changes to the database
npm run db:push

# Generate a new migration
npm run db:generate
```

## License

MIT

---

Made with ❤️ using React, Express, and PostgreSQL