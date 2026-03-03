import { useState, useCallback, useRef } from 'react';
import { ChatStatus, Message, SSEEvent } from '../types';

interface UseChatReturn {
  chatStatus: ChatStatus;
  messages: Message[];
  sendMessage: (content: string) => void;
  error: string | null;
  sessionId: string | null;
}

/**
 * Parse SSE events from a text buffer.
 * Returns parsed events and any remaining incomplete buffer.
 *
 * The AgentCore SDK sends unnamed SSE events (no "event:" line), so we
 * detect the event type from the JSON payload keys:
 *   { session_id }  → metadata
 *   { text }        → data (text chunk)
 *   { done }        → done
 *   { error }       → error
 */
function parseSSEBuffer(buffer: string): { events: SSEEvent[]; remaining: string } {
  const events: SSEEvent[] = [];
  const blocks = buffer.split('\n\n');

  // Last block may be incomplete
  const remaining = blocks.pop() || '';

  for (const block of blocks) {
    if (!block.trim()) continue;

    let dataLine = '';

    for (const line of block.split('\n')) {
      if (line.startsWith('data: ')) {
        dataLine = line.slice(6);
      } else if (line.startsWith('data:')) {
        dataLine = line.slice(5);
      }
    }

    if (!dataLine) continue;

    try {
      const data = JSON.parse(dataLine);

      if ('session_id' in data) {
        events.push({ type: 'metadata', data });
      } else if ('done' in data) {
        events.push({ type: 'done', data });
      } else if ('error' in data) {
        events.push({ type: 'error', data });
      } else if ('text' in data) {
        events.push({ type: 'data', data });
      }
    } catch {
      // Skip malformed JSON
    }
  }

  return { events, remaining };
}

/**
 * Chat hook using fetch + ReadableStream for SSE streaming.
 *
 * Replaces the WebSocket-based hook with a simpler HTTP streaming approach:
 * - POST /chat sends the message
 * - Response is an SSE stream with text chunks
 * - No persistent connection to manage
 */
export function useChat(apiEndpoint: string, token: string): UseChatReturn {
  const [chatStatus, setChatStatus] = useState<ChatStatus>('idle');
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;

    const trimmed = content.trim();

    // Add user message
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
      status: 'sent',
    };

    // Add placeholder assistant message
    const assistantId = `assistant-${Date.now()}`;
    const assistantMessage: Message = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      status: 'streaming',
    };

    setMessages(prev => [...prev, userMessage, assistantMessage]);
    setChatStatus('sending');
    setError(null);

    // Abort any in-flight request
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      // Build headers — include AgentCore session header for microVM affinity
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      };
      if (sessionId) {
        headers['X-Amzn-Bedrock-AgentCore-Runtime-Session-Id'] = sessionId;
      }

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          prompt: trimmed,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        let errMsg = `Request failed (${response.status})`;
        if (response.status === 401) errMsg = 'Authentication expired. Please sign in again.';
        if (response.status === 429) errMsg = 'Too many requests. Please wait a moment.';
        throw new Error(errMsg);
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let receivedDone = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const { events, remaining } = parseSSEBuffer(buffer);
        buffer = remaining;

        for (const event of events) {
          if (event.type === 'metadata') {
            setSessionId(event.data.session_id);
          } else if (event.type === 'data') {
            // Append text chunk to assistant message
            setMessages(prev => prev.map(msg =>
              msg.id === assistantId
                ? { ...msg, content: msg.content + event.data.text }
                : msg
            ));
          } else if (event.type === 'done') {
            receivedDone = true;
          } else if (event.type === 'error') {
            throw new Error(event.data.error || 'Server error');
          }
        }
      }

      // Mark assistant message as complete
      setMessages(prev => prev.map(msg =>
        msg.id === assistantId
          ? { ...msg, status: 'sent' as const }
          : msg
      ));

      if (!receivedDone) {
        console.warn('Stream ended without done event — possible timeout');
      }

      setChatStatus('idle');
    } catch (err: any) {
      if (err.name === 'AbortError') return;

      const errMsg = err.message || 'Failed to send message';
      setError(errMsg);
      setChatStatus('error');

      // Mark assistant message as error (remove if empty)
      setMessages(prev => {
        const assistant = prev.find(m => m.id === assistantId);
        if (assistant && !assistant.content) {
          // Remove empty assistant message
          return prev.filter(m => m.id !== assistantId);
        }
        return prev.map(msg =>
          msg.id === assistantId
            ? { ...msg, status: 'error' as const }
            : msg
        );
      });
    } finally {
      abortRef.current = null;
    }
  }, [apiEndpoint, token, sessionId]);

  return {
    chatStatus,
    messages,
    sendMessage,
    error,
    sessionId,
  };
}
