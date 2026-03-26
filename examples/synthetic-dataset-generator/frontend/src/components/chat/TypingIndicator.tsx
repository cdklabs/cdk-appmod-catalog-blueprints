/**
 * TypingIndicator component displays animated dots while the agent is generating a response.
 */

export function TypingIndicator() {
  return (
    <div className="flex max-w-[85%] mr-auto">
      <div className="bg-surface text-foreground px-4 py-3 rounded-[12px_12px_12px_4px]">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.3s]" />
          <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.15s]" />
          <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
        </div>
      </div>
    </div>
  );
}
