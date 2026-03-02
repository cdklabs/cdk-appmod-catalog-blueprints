/**
 * ChatPanel component - main container for the chat interface.
 * Displays messages, typing indicator, error banner, and input field.
 */

import { useRef, useEffect, useState } from 'react';
import { MessageSquare, AlertCircle, X } from 'lucide-react';
import { useChat } from '../../hooks/useChat';
import { MessageBubble } from './MessageBubble';
import { TypingIndicator } from './TypingIndicator';
import { MessageLoading } from './MessageLoading';
import { ChatInput } from './ChatInput';
import { ExportProgress } from '../data/ExportProgress';
import { PreviewProgress } from '../data/PreviewProgress';

/** Time in ms before showing stall indicator */
const STALL_THRESHOLD_MS = 1000;

/**
 * Welcome message shown when chat is empty.
 */
function WelcomeMessage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
        <MessageSquare className="w-8 h-8 text-primary" />
      </div>
      <h2 className="text-lg font-semibold text-foreground mb-2">
        Describe Your Dataset
      </h2>
      <p className="text-sm text-muted-foreground max-w-[280px]">
        Tell me what kind of synthetic data you need. I&apos;ll generate a schema,
        show you a preview, and let you export the full dataset.
      </p>
      <div className="mt-6 space-y-2 text-xs text-muted-foreground">
        <p className="font-medium text-foreground">Try something like:</p>
        <p>&quot;Generate 1000 rows of e-commerce order data&quot;</p>
        <p>&quot;Create a customer database with realistic names&quot;</p>
        <p>&quot;Make sensor readings for IoT devices&quot;</p>
      </div>
    </div>
  );
}

/**
 * Error banner displayed when there's an error.
 */
interface ErrorBannerProps {
  message: string;
  onDismiss: () => void;
}

function ErrorBanner({ message, onDismiss }: ErrorBannerProps) {
  return (
    <div className="mx-4 mb-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-2">
      <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
      <p className="flex-1 text-sm text-destructive">{message}</p>
      <button
        onClick={onDismiss}
        className="flex-shrink-0 p-1 hover:bg-destructive/10 rounded"
        aria-label="Dismiss error"
      >
        <X className="w-4 h-4 text-destructive" />
      </button>
    </div>
  );
}

export function ChatPanel() {
  const { messages, schema, preview, isStreaming, isExporting, downloads, error, sendMessage, clearError } = useChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isStalled, setIsStalled] = useState(false);
  const lastContentLengthRef = useRef(0);
  const stallTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track content changes to detect stalls during streaming
  useEffect(() => {
    if (!isStreaming) {
      // Not streaming - clear stall state
      setIsStalled(false);
      lastContentLengthRef.current = 0;
      if (stallTimerRef.current) {
        clearTimeout(stallTimerRef.current);
        stallTimerRef.current = null;
      }
      return;
    }

    // Find the streaming message
    const streamingMsg = messages.find(m => m.id === 'streaming');
    const currentLength = streamingMsg?.content?.length || 0;

    // Content changed - reset stall timer
    if (currentLength !== lastContentLengthRef.current) {
      lastContentLengthRef.current = currentLength;
      setIsStalled(false);

      // Clear existing timer
      if (stallTimerRef.current) {
        clearTimeout(stallTimerRef.current);
      }

      // Start new stall detection timer
      stallTimerRef.current = setTimeout(() => {
        setIsStalled(true);
      }, STALL_THRESHOLD_MS);
    }

    return () => {
      if (stallTimerRef.current) {
        clearTimeout(stallTimerRef.current);
      }
    };
  }, [isStreaming, messages]);

  // Auto-scroll to bottom when messages change or export progress updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming, isExporting, downloads, isStalled]);

  const handleSend = async (content: string) => {
    await sendMessage(content);
  };

  const hasMessages = messages.length > 0;

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-border bg-sidebar">
        <h1 className="text-lg font-semibold text-sidebar-foreground">
          Generate Dataset
        </h1>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto">
        {!hasMessages ? (
          <WelcomeMessage />
        ) : (
          <div className="p-4 space-y-4">
            {messages.map((message) => {
              // Show typing indicator instead of empty streaming message
              if (isStreaming && message.id === 'streaming' && !message.content) {
                return <TypingIndicator key={message.id} />;
              }
              return <MessageBubble key={message.id} message={message} />;
            })}
            {/* Preview progress - shows when schema arrived but preview hasn't yet */}
            {isStreaming && schema.length > 0 && preview.length === 0 && (
              <PreviewProgress hasPreview={false} hasSchema={true} />
            )}
            {/* Generic stall indicator - shows for tool executions when no schema yet or preview exists */}
            {isStreaming && isStalled && !isExporting && schema.length === 0 && <MessageLoading />}
            {/* Export progress indicator */}
            {(isExporting || (downloads && (downloads.csv || downloads.json || downloads.schema || downloads.script))) && (
              <ExportProgress
                downloads={downloads}
                isExporting={isExporting}
              />
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Error banner */}
      {error && <ErrorBanner message={error} onDismiss={clearError} />}

      {/* Input */}
      <ChatInput onSend={handleSend} disabled={isStreaming} />
    </div>
  );
}
