/**
 * TypeScript types for the Synthetic Dataset Generator frontend.
 */

/**
 * A chat message in the conversation.
 */
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

/**
 * A column definition in the generated schema.
 */
export interface SchemaColumn {
  name: string;
  type: string;
  description: string;
  constraints?: string;
}

/**
 * Download links for exported dataset files.
 * Keys match backend export_dataset.py: csv, json, schema, script
 */
export interface DownloadLinks {
  csv?: string;
  json?: string;
  schema?: string;
  script?: string;
}

/**
 * The complete state of the chat and generation context.
 */
export interface ChatState {
  messages: Message[];
  schema: SchemaColumn[];
  preview: Record<string, unknown>[];
  totalRows: number | null;
  downloads: DownloadLinks | null;
  isExporting: boolean;
  isStreaming: boolean;
  error: string | null;
}

/**
 * Actions for the chat state reducer.
 */
export type ChatAction =
  | { type: 'ADD_USER_MESSAGE'; payload: Message }
  | { type: 'START_STREAMING' }
  | { type: 'APPEND_CONTENT'; payload: string }
  | { type: 'SET_SCHEMA'; payload: SchemaColumn[] }
  | { type: 'SET_PREVIEW'; payload: { rows: Record<string, unknown>[]; totalRows: number } }
  | { type: 'START_EXPORTING' }
  | { type: 'SET_DOWNLOADS'; payload: DownloadLinks }
  | { type: 'STOP_EXPORTING' }
  | { type: 'STOP_STREAMING' }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'CLEAR_ERROR' }
  | { type: 'RESET_CHAT' }
  | { type: 'LOAD_SESSION'; payload: { sessionId: string; messages: Message[]; schema?: SchemaColumn[]; preview?: Record<string, unknown>[]; totalRows?: number; downloads?: DownloadLinks } };

/**
 * Session metadata for the session list.
 */
export interface SessionMeta {
  sessionId: string;
  createdAt: Date;
  lastMessage?: string;
  name?: string;
}

/**
 * SSE event types from the InteractiveAgent backend.
 */
export type SSEEventType = 'message' | 'schema' | 'preview' | 'download' | 'error' | 'done';

/**
 * SSE event structure from the backend.
 */
export interface SSEEvent {
  type: SSEEventType;
  content?: string;
  data?: SchemaColumn[] | Record<string, unknown>[] | DownloadLinks;
  message?: string;
}
