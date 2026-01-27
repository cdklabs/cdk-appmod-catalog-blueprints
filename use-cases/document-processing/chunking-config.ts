// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * Chunking strategy options for PDF document processing.
 *
 * Choose the strategy based on your document characteristics:
 *
 * - **fixed-pages**: Legacy approach, splits by fixed page count.
 *   - Pros: Fast, simple, predictable chunk sizes
 *   - Cons: May exceed token limits for dense documents
 *   - Best for: Uniform density documents, simple text
 *
 * - **token-based**: Splits based on token count to respect model limits.
 *   - Pros: Respects model token limits, handles variable density
 *   - Cons: Slower analysis, variable chunk sizes
 *   - Best for: Variable density documents, technical content
 *
 * - **hybrid**: RECOMMENDED - Balances token count and page limits.
 *   - Pros: Best of both worlds, reliable, flexible
 *   - Cons: Slightly more complex configuration
 *   - Best for: Most documents, general-purpose processing
 */
export type ChunkingStrategy = 'fixed-pages' | 'token-based' | 'hybrid';

/**
 * Processing mode for chunked documents.
 *
 * - **sequential**: Process chunks one at a time (cost-optimized)
 * - **parallel**: Process multiple chunks simultaneously (speed-optimized)
 */
export type ProcessingMode = 'sequential' | 'parallel';

/**
 * Aggregation strategy for combining chunk results.
 *
 * - **majority-vote**: Select most frequent classification across chunks
 * - **weighted-vote**: Weight early chunks higher than later chunks
 * - **first-chunk**: Use classification from first chunk only
 */
export type AggregationStrategy = 'majority-vote' | 'weighted-vote' | 'first-chunk';

/**
 * Configuration for fixed-pages chunking strategy.
 * Splits documents by fixed page count (legacy approach).
 */
export interface FixedPagesConfig {
  /**
   * Threshold for triggering chunking based on page count.
   * Documents with pages > threshold will be chunked.
   * @default 100
   */
  readonly pageThreshold?: number;

  /**
   * Number of pages per chunk.
   * @default 50
   */
  readonly chunkSize?: number;

  /**
   * Number of overlapping pages between consecutive chunks.
   * Must be less than chunkSize.
   * @default 5
   */
  readonly overlapPages?: number;
}

/**
 * Configuration for token-based chunking strategy.
 * Splits documents based on estimated token count to respect model limits.
 */
export interface TokenBasedConfig {
  /**
   * Threshold for triggering chunking based on token count.
   * Documents with tokens > threshold will be chunked.
   * @default 150000
   */
  readonly tokenThreshold?: number;

  /**
   * Maximum tokens per chunk.
   * Ensures no chunk exceeds model token limits.
   * @default 100000
   */
  readonly maxTokensPerChunk?: number;

  /**
   * Number of overlapping tokens between consecutive chunks.
   * Provides context continuity across chunks.
   * @default 5000
   */
  readonly overlapTokens?: number;
}

/**
 * Configuration for hybrid chunking strategy (RECOMMENDED).
 * Balances token count and page limits for optimal chunking.
 */
export interface HybridConfig {
  /**
   * Hard limit on pages per chunk.
   * Prevents very large chunks even if token count is low.
   * Note: Bedrock has a hard limit of 100 pages per PDF, so we default to 99
   * to provide a safety margin.
   * @default 99
   */
  readonly maxPagesPerChunk?: number;

  /**
   * Soft target for tokens per chunk.
   * Chunks aim for this token count but respect maxPagesPerChunk.
   * @default 80000
   */
  readonly targetTokensPerChunk?: number;

  /**
   * Threshold for triggering chunking based on page count.
   * Documents with pages > threshold will be chunked.
   * @default 100
   */
  readonly pageThreshold?: number;

  /**
   * Threshold for triggering chunking based on token count.
   * Documents with tokens > threshold will be chunked.
   * @default 150000
   */
  readonly tokenThreshold?: number;

  /**
   * Number of overlapping tokens between consecutive chunks.
   * Provides context continuity across chunks.
   * @default 5000
   */
  readonly overlapTokens?: number;
}

