import { useState, useEffect, useRef } from 'react';
import { LLMProvider } from '@/types';
import { apiRequest } from '@/lib/queryClient';

interface MultiStreamingOptions {
  chatId: number;
  content: string;
  branchId: string;
  parentTurnId?: string | null;
  providers: LLMProvider[];
  onComplete?: (results: Partial<Record<LLMProvider, string>>) => void;
}

interface StreamingState {
  isStreaming: boolean;
  content: string;
  error: string | null;
}

type StreamStateRecord = Partial<Record<LLMProvider, StreamingState>>;
type AbortControllerRecord = Partial<Record<LLMProvider, AbortController>>;
type ResponseRecord = Partial<Record<LLMProvider, string>>;

/**
 * Custom hook for streaming responses from multiple LLM providers simultaneously
 */
export function useMultiStreaming() {
  const [streams, setStreams] = useState<StreamStateRecord>({});
  const [isAnyStreaming, setIsAnyStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllersRef = useRef<AbortControllerRecord>({});

  // Clean up function to abort all ongoing stream requests
  const cancelAllStreams = () => {
    Object.values(abortControllersRef.current).forEach(controller => {
      try {
        controller.abort();
      } catch (e) {
        console.error('Error aborting stream:', e);
      }
    });
    abortControllersRef.current = {};
    setIsAnyStreaming(false);
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      cancelAllStreams();
    };
  }, []);

  const startMultiStream = async ({
    chatId,
    content,
    branchId,
    parentTurnId,
    providers,
    onComplete
  }: MultiStreamingOptions) => {
    // Cancel any existing streams
    cancelAllStreams();
    
    // Initialize stream state for each provider
    const initialStreamState: StreamStateRecord = {};
    providers.forEach(provider => {
      initialStreamState[provider] = {
        isStreaming: true,
        content: '',
        error: null
      };
    });
    
    setStreams(initialStreamState);
    setIsAnyStreaming(true);
    setError(null);
    
    // Create a new AbortController for each stream
    const controllers: AbortControllerRecord = {};
    const results: ResponseRecord = {};
    
    try {
      // Create a user turn first to get its ID
      // This ensures all model responses reference the same user message
      let userTurnId = parentTurnId;
      
      if (!userTurnId) {
        try {
          const createUserTurnResponse = await fetch(`/api/chats/${chatId}/turns`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content,
              branchId,
              parentTurnId,
              selectedModels: [providers[0]] // Just need one model to create the user turn
            })
          });
          
          if (createUserTurnResponse.ok) {
            const data = await createUserTurnResponse.json();
            if (data.userTurnId) {
              userTurnId = data.userTurnId;
              console.log(`Created shared user turn ${userTurnId} for multi-model streaming`);
            }
          }
        } catch (e) {
          console.error('Error creating shared user turn:', e);
          // Will proceed without shared turn ID if this fails
        }
      }
      
      // Start streams for each provider
      const streamPromises = providers.map(async (provider) => {
        const controller = new AbortController();
        controllers[provider] = controller;
        abortControllersRef.current = controllers;
        
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
              parentTurnId: userTurnId, // Use the shared user turn ID if we got one
              provider
            }),
            signal: controller.signal
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Failed to start stream for ${provider}`);
          }
          
          // Set up reader for the stream
          const reader = response.body?.getReader();
          if (!reader) {
            throw new Error('Response body is not readable');
          }
          
          const decoder = new TextDecoder();
          let accumulatedResponse = '';
          
          while (true) {
            const { done, value } = await reader.read();
            
            if (done) {
              // Update this stream's state to complete
              setStreams(prev => ({
                ...prev,
                [provider]: {
                  ...prev[provider],
                  isStreaming: false
                }
              }));
              
              // Store final response
              results[provider] = accumulatedResponse;
              
              break;
            }
            
            // Decode the chunk
            const chunk = decoder.decode(value, { stream: true });
            
            // Process each line (SSE format)
            const lines = chunk.split('\n\n');
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.substring(6));
                  
                  if (data.error) {
                    setStreams(prev => ({
                      ...prev,
                      [provider]: {
                        ...prev[provider],
                        error: data.error,
                        isStreaming: false
                      }
                    }));
                    break;
                  }
                  
                  if (data.done) {
                    setStreams(prev => ({
                      ...prev,
                      [provider]: {
                        ...prev[provider],
                        isStreaming: false
                      }
                    }));
                    
                    // Store final response
                    results[provider] = accumulatedResponse;
                    break;
                  }
                  
                  if (data.chunk) {
                    accumulatedResponse += data.chunk;
                    
                    // Update just this provider's content in the state
                    setStreams(prev => ({
                      ...prev,
                      [provider]: {
                        ...prev[provider],
                        content: accumulatedResponse
                      }
                    }));
                  }
                } catch (e) {
                  console.error(`Error parsing SSE data for ${provider}:`, e);
                }
              }
            }
          }
        } catch (e) {
          if ((e as Error).name !== 'AbortError') {
            console.error(`Error in stream for ${provider}:`, e);
            setStreams(prev => ({
              ...prev,
              [provider]: {
                ...prev[provider],
                error: (e as Error).message || `Stream for ${provider} interrupted`,
                isStreaming: false
              }
            }));
          }
        }
      });
      
      // Wait for all streams to complete
      await Promise.allSettled(streamPromises);
      
      // Check if all streams are done
      const allCompleted = Object.values(results).length === providers.length;
      if (allCompleted && onComplete) {
        onComplete(results);
      }
      
      setIsAnyStreaming(false);
      
    } catch (e) {
      console.error('Error starting multiple streams:', e);
      setError((e as Error).message || 'Failed to start streams');
      setIsAnyStreaming(false);
    }
  };

  // Check if all streams are complete
  useEffect(() => {
    if (isAnyStreaming && Object.keys(streams).length > 0) {
      const allComplete = Object.values(streams).every(stream => !stream.isStreaming);
      if (allComplete) {
        setIsAnyStreaming(false);
      }
    }
  }, [streams, isAnyStreaming]);

  // Utility to cancel a specific stream
  const cancelStream = (provider: LLMProvider) => {
    const controller = abortControllersRef.current[provider];
    if (controller) {
      try {
        controller.abort();
        delete abortControllersRef.current[provider];
        
        setStreams(prev => ({
          ...prev,
          [provider]: {
            ...prev[provider],
            isStreaming: false
          }
        }));
      } catch (e) {
        console.error(`Error canceling stream for ${provider}:`, e);
      }
    }
  };
  
  return {
    streams,
    isAnyStreaming,
    error,
    startMultiStream,
    cancelStream,
    cancelAllStreams
  };
}