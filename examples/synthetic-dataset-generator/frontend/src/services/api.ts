/**
 * API service layer for SSE communication with the InteractiveAgent backend.
 */

import type { SchemaColumn, DownloadLinks, Message, SessionMeta } from '../types';
export type { DownloadLinks };

/**
 * Configuration for the API service.
 */
interface APIConfig {
  apiEndpoint: string;
  getAuthToken: () => Promise<string>;
}

let config: APIConfig | null = null;

/**
 * Initialize the API service with endpoint and auth configuration.
 */
export function initializeAPI(apiConfig: APIConfig): void {
  config = apiConfig;
}

/**
 * Get the current API configuration.
 */
export function getAPIConfig(): APIConfig | null {
  return config;
}

/**
 * Callbacks for SSE events.
 */
export interface SSECallbacks {
  onMessage: (content: string) => void;
  onSchema: (schema: SchemaColumn[]) => void;
  onPreview: (data: { rows: Record<string, unknown>[]; totalRows: number }) => void;
  onDownload: (links: DownloadLinks) => void;
  onError: (error: string) => void;
  onDone: () => void;
  onSessionId?: (sessionId: string) => void;
  onToolStart?: (tool: string) => void;
  onToolEnd?: (tool: string) => void;
}

/**
 * Retry configuration with exponential backoff.
 */
interface RetryConfig {
  initialDelayMs: number;
  maxDelayMs: number;
  maxRetries: number;
  backoffMultiplier: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  maxRetries: 0,
  backoffMultiplier: 2,
};

/**
 * Calculate delay for retry with exponential backoff.
 */
function calculateBackoffDelay(attempt: number, config: RetryConfig): number {
  const delay = config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt);
  return Math.min(delay, config.maxDelayMs);
}

/**
 * Sleep for a given number of milliseconds.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Parse an SSE line and extract the data.
 */
function parseSSELine(line: string): { event?: string; data?: string } {
  if (line.startsWith('event:')) {
    return { event: line.slice(6).trim() };
  }
  if (line.startsWith('data:')) {
    return { data: line.slice(5).trim() };
  }
  return {};
}

/**
 * Process SSE events from the response stream.
 */
