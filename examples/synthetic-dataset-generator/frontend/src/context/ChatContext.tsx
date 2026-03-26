/**
 * ChatContext provides centralized state management for the chat interface.
 * Uses useReducer for predictable state updates and SSE integration.
 * DynamoDB is the source of truth for sessions; localStorage is a cache/fallback.
 * Message history is fetched from S3.
 */

import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useRef,
  useEffect,
  useState,
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
import { sendMessage as apiSendMessage, fetchSessionHistory, fetchSessionsList, deleteSession as apiDeleteSession, type SSECallbacks } from '../services/api';

// Storage keys - localStorage is a cache, DynamoDB is source of truth
const SESSIONS_KEY = (userId: string) => `datasynth_sessions_${userId}`;
const CURRENT_SESSION_KEY = (userId: string) => `datasynth_current_session_${userId}`;

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  return `${Date.now().toString(36)}-${performance.now().toString(36).replace('.', '')}`;
}

/**
 * Session storage utilities - localStorage cache for sessions.
 * DynamoDB (via backend API) is the source of truth.
 * Message history is fetched from S3 via the backend /history endpoint.
 */
const sessionStorage = {
  /**
   * Get list of all sessions for a user from localStorage cache.
   */
  getSessions(userId: string): SessionMeta[] {
    try {
      const data = localStorage.getItem(SESSIONS_KEY(userId));
      console.debug('[getSessions] raw data:', data, 'key:', SESSIONS_KEY(userId));
      if (!data) return [];
      const sessions = JSON.parse(data);
      if (!Array.isArray(sessions)) {
        console.error('[getSessions] data is not an array:', typeof sessions);
        return [];
      }
      const mapped: SessionMeta[] = sessions
        .filter((s: Record<string, unknown>) => s.sessionId) // Filter out any invalid entries
        .map((s: Record<string, unknown>) => ({
          sessionId: s.sessionId as string,
          createdAt: s.createdAt ? new Date(s.createdAt as string) : new Date(),
          lastMessage: s.lastMessage as string | undefined,
          name: s.name as string | undefined,
        }));
      console.debug('[getSessions] parsed sessions:', mapped.length);
      return mapped;
    } catch (e) {
      console.error('[getSessions] parse error:', e);
      return [];
    }
  },

  /**
   * Save session list for a user to localStorage cache.
   */
  saveSessions(userId: string, sessions: SessionMeta[]): void {
    console.debug('[saveSessions] saving', sessions.length, 'sessions to cache');
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
   * Update a session in the cache (upsert).
   */
  updateSession(userId: string, sessionId: string, lastMessage?: string): void {
    const sessions = this.getSessions(userId);
    const index = sessions.findIndex(s => s.sessionId === sessionId);
    if (index !== -1) {
      sessions[index] = { ...sessions[index], lastMessage };
    } else {
      sessions.unshift({ sessionId, createdAt: new Date(), lastMessage });
    }
    this.saveSessions(userId, sessions);
    console.debug('[updateSession] updated cache for session:', sessionId);
  },

  /**
   * Add a session to the cache if not already present.
   */
  addSession(userId: string, sessionId: string): void {
    const sessions = this.getSessions(userId);
    console.debug('[addSession] existing sessions:', sessions.length, 'adding:', sessionId);
    if (!sessions.find(s => s.sessionId === sessionId)) {
      sessions.unshift({
        sessionId,
        createdAt: new Date(),
      });
      this.saveSessions(userId, sessions);
      console.debug('[addSession] saved, new count:', sessions.length);
    } else {
      console.debug('[addSession] session already exists');
    }
    this.setCurrentSessionId(userId, sessionId);
  },

  /**
   * Create a new local session (optimistic, backend creates DynamoDB record on first message).
   */
  createSession(userId: string): string {
    const sessionId = generateId();
    console.debug('[createSession] creating new local session:', sessionId);
    this.addSession(userId, sessionId);
    return sessionId;
  },

  /**
   * Update session metadata (e.g., last message preview) in cache.
   */
  updateSessionMeta(userId: string, sessionId: string, updates: Partial<SessionMeta>): void {
    const sessions = this.getSessions(userId);
    const index = sessions.findIndex(s => s.sessionId === sessionId);
    if (index !== -1) {
      sessions[index] = { ...sessions[index], ...updates };
      this.saveSessions(userId, sessions);
    }
  },

  /**
   * Delete a session from the cache.
   */
  deleteSession(userId: string, sessionId: string): void {
    const sessions = this.getSessions(userId);
    const filtered = sessions.filter(s => s.sessionId !== sessionId);
    this.saveSessions(userId, filtered);
    console.debug('[deleteSession] deleted session from cache:', sessionId, 'remaining:', filtered.length);
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
  isExporting: false,
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
      console.debug('[START_STREAMING] adding streaming message, existing messages:', state.messages.length);
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
        const lastMsg = updatedMessages[lastIndex];
        const prevContent = lastMsg.content;

        // Stop appending if content already ends with "ready for download"
        if (/ready for download!?\s*$/i.test(prevContent)) {
          return state; // Don't append anything more
        }

        let chunk = action.payload;

        // Add paragraph break when previous content ends with sentence and new content starts fresh
        // This creates natural breaks between tool call responses
        const endsWithSentence = /[.!?:]\s*$/.test(prevContent);
        const startsWithCapital = /^[A-Z]/.test(chunk.trim());
        const prevEndsWithNewline = /\n\s*$/.test(prevContent);

        if (prevContent.length > 0 && endsWithSentence && startsWithCapital && !prevEndsWithNewline) {
          chunk = '\n\n' + chunk;
        }

        const newContent = prevContent + chunk;

        updatedMessages[lastIndex] = {
          ...lastMsg,
          content: newContent,
        };
      }
      return { ...state, messages: updatedMessages };
    }

    case 'SET_SCHEMA':
      return { ...state, schema: Array.isArray(action.payload) ? action.payload : [] };

    case 'SET_PREVIEW':
      return {
        ...state,
        preview: Array.isArray(action.payload.rows) ? action.payload.rows : [],
        totalRows: action.payload.totalRows,
      };

    case 'START_EXPORTING':
      return { ...state, isExporting: true, downloads: null };

    case 'SET_DOWNLOADS': {
      // Check if all 4 downloads are complete
      const allComplete = Boolean(action.payload.csv) && Boolean(action.payload.json) &&
        Boolean(action.payload.schema) && Boolean(action.payload.script);
      // Start exporting on first download, stop when all are complete
      const hasAnyDownload = Boolean(action.payload.csv) || Boolean(action.payload.json) ||
        Boolean(action.payload.schema) || Boolean(action.payload.script);
      return {
        ...state,
        downloads: action.payload,
        isExporting: hasAnyDownload && !allComplete,
      };
    }

    case 'STOP_EXPORTING':
      return { ...state, isExporting: false };

    case 'STOP_STREAMING': {
      const finalMessages = [...state.messages];
      const lastIndex = finalMessages.length - 1;
      if (lastIndex >= 0 && finalMessages[lastIndex].id === 'streaming') {
        const newId = generateId();
        console.debug('[STOP_STREAMING] finalizing message, content length:', finalMessages[lastIndex].content.length, 'new id:', newId);
        finalMessages[lastIndex] = {
          ...finalMessages[lastIndex],
          id: newId,
        };
      }
      return { ...state, isStreaming: false, messages: finalMessages };
    }

    case 'SET_ERROR':
      return { ...state, error: action.payload, isStreaming: false };

    case 'CLEAR_ERROR':
      return { ...state, error: null };

    case 'RESET_CHAT':
      console.debug('[RESET_CHAT] clearing all state');
      return { ...initialState };

    case 'LOAD_SESSION':
      console.debug('[LOAD_SESSION] loading', action.payload.messages.length, 'messages for session', action.payload.sessionId);
      return {
        ...initialState,
        messages: action.payload.messages,
        schema: Array.isArray(action.payload.schema) ? action.payload.schema : [],
        preview: Array.isArray(action.payload.preview) ? action.payload.preview : [],
        totalRows: action.payload.totalRows || null,
        downloads: action.payload.downloads || null,
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
  isLoadingHistory: boolean;
  isPreparingData: boolean;
  sendMessage: (content: string) => Promise<void>;
  clearError: () => void;
  newChat: () => void;
  switchSession: (sessionId: string) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
  refreshSessions: () => Promise<void>;
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

  // Session management - use both ref (for callbacks) and state (for UI re-renders)
  const sessionIdRef = useRef<string>('');
  const [sessionId, setSessionId] = useState<string>('');
  const [sessions, setSessions] = useState<SessionMeta[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isPreparingData, setIsPreparingData] = useState(false);

  // AbortController for canceling in-flight session history fetches
  const fetchAbortControllerRef = useRef<AbortController | null>(null);

  /**
   * Fetch sessions from backend API (DynamoDB source of truth).
   * Falls back to localStorage cache on error or empty response.
   */
  const fetchSessions = useCallback(async () => {
    try {
      console.debug('[fetchSessions] fetching from backend API for user:', userId);
      const backendSessions = await fetchSessionsList();

      // REPLACE localStorage cache with backend data (not merge!)
      // This ensures deleted sessions don't persist in cache
      console.debug('[fetchSessions] loaded from API:', backendSessions.length);
      setSessions(backendSessions);
      sessionStorage.saveSessions(userId, backendSessions);
      return backendSessions;
    } catch (error) {
      // Fallback to localStorage on error
      console.error('[fetchSessions] API error, falling back to localStorage:', error);
      const localSessions = sessionStorage.getSessions(userId);
      setSessions(localSessions);
      return localSessions;
    }
  }, [userId]);

  // Initialize session on mount - fetch from backend API (DynamoDB source of truth)
  useEffect(() => {
    async function initializeSessions() {
      // Fetch sessions from backend (source of truth)
      const loadedSessions = await fetchSessions();

      // Get or create current session
      let currentSessionId = sessionStorage.getCurrentSessionId(userId);
      console.debug('[init] current session ID from storage:', currentSessionId);

      if (!currentSessionId) {
        // No current session at all, create new one (optimistic, local only until first message)
        console.debug('[init] no current session, creating new one');
        currentSessionId = sessionStorage.createSession(userId);
        setSessions(sessionStorage.getSessions(userId));
      } else if (!loadedSessions.find(s => s.sessionId === currentSessionId)) {
        // Current session ID exists but not in sessions list
        // This might be a new session that hasn't sent a message yet - add to cache
        console.debug('[init] current session not in list, adding to cache');
        sessionStorage.addSession(userId, currentSessionId);
        setSessions(sessionStorage.getSessions(userId));
      }

      sessionIdRef.current = currentSessionId;
      setSessionId(currentSessionId);
    }

    initializeSessions();
  }, [userId, fetchSessions]);

  // Update session metadata with first message preview (captures intent, not "export")
  useEffect(() => {
    if (sessionIdRef.current && state.messages.length > 0 && !state.isStreaming) {
      const firstUserMessage = state.messages.find(m => m.role === 'user');
      if (firstUserMessage) {
        sessionStorage.updateSessionMeta(userId, sessionIdRef.current, {
          lastMessage: firstUserMessage.content.slice(0, 50) + (firstUserMessage.content.length > 50 ? '...' : ''),
        });
        setSessions(sessionStorage.getSessions(userId));
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
      onError: (error: string) => {
        dispatch({ type: 'SET_ERROR', payload: error });
        setIsPreparingData(false);  // Reset on error
      },
      onDone: () => {
        dispatch({ type: 'STOP_STREAMING' });
        setIsPreparingData(false);  // Reset on done (fallback if tool_end missed)
      },
      onSessionId: (backendSessionId: string) => {
        // Update session ID if backend assigns a new one
        if (backendSessionId && backendSessionId !== sessionIdRef.current) {
          console.debug('[onSessionId] Backend assigned session:', backendSessionId);
          sessionIdRef.current = backendSessionId;
          setSessionId(backendSessionId);
          sessionStorage.addSession(userId, backendSessionId);
          setSessions(sessionStorage.getSessions(userId));
        }
      },
      onToolStart: (tool: string) => {
        // Start preparing data spinner when generate_script tool is called
        if (tool === 'generate_script') {
          console.debug('[onToolStart] generate_script - showing preparing spinners');
          setIsPreparingData(true);
        } else if (tool === 'export_dataset') {
          console.debug('[onToolStart] export_dataset - showing export spinner');
          dispatch({ type: 'START_EXPORTING' });
        }
      },
      onToolEnd: (tool: string) => {
        // Stop preparing data spinner when execute_script completes
        if (tool === 'execute_script') {
          console.debug('[onToolEnd] execute_script - hiding preparing spinners');
          setIsPreparingData(false);
        }
        // Note: export_dataset tool_end is handled automatically via SET_DOWNLOADS
        // when all 4 download links arrive
      },
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
   * Creates locally first (optimistic) - backend creates DynamoDB record on first message.
   */
  const newChat = useCallback(() => {
    console.debug('[newChat] creating new local session (DynamoDB record created on first message)');
    const newSessionId = sessionStorage.createSession(userId);
    sessionIdRef.current = newSessionId;
    setSessionId(newSessionId);
    const updatedSessions = sessionStorage.getSessions(userId);
    console.debug('[newChat] sessions after create:', updatedSessions.length, updatedSessions.map(s => s.sessionId.slice(0, 8)));
    setSessions(updatedSessions);
    dispatch({ type: 'RESET_CHAT' });
  }, [userId]);

  /**
   * Switch to a different session and load its history from S3.
   * Uses AbortController to cancel previous fetch if user clicks another session.
   * This ensures the UI always shows the LAST clicked session, not whichever fetch finishes first.
   */
  const switchSession = useCallback(async (targetSessionId: string) => {
    // Same session - no-op
    if (targetSessionId === sessionIdRef.current) return;

    // Cancel any in-flight fetch (user clicked a different session)
    if (fetchAbortControllerRef.current) {
      console.debug('[switchSession] canceling previous fetch');
      fetchAbortControllerRef.current.abort();
    }

    // Create new AbortController for this fetch
    fetchAbortControllerRef.current = new AbortController();
    const signal = fetchAbortControllerRef.current.signal;

    // Update UI immediately - user sees selection change right away
    console.debug('[switchSession] switching to:', targetSessionId);
    sessionStorage.setCurrentSessionId(userId, targetSessionId);
    sessionIdRef.current = targetSessionId;
    setSessionId(targetSessionId);
    setSessions(sessionStorage.getSessions(userId));
    setIsLoadingHistory(true);

    // Fetch history from S3 backend
    try {
      const historyResponse = await fetchSessionHistory(targetSessionId, signal);

      // Double-check we're still the target (in case abort didn't work)
      if (targetSessionId !== sessionIdRef.current) {
        console.debug('[switchSession] session changed during fetch, discarding');
        return;
      }

      console.debug('[switchSession] fetched history:', historyResponse.messages.length, 'messages');

      if (historyResponse.messages.length > 0) {
        // Map to Message type with generated IDs
        const messagesWithIds: Message[] = historyResponse.messages.map((msg, index) => ({
          id: `restored-${targetSessionId.slice(0, 8)}-${index}`,
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
          timestamp: msg.timestamp instanceof Date && !isNaN(msg.timestamp.getTime())
            ? msg.timestamp
            : new Date(),
        }));
        dispatch({
          type: 'LOAD_SESSION',
          payload: {
            sessionId: targetSessionId,
            messages: messagesWithIds,
            schema: historyResponse.schema,
            preview: historyResponse.preview,
            totalRows: historyResponse.totalRows,
            downloads: historyResponse.downloads,
          },
        });
      } else {
        dispatch({ type: 'RESET_CHAT' });
      }
    } catch (error) {
      // Ignore abort errors - these are intentional cancellations
      if (error instanceof Error && error.name === 'AbortError') {
        console.debug('[switchSession] fetch aborted (user clicked another session)');
        return;
      }
      console.error('[switchSession] failed to fetch history:', error);
      if (targetSessionId === sessionIdRef.current) {
        dispatch({ type: 'RESET_CHAT' });
      }
    } finally {
      if (targetSessionId === sessionIdRef.current) {
        setIsLoadingHistory(false);
      }
    }
  }, [userId]);

  /**
   * Delete a session and switch to a new one if it was the current session.
   * Uses optimistic UI - removes from UI instantly, backend deletes from DynamoDB and S3.
   * This provides instant feedback while ensuring data cleanup happens.
   */
  const deleteSession = useCallback(async (targetSessionId: string) => {
    console.debug('[deleteSession] deleting session:', targetSessionId);

    // OPTIMISTIC: Update UI immediately (don't wait for backend)
    // 1. Remove from localStorage cache first - this survives page refresh
    sessionStorage.deleteSession(userId, targetSessionId);
    const updatedSessions = sessionStorage.getSessions(userId);
    setSessions(updatedSessions);

    // 2. If we deleted the current session, switch to a new one
    if (targetSessionId === sessionIdRef.current) {
      console.debug('[deleteSession] deleted current session, creating new one');
      const newSessionId = sessionStorage.createSession(userId);
      sessionIdRef.current = newSessionId;
      setSessionId(newSessionId);
      setSessions(sessionStorage.getSessions(userId));
      dispatch({ type: 'RESET_CHAT' });
    }

    // BACKGROUND: Delete from backend (DynamoDB + S3) - fire and forget
    // Backend handles deletion from both DynamoDB and S3
    // Even if this fails, the session won't reappear in UI because we removed from cache
    apiDeleteSession(targetSessionId)
      .then(() => console.debug('[deleteSession] backend cleanup complete (DynamoDB + S3)'))
      .catch((error) => console.warn('[deleteSession] backend cleanup failed (orphaned data):', error));
  }, [userId]);

  return (
    <ChatContext.Provider
      value={{
        state,
        sessionId,
        sessions,
        isLoadingHistory,
        isPreparingData,
        sendMessage,
        clearError,
        newChat,
        switchSession,
        deleteSession,
        refreshSessions: async () => { await fetchSessions(); },
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
