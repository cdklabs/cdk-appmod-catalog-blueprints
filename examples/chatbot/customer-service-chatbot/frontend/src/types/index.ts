/**
 * Message in the chat
 */
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  status: 'sending' | 'streaming' | 'sent' | 'error';
}

/**
 * Chat status
 */
export type ChatStatus = 'idle' | 'sending' | 'error';

/**
 * SSE event types from the backend
 */
export interface SSEMetadataEvent {
  type: 'metadata';
  data: { session_id: string };
}

export interface SSETextEvent {
  type: 'data';
  data: { text: string };
}

export interface SSEDoneEvent {
  type: 'done';
  data: Record<string, never>;
}

export interface SSEErrorEvent {
  type: 'error';
  data: { error: string };
}

export type SSEEvent = SSEMetadataEvent | SSETextEvent | SSEDoneEvent | SSEErrorEvent;

/**
 * Configuration from CloudFormation outputs
 */
export interface Config {
  chatApiEndpoint: string;
  userPoolId: string;
  userPoolClientId: string;
  region: string;
}