async function processSSEStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  callbacks: SSECallbacks
): Promise<void> {
  const decoder = new TextDecoder();
  let buffer = '';
  let currentEvent = 'message';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) {
          currentEvent = 'message';
          continue;
        }

        const parsed = parseSSELine(trimmed);
        if (parsed.event) {
          currentEvent = parsed.event;
          continue;
        }

        if (parsed.data !== undefined) {
          handleSSEData(currentEvent, parsed.data, callbacks);
        }
      }
    }

    // Process any remaining data in buffer
    if (buffer.trim()) {
      const parsed = parseSSELine(buffer.trim());
      if (parsed.data !== undefined) {
        handleSSEData(currentEvent, parsed.data, callbacks);
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Handle parsed SSE data based on event type.
 */
function handleSSEData(eventType: string, data: string, callbacks: SSECallbacks): void {
  try {
    switch (eventType) {
      case 'message':
        // Message content can be plain text or JSON with text/content field
        try {
          const parsed = JSON.parse(data);
          if (typeof parsed === 'object' && parsed.text) {
            // Backend sends {'text': chunk}
            console.debug('[SSE msg]', JSON.stringify(parsed.text).slice(0, 80));
            callbacks.onMessage(parsed.text);
          } else if (typeof parsed === 'object' && parsed.content) {
            console.debug('[SSE content]', JSON.stringify(parsed.content).slice(0, 80));
            callbacks.onMessage(parsed.content);
          } else if (typeof parsed === 'string') {
            console.debug('[SSE string]', parsed.slice(0, 80));
            callbacks.onMessage(parsed);
          } else {
            console.debug('[SSE other]', data.slice(0, 80));
            callbacks.onMessage(data);
          }
        } catch {
          // Plain text message
          console.debug('[SSE plain]', data.slice(0, 80));
          callbacks.onMessage(data);
        }
        break;

      case 'schema':
        const schemaData = JSON.parse(data);
        const rawSchema = schemaData.data || schemaData;
        // Convert backend schema format to array of SchemaColumn
        // Backend sends: {columns: [{columnName, dataType, description, constraint}]}
        // Frontend expects: [{name, type, description, constraints}]
        let schemaArray: SchemaColumn[];
        if (rawSchema.columns && Array.isArray(rawSchema.columns)) {
          // Format: {columns: [{columnName, dataType, description, constraint}]}
          schemaArray = rawSchema.columns.map((col: Record<string, string>) => ({
            name: col.columnName || col.name || '',
            type: col.dataType || col.type || 'unknown',
            description: col.description || '',
            constraints: col.constraint || col.constraints || '',
          }));
        } else if (Array.isArray(rawSchema)) {
          // Already an array - map fields to expected names
          schemaArray = rawSchema.map((col: Record<string, string>) => ({
            name: col.columnName || col.name || '',
            type: col.dataType || col.type || 'unknown',
            description: col.description || '',
            constraints: col.constraint || col.constraints || '',
          }));
        } else if (typeof rawSchema === 'object' && rawSchema !== null) {
          // Dict format: {colName: {type, description}}
          schemaArray = Object.entries(rawSchema).map(([name, value]: [string, unknown]) => ({
            name,
            type: (value as Record<string, string>)?.type || 'unknown',
            description: (value as Record<string, string>)?.description || '',
          }));
        } else {
          schemaArray = [];
        }
        callbacks.onSchema(schemaArray);
        break;

      case 'preview':
        const previewData = JSON.parse(data);
        // Expect { rows: [...], totalRows: N } from backend
        // Ensure rows is always an array
        const rows = Array.isArray(previewData.rows) ? previewData.rows
          : Array.isArray(previewData.data) ? previewData.data
          : Array.isArray(previewData) ? previewData
          : [];
        callbacks.onPreview({
          rows,
          totalRows: previewData.totalRows || previewData.total_rows || 0,
        });
        break;

      case 'download':
        const downloadData = JSON.parse(data);
        callbacks.onDownload(downloadData.data || downloadData);
        break;

      case 'error':
        try {
          const errorData = JSON.parse(data);
          callbacks.onError(errorData.message || errorData.error || data);
        } catch {
          callbacks.onError(data);
        }
        break;

      case 'done':
        callbacks.onDone();
        break;

      case 'metadata':
        // Session metadata from backend - extract session_id
        console.debug('Session metadata:', data);
        try {
          const metaData = JSON.parse(data);
          if (metaData.session_id && callbacks.onSessionId) {
            callbacks.onSessionId(metaData.session_id);
          }
        } catch {
          console.warn('Failed to parse metadata:', data);
        }
        break;

      case 'tool_start':
        // Tool started - triggers loading spinners
        console.debug('Tool started:', data);
        try {
          const toolData = JSON.parse(data);
          if (toolData.tool && callbacks.onToolStart) {
            callbacks.onToolStart(toolData.tool);
          }
        } catch {
          console.warn('Failed to parse tool_start:', data);
        }
        break;

      case 'tool_end':
        // Tool ended - stops loading spinners
        console.debug('Tool ended:', data);
        try {
          const toolData = JSON.parse(data);
          if (toolData.tool && callbacks.onToolEnd) {
            callbacks.onToolEnd(toolData.tool);
          }
        } catch {
          console.warn('Failed to parse tool_end:', data);
        }
        break;

      default:
        // Unknown event type, treat as message
        console.debug('[SSE default]', eventType, data.slice(0, 80));
        callbacks.onMessage(data);
    }
  } catch (error) {
    console.error('Error handling SSE data:', error, { eventType, data });
    callbacks.onError(`Failed to parse ${eventType} event`);
  }
}

/**
 * Send a message to the backend and process SSE response.
 * Implements exponential backoff retry on connection failures.
 */
export async function sendMessage(
  message: string,
  sessionId: string,
  callbacks: SSECallbacks,
  userId?: string,
  retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<void> {
  if (!config) {
    throw new Error('API not initialized. Call initializeAPI() first.');
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
    try {
      const token = await config.getAuthToken();

      const response = await fetch(config.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          message,
          session_id: sessionId,
          ...(userId && { user_id: userId }),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
      }

      if (!response.body) {
        throw new Error('Response body is null');
      }

      // Process the SSE stream
      await processSSEStream(response.body.getReader(), callbacks);
      return; // Success, exit retry loop

    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(`SSE connection attempt ${attempt + 1} failed:`, lastError.message);

      // Don't retry on authentication errors
      if (lastError.message.includes('401') || lastError.message.includes('403')) {
        callbacks.onError('Authentication failed. Please sign in again.');
        throw lastError;
      }

      // Don't retry on the last attempt
      if (attempt === retryConfig.maxRetries) {
        break;
      }

      // Calculate backoff delay and wait
      const delay = calculateBackoffDelay(attempt, retryConfig);
      console.log(`Retrying in ${delay}ms...`);
      await sleep(delay);
    }
  }

  // All retries exhausted
  const errorMessage = lastError?.message || 'Connection failed after retries';
  callbacks.onError(errorMessage);
  throw lastError || new Error(errorMessage);
}

/**
 * Fetch list of all sessions for the current user from S3 via backend.
 */
export async function fetchSessionsList(): Promise<SessionMeta[]> {
  if (!config) return [];
  try {
    const token = await config.getAuthToken();
    const baseUrl = config.apiEndpoint.replace('/chat', '');
    const response = await fetch(`${baseUrl}/sessions`, {
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });
    if (!response.ok) {
      console.warn(`Failed to fetch sessions list: ${response.status}`);
      return [];
    }
    const data = await response.json();
    // Map backend response to SessionMeta type
    return (data || []).map((s: Record<string, unknown>) => ({
      sessionId: s.session_id as string,
      createdAt: new Date(s.created_at as string || s.updated_at as string),
      lastMessage: s.last_message as string | undefined,
      name: s.name as string | undefined,
    }));
  } catch (error) {
    console.warn('Error fetching sessions list:', error);
    return [];
  }
}

/**
 * Session history response from backend including messages, schema, preview, and downloads.
 */
export interface SessionHistoryResponse {
  messages: Message[];
  schema?: SchemaColumn[];
  preview?: Record<string, unknown>[];
  totalRows?: number;
  downloads?: DownloadLinks;
}

/**
 * Fetch session history from S3 via the backend /history endpoint.
 * Returns messages along with schema and preview if they exist in the session.
 */
export async function fetchSessionHistory(sessionId: string, signal?: AbortSignal): Promise<SessionHistoryResponse> {
  if (!config) return { messages: [] };
  try {
    const token = await config.getAuthToken();
    const baseUrl = config.apiEndpoint.replace('/chat', '');
    const response = await fetch(`${baseUrl}/history/${sessionId}`, {
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      signal,  // Allow cancellation
    });
    if (!response.ok) {
      console.warn(`Failed to fetch session history: ${response.status}`);
      return { messages: [] };
    }
    const data = await response.json();

    // Backend can return either:
    // 1. Array of messages (legacy format)
    // 2. Object with {messages, schema, preview, totalRows}
    if (Array.isArray(data)) {
      // Legacy format - just messages
      const messages: Message[] = data.map((m: Record<string, unknown>) => ({
        id: m.id as string || `restored-${Date.now()}`,
        role: m.role as 'user' | 'assistant',
        content: m.content as string,
        timestamp: m.timestamp ? new Date(m.timestamp as string) : new Date(),
      }));
      return { messages };
    } else {
      // New format with schema and preview
      const messages: Message[] = (data.messages || []).map((m: Record<string, unknown>) => ({
        id: m.id as string || `restored-${Date.now()}`,
        role: m.role as 'user' | 'assistant',
        content: m.content as string,
        timestamp: m.timestamp ? new Date(m.timestamp as string) : new Date(),
      }));

      // Convert schema to array format if needed (same logic as SSE handler)
      let schemaArray: SchemaColumn[] | undefined;
      const rawSchema = data.schema;
      if (rawSchema) {
        if (rawSchema.columns && Array.isArray(rawSchema.columns)) {
          // Format: {columns: [{columnName, dataType, description, constraint}]}
          schemaArray = rawSchema.columns.map((col: Record<string, string>) => ({
            name: col.columnName || col.name || '',
            type: col.dataType || col.type || 'unknown',
            description: col.description || '',
            constraints: col.constraint || col.constraints || '',
          }));
        } else if (Array.isArray(rawSchema)) {
          // Already an array - map fields to expected names
          schemaArray = rawSchema.map((col: Record<string, string>) => ({
            name: col.columnName || col.name || '',
            type: col.dataType || col.type || 'unknown',
            description: col.description || '',
            constraints: col.constraint || col.constraints || '',
          }));
        } else if (typeof rawSchema === 'object' && rawSchema !== null) {
          // Dict format: {colName: {type, description}}
          schemaArray = Object.entries(rawSchema).map(([name, value]: [string, unknown]) => ({
            name,
            type: (value as Record<string, string>)?.type || 'unknown',
            description: (value as Record<string, string>)?.description || '',
          }));
        }
      }

      return {
        messages,
        schema: schemaArray,
        preview: Array.isArray(data.preview) ? data.preview : undefined,
        totalRows: data.totalRows || data.total_rows,
        downloads: data.downloads || undefined,
      };
    }
  } catch (error) {
    console.warn('Error fetching session history:', error);
    return { messages: [] };
  }
}

/**
 * Delete a session from S3 via the backend /sessions endpoint.
 */
export async function deleteSession(sessionId: string): Promise<void> {
  if (!config) {
    throw new Error('API not initialized. Call initializeAPI() first.');
  }
  try {
    const token = await config.getAuthToken();
    const baseUrl = config.apiEndpoint.replace('/chat', '');
    const response = await fetch(`${baseUrl}/sessions/${sessionId}`, {
      method: 'DELETE',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to delete session: HTTP ${response.status}: ${errorText || response.statusText}`);
    }
  } catch (error) {
    console.error('Error deleting session:', error);
    throw error;
  }
}

/**
 * Rename a session via the backend /sessions endpoint.
 */
export async function renameSession(sessionId: string, name: string): Promise<void> {
  if (!config) {
    throw new Error('API not initialized. Call initializeAPI() first.');
  }
  try {
    const token = await config.getAuthToken();
    const baseUrl = config.apiEndpoint.replace('/chat', '');
    const response = await fetch(`${baseUrl}/sessions/${sessionId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({ name }),
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to rename session: HTTP ${response.status}: ${errorText || response.statusText}`);
    }
  } catch (error) {
    console.error('Error renaming session:', error);
    throw error;
  }
}