/**
 * Comprehensive configuration for PDF chunking behavior.
 *
 * This interface provides fine-grained control over how large PDF documents are
 * split into manageable chunks for processing. The chunking system supports three
 * strategies, each optimized for different document types and use cases.
 *
 * ## Chunking Strategies
 *
 * ### 1. Hybrid Strategy (RECOMMENDED)
 * Balances both token count and page limits for optimal chunking. Best for most
 * documents as it respects model token limits while preventing excessively large chunks.
 *
 * ### 2. Token-Based Strategy
 * Splits documents based on estimated token count. Best for documents with variable
 * content density (e.g., mixed text and images, tables, charts).
 *
 * ### 3. Fixed-Pages Strategy (Legacy)
 * Simple page-based splitting. Fast but may exceed token limits for dense documents.
 * Use only for documents with uniform content density.
 *
 * ## Processing Modes
 *
 * - **parallel**: Process multiple chunks simultaneously (faster, higher cost)
 * - **sequential**: Process chunks one at a time (slower, lower cost)
 *
 * ## Aggregation Strategies
 *
 * - **majority-vote**: Most frequent classification wins (recommended)
 * - **weighted-vote**: Early chunks weighted higher
 * - **first-chunk**: Use first chunk's classification only
 *
 * ## Default Values
 *
 * | Parameter | Default | Description |
 * |-----------|---------|-------------|
 * | strategy | 'hybrid' | Chunking strategy |
 * | pageThreshold | 100 | Pages to trigger chunking |
 * | tokenThreshold | 150000 | Tokens to trigger chunking |
 * | chunkSize | 50 | Pages per chunk (fixed-pages) |
 * | overlapPages | 5 | Overlap pages (fixed-pages) |
 * | maxTokensPerChunk | 100000 | Max tokens per chunk (token-based) |
 * | overlapTokens | 5000 | Overlap tokens (token-based, hybrid) |
 * | targetTokensPerChunk | 80000 | Target tokens per chunk (hybrid) |
 * | maxPagesPerChunk | 99 | Max pages per chunk (hybrid) |
 * | processingMode | 'parallel' | Processing mode |
 * | maxConcurrency | 10 | Max parallel chunks |
 * | aggregationStrategy | 'majority-vote' | Result aggregation |
 * | minSuccessThreshold | 0.5 | Min success rate for valid result |
 */
export interface ChunkingConfig {
  /**
   * Chunking strategy to use.
   *
   * - **hybrid** (RECOMMENDED): Balances token count and page limits
   * - **token-based**: Respects model token limits, good for variable density
   * - **fixed-pages**: Simple page-based splitting (legacy, not recommended)
   *
   * @default 'hybrid'
   */
  readonly strategy?: ChunkingStrategy;

  // Fixed-pages strategy configuration
  /**
   * Threshold for triggering chunking based on page count (fixed-pages strategy).
   * @default 100
   */
  readonly pageThreshold?: number;

  /**
   * Number of pages per chunk (fixed-pages strategy).
   * @default 50
   */
  readonly chunkSize?: number;

  /**
   * Number of overlapping pages between chunks (fixed-pages strategy).
   * @default 5
   */
  readonly overlapPages?: number;

  // Token-based strategy configuration
  /**
   * Threshold for triggering chunking based on token count (token-based strategy).
   * @default 150000
   */
  readonly tokenThreshold?: number;

  /**
   * Maximum tokens per chunk (token-based strategy).
   * @default 100000
   */
  readonly maxTokensPerChunk?: number;

  /**
   * Number of overlapping tokens between chunks (token-based and hybrid strategies).
   * @default 5000
   */
  readonly overlapTokens?: number;

  // Hybrid strategy configuration
  /**
   * Hard limit on pages per chunk (hybrid strategy).
   * Note: Bedrock has a hard limit of 100 pages per PDF, so we default to 99
   * to provide a safety margin.
   * @default 99
   */
  readonly maxPagesPerChunk?: number;

  /**
   * Soft target for tokens per chunk (hybrid strategy).
   * @default 80000
   */
  readonly targetTokensPerChunk?: number;

  // Common settings
  /**
   * Processing mode for chunks.
   *
   * - **parallel**: Process multiple chunks simultaneously (faster, higher cost)
   * - **sequential**: Process chunks one at a time (slower, lower cost)
   *
   * @default 'parallel'
   */
  readonly processingMode?: ProcessingMode;

  /**
   * Maximum number of chunks to process concurrently (parallel mode only).
   * Higher values increase speed but also cost.
   *
   * @default 10
   */
  readonly maxConcurrency?: number;

  /**
   * Strategy for aggregating results from multiple chunks.
   *
   * - **majority-vote**: Most frequent classification wins
   * - **weighted-vote**: Early chunks weighted higher
   * - **first-chunk**: Use first chunk's classification
   *
   * @default 'majority-vote'
   */
  readonly aggregationStrategy?: AggregationStrategy;

