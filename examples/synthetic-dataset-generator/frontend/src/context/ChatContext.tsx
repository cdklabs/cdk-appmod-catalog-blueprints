/**
 * ChatContext provides centralized state management for the chat interface.
 * Uses useReducer for predictable state updates and SSE integration.
 * Sessions are persisted to localStorage and tied to the authenticated user.
 */

import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useRef,
  useEffect,
  type ReactNode,
} from 'react';
import type {
  ChatState,
  ChatAction,
  Message,
  SchemaColumn,
  DownloadLinks,
  SessionMeta,
} from '../types';
import { sendMessage as apiSendMessage, type SSECallbacks } from '../services/api';

// Storage keys
const SESSIONS_KEY = (userId: string) => `datasynth_sessions_${userId}`;
const CURRENT_SESSION_KEY = (userId: string) => `datasynth_current_session_${userId}`;
const SESSION_DATA_KEY = (userId: string, sessionId: string) => `datasynth_session_data_${userId}_${sessionId}`;

/**
 * Generate a unique ID for messages and sessions.
 */
function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Session storage utilities.
 */
const sessionStorage = {
  /**
   * Get list of all sessions for a user.
   */
  getSessions(userId: string): SessionMeta[] {
    try {
      const data = localStorage.getItem(SESSIONS_KEY(userId));
      if (!data) return [];
      const sessions = JSON.parse(data);
      return sessions.map((s: any) => ({
        ...s,
        createdAt: new Date(s.createdAt),
      }));
    } catch {
      return [];
    }
  },

  /**
   * Save session list for a user.
   */
  saveSessions(userId: string, sessions: SessionMeta[]): void {
    localStorage.setItem(SESSIONS_KEY(userId), JSON.stringify(sessions));
  },

  /**
   * Get current session ID for a user.
   */
  getCurrentSessionId(userId: string): string | null {
    return localStorage.getItem(CURRENT_SESSION_KEY(userId));
  },

  /**
   * Set current session ID for a user.
   */
  setCurrentSessionId(userId: string, sessionId: string): void {
    localStorage.setItem(CURRENT_SESSION_KEY(userId), sessionId);
  },

  /**
   * Get session data (messages) for a specific session.
   */
  getSessionData(userId: string, sessionId: string): Message[] {
    try {
      const data = localStorage.getItem(SESSION_DATA_KEY(userId, sessionId));
      if (!data) return [];
      const messages = JSON.parse(data);
      return messages.map((m: any) => ({
        ...m,
        timestamp: new Date(m.timestamp),
      }));
    } catch {
      return [];
    }
  },

  /**
   * Save session data (messages) for a specific session.
   */
  saveSessionData(userId: string, sessionId: string, messages: Message[]): void {
    localStorage.setItem(SESSION_DATA_KEY(userId, sessionId), JSON.stringify(messages));
  },

  /**
   * Create a new session and return its ID.
   */
  createSession(userId: string): string {
    const sessionId = generateId();
    const sessions = this.getSessions(userId);
    sessions.unshift({
      sessionId,
      createdAt: new Date(),
    });
    this.saveSessions(userId, sessions);
    this.setCurrentSessionId(userId, sessionId);
    return sessionId;
  },

  /**
   * Update session metadata (e.g., last message preview).
   */
  updateSessionMeta(userId: string, sessionId: string, updates: Partial<SessionMeta>): void {
    const sessions = this.getSessions(userId);
    const index = sessions.findIndex(s => s.sessionId === sessionId);
    if (index !== -1) {
      sessions[index] = { ...sessions[index], ...updates };
      this.saveSessions(userId, sessions);
    }
  },
};

/**
 * Initial state for the chat context.
 */
const initialState: ChatState = {
  messages: [],
  schema: [],
  preview: [],
  totalRows: null,
  downloads: null,
  isStreaming: false,
  error: null,
};

/**
 * Reducer function for chat state management.
 */
function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'ADD_USER_MESSAGE':
      return {
        ...state,
        messages: [...state.messages, action.payload],
      };

    case 'START_STREAMING':
      return {
        ...state,
        isStreaming: true,
        messages: [
          ...state.messages,
          {
            id: 'streaming',
            role: 'assistant',
            content: '',
            timestamp: new Date(),
          },
        ],
      };

    case 'APPEND_CONTENT': {
      const updatedMessages = [...state.messages];
      const lastIndex = updatedMessages.length - 1;
      if (lastIndex >= 0) {
        updatedMessages[lastIndex] = {
          ...updatedMessages[lastIndex],
          content: updatedMessages[lastIndex].content + action.payload,
        };
      }
      return { ...state, messages: updatedMessages };
    }

    case 'SET_SCHEMA':
      return { ...state, schema: action.payload };

    case 'SET_PREVIEW':
      return { ...state, preview: action.payload.rows, totalRows: action.payload.totalRows };

    case 'SET_DOWNLOADS':
      return { ...state, downloads: action.payload };

    case 'STOP_STREAMING': {
      const finalMessages = [...state.messages];
      const lastIndex = finalMessages.length - 1;
      if (lastIndex >= 0 && finalMessages[lastIndex].id === 'streaming') {
        finalMessages[lastIndex] = {
          ...finalMessages[lastIndex],
          id: generateId(),
        };
      }
      return { ...state, isStreaming: false, messages: finalMessages };
    }

    case 'SET_ERROR':
      return { ...state, error: action.payload, isStreaming: false };

    case 'CLEAR_ERROR':
      return { ...state, error: null };

    case 'RESET_CHAT':
      return { ...initialState };

    case 'LOAD_SESSION':
      return {
        ...initialState,
        messages: action.payload.messages,
      };

    default:
      return state;
  }
}

