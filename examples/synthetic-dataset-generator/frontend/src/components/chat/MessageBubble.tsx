/**
 * MessageBubble component for rendering individual chat messages.
 * User messages are primary blue (right-aligned), assistant messages are light (left-aligned).
 */

import { cn } from '../../lib/utils';
import type { Message } from '../../types';

interface MessageBubbleProps {
  message: Message;
}

/**
 * Format the timestamp for display.
 */
function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Render message content with basic markdown-like formatting.
 * Supports newlines and simple bullet points.
 */
function renderContent(content: string): React.ReactNode {
  if (!content) return null;

  // Split by newlines and process each line
  const lines = content.split('\n');

  return lines.map((line, index) => {
    const trimmed = line.trim();

    // Handle bullet points
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      return (
        <div key={index} className="flex items-start gap-2 ml-2">
          <span className="text-muted-foreground">{'.'}</span>
          <span>{trimmed.slice(2)}</span>
        </div>
      );
    }

    // Handle numbered lists
    const numberedMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (numberedMatch) {
      return (
        <div key={index} className="flex items-start gap-2 ml-2">
          <span className="text-muted-foreground min-w-[1.5rem]">{numberedMatch[1]}.</span>
          <span>{numberedMatch[2]}</span>
        </div>
      );
    }

    // Regular line with optional line break
    return (
      <span key={index}>
        {line}
        {index < lines.length - 1 && <br />}
      </span>
    );
  });
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div
      className={cn(
        'flex flex-col max-w-[85%]',
        isUser ? 'ml-auto items-end' : 'mr-auto items-start'
      )}
    >
      <div
        className={cn(
          'px-4 py-3 text-sm leading-relaxed break-words',
          isUser
            ? 'bg-primary text-primary-foreground rounded-[12px_12px_4px_12px]'
            : 'bg-surface text-foreground rounded-[12px_12px_12px_4px]'
        )}
      >
        {renderContent(message.content)}
      </div>
      <span className="text-xs text-muted-foreground mt-1 px-1">
        {formatTime(message.timestamp)}
      </span>
    </div>
  );
}