  /**
   * Minimum percentage of chunks that must succeed for aggregation.
   * If fewer chunks succeed, the result is marked as partial failure.
   *
   * @default 0.5 (50%)
   */
  readonly minSuccessThreshold?: number;
}

/**
 * Metadata about a single chunk of a document.
 * Contains information about the chunk's position, size, and S3 location.
 */
export interface ChunkMetadata {
  /**
   * Unique identifier for this chunk.
   * Format: {documentId}_chunk_{index}
   */
  readonly chunkId: string;

  /**
   * Zero-based index of this chunk in the document.
   */
  readonly chunkIndex: number;

  /**
   * Total number of chunks in the document.
   */
  readonly totalChunks: number;

  /**
   * Starting page number (zero-based) of this chunk.
   */
  readonly startPage: number;

  /**
   * Ending page number (zero-based, inclusive) of this chunk.
   */
  readonly endPage: number;

  /**
   * Number of pages in this chunk.
   */
  readonly pageCount: number;

  /**
   * Estimated token count for this chunk.
   * Based on word-count heuristic (1.3 tokens per word).
   */
  readonly estimatedTokens: number;

  /**
   * S3 bucket containing the chunk file.
   */
  readonly bucket: string;

  /**
   * S3 key for the chunk file.
   * Typically in chunks/ prefix.
   */
  readonly key: string;
}

/**
 * Document content location information.
 */
export interface DocumentContent {
  /**
   * Storage location type (e.g., 's3').
   */
  readonly location: string;

  /**
   * S3 bucket containing the document.
   */
  readonly bucket: string;

  /**
   * S3 key for the document.
   */
  readonly key: string;

  /**
   * Original filename of the document.
   */
  readonly filename: string;
}

/**
 * Request payload for PDF analysis and chunking Lambda.
 * Contains document information and chunking configuration.
 */
export interface ChunkingRequest {
  /**
   * Unique identifier for the document.
   */
  readonly documentId: string;

  /**
   * Content type of the document.
   * Typically 'file' for S3-based documents.
   */
  readonly contentType: string;

  /**
   * Document content location information.
   */
  readonly content: DocumentContent;

  /**
   * Optional chunking configuration.
   * If not provided, uses default configuration.
   */
  readonly config?: ChunkingConfig;
}

/**
 * Token analysis results from PDF analysis.
 * Provides information about document size and token distribution.
 */
export interface TokenAnalysis {
  /**
   * Total estimated tokens in the document.
   */
  readonly totalTokens: number;

  /**
   * Total number of pages in the document.
   */
  readonly totalPages: number;

  /**
   * Average tokens per page across the document.
   */
  readonly avgTokensPerPage: number;

  /**
   * Optional detailed token count for each page.
   * Used for token-based and hybrid chunking strategies.
   */
  readonly tokensPerPage?: number[];
}

/**
 * Response when chunking is NOT required.
 * Document is below thresholds and will be processed without chunking.
 */
export interface NoChunkingResponse {
  /**
   * Document identifier.
   */
  readonly documentId: string;

  /**
   * Indicates chunking is not required.
   */
  readonly requiresChunking: false;

  /**
   * Token analysis results.
   */
  readonly tokenAnalysis: TokenAnalysis;

  /**
   * Human-readable reason why chunking was not applied.
   * Example: "Document has 50 pages, below threshold of 100"
   */
  readonly reason: string;
}

/**
 * Chunking configuration used for processing.
 * Includes both user-provided and default values.
 */
export interface ChunkingConfigUsed {
  readonly strategy: ChunkingStrategy;
  readonly totalPages: number;
  readonly totalTokens: number;
  readonly chunkSize?: number;
  readonly overlapPages?: number;
  readonly maxTokensPerChunk?: number;
  readonly overlapTokens?: number;
  readonly targetTokensPerChunk?: number;
  readonly maxPagesPerChunk?: number;
  readonly processingMode?: string;
}

/**
 * Response when chunking IS required.
 * Document exceeds thresholds and has been split into chunks.
 */
export interface ChunkingResponse {
  /**
   * Document identifier.
   */
  readonly documentId: string;

  /**
   * Indicates chunking is required.
   */
  readonly requiresChunking: true;

  /**
   * Token analysis results with detailed per-page information.
   */
  readonly tokenAnalysis: TokenAnalysis;