/**
 * Context value interface.
 */
interface ChatContextValue {
  state: ChatState;
  sessionId: string;
  sessions: SessionMeta[];
  sendMessage: (content: string) => Promise<void>;
  clearError: () => void;
  newChat: () => void;
  switchSession: (sessionId: string) => void;
}

const ChatContext = createContext<ChatContextValue | null>(null);

/**
 * Props for the ChatProvider component.
 */
interface ChatProviderProps {
  children: ReactNode;
  userId: string;
}

/**
 * ChatProvider component that wraps the application and provides chat state.
 */
export function ChatProvider({ children, userId }: ChatProviderProps) {
  const [state, dispatch] = useReducer(chatReducer, initialState);

  // Session management refs
  const sessionIdRef = useRef<string>('');
  const sessionsRef = useRef<SessionMeta[]>([]);

  // Initialize session on mount
  useEffect(() => {
    // Load existing sessions
    sessionsRef.current = sessionStorage.getSessions(userId);

    // Get or create current session
    let currentSessionId = sessionStorage.getCurrentSessionId(userId);
    if (!currentSessionId || !sessionsRef.current.find(s => s.sessionId === currentSessionId)) {
      // No valid current session, create new one
      currentSessionId = sessionStorage.createSession(userId);
      sessionsRef.current = sessionStorage.getSessions(userId);
    }

    sessionIdRef.current = currentSessionId;

    // Load session data
    const messages = sessionStorage.getSessionData(userId, currentSessionId);
    if (messages.length > 0) {
      dispatch({ type: 'LOAD_SESSION', payload: { sessionId: currentSessionId, messages } });
    }
  }, [userId]);

  // Persist messages to localStorage whenever they change
  useEffect(() => {
    if (sessionIdRef.current && state.messages.length > 0 && !state.isStreaming) {
      sessionStorage.saveSessionData(userId, sessionIdRef.current, state.messages);

      // Update session metadata with last message preview
      const lastUserMessage = [...state.messages].reverse().find(m => m.role === 'user');
      if (lastUserMessage) {
        sessionStorage.updateSessionMeta(userId, sessionIdRef.current, {
          lastMessage: lastUserMessage.content.slice(0, 50) + (lastUserMessage.content.length > 50 ? '...' : ''),
        });
        sessionsRef.current = sessionStorage.getSessions(userId);
      }
    }
  }, [state.messages, state.isStreaming, userId]);

  /**
   * Send a message to the AI agent.
   */
  const sendMessage = useCallback(async (content: string) => {
    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content,
      timestamp: new Date(),
    };
    dispatch({ type: 'ADD_USER_MESSAGE', payload: userMessage });
    dispatch({ type: 'START_STREAMING' });
    dispatch({ type: 'CLEAR_ERROR' });

    const callbacks: SSECallbacks = {
      onMessage: (chunk: string) =>
        dispatch({ type: 'APPEND_CONTENT', payload: chunk }),
      onSchema: (schema: SchemaColumn[]) =>
        dispatch({ type: 'SET_SCHEMA', payload: schema }),
      onPreview: (data: { rows: Record<string, unknown>[]; totalRows: number }) =>
        dispatch({ type: 'SET_PREVIEW', payload: data }),
      onDownload: (links: DownloadLinks) =>
        dispatch({ type: 'SET_DOWNLOADS', payload: links }),
      onError: (error: string) =>
        dispatch({ type: 'SET_ERROR', payload: error }),
      onDone: () =>
        dispatch({ type: 'STOP_STREAMING' }),
    };

    try {
      await apiSendMessage(content, sessionIdRef.current, callbacks, userId);
    } catch (error) {
      console.error('Message send failed:', error);
    }
  }, [userId]);

  /**
   * Clear the current error message.
   */
  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  /**
   * Start a new chat session.
   */
  const newChat = useCallback(() => {
    const newSessionId = sessionStorage.createSession(userId);
    sessionIdRef.current = newSessionId;
    sessionsRef.current = sessionStorage.getSessions(userId);
    dispatch({ type: 'RESET_CHAT' });
  }, [userId]);

  /**
   * Switch to a different session.
   */
  const switchSession = useCallback((sessionId: string) => {
    if (sessionId === sessionIdRef.current) return;

    sessionStorage.setCurrentSessionId(userId, sessionId);
    sessionIdRef.current = sessionId;

    const messages = sessionStorage.getSessionData(userId, sessionId);
    dispatch({ type: 'LOAD_SESSION', payload: { sessionId, messages } });
  }, [userId]);

  return (
    <ChatContext.Provider
      value={{
        state,
        sessionId: sessionIdRef.current,
        sessions: sessionsRef.current,
        sendMessage,
        clearError,
        newChat,
        switchSession,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

/**
 * Hook to access the chat context.
 * Must be used within a ChatProvider.
 */
export function useChatContext(): ChatContextValue {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
}
