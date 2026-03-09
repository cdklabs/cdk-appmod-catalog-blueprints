import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isThinking?: boolean;
}

interface ChatProps {
  apiEndpoint: string;
  getIdToken: () => Promise<string | null>;
}

const SUGGESTIONS = [
  "What's the current price of AAPL?",
  "Give me a technical analysis of NVDA",
  "How are the major indices doing today?",
  "What's the latest stock market news?",
  "Compare MSFT and GOOGL fundamentals",
  "Show me Tesla's price history for the last 3 months",
];

// SSE event types from Strands agent that should be hidden from the user
function isToolEvent(parsed: Record<string, unknown>): boolean {
  // Tool use events
  if (parsed.type === "tool_use" || parsed.type === "tool_result") return true;
  if (parsed.tool_use || parsed.tool_result) return true;
  if (parsed.type === "content_block_start" && parsed.content_block) {
    const block = parsed.content_block as Record<string, unknown>;
    if (block.type === "tool_use") return true;
  }
  if (parsed.type === "content_block_delta" && parsed.delta) {
    const delta = parsed.delta as Record<string, unknown>;
    if (delta.type === "input_json_delta") return true;
  }
  // Tool call/result in various formats
  if (parsed.event === "tool_call" || parsed.event === "tool_result") return true;
  if (parsed.event === "tool_use" || parsed.event === "tool_input") return true;
  // Thinking/reasoning events
  if (parsed.type === "thinking" || parsed.event === "thinking") return true;
  // Metadata events
  if (parsed.type === "message_start" || parsed.type === "message_stop") return true;
  if (parsed.type === "message_delta") return true;
  if (parsed.type === "content_block_stop") return true;
  if (parsed.type === "ping" || parsed.event === "ping") return true;
  return false;
}

// Extract displayable text from an SSE event
function extractText(parsed: Record<string, unknown>): string {
  // Skip tool events entirely
  if (isToolEvent(parsed)) return "";

  // Content block delta with text
  if (parsed.type === "content_block_delta" && parsed.delta) {
    const delta = parsed.delta as Record<string, unknown>;
    if (delta.type === "text_delta" && typeof delta.text === "string") {
      return delta.text;
    }
  }

  // Direct text fields (various Strands/AgentCore formats)
  if (typeof parsed.data === "string") return parsed.data;
  if (typeof parsed.content === "string" && !parsed.tool_use) return parsed.content;
  if (typeof parsed.text === "string") return parsed.text;

  // Nested delta.text
  if (parsed.delta && typeof (parsed.delta as Record<string, unknown>).text === "string") {
    return (parsed.delta as Record<string, unknown>).text as string;
  }

  return "";
}

