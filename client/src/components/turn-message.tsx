import { Turn, LLM_PROVIDERS, LLMProvider } from "@/types";
import { useEffect, useRef } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useIsMobile } from "@/hooks/use-mobile";

interface TurnMessageProps {
  turn: Turn;
  branches?: Turn[];
  onContinueWithBranch?: (branchId: string) => void;
  onCompareWithModels?: (turnId: string) => void;
  isLatestUserTurn?: boolean;
}

export function TurnMessage({ 
  turn,
  branches = [],
  onContinueWithBranch,
  onCompareWithModels,
  isLatestUserTurn = false
}: TurnMessageProps) {
  const messageRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  
  useEffect(() => {
    if (messageRef.current) {
      messageRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [turn]);

  // Format the timestamp
  const timestamp = new Date(turn.timestamp);
  const timeAgo = format(timestamp, 'h:mm a');

  // Handle user turn
  if (turn.role === 'user') {
    return (
      <div className="flex flex-col space-y-2" ref={messageRef}>
        <div className="flex items-start justify-end">
          <div className="bg-blue-500 text-white p-3 rounded-lg max-w-md ml-12 text-sm">
            <p>{turn.content}</p>
          </div>
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center ml-3">
            <span className="material-icons text-white text-sm">person</span>
          </div>
        </div>

        {/* Compare with models button (only if this is the latest user turn) */}
        {isLatestUserTurn && onCompareWithModels && (
          <div className="flex justify-end pr-11">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onCompareWithModels(turn.id)}
              className="text-xs"
            >
              <span className="material-icons text-xs mr-1">compare_arrows</span>
              Compare with...
            </Button>
          </div>
        )}
      </div>
    );
  }

  // For a single assistant message with no branches
  if (branches.length === 0) {
    const provider = turn.model as LLMProvider;
    const config = provider ? LLM_PROVIDERS[provider] : null;
    const isError = turn.content.startsWith('Error:');
    
    return (
      <div className="flex items-start" ref={messageRef}>
        <div 
          className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
            isError ? 'bg-red-500' : (config ? '' : 'bg-gray-200')
          }`}
          style={{ backgroundColor: isError ? undefined : (config ? config.color : undefined) }}
        >
          <span className="material-icons text-white text-sm">
            {isError ? 'error' : 'smart_toy'}
          </span>
        </div>
        <div className="flex flex-col space-y-1 max-w-2xl">
          <div className="flex items-center">
            <span 
              className={`text-xs font-medium mr-2 ${isError ? 'text-red-500' : ''}`}
              style={{ color: isError ? undefined : (config ? config.color : undefined) }}
            >
              {config ? config.name : 'Assistant'} {isError ? '(Error)' : ''}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">{timeAgo}</span>
          </div>
          <div className={`${
            isError 
              ? 'bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30' 
              : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
            } p-3 rounded-lg text-sm`}
          >
            {isError ? (
              <p className={`${isError ? 'text-red-600 dark:text-red-400' : ''}`}>
                {turn.content.replace('Error: ', '')}
              </p>
            ) : (
              <div dangerouslySetInnerHTML={{ 
                __html: turn.content
                  .replace(/\n\n/g, '</p><p>')
                  .replace(/\n/g, '<br>')
                  .replace(/^(.+?)$/, '<p>$1</p>')
              }} />
            )}
          </div>
          
          {/* Continue with this response button */}
          {onContinueWithBranch && (
            <div className="mt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onContinueWithBranch(turn.branchId)}
                className="text-xs"
              >
                <span className="material-icons text-xs mr-1">subdirectory_arrow_right</span>
                Continue with this response
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // For branches, mobile uses accordions, desktop uses horizontal scroll
  return (
    <div className="flex flex-col space-y-2" ref={messageRef}>
      <div className="flex items-center">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center mr-3">
          <span className="material-icons text-gray-600 text-sm">compare_arrows</span>
        </div>
        <div className="flex items-center">
          <span className="text-xs font-medium text-gray-600 mr-2">Multiple Responses</span>
          <span className="text-xs text-gray-500 dark:text-gray-400">{timeAgo}</span>
        </div>
      </div>

      {isMobile ? (
        // Mobile: Accordion style
        <div className="ml-11 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          {branches.map((branch, index) => {
            const provider = branch.model as LLMProvider;
            const config = provider ? LLM_PROVIDERS[provider] : null;
            const isError = branch.content.startsWith('Error:');
            
            return (
              <div 
                key={branch.id}
                className={`border-t border-gray-200 dark:border-gray-700 ${index === 0 ? 'border-t-0' : ''}`}
              >
                <div 
                  className={`p-3 ${
                    isError 
                      ? 'bg-red-50 dark:bg-red-900/10' 
                      : (config ? `bg-opacity-10 dark:bg-opacity-5` : 'bg-white dark:bg-gray-800')
                  }`}
                  style={config && !isError ? { backgroundColor: config.bgColor } : undefined}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span 
                      className={`text-xs font-medium ${isError ? 'text-red-500' : ''}`}
                      style={{ color: isError ? undefined : (config ? config.color : undefined) }}
                    >
                      {config ? config.name : 'Assistant'} {isError ? '(Error)' : ''}
                    </span>
                    
                    {onContinueWithBranch && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onContinueWithBranch(branch.branchId)}
                        className="h-6 text-xs"
                      >
                        <span className="material-icons text-xs mr-1">arrow_forward</span>
                        Continue
                      </Button>
                    )}
                  </div>
                  
                  {isError ? (
                    <p className={`text-sm ${isError ? 'text-red-600 dark:text-red-400' : ''}`}>
                      {branch.content.replace('Error: ', '')}
                    </p>
                  ) : (
                    <div 
                      className="text-sm"
                      dangerouslySetInnerHTML={{ 
                        __html: branch.content
                          .replace(/\n\n/g, '</p><p>')
                          .replace(/\n/g, '<br>')
                          .replace(/^(.+?)$/, '<p>$1</p>')
                      }} 
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        // Desktop: Horizontal scrolling cards
        <div className="ml-11 overflow-hidden">
          <ScrollArea className="w-full pb-4">
            <div className="flex space-x-4 overflow-x-auto py-1 px-0.5">
              {branches.map((branch) => {
                const provider = branch.model as LLMProvider;
                const config = provider ? LLM_PROVIDERS[provider] : null;
                const isError = branch.content.startsWith('Error:');
                
                return (
                  <div 
                    key={branch.id}
                    className={`flex-shrink-0 w-72 border rounded-lg overflow-hidden ${
                      isError 
                        ? 'border-red-200 dark:border-red-800/30' 
                        : (config ? '' : 'border-gray-200 dark:border-gray-700')
                    }`}
                    style={config && !isError ? { borderColor: config.borderColor } : undefined}
                  >
                    <div 
                      className={`p-3 h-full flex flex-col ${
                        isError 
                          ? 'bg-red-50 dark:bg-red-900/10' 
                          : (config ? `bg-opacity-10 dark:bg-opacity-5` : 'bg-white dark:bg-gray-800')
                      }`}
                      style={config && !isError ? { backgroundColor: config.bgColor } : undefined}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span 
                          className={`text-xs font-medium ${isError ? 'text-red-500' : ''}`}
                          style={{ color: isError ? undefined : (config ? config.color : undefined) }}
                        >
                          {config ? config.name : 'Assistant'} {isError ? '(Error)' : ''}
                        </span>
                      </div>
                      
                      <div className="flex-1 overflow-y-auto max-h-60">
                        {isError ? (
                          <p className={`text-sm ${isError ? 'text-red-600 dark:text-red-400' : ''}`}>
                            {branch.content.replace('Error: ', '')}
                          </p>
                        ) : (
                          <div 
                            className="text-sm"
                            dangerouslySetInnerHTML={{ 
                              __html: branch.content
                                .replace(/\n\n/g, '</p><p>')
                                .replace(/\n/g, '<br>')
                                .replace(/^(.+?)$/, '<p>$1</p>')
                            }} 
                          />
                        )}
                      </div>
                      
                      {onContinueWithBranch && (
                        <div className="mt-3 pt-2 border-t border-gray-100 dark:border-gray-700">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onContinueWithBranch(branch.branchId)}
                            className="w-full text-xs justify-center"
                          >
                            <span className="material-icons text-xs mr-1">arrow_forward</span>
                            Continue
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}

export function TurnSystemMessage({ content }: { content: string }) {
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