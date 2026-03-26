/**
 * MessageBubble component for rendering individual chat messages.
 * User messages are primary blue (right-aligned), assistant messages are light (left-aligned).
 */

import ReactMarkdown from 'react-markdown';
import { cn } from '../../lib/utils';
import type { Message } from '../../types';

interface MessageBubbleProps {
  message: Message;
}

/**
 * Format the timestamp for display.
 */
function formatTime(date: Date): string {
  // Handle invalid Date objects gracefully
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    return '';
  }
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Render message content with markdown formatting.
 */
function renderContent(content: string, isUser: boolean): React.ReactNode {
  if (!content) {
    console.debug('[RENDER] empty content');
    return null;
  }

  console.debug('[RENDER] content length:', content.length);

  return (
    <ReactMarkdown
      components={{
        // Style paragraphs with proper spacing
        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
        // Style bold text
        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
        // Style italic text
        em: ({ children }) => <em className="italic">{children}</em>,
        // Style unordered lists
        ul: ({ children }) => <ul className="list-disc list-inside ml-2 mb-2">{children}</ul>,
        // Style ordered lists
        ol: ({ children }) => <ol className="list-decimal list-inside ml-2 mb-2">{children}</ol>,
        // Style list items
        li: ({ children }) => <li className="mb-1">{children}</li>,
        // Style code blocks
        code: ({ children, className }) => {
          const isInline = !className;
          return isInline ? (
            <code className={cn(
              'px-1 py-0.5 rounded text-xs font-mono',
              isUser ? 'bg-primary-foreground/20' : 'bg-muted'
            )}>
              {children}
            </code>
          ) : (
            <code className="block bg-muted p-2 rounded text-xs font-mono overflow-x-auto my-2">
              {children}
            </code>
          );
        },
        // Style links
        a: ({ href, children }) => (
          <a
            href={href}
            className="text-blue-500 hover:text-blue-600 underline break-all"
            target="_blank"
            rel="noopener noreferrer"
          >
            {children}
          </a>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
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
        {renderContent(message.content, isUser)}
      </div>
      <span className="text-xs text-muted-foreground mt-1 px-1">
        {formatTime(message.timestamp)}
      </span>
    </div>
  );
}
