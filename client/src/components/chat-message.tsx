import { Message, LLM_PROVIDERS } from "@/types";
import { useEffect, useRef } from "react";
import { format } from "date-fns";

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const messageRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (messageRef.current) {
      messageRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [message]);

  // Format the timestamp
  const timestamp = new Date(message.createdAt);
  const timeAgo = format(timestamp, 'h:mm a');

  if (message.role === 'user') {
    return (
      <div className="flex items-start justify-end" ref={messageRef}>
        <div className="bg-blue-500 text-white p-3 rounded-lg max-w-md ml-12 text-sm">
          <p>{message.content}</p>
        </div>
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center ml-3">
          <span className="material-icons text-white text-sm">person</span>
        </div>
      </div>
    );
  }

  // For assistant messages
  if (!message.modelId) {
    return (
      <div className="flex items-start" ref={messageRef}>
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center mr-3">
          <span className="material-icons text-gray-600 text-sm">smart_toy</span>
        </div>
        <div className="flex flex-col space-y-1 max-w-2xl">
          <div className="flex items-center">
            <span className="text-xs font-medium text-gray-600 mr-2">Assistant</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">{timeAgo}</span>
          </div>
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3 rounded-lg text-sm">
            <p>{message.content}</p>
          </div>
        </div>
      </div>
    );
  }

  // For specific LLM responses
  const provider = message.modelId;
  const config = LLM_PROVIDERS[provider];

  return (
    <div className="flex items-start" ref={messageRef}>
      <div 
        className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mr-3"
        style={{ backgroundColor: config.color }}
      >
        <span className="material-icons text-white text-sm">smart_toy</span>
      </div>
      <div className="flex flex-col space-y-1 max-w-2xl">
        <div className="flex items-center">
          <span 
            className="text-xs font-medium mr-2"
            style={{ color: config.color }}
          >
            {config.name}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">{timeAgo}</span>
        </div>
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3 rounded-lg text-sm">
          <div dangerouslySetInnerHTML={{ 
            __html: message.content
              .replace(/\n\n/g, '</p><p>')
              .replace(/\n/g, '<br>')
              .replace(/^(.+?)$/, '<p>$1</p>')
          }} />
        </div>
      </div>
    </div>
  );
}

export function SystemMessage({ content }: { content: string }) {
  return (
    <div className="flex items-start">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mr-3">
        <span className="material-icons text-blue-500 dark:text-blue-400 text-sm">info</span>
      </div>
      <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg max-w-md text-sm">
        <p>{content}</p>
      </div>
    </div>
  );
}
