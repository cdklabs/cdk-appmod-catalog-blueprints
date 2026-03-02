/**
 * Convenience hook for accessing chat state and methods.
 * Provides a cleaner interface than directly using useChatContext.
 */

import { useChatContext } from '../context/ChatContext';
import type { Message, SchemaColumn, DownloadLinks } from '../types';

import type { SessionMeta } from '../types';

/**
 * Return type for the useChat hook.
 */
export interface UseChatReturn {
  /** All messages in the conversation */
  messages: Message[];
  /** Current schema columns from execute_script */
  schema: SchemaColumn[];
  /** Preview data rows from execute_script */
  preview: Record<string, unknown>[];
  /** Total rows in the full dataset */
  totalRows: number | null;
  /** Download links from export_dataset */
  downloads: DownloadLinks | null;
  /** Whether export is currently in progress */
  isExporting: boolean;
  /** Whether the agent is currently streaming a response */
  isStreaming: boolean;
  /** Whether session history is being loaded */
  isLoadingHistory: boolean;
  /** Whether data generation is in progress (generate_script + execute_script) */
  isPreparingData: boolean;
  /** Current error message, if any */
  error: string | null;
  /** Current session ID */
  sessionId: string;
  /** List of all sessions for the current user */
  sessions: SessionMeta[];
  /** Send a message to the agent */
  sendMessage: (content: string) => Promise<void>;
  /** Clear the current error */
  clearError: () => void;
  /** Start a new chat session */
  newChat: () => void;
  /** Switch to a different session */
  switchSession: (sessionId: string) => Promise<void>;
  /** Delete a session */
  deleteSession: (sessionId: string) => Promise<void>;
  /** Refresh the sessions list from the backend */
  refreshSessions: () => Promise<void>;
}

/**
 * Hook for interacting with the chat system.
 *
 * @example
 * ```tsx
 * function ChatComponent() {
 *   const { messages, isStreaming, sendMessage, error } = useChat();
 *
 *   const handleSend = async (content: string) => {
 *     await sendMessage(content);
 *   };
 *
 *   return (
 *     <div>
 *       {messages.map(msg => <Message key={msg.id} {...msg} />)}
 *       {isStreaming && <TypingIndicator />}
 *       {error && <ErrorBanner message={error} />}
 *     </div>
 *   );
 * }
 * ```
 */
export function useChat(): UseChatReturn {
  const { state, sessionId, sessions, isLoadingHistory, isPreparingData, sendMessage, clearError, newChat, switchSession, deleteSession, refreshSessions } = useChatContext();

  return {
    messages: state.messages,
    schema: state.schema,
    preview: state.preview,
    totalRows: state.totalRows,
    downloads: state.downloads,
    isExporting: state.isExporting,
    isStreaming: state.isStreaming,
    isLoadingHistory,
    isPreparingData,
    error: state.error,
    sessionId,
    sessions,
    sendMessage,
    clearError,
    newChat,
    switchSession,
    deleteSession,
    refreshSessions,
  };
}
