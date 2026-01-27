// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import {
  ChunkingConfig,
  ChunkMetadata,
  ChunkingRequest,
  NoChunkingResponse,
  ChunkingResponse,
  AggregationRequest,
  AggregatedResult,
  CleanupRequest,
  CleanupResponse,
  ChunkingStrategy,
  ProcessingMode,
  AggregationStrategy,
} from '../chunking-config';

describe('ChunkingConfig Interfaces', () => {
  describe('ChunkingConfig', () => {
    it('should accept valid hybrid strategy configuration', () => {
      const config: ChunkingConfig = {
        strategy: 'hybrid',
        maxPagesPerChunk: 100,
        targetTokensPerChunk: 80000,
        pageThreshold: 100,
        tokenThreshold: 150000,
        overlapTokens: 5000,
        processingMode: 'parallel',
        maxConcurrency: 10,
        aggregationStrategy: 'majority-vote',
        minSuccessThreshold: 0.5,
      };

      expect(config.strategy).toBe('hybrid');
      expect(config.maxPagesPerChunk).toBe(100);
      expect(config.targetTokensPerChunk).toBe(80000);
    });

    it('should accept valid token-based strategy configuration', () => {
      const config: ChunkingConfig = {
        strategy: 'token-based',
        tokenThreshold: 150000,
        maxTokensPerChunk: 100000,
        overlapTokens: 5000,
        processingMode: 'sequential',
        maxConcurrency: 1,
      };

      expect(config.strategy).toBe('token-based');
      expect(config.maxTokensPerChunk).toBe(100000);
    });

    it('should accept valid fixed-pages strategy configuration', () => {
      const config: ChunkingConfig = {
        strategy: 'fixed-pages',
        pageThreshold: 100,
        chunkSize: 50,
        overlapPages: 5,
        processingMode: 'parallel',
      };

      expect(config.strategy).toBe('fixed-pages');
      expect(config.chunkSize).toBe(50);
    });
  });

  describe('ChunkMetadata', () => {
    it('should create valid chunk metadata', () => {
      const metadata: ChunkMetadata = {
        chunkId: 'doc-123_chunk_0',
        chunkIndex: 0,
        totalChunks: 3,
        startPage: 0,
        endPage: 49,
        pageCount: 50,
        estimatedTokens: 75000,
        bucket: 'my-bucket',
        key: 'chunks/doc-123_chunk_0.pdf',
      };

      expect(metadata.chunkId).toBe('doc-123_chunk_0');
      expect(metadata.chunkIndex).toBe(0);
      expect(metadata.pageCount).toBe(50);
    });
  });

  describe('ChunkingRequest', () => {
    it('should create valid chunking request', () => {
      const request: ChunkingRequest = {
        documentId: 'doc-123',
        contentType: 'file',
        content: {
          location: 's3',
          bucket: 'my-bucket',
          key: 'raw/document.pdf',
          filename: 'document.pdf',
        },
        config: {
          strategy: 'hybrid',
          processingMode: 'parallel',
        },
      };

      expect(request.documentId).toBe('doc-123');
      expect(request.content.bucket).toBe('my-bucket');
    });
  });

  describe('ChunkingResponse', () => {
    it('should create valid NoChunkingResponse', () => {
      const response: NoChunkingResponse = {
        documentId: 'doc-123',
        requiresChunking: false,
        tokenAnalysis: {
          totalTokens: 45000,
          totalPages: 30,
          avgTokensPerPage: 1500,
        },
        reason: 'Document has 30 pages, below threshold of 100',
      };

      expect(response.requiresChunking).toBe(false);
      expect(response.tokenAnalysis.totalPages).toBe(30);
    });

    it('should create valid ChunkingResponse', () => {
      const response: ChunkingResponse = {
        documentId: 'doc-123',
        requiresChunking: true,
        tokenAnalysis: {
          totalTokens: 245000,
          totalPages: 150,
          avgTokensPerPage: 1633,
          tokensPerPage: [1500, 1600, 1700],
        },
        strategy: 'hybrid',
        chunks: [
          {
            chunkId: 'doc-123_chunk_0',
            chunkIndex: 0,
            totalChunks: 3,
            startPage: 0,
            endPage: 49,
            pageCount: 50,
            estimatedTokens: 75000,
            bucket: 'my-bucket',
            key: 'chunks/doc-123_chunk_0.pdf',
          },
        ],
        config: {
          strategy: 'hybrid',
          totalPages: 150,
          totalTokens: 245000,
          targetTokensPerChunk: 80000,
          maxPagesPerChunk: 100,
        },
      };

      expect(response.requiresChunking).toBe(true);
      expect(response.chunks.length).toBe(1);
      expect(response.strategy).toBe('hybrid');
    });
  });

  describe('AggregationRequest and AggregatedResult', () => {
    it('should create valid aggregation request', () => {
      const request: AggregationRequest = {
        documentId: 'doc-123',
        chunkResults: [
          {
            chunkId: 'doc-123_chunk_0',
            chunkIndex: 0,
            classificationResult: {
              documentClassification: 'INVOICE',
              confidence: 0.95,
            },
            processingResult: {
              entities: [
                { type: 'AMOUNT', value: '$100.00' },
              ],
            },
          },
        ],
        aggregationStrategy: 'majority-vote',
      };

      expect(request.documentId).toBe('doc-123');
      expect(request.chunkResults.length).toBe(1);
    });

    it('should create valid aggregated result', () => {
      const result: AggregatedResult = {
        documentId: 'doc-123',
        classification: 'INVOICE',
        classificationConfidence: 0.95,
        entities: [
          { type: 'AMOUNT', value: '$100.00', page: 1 },
        ],
        chunksSummary: {
          totalChunks: 3,
          successfulChunks: 3,
          failedChunks: 0,
          totalTokensProcessed: 225000,
        },
        partialResult: false,
      };

      expect(result.classification).toBe('INVOICE');
      expect(result.chunksSummary.totalChunks).toBe(3);
      expect(result.partialResult).toBe(false);
    });
  });

  describe('CleanupRequest and CleanupResponse', () => {
    it('should create valid cleanup request', () => {
      const request: CleanupRequest = {
        documentId: 'doc-123',
        chunks: [
          {
            chunkId: 'doc-123_chunk_0',
            chunkIndex: 0,
            totalChunks: 3,
            startPage: 0,
            endPage: 49,
            pageCount: 50,
            estimatedTokens: 75000,
            bucket: 'my-bucket',
            key: 'chunks/doc-123_chunk_0.pdf',
          },
        ],
      };

      expect(request.documentId).toBe('doc-123');
      expect(request.chunks.length).toBe(1);
    });

    it('should create valid cleanup response', () => {
      const response: CleanupResponse = {
        documentId: 'doc-123',
        deletedChunks: 3,
        errors: [],
      };

      expect(response.deletedChunks).toBe(3);
      expect(response.errors.length).toBe(0);
    });

    it('should create cleanup response with errors', () => {
      const response: CleanupResponse = {
        documentId: 'doc-123',
        deletedChunks: 2,
        errors: ['Failed to delete chunk 2: Access Denied'],
      };

      expect(response.deletedChunks).toBe(2);
      expect(response.errors.length).toBe(1);
    });
  });

  describe('Type Enums', () => {
    it('should accept valid chunking strategies', () => {
      const strategies: ChunkingStrategy[] = ['fixed-pages', 'token-based', 'hybrid'];
      expect(strategies.length).toBe(3);
    });

    it('should accept valid processing modes', () => {
      const modes: ProcessingMode[] = ['sequential', 'parallel'];
      expect(modes.length).toBe(2);
    });

    it('should accept valid aggregation strategies', () => {
      const strategies: AggregationStrategy[] = ['majority-vote', 'weighted-vote', 'first-chunk'];
      expect(strategies.length).toBe(3);
    });
  });
});
