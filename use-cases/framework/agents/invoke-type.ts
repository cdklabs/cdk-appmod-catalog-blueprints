// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * Agent invocation type enumeration.
 *
 * Defines the processing mode for the agent.
 * Must match the Python InvokeType enum in batch.py.
 */
export enum InvokeType {
  /**
   * Batch processing mode - processes one document at a time.
   * Default mode for most agent operations.
   */
  BATCH = 'batch',

  /**
   * Interactive conversation mode (future).
   * For real-time chat and conversational interfaces.
   */
  INTERACTIVE = 'interactive',

  /**
   * Direct invocation mode.
   * Used for RAG applications, API endpoints, and direct agent calls.
   */
  ATTACH_DIRECTLY = 'attach-directly',

  /**
   * Document classification step.
   * Used in document processing workflows for classification phase.
   */
  CLASSIFICATION = 'classification',

  /**
   * Document processing step.
   * Used in document processing workflows for extraction/processing phase.
   */
  PROCESSING = 'processing',

  /**
   * Document aggregation step.
   * Used in document processing workflows for aggregating chunked results.
   */
  AGGREGATION = 'aggregation',
}