  /**
   * Strategy used for chunking.
   */
  readonly strategy: ChunkingStrategy;

  /**
   * Array of chunk metadata for all created chunks.
   */
  readonly chunks: ChunkMetadata[];

  /**
   * Configuration used for chunking.
   * Includes both user-provided and default values.
   */
  readonly config: ChunkingConfigUsed;
}

/**
 * Union type for chunking Lambda response.
 * Either chunking is required or not.
 */
export type ChunkingLambdaResponse = NoChunkingResponse | ChunkingResponse;

/**
 * Classification result for a chunk.
 */
export interface ChunkClassificationResult {
  readonly documentClassification: string;
  readonly confidence?: number;
}

/**
 * Processing result for a chunk.
 */
export interface ChunkProcessingResult {
  readonly entities: Entity[];
}

/**
 * Result from processing a single chunk.
 * Contains classification and extraction results, or error information.
 */
export interface ChunkResult {
  /**
   * Chunk identifier.
   */
  readonly chunkId: string;

  /**
   * Zero-based chunk index.
   */
  readonly chunkIndex: number;

  /**
   * Optional classification result for this chunk.
   */
  readonly classificationResult?: ChunkClassificationResult;

  /**
   * Optional extraction result for this chunk.
   */
  readonly processingResult?: ChunkProcessingResult;

  /**
   * Error message if chunk processing failed.
   */
  readonly error?: string;
}

/**
 * Extracted entity from document processing.
 */
export interface Entity {
  /**
   * Type of entity (e.g., 'NAME', 'DATE', 'AMOUNT', 'ADDRESS').
   */
  readonly type: string;

  /**
   * Value of the entity.
   */
  readonly value: string;

  /**
   * Optional page number where entity was found.
   * Entities with page numbers are preserved even if duplicated.
   */
  readonly page?: number;

  /**
   * Optional chunk index where entity was found.
   */
  readonly chunkIndex?: number;
}

/**
 * Request payload for aggregation Lambda.
 * Contains results from all processed chunks.
 */
export interface AggregationRequest {
  /**
   * Document identifier.
   */
  readonly documentId: string;

  /**
   * Results from all processed chunks.
   */
  readonly chunkResults: ChunkResult[];

  /**
   * Strategy to use for aggregation.
   * @default 'majority-vote'
   */
  readonly aggregationStrategy?: AggregationStrategy;
}

/**
 * Summary of chunk processing results.
 */
export interface ChunksSummary {
  /**
   * Total number of chunks created.
   */
  readonly totalChunks: number;

  /**
   * Number of chunks that processed successfully.
   */
  readonly successfulChunks: number;

  /**
   * Number of chunks that failed processing.
   */
  readonly failedChunks: number;

  /**
   * Optional total tokens processed across all chunks.
   */
  readonly totalTokensProcessed?: number;
}

/**
 * Aggregated result from processing all chunks.
 * Combines classification and extraction results into final output.
 */
export interface AggregatedResult {
  /**
   * Document identifier.
   */
  readonly documentId: string;

  /**
   * Final document classification (from majority vote or other strategy).
   */
  readonly classification: string;

  /**
   * Confidence score for the classification (0-1).
   * For majority vote: (count of majority / total chunks)
   */
  readonly classificationConfidence: number;

  /**
   * Deduplicated entities from all chunks.
   * Entities without page numbers are deduplicated by (type, value).
   * Entities with page numbers are preserved even if duplicated.
   */
  readonly entities: Entity[];

  /**
   * Summary of chunk processing results.
   */
  readonly chunksSummary: ChunksSummary;

  /**
   * Indicates if result is partial due to chunk failures.
   * True if fewer than minSuccessThreshold chunks succeeded.
   */
  readonly partialResult: boolean;
}

/**
 * Request payload for cleanup Lambda.
 * Contains information about chunks to delete.
 */
export interface CleanupRequest {
  /**
   * Document identifier.
   */
  readonly documentId: string;

  /**
   * Array of chunk metadata for chunks to delete.
   */
  readonly chunks: ChunkMetadata[];
}

/**
 * Response from cleanup Lambda.
 * Reports success and any errors encountered.
 */
export interface CleanupResponse {
  /**
   * Document identifier.
   */
  readonly documentId: string;

  /**
   * Number of chunks successfully deleted.
   */
  readonly deletedChunks: number;

  /**
   * Array of error messages for failed deletions.
   * Empty if all deletions succeeded.
   */
  readonly errors: string[];
}