// Strip tool call/result XML blocks and normalize markdown formatting.
function cleanResponseText(text: string): string {
  // Remove any XML-like block that contains JSON (tool calls/results).
  // Matches <tag_name> ... </tag_name> where content looks like tool data.
  // Covers: <function_calls>, <function_result>, <invoke>, <tool_call>,
  //         <tool_result>, <stock_price>, <get_stock_price>, etc.
  let cleaned = text.replace(
    /<(function_calls|function_result|invoke|tool_call|tool_result|parameter)>[\s\S]*?<\/\1>\s*/g,
    ""
  );
  // Remove self-closing or complete blocks for any tag containing JSON-like content
  // e.g., <stock_price> {"symbol": "AAPL"} </stock_price>
  cleaned = cleaned.replace(
    /<([a-z_]+)>\s*\{[\s\S]*?\}\s*<\/\1>\s*/g,
    ""
  );
  // Remove any remaining tool-pattern XML blocks:
  // <tag_name> ... </tag_name> where tag looks like a tool name (snake_case)
  cleaned = cleaned.replace(
    /<([a-z][a-z0-9_]*)>\s*[\s\S]*?<\/\1>\s*/g,
    (match, tag) => {
      // Preserve common HTML-like tags used in markdown
      const htmlTags = new Set(["p", "br", "em", "strong", "a", "b", "i", "u", "s", "code", "pre", "ul", "ol", "li", "h1", "h2", "h3", "h4", "h5", "h6", "table", "tr", "td", "th", "thead", "tbody", "div", "span", "blockquote", "hr", "img", "sub", "sup"]);
      if (htmlTags.has(tag)) return match;
      return "";
    }
  );
  // Remove any trailing incomplete XML block still streaming in
  cleaned = cleaned.replace(/<([a-z_]+)>\s*(\{[\s\S]*)?$/, "");

  // Ensure blank line before markdown tables so they render properly.
  // A table starts with a line beginning with |
  cleaned = cleaned.replace(/([^\n])\n(\|[^\n]+\|)/g, "$1\n\n$2");

  // Ensure blank line before markdown headers
  cleaned = cleaned.replace(/([^\n])\n(#{1,6} )/g, "$1\n\n$2");

  // Ensure blank line before lists
  cleaned = cleaned.replace(/([^\n])\n([-*] )/g, "$1\n\n$2");
  cleaned = cleaned.replace(/([^\n])\n(\d+\. )/g, "$1\n\n$2");

  // Ensure blank line before code blocks
  cleaned = cleaned.replace(/([^\n])\n(```)/g, "$1\n\n$2");

  // Collapse 3+ consecutive newlines to 2
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n");

  return cleaned.trim();
}

// Keep old name as alias for all call sites
const stripToolXml = cleanResponseText;

export default function Chat({ apiEndpoint, getIdToken }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [conversationId] = useState(() => crypto.randomUUID());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking]);

  const updateLastMessage = (rawText: string) => {
    const cleaned = stripToolXml(rawText);
    setMessages((prev) => {
      const updated = [...prev];
      updated[updated.length - 1] = {
        ...updated[updated.length - 1],
        content: cleaned,
      };
      return updated;
    });
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: Message = {
      role: "user",
      content: text.trim(),
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setIsThinking(true);

    try {
      const token = await getIdToken();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch(`${apiEndpoint}`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          message: text.trim(),
          conversationId,
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const contentType = res.headers.get("content-type") || "";

      if (
        contentType.includes("text/event-stream") ||
        contentType.includes("text/plain")
      ) {
        const reader = res.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let fullText = "";
        let addedMessage = false;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6);
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);
              const extracted = extractText(parsed);

              if (extracted) {
                // First text received — hide thinking indicator, add message
                if (!addedMessage) {
                  setIsThinking(false);
                  setMessages((prev) => [
                    ...prev,
                    { role: "assistant", content: "", timestamp: new Date() },
                  ]);
                  addedMessage = true;
                }
                fullText += extracted;
                updateLastMessage(fullText);
              }
            } catch {
              // Non-JSON data — only append if it looks like actual text
              const trimmed = data.trim();
              if (
                trimmed &&
                !trimmed.startsWith("{") &&
                !trimmed.startsWith("[")
              ) {
                if (!addedMessage) {
                  setIsThinking(false);
                  setMessages((prev) => [
                    ...prev,
                    { role: "assistant", content: "", timestamp: new Date() },
                  ]);
                  addedMessage = true;
                }
                fullText += trimmed;
                updateLastMessage(fullText);
              }
            }
          }
        }

        // Handle case where stream had no displayable text
        if (!addedMessage) {
          setIsThinking(false);
          const remaining = decoder.decode().trim();
          if (remaining) {
            setMessages((prev) => [
              ...prev,
              { role: "assistant", content: stripToolXml(remaining), timestamp: new Date() },
            ]);
          }
        }
      } else {
        setIsThinking(false);
        const data = await res.json();
        const content =
          data.message || data.content || data.output || JSON.stringify(data);
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: stripToolXml(content), timestamp: new Date() },
        ]);
      }
    } catch {
      setIsThinking(false);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Sorry, I encountered an error connecting to the backend. Please try again.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
      setIsThinking(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.messagesArea}>
        {messages.length === 0 && (
          <div style={styles.welcome}>
            <h2 style={styles.welcomeTitle}>
              Welcome! Ask me about the stock market.
            </h2>
            <p style={styles.welcomeText}>
              I can look up stock prices, perform technical analysis, fetch
              company fundamentals, and get the latest market news.
            </p>
            <div style={styles.suggestions}>
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  style={styles.suggestionBtn}
                  onClick={() => sendMessage(s)}
                  onMouseOver={(e) =>
                    (e.currentTarget.style.borderColor = "#38bdf8")
                  }
                  onMouseOut={(e) =>
                    (e.currentTarget.style.borderColor = "#334155")
                  }
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              ...styles.messageBubble,
              ...(msg.role === "user"
                ? styles.userBubble
                : styles.assistantBubble),
            }}
          >
            <div style={styles.roleLabel}>
              {msg.role === "user" ? "You" : "Analyst"}
            </div>
            <div
              style={styles.messageContent}
              className={msg.role === "assistant" ? "markdown-body" : ""}
            >
              {msg.role === "assistant" ? (
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              ) : (
                msg.content
              )}
            </div>
          </div>
        ))}

        {isThinking && (
          <div style={{ ...styles.messageBubble, ...styles.assistantBubble }}>
            <div style={styles.roleLabel}>Analyst</div>
            <div style={styles.thinkingRow}>
              <div style={styles.typing}>
                <span style={styles.dot} />
                <span style={{ ...styles.dot, animationDelay: "0.2s" }} />
                <span style={{ ...styles.dot, animationDelay: "0.4s" }} />
              </div>
              <span style={styles.thinkingText}>Analyzing...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div style={styles.inputArea}>
        <textarea
          ref={inputRef}
          style={styles.input}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about any stock, market index, or financial topic..."
          rows={1}
          disabled={isLoading}
        />
        <button
          style={{
            ...styles.sendBtn,
            opacity: isLoading || !input.trim() ? 0.5 : 1,
          }}
          onClick={() => sendMessage(input)}
          disabled={isLoading || !input.trim()}
        >
          Send
        </button>
      </div>

      <p style={styles.disclaimer}>
        For informational purposes only. Not financial advice. Data from Yahoo
        Finance.
      </p>

      <style>{`
        @keyframes blink {
          0%, 80%, 100% { opacity: 0.3; }
          40% { opacity: 1; }
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { margin: 0; }
        textarea:focus { outline: none; border-color: #38bdf8 !important; }

        /* Markdown styling for assistant messages */
        .markdown-body h1, .markdown-body h2, .markdown-body h3 {
          color: #f1f5f9;
          margin: 12px 0 6px 0;
          line-height: 1.3;
        }
        .markdown-body h1 { font-size: 18px; }
        .markdown-body h2 { font-size: 16px; }
        .markdown-body h3 { font-size: 15px; }
        .markdown-body p {
          margin: 6px 0;
          line-height: 1.6;
        }
        .markdown-body ul, .markdown-body ol {
          margin: 6px 0;
          padding-left: 20px;
        }
        .markdown-body li {
          margin: 3px 0;
        }
        .markdown-body strong {
          color: #f1f5f9;
          font-weight: 600;
        }
        .markdown-body em {
          color: #cbd5e1;
        }
        .markdown-body code {
          background: #0f172a;
          color: #38bdf8;
          padding: 1px 5px;
          border-radius: 4px;
          font-size: 13px;
        }
        .markdown-body pre {
          background: #0f172a;
          border: 1px solid #334155;
          border-radius: 8px;
          padding: 12px;
          overflow-x: auto;
          margin: 8px 0;
        }
        .markdown-body pre code {
          background: none;
          padding: 0;
          color: #e2e8f0;
        }
        .markdown-body table {
          width: 100%;
          border-collapse: collapse;
          margin: 8px 0;
          font-size: 13px;
        }
        .markdown-body th {
          background: #0f172a;
          color: #94a3b8;
          font-weight: 600;
          text-align: left;
          padding: 8px 10px;
          border-bottom: 2px solid #334155;
        }
        .markdown-body td {
          padding: 6px 10px;
          border-bottom: 1px solid #1e293b;
          color: #e2e8f0;
        }
        .markdown-body tr:hover td {
          background: rgba(56, 189, 248, 0.05);
        }
        .markdown-body blockquote {
          border-left: 3px solid #38bdf8;
          padding-left: 12px;
          margin: 8px 0;
          color: #94a3b8;
        }
        .markdown-body hr {
          border: none;
          border-top: 1px solid #334155;
          margin: 12px 0;
        }
        .markdown-body a {
          color: #38bdf8;
          text-decoration: none;
        }
        .markdown-body a:hover {
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "calc(100vh - 73px)",
    maxWidth: "900px",
    margin: "0 auto",
    padding: "0 16px",
  },
  messagesArea: {
    flex: 1,
    overflowY: "auto",
    padding: "24px 0",
  },
  welcome: {
    textAlign: "center",
    padding: "48px 16px",
  },
  welcomeTitle: {
    fontSize: "24px",
    fontWeight: 600,
    marginBottom: "8px",
    color: "#f1f5f9",
  },
  welcomeText: {
    color: "#94a3b8",
    marginBottom: "32px",
    fontSize: "15px",
  },
  suggestions: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    justifyContent: "center",
  },
  suggestionBtn: {
    background: "transparent",
    border: "1px solid #334155",
    borderRadius: "20px",
    color: "#cbd5e1",
    padding: "8px 16px",
    cursor: "pointer",
    fontSize: "13px",
    transition: "border-color 0.2s",
  },
  messageBubble: {
    marginBottom: "16px",
    padding: "12px 16px",
    borderRadius: "12px",
    maxWidth: "85%",
    lineHeight: 1.6,
    fontSize: "14px",
  },
  userBubble: {
    marginLeft: "auto",
    background: "#1e3a5f",
    borderBottomRightRadius: "4px",
  },
  assistantBubble: {
    marginRight: "auto",
    background: "#1e293b",
    border: "1px solid #334155",
    borderBottomLeftRadius: "4px",
  },
  roleLabel: {
    fontSize: "11px",
    fontWeight: 600,
    color: "#64748b",
    marginBottom: "4px",
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
  },
  messageContent: {
    color: "#e2e8f0",
    wordBreak: "break-word" as const,
  },
  thinkingRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "4px 0",
  },
  thinkingText: {
    fontSize: "13px",
    color: "#64748b",
    fontStyle: "italic" as const,
  },
  typing: {
    display: "flex",
    gap: "4px",
  },
  dot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    background: "#64748b",
    animation: "blink 1.4s infinite both",
    display: "inline-block",
  },
  inputArea: {
    display: "flex",
    gap: "8px",
    padding: "16px 0",
    borderTop: "1px solid #334155",
  },
  input: {
    flex: 1,
    background: "#0f172a",
    border: "1px solid #334155",
    borderRadius: "12px",
    color: "#e2e8f0",
    padding: "12px 16px",
    fontSize: "14px",
    resize: "none" as const,
    fontFamily: "inherit",
  },
  sendBtn: {
    background: "linear-gradient(135deg, #2563eb, #7c3aed)",
    border: "none",
    borderRadius: "12px",
    color: "white",
    padding: "12px 24px",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: "14px",
    whiteSpace: "nowrap" as const,
  },
  disclaimer: {
    textAlign: "center" as const,
    fontSize: "11px",
    color: "#475569",
    padding: "8px 0 16px",
  },
};
