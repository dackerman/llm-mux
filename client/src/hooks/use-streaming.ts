import { useState, useEffect, useRef } from 'react';
import { LLMProvider } from '@/types';
import { apiRequest } from '@/lib/queryClient';

interface StreamingOptions {
  chatId: number;
  content: string;
  branchId: string;
  parentTurnId?: string | null;
  provider: LLMProvider;
  onComplete?: (fullResponse: string) => void;
}

/**
 * Custom hook for streaming responses from LLM providers
 */
export function useStreaming() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedContent, setStreamedContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Clean up function to abort any ongoing stream requests
  const cancelStream = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      cancelStream();
    };
  }, []);

  const startStream = async ({
    chatId,
    content,
    branchId,
    parentTurnId,
    provider,
    onComplete
  }: StreamingOptions) => {
    // Cancel any existing streams
    cancelStream();
    
    // Reset state
    setIsStreaming(true);
    setStreamedContent('');
    setError(null);
    
    // Create a new AbortController for this stream
    abortControllerRef.current = new AbortController();
    
    try {
      // Make the request to the stream endpoint
      const response = await fetch(`/api/chats/${chatId}/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          branchId,
          parentTurnId,
          provider
        }),
        signal: abortControllerRef.current.signal
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to start stream');
      }
      
      // Set up event source for Server-Sent Events
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body is not readable');
      }
      
      const decoder = new TextDecoder();
      let accumulatedResponse = '';
      
      const processStream = async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            
            if (done) {
              setIsStreaming(false);
              if (onComplete) {
                onComplete(accumulatedResponse);
              }
              break;
            }
            
            // Decode the chunk
            const chunk = decoder.decode(value, { stream: true });
            
            // Process each line (SSE format sends data line by line)
            const lines = chunk.split('\n\n');
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.substring(6));
                  
                  if (data.error) {
                    setError(data.error);
                    setIsStreaming(false);
                    break;
                  }
                  
                  if (data.done) {
                    setIsStreaming(false);
                    if (onComplete) {
                      onComplete(accumulatedResponse);
                    }
                    break;
                  }
                  
                  if (data.chunk) {
                    accumulatedResponse += data.chunk;
                    setStreamedContent(accumulatedResponse);
                  }
                } catch (e) {
                  console.error('Error parsing SSE data:', e);
                }
              }
            }
          }
        } catch (e) {
          if ((e as Error).name !== 'AbortError') {
            console.error('Error reading stream:', e);
            setError((e as Error).message || 'Stream interrupted');
          }
          setIsStreaming(false);
        }
      };
      
      processStream();
      
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        console.error('Error starting stream:', e);
        setError((e as Error).message || 'Failed to start stream');
      }
      setIsStreaming(false);
    }
  };
  
  return {
    isStreaming,
    streamedContent,
    error,
    startStream,
    cancelStream
  };
}