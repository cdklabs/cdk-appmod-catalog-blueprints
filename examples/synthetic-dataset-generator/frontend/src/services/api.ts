/**
 * API service layer for SSE communication with the InteractiveAgent backend.
 */

import type { SchemaColumn, DownloadLinks } from '../types';

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
  maxRetries: 5,
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
            callbacks.onMessage(parsed.text);
          } else if (typeof parsed === 'object' && parsed.content) {
            callbacks.onMessage(parsed.content);
          } else if (typeof parsed === 'string') {
            callbacks.onMessage(parsed);
          } else {
            callbacks.onMessage(data);
          }
        } catch {
          // Plain text message
          callbacks.onMessage(data);
        }
        break;

      case 'schema':
        const schemaData = JSON.parse(data);
        callbacks.onSchema(schemaData.data || schemaData);
        break;

      case 'preview':
        const previewData = JSON.parse(data);
        // Expect { rows: [...], totalRows: N } from backend
        callbacks.onPreview({
          rows: previewData.rows || previewData.data || previewData,
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
        // Session metadata from backend - log for debugging
        console.debug('Session metadata:', data);
        break;

      default:
        // Unknown event type, treat as message
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
