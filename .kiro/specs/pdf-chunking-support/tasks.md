# Implementation Plan: PDF Chunking Support

## Overview

This implementation plan breaks down the PDF chunking feature into discrete coding tasks. The feature enables processing of large PDFs by splitting them into manageable chunks, processing each chunk through the existing classification and extraction pipeline, and intelligently aggregating results.

## Tasks

- [x] 1. Extend BaseDocumentProcessing with Template Method Pattern
  - [x] 1.1 Add abstract `preprocessingStep()` method to BaseDocumentProcessing
    - Define method signature returning `DocumentProcessingStepType | undefined`
    - Add JSDoc documentation explaining purpose and usage
    - _Requirements: 6.5_
  
  - [x] 1.2 Add abstract `createProcessingWorkflow()` method to BaseDocumentProcessing
    - Define method signature returning `IChainable`
    - Add JSDoc documentation for concrete class implementation
    - _Requirements: 6.5_
  
  - [x] 1.3 Implement `createStandardProcessingWorkflow()` protected helper method
    - Chain Classification → Processing → Enrichment → PostProcessing
    - Add error handling and DynamoDB updates
    - Return IChainable for reuse by concrete classes
    - _Requirements: 6.1, 6.4_
  
  - [x] 1.4 Update `handleStateMachineCreation()` to integrate preprocessing
    - Check if `preprocessingStep()` returns a task
    - Create workflow with preprocessing: PreprocessingStep → InitMetadata → createProcessingWorkflow()
    - Create workflow without preprocessing: InitMetadata → createStandardProcessingWorkflow()
    - _Requirements: 6.1, 6.4_
  
  - [x] 1.5 Write unit tests for BaseDocumentProcessing workflow orchestration
    - Test workflow with preprocessing step
    - Test workflow without preprocessing step
    - Verify standard workflow is reusable
    - _Requirements: 6.1, 6.4_

- [x] 2. Extend DynamoDB schema for chunking metadata
  - [x] 2.1 Add ChunkingEnabled field (boolean) to table schema
    - Update DynamoDB table definition in BaseDocumentProcessing
    - _Requirements: 2.7, 4.7_
  
  - [x] 2.2 Add ChunkingStrategy field (string) to table schema
    - Store strategy used: 'fixed-pages', 'token-based', or 'hybrid'
    - _Requirements: 2.7, 4.7_
  
  - [x] 2.3 Add TokenAnalysis field (JSON string) to table schema
    - Store totalTokens, totalPages, avgTokensPerPage, tokensPerPage array
    - _Requirements: 2.7, 4.7_
  
  - [x] 2.4 Add ChunkingConfig field (JSON string) to table schema
    - Store strategy, totalPages, totalTokens, and strategy-specific config
    - _Requirements: 2.7, 4.7_
  
  - [x] 2.5 Add ChunkMetadata field (JSON string array) to table schema
    - Store array of chunk metadata (chunkId, startPage, endPage, etc.)
    - _Requirements: 2.3, 2.7, 4.7_
  
  - [x] 2.6 Add AggregatedResult field (JSON string) to table schema
    - Store classification, entities, chunksSummary, partialResult flag
    - _Requirements: 4.6, 4.7_
  
  - [x] 2.7 Write migration tests to ensure backward compatibility
    - Verify non-chunked documents don't have chunking fields
    - Test schema compatibility with existing documents
    - _Requirements: 6.2, 6.3_

- [x] 3. Define TypeScript interfaces for chunking
  - [x] 3.1 Create `chunking-config.ts` with ChunkingConfig interface
    - Define all strategy options (fixed-pages, token-based, hybrid)
    - Add strategy-specific configuration fields
    - Add common settings (processingMode, maxConcurrency, etc.)
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  
  - [x] 3.2 Create ChunkMetadata interface
    - Define chunkId, chunkIndex, startPage, endPage, pageCount, estimatedTokens
    - Add bucket and key for S3 location
    - _Requirements: 2.3_
  
  - [x] 3.3 Create ChunkingRequest interface for Lambda input
    - Define documentId, contentType, content, config fields
    - _Requirements: 1.1, 2.1_
  
  - [x] 3.4 Create ChunkingResponse interfaces (NoChunkingResponse, ChunkingResponse)
    - Define requiresChunking flag, tokenAnalysis, chunks array
    - Add reason field for no-chunking case
    - _Requirements: 1.2, 1.3, 2.1_
  
  - [x] 3.5 Create AggregationRequest and AggregatedResult interfaces
    - Define chunkResults array, aggregationStrategy
    - Define classification, entities, chunksSummary, partialResult
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_
  
  - [x] 3.6 Create CleanupRequest and CleanupResponse interfaces
    - Define documentId, chunks array for cleanup
    - Define deletedChunks count and errors array
    - _Requirements: 8.4_
  
  - [x] 3.7 Add chunking props to BedrockDocumentProcessingProps
    - Add enableChunking boolean flag (default: false)
    - Add chunkingConfig optional field
    - _Requirements: 5.1, 5.4, 6.5_

- [x] 4. Implement token estimation module (Python)
  - [x] 4.1 Create `resources/pdf-chunking/token_estimation.py`
    - Implement `estimate_tokens_fast(text: str)` using word-based heuristic
    - Count words using regex `\b\w+\b`
    - Apply 1.3 tokens per word multiplier
    - Return estimated token count
    - _Requirements: 1.1_
  
  - [x] 4.2 Implement `analyze_pdf_tokens(bucket: str, key: str, config: dict)`
    - Stream PDF from S3 using boto3
    - Extract text from each page using PyPDF2
    - Calculate tokens per page using `estimate_tokens_fast()`
    - Determine if chunking required based on strategy and thresholds
    - Return dict with total_tokens, total_pages, tokens_per_page, requires_chunking
    - _Requirements: 1.1, 1.3_
  
  - [x] 4.3 Write unit tests for token estimation
    - Test with various text densities (low, medium, high)
    - Test with empty pages (0 tokens)
    - Test with very dense pages (>10,000 tokens)
    - Verify estimation accuracy (~85-90%)
    - _Requirements: 1.1_
  
  - [ ]* 4.4 Write property test for token estimation consistency
    - **Property: Token Estimation Consistency**
    - **Validates: Requirements 1.1**
    - Test that token estimation is consistent for same input
    - Use hypothesis to generate various text samples

- [x] 5. Implement chunking algorithms (Python)
  - [x] 5.1 Create `resources/pdf-chunking/chunking_strategies.py`
    - Implement `calculate_chunks_fixed_pages(total_pages, chunk_size, overlap_pages)`
    - Implement `calculate_chunks_token_based(tokens_per_page, max_tokens_per_chunk, overlap_tokens)`
    - Implement `calculate_chunks_hybrid(tokens_per_page, target_tokens, max_pages, overlap_tokens)`
    - Return list of chunk metadata dicts
    - _Requirements: 2.1, 2.2_
  
  - [x] 5.2 Implement configuration validation
    - Validate chunk_size > 0
    - Validate overlap >= 0 and overlap < chunk_size
    - Validate threshold > 0
    - Reject invalid configurations
    - _Requirements: 5.5_
  
  - [x] 5.3 Write unit tests for each chunking strategy
    - Test fixed-pages with various page counts and chunk sizes
    - Test token-based with variable token density
    - Test hybrid with mixed scenarios (token limit vs page limit)
    - Test edge cases (document size equals chunk size, 1 page, last chunk smaller)
    - _Requirements: 2.1, 2.2_
  
  - [ ]* 5.4 Write property test for Property 1: Chunk Count Calculation
    - **Property 1: Chunk Count Calculation**
    - **Validates: Requirements 2.1**
    - For any PDF with page count P, chunk size C, overlap O (0 ≤ O < C, C > 0)
    - Number of chunks = ceil((P - O) / (C - O)) when O > 0, or ceil(P / C) when O = 0
    - Use hypothesis with page_count (101-1000), chunk_size (10-100), overlap (0-10)
  
  - [ ]* 5.5 Write property test for Property 2: Overlap Consistency
    - **Property 2: Overlap Consistency**
    - **Validates: Requirements 2.4**
    - For any two consecutive chunks with overlap O > 0
    - Last O pages of chunk N overlap with first O pages of chunk N+1
    - Use hypothesis with page_count (101-500), chunk_size (20-100), overlap (1-10)

- [x] 6. Implement PDF analysis and chunking Lambda
  - [x] 6.1 Create `resources/pdf-chunking/handler.py` Lambda handler
    - Parse event for documentId, content (bucket, key), config
    - Call `analyze_pdf_tokens()` to get token analysis
    - Determine if chunking required based on strategy and thresholds
    - If no chunking: return NoChunkingResponse with analysis
    - If chunking: proceed to split PDF
    - _Requirements: 1.1, 1.2, 1.3_
  
  - [x] 6.2 Implement PDF splitting and chunk creation
    - Download PDF from S3 using streaming
    - Use PyPDF2 to split PDF based on chunk boundaries
    - Generate chunk IDs: `{documentId}_chunk_{index}`
    - Upload chunks to S3 chunks/ prefix
    - Generate ChunkMetadata for each chunk
    - _Requirements: 2.1, 2.3, 2.5_
  
  - [x] 6.3 Add error handling for PDF operations
    - Handle invalid PDF format → return error
    - Handle corrupted PDF files → return error
    - Handle S3 access denied → return error with message
    - Handle timeout → return error
    - Handle corrupted pages → skip page, log warning, continue
    - _Requirements: 1.5, 2.6, 7.1_
  
  - [x] 6.4 Add error handling for S3 operations
    - Retry S3 writes with exponential backoff (3 attempts)
    - Log all S3 errors with document ID
    - Preserve original document in raw/ on failure
    - _Requirements: 2.6, 7.1_
  
  - [x] 6.5 Create `requirements.txt` for Lambda dependencies
    - Add PyPDF2 or pypdf for PDF processing
    - Add boto3 for S3 operations
    - _Requirements: 2.1_
  
  - [x] 6.6 Write unit tests for Lambda handler
    - Test with small document (no chunking)
    - Test with large document (chunking required)
    - Test with invalid PDF format
    - Test with S3 access denied
    - _Requirements: 1.1, 1.2, 1.3, 2.1_
  
  - [x] 6.7 Write integration tests for end-to-end chunking
    - Upload test PDF to S3
    - Invoke Lambda with test event
    - Verify chunks created in S3
    - Verify chunk metadata returned
    - Verify original PDF preserved
    - _Requirements: 2.1, 2.3, 2.5_

- [x] 7. Implement preprocessing step in BedrockDocumentProcessing
  - [x] 7.1 Override `preprocessingStep()` method in BedrockDocumentProcessing
    - Check if `enableChunking` flag is true
    - If false, return undefined (skip preprocessing)
    - If true, create and return PDF Analysis & Chunking Lambda task
    - _Requirements: 5.1, 6.5_
  
  - [x] 7.2 Create PDF Analysis & Chunking Lambda construct
    - Use PythonFunction with entry path to `resources/pdf-chunking`
    - Set runtime to DefaultRuntimes.PYTHON
    - Set memorySize to 2048 MB
    - Set timeout to 10 minutes
    - _Requirements: 2.1_
  
  - [x] 7.3 Configure Lambda environment variables from chunking config
    - Set CHUNKING_STRATEGY from config (default: 'hybrid')
    - Set PAGE_THRESHOLD from config (default: 100)
    - Set TOKEN_THRESHOLD from config (default: 150000)
    - Set strategy-specific parameters
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  
  - [x] 7.4 Add IAM permissions for S3 operations
    - Grant read access to raw/ prefix
    - Grant write access to chunks/ prefix
    - Grant write access to failed/ prefix
    - _Requirements: 2.5, 2.6_
  
  - [x] 7.5 Create LambdaInvoke Step Functions task
    - Set resultPath to '$.chunkingResult'
    - Return task from preprocessingStep()
    - _Requirements: 1.1, 1.3_
  
  - [x] 7.6 Write unit tests for preprocessing step creation
    - Test with enableChunking=true
    - Test with enableChunking=false
    - Verify Lambda construct created correctly
    - Verify environment variables set correctly
    - _Requirements: 5.1, 6.5_

- [x] 8. Implement custom processing workflow in BedrockDocumentProcessing
  - [x] 8.1 Override `createProcessingWorkflow()` method
    - Create Choice State named 'CheckIfChunked'
    - Check condition: `$.chunkingResult.requiresChunking` equals true
    - Branch to chunked flow if true, standard flow if false
    - _Requirements: 1.2, 1.3, 3.5_
  
  - [x] 8.2 Implement `createChunkedProcessingFlow()` private method
    - Create Map State for processing chunks
    - Set itemsPath to '$.chunkingResult.chunks'
    - Configure maxConcurrency from config (default: 10)
    - Set parameters for chunk processing
    - _Requirements: 3.1, 3.2, 3.5_
  
  - [x] 8.3 Configure Map State iterator with chunk processing
    - Reuse existing classificationStep() for each chunk
    - Reuse existing processingStep() for each chunk
    - Chain classification → processing for each chunk
    - _Requirements: 3.1, 3.2_
  
  - [x] 8.4 Wire standard workflow for non-chunked path
    - Call `createStandardProcessingWorkflow()` for otherwise branch
    - Ensure backward compatibility with existing workflow
    - _Requirements: 6.1, 6.4_
  
  - [x] 8.5 Write unit tests for workflow branching
    - Test Choice State condition evaluation
    - Test Map State configuration
    - Test standard workflow fallback
    - _Requirements: 1.2, 1.3, 3.5, 6.1_

- [-] 9. Implement aggregation Lambda
  - [x] 9.1 Create `resources/aggregation/handler.py` Lambda handler
    - Parse event for documentId, chunkResults array
    - Call `aggregate_classifications()` for classification results
    - Call `deduplicate_entities()` for extraction results
    - Calculate chunksSummary (total, successful, failed)
    - Determine if result is partial (< 50% success threshold)
    - Return AggregatedResult
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_
  
  - [x] 9.2 Implement `aggregate_classifications()` function
    - Count classification results from all chunks
    - Select most frequent classification (majority vote)
    - Calculate confidence as (count of majority / total chunks)
    - Handle tie by selecting first alphabetically
    - _Requirements: 4.2_
  
  - [x] 9.3 Implement `deduplicate_entities()` function
    - Combine entities from all chunks
    - Remove exact duplicates by (type, value) for entities without page numbers
    - Preserve all entities with page numbers (may appear on multiple pages)
    - Sort entities by chunk index and page number
    - _Requirements: 4.4_
  
  - [x] 9.4 Add error handling for aggregation failures
    - Handle insufficient successful chunks (< 50%)
    - Preserve individual chunk results on failure
    - Log aggregation errors with document ID
    - _Requirements: 4.5, 7.3_
  
  - [x] 9.5 Create `requirements.txt` for aggregation Lambda
    - Add boto3 for AWS operations
    - Add any additional dependencies
    - _Requirements: 4.1_
  
  - [x] 9.6 Write unit tests for aggregation logic
    - Test majority voting with clear majority
    - Test majority voting with tie (alphabetical selection)
    - Test entity deduplication with exact duplicates
    - Test entity deduplication preserving page numbers
    - Test partial results with 50% failure threshold
    - Test all chunks failed scenario
    - _Requirements: 4.2, 4.4, 4.5_
  
  - [ ]* 9.7 Write property test for Property 3: Classification Aggregation
    - **Property 3: Classification Aggregation (Majority Vote)**
    - **Validates: Requirements 4.2**
    - For any set of processed chunks with classification results
    - Aggregated classification = most frequent classification
    - Use hypothesis with classifications list (3-20 items)
  
  - [ ]* 9.8 Write property test for Property 4: Entity Deduplication
    - **Property 4: Entity Deduplication**
    - **Validates: Requirements 4.4**
    - Entities without page numbers deduplicated by (type, value)
    - Entities with page numbers preserved even if duplicated
    - Use hypothesis with entities list (5-50 items)

- [x] 10. Implement cleanup Lambda
  - [x] 10.1 Create `resources/cleanup/handler.py` Lambda handler
    - Parse event for documentId, chunks array
    - Extract S3 keys for all chunks
    - Use boto3 batch delete (up to 1000 objects per request)
    - Return CleanupResponse with deletedChunks count and errors
    - _Requirements: 8.4_
  
  - [x] 10.2 Add error handling for cleanup failures
    - Log deletion failures but don't fail workflow
    - Return errors array with failed deletions
    - Rely on S3 lifecycle policy for eventual cleanup
    - _Requirements: 8.4, 7.3_
  
  - [x] 10.3 Create `requirements.txt` for cleanup Lambda
    - Add boto3 for S3 operations
    - _Requirements: 8.4_
  
  - [x] 10.4 Write unit tests for cleanup logic
    - Test batch delete with multiple chunks
    - Test error handling for S3 delete failures
    - Verify non-blocking error handling
    - _Requirements: 8.4_
  
  - [ ]* 10.5 Write integration test for Property 9: Chunk Cleanup
    - **Property 9: Chunk Cleanup**
    - **Validates: Requirements 8.4**
    - After successful aggregation, all temporary chunk files deleted from S3
    - Verify S3 chunks/ prefix is empty after processing

- [x] 11. Wire aggregation and cleanup into workflow
  - [x] 11.1 Create Aggregation Lambda construct in BedrockDocumentProcessing
    - Use PythonFunction with entry path to `resources/aggregation`
    - Set appropriate memory and timeout
    - Grant read access to DynamoDB for chunk results
    - _Requirements: 4.1_
  
  - [x] 11.2 Create Cleanup Lambda construct in BedrockDocumentProcessing
    - Use PythonFunction with entry path to `resources/cleanup`
    - Set appropriate memory and timeout
    - Grant delete access to S3 chunks/ prefix
    - _Requirements: 8.4_
  
  - [x] 11.3 Add DynamoDB update step after aggregation
    - Update AggregatedResult field with aggregation output
    - Update WorkflowStatus to 'complete'
    - Set resultPath to JsonPath.DISCARD
    - _Requirements: 4.6_
  
  - [x] 11.4 Chain workflow steps in `createChunkedProcessingFlow()`
    - Map State → Aggregation → DynamoDB Update → Cleanup
    - Add error handling with addCatch() for each step
    - Add retry logic for transient failures
    - _Requirements: 3.5, 4.1, 4.6, 8.4_
  
  - [x] 11.5 Write integration tests for complete chunked workflow
    - Upload large PDF (>100 pages) ✓ (test_large_document_with_chunking in test_integration.py)
    - Verify chunking occurs ✓ (verifies requiresChunking=true)
    - Verify all chunks processed ✓ (verifies chunk metadata and S3 objects)
    - Verify aggregation completes ✓ (covered by workflow chain tests)
    - Verify chunks cleaned up ✓ (cleanup Lambda tested in test_handler.py)
    - Verify final result in DynamoDB ✓ (DynamoDB update step tested in CDK tests)
    - _Requirements: 1.3, 2.1, 3.1, 3.2, 4.1, 4.6, 8.4_

- [x] 12. Enhance classification Lambda for chunk context
  - [x] 12.1 Update classification Lambda to accept chunk metadata in event
    - Add optional chunkMetadata field to event payload
    - Parse chunkIndex, totalChunks, startPage, endPage from metadata
    - _Requirements: 3.3_
  
  - [x] 12.2 Modify prompt template to include chunk context
    - Add chunk position information to prompt
    - Include overlap information if applicable
    - Format: "You are analyzing chunk {N} of {total} from pages {start} to {end}"
    - _Requirements: 3.3_
  
  - [x] 12.3 Write unit tests for chunk-aware classification
    - Test classification with chunk metadata
    - Test classification without chunk metadata (backward compatibility)
    - Verify prompt includes chunk context
    - _Requirements: 3.3, 6.4_
  
  - [x] 12.4 Write integration tests comparing chunked vs non-chunked
    - Process same document with and without chunking
    - Compare classification results
    - Verify accuracy maintained
    - _Requirements: 3.1, 6.4_

- [x] 13. Enhance processing Lambda for chunk context
  - [x] 13.1 Update processing Lambda to accept chunk metadata in event
    - Add optional chunkMetadata field to event payload
    - Parse chunkIndex, totalChunks, startPage, endPage from metadata
    - _Requirements: 3.3_
  
  - [x] 13.2 Modify prompt template to include chunk context
    - Add chunk position information to prompt
    - Include overlap information if applicable
    - Format: "You are processing chunk {N} of {total} from pages {start} to {end}"
    - _Requirements: 3.3_
  
  - [x] 13.3 Write unit tests for chunk-aware processing
    - Test processing with chunk metadata
    - Test processing without chunk metadata (backward compatibility)
    - Verify prompt includes chunk context
    - _Requirements: 3.3, 6.4_
  
  - [x] 13.4 Write integration tests comparing chunked vs non-chunked
    - Process same document with and without chunking
    - Compare extraction results
    - Verify entity extraction accuracy
    - _Requirements: 3.2, 6.4_

- [x] 14. Implement configuration management
  - [x] 14.1 Add enableChunking flag to BedrockDocumentProcessingProps
    - Set default to false for backward compatibility
    - Document flag in JSDoc
    - _Requirements: 5.1, 6.5_
  
  - [x] 14.2 Add chunkingConfig to BedrockDocumentProcessingProps
    - Make optional with type ChunkingConfig
    - Document all configuration options
    - _Requirements: 5.1, 5.2, 5.3_
  
  - [x] 14.3 Implement default configuration values
    - Default strategy: 'hybrid' (recommended)
    - Default pageThreshold: 100
    - Default tokenThreshold: 150000
    - Default maxPagesPerChunk: 100
    - Default targetTokensPerChunk: 80000
    - Default processingMode: 'parallel'
    - Default maxConcurrency: 10
    - _Requirements: 5.4_
  
  - [x] 14.4 Add configuration validation in constructor
    - Validate chunk_size > 0
    - Validate overlap >= 0 and overlap < chunk_size
    - Validate threshold > 0
    - Throw error for invalid configuration
    - _Requirements: 5.5_
  
  - [ ]* 14.5 Write property test for Property 5: Configuration Validation
    - **Property 5: Configuration Validation**
    - **Validates: Requirements 5.5**
    - For any configuration with invalid parameters
    - System rejects configuration before processing
    - Use hypothesis with chunk_size (-100 to 100), overlap (-10 to 100), threshold (-100 to 1000)
  
  - [x] 14.6 Write unit tests for configuration precedence
    - Test default values applied
    - Test custom configuration overrides defaults
    - Test environment variable precedence
    - _Requirements: 5.1, 5.4_

- [x] 15. Implement strategy selection logic
  - [x] 15.1 Add threshold checks for each strategy
    - Fixed-pages: check page count > pageThreshold
    - Token-based: check total tokens > tokenThreshold
    - Hybrid: check page count OR total tokens exceed thresholds
    - _Requirements: 1.2, 1.3_
  
  - [x] 15.2 Add logging for strategy selection reasoning
    - Log selected strategy and reason
    - Log document characteristics (pages, tokens)
    - Log threshold values used
    - _Requirements: 7.5_
  
  - [x] 15.3 Write unit tests for strategy selection
    - Test fixed-pages strategy selection
    - Test token-based strategy selection
    - Test hybrid strategy selection
    - Test threshold boundary conditions
    - _Requirements: 1.2, 1.3_
  
  - [ ]* 15.4 Write unit test for Property 6: Threshold-Based Chunking Decision
    - **Property 6: Threshold-Based Chunking Decision**
    - **Validates: Requirements 1.2, 1.3**
    - Documents with page count ≤ threshold bypass chunking
    - Documents with page count > threshold are chunked
    - Test with specific page counts (50, 100, 101, 150)

- [x] 16. Verify chunking inheritance in AgenticDocumentProcessing
  - [x] 16.1 Verify preprocessingStep() inherited correctly
    - No code changes needed in AgenticDocumentProcessing
    - Verify method inherited from BedrockDocumentProcessing
    - _Requirements: 6.5_
  
  - [x] 16.2 Verify createProcessingWorkflow() inherited correctly
    - No code changes needed in AgenticDocumentProcessing
    - Verify method inherited from BedrockDocumentProcessing
    - _Requirements: 6.5_
  
  - [x] 16.3 Test chunking with agent-based processing
    - Create test with AgenticDocumentProcessing and chunking enabled
    - Verify chunks processed through BatchAgent
    - Verify aggregation works with agent results
    - _Requirements: 3.1, 3.2, 6.5_
  
  - [x] 16.4 Write integration tests for AgenticDocumentProcessing with chunking
    - Test large document with agent processing
    - Verify chunking and aggregation work correctly
    - Compare results with BedrockDocumentProcessing
    - _Requirements: 6.5_

- [ ] 17. Property-based testing suite
  - [ ]* 17.1 Set up Hypothesis testing framework
    - Install hypothesis package
    - Configure test settings (min 100 iterations per property)
    - Set up test fixtures and utilities
  
  - [ ]* 17.2 Verify all property tests pass
    - Run Property 1: Chunk Count Calculation (100+ iterations)
    - Run Property 2: Overlap Consistency (100+ iterations)
    - Run Property 3: Classification Aggregation (100+ iterations)
    - Run Property 4: Entity Deduplication (100+ iterations)
    - Run Property 5: Configuration Validation (100+ iterations)
    - Verify all tests pass consistently

- [ ] 18. Integration testing suite
  - [ ] 18.1 Test small document flow (no chunking)
    - Upload PDF with 50 pages, 45,000 tokens
    - Verify no chunking occurs
    - Verify existing workflow completes
    - Verify no chunking fields in DynamoDB
    - **Validates Property 7: Backward Compatibility**
    - _Requirements: 1.2, 6.1, 6.2, 6.3, 6.4_
  
  - [ ] 18.2 Test large document flow with fixed-pages strategy
    - Upload PDF with 150 pages
    - Configure strategy: 'fixed-pages'
    - Verify chunking occurs based on page count
    - Verify all chunks processed
    - Verify aggregation completes
    - Verify chunks cleaned up
    - Verify final result in DynamoDB
    - _Requirements: 1.3, 2.1, 3.1, 3.2, 4.1, 4.6, 8.4_
  
  - [ ] 18.3 Test large document flow with token-based strategy
    - Upload PDF with 100 pages, 200,000 tokens (high density)
    - Configure strategy: 'token-based'
    - Verify chunking occurs based on token count
    - Verify no chunk exceeds token limit
    - Verify all chunks processed
    - Verify aggregation completes
    - _Requirements: 1.3, 2.1, 3.1, 3.2, 4.1, 4.6_
  
  - [ ] 18.4 Test large document flow with hybrid strategy
    - Upload PDF with 200 pages, variable density
    - Configure strategy: 'hybrid'
    - Verify chunks respect both token and page limits
    - Verify optimal chunk boundaries
    - Verify all chunks processed
    - _Requirements: 1.3, 2.1, 3.1, 3.2, 4.1, 4.6_
  
  - [ ] 18.5 Test variable density document across all strategies
    - Upload PDF with mixed content (title pages, dense text, tables)
    - Process with fixed-pages, token-based, and hybrid strategies
    - Compare chunk counts and boundaries
    - Verify token-based creates more balanced chunks
    - _Requirements: 2.1_
  
  - [ ] 18.6 Test partial failure flow
    - Simulate chunk processing failure
    - Verify remaining chunks process
    - Verify partial result marked correctly
    - Verify failed chunks recorded in DynamoDB
    - **Validates Property 8: Partial Failure Resilience**
    - _Requirements: 3.4, 4.5, 7.2_
  
  - [ ] 18.7 Test configuration override flow
    - Upload document with custom configuration
    - Verify custom values used instead of defaults
    - Test all three strategies with custom configs
    - _Requirements: 5.1, 5.2, 5.3_
  
  - [ ] 18.8 Test token limit edge case
    - Upload document with single page exceeding token limit
    - Verify system handles gracefully
    - Verify warning logged
    - Verify document still processes
    - _Requirements: 1.5, 7.1_

- [ ] 19. Performance testing
  - [ ] 19.1 Test parallel processing performance
    - Process 10 large documents simultaneously
    - Verify concurrency limits respected (maxConcurrency)
    - Measure total processing time
    - _Requirements: 3.5, 8.2_
  
  - [ ] 19.2 Test sequential processing performance
    - Process large document with maxConcurrency=1
    - Measure processing time per chunk
    - Verify no concurrency violations
    - _Requirements: 3.5, 8.5_
  
  - [ ] 19.3 Monitor Lambda memory usage during chunking
    - Track memory usage for PDF analysis Lambda
    - Track memory usage for chunking Lambda
    - Verify no out-of-memory errors
    - Verify efficient S3 streaming
    - _Requirements: 8.3_
  
  - [ ] 19.4 Measure token analysis time for various PDF sizes
    - Test with 50, 100, 200, 500, 1000 page PDFs
    - Measure analysis time for each strategy
    - Verify fixed-pages is fastest (< 1 second)
    - Verify token-based and hybrid are moderate (2-5 seconds)
    - _Requirements: 8.1_
  
  - [ ] 19.5 Compare performance across all three strategies
    - Process same documents with all strategies
    - Compare total processing time
    - Compare chunk counts
    - Document performance characteristics
    - _Requirements: 8.1, 8.5_

- [ ] 20. Generate test data
  - [ ] 20.1 Create simple-invoice-30pages-45k-tokens.pdf
    - Generate PDF with 30 pages
    - Target ~1,500 tokens per page
    - Use for no-chunking test case
    - _Requirements: 1.2_
  
  - [ ] 20.2 Create technical-manual-150pages-225k-tokens.pdf
    - Generate PDF with 150 pages
    - Target ~1,500 tokens per page (medium density)
    - Use for token-based chunking test
    - _Requirements: 1.3, 2.1_
  
  - [ ] 20.3 Create mixed-content-200pages-150k-tokens.pdf
    - Generate PDF with 200 pages
    - Mix of low and high density pages
    - Use for hybrid chunking test
    - _Requirements: 1.3, 2.1_
  
  - [ ] 20.4 Create dense-contract-80pages-400k-tokens.pdf
    - Generate PDF with 80 pages
    - Target ~5,000 tokens per page (high density)
    - Use for token-based strategy test
    - _Requirements: 1.3, 2.1_
  
  - [ ] 20.5 Create image-heavy-500pages-50k-tokens.pdf
    - Generate PDF with 500 pages
    - Target ~100 tokens per page (low density, mostly images)
    - Use for page-based chunking test
    - _Requirements: 1.3, 2.1_
  
  - [ ] 20.6 Create corrupted PDF for error testing
    - Create intentionally corrupted PDF file
    - Use for error handling tests
    - _Requirements: 1.5, 7.1_
  
  - [ ] 20.7 Create encrypted PDF for error testing
    - Create password-protected PDF
    - Use for error handling tests
    - _Requirements: 1.5, 7.1_

- [x] 21. Implement error handling
  - [x] 21.1 Add error handling for invalid PDF format
    - Detect invalid PDF format in chunking Lambda
    - Log error with document ID and failure reason
    - Move document to failed/ prefix
    - Update DynamoDB with error details
    - _Requirements: 1.5, 7.1_
  
  - [x] 21.2 Add error handling for corrupted PDF files
    - Detect corrupted PDF in chunking Lambda
    - Log error with document ID and stack trace
    - Move document to failed/ prefix
    - Update DynamoDB with error details
    - _Requirements: 1.5, 7.1_
  
  - [x] 21.3 Add error handling for S3 access denied
    - Catch S3 access denied errors
    - Log error with specific message
    - Move document to failed/ prefix
    - _Requirements: 1.5, 7.1_
  
  - [x] 21.4 Add error handling for Lambda timeout
    - Set appropriate timeout values (10 minutes for chunking)
    - Log timeout errors
    - Move document to failed/ prefix
    - _Requirements: 1.5, 7.1_
  
  - [x] 21.5 Add error handling for DynamoDB write failures
    - Retry DynamoDB writes with exponential backoff
    - Log failures with document ID
    - Preserve chunk results on failure
    - _Requirements: 7.2, 7.3_
  
  - [x] 21.6 Add retry logic with exponential backoff for transient errors
    - Implement retry for S3 throttling (3 attempts)
    - Implement retry for Bedrock throttling (3 attempts)
    - Use exponential backoff with jitter
    - _Requirements: 3.4, 7.1_
  
  - [x] 21.7 Write unit tests for all error scenarios
    - Test invalid PDF format handling
    - Test corrupted PDF handling
    - Test S3 access denied handling
    - Test Lambda timeout handling
    - Test DynamoDB write failure handling
    - Test retry logic
    - _Requirements: 7.1, 7.2, 7.3_

- [x] 22. Implement CloudWatch metrics
  - [x] 22.1 Add ChunkingOperations metric
    - Emit count metric for each chunking operation
    - Add dimension for strategy (fixed-pages, token-based, hybrid)
    - _Requirements: 7.4_
  
  - [x] 22.2 Add ChunkCount metric
    - Emit average and max chunk count per document
    - Add dimension for strategy
    - _Requirements: 7.4_
  
  - [x] 22.3 Add TokensPerChunk metric
    - Emit average and p99 tokens per chunk
    - Add dimension for strategy
    - _Requirements: 7.4_
  
  - [x] 22.4 Add ChunkProcessingTime metric
    - Emit average and p99 processing time per chunk
    - Add dimension for processing mode (sequential, parallel)
    - _Requirements: 7.4_
  
  - [x] 22.5 Add ChunkFailureRate metric
    - Calculate percentage of failed chunks
    - Emit as percentage metric
    - _Requirements: 7.4_
  
  - [x] 22.6 Add AggregationTime metric
    - Emit average and p99 aggregation time
    - _Requirements: 7.4_
  
  - [x] 22.7 Add StrategyUsage metric
    - Emit count by strategy type
    - Track which strategies are most used
    - _Requirements: 7.4_

- [ ] 23. Implement CloudWatch alarms
  - [ ] 23.1 Create alarm for high failure rate
    - Threshold: > 5% of documents fail
    - Action: Send SNS notification
    - _Requirements: 7.4_
  
  - [ ] 23.2 Create alarm for high DLQ message count
    - Threshold: > 10 messages in DLQ
    - Action: Send SNS notification
    - _Requirements: 7.4_
  
  - [ ] 23.3 Create alarm for long processing time
    - Threshold: > 15 minutes per document
    - Action: Send SNS notification
    - _Requirements: 7.4_
  
  - [ ] 23.4 Create alarm for aggregation failures
    - Threshold: > 1% of aggregations fail
    - Action: Send SNS notification
    - _Requirements: 7.4_
  
  - [ ] 23.5 Create alarm for token limit violations
    - Threshold: Any chunk exceeds token limit
    - Action: Send SNS notification
    - _Requirements: 7.4_

- [x] 24. Implement structured logging
  - [x] 24.1 Add structured JSON logging to all Lambda functions
    - Use consistent log format across all Lambdas
    - Include timestamp, level, message, context
    - _Requirements: 7.5_
  
  - [x] 24.2 Include document ID, chunk index, and correlation ID in logs
    - Add documentId to all log entries
    - Add chunkIndex for chunk-specific logs
    - Generate and propagate correlation ID
    - _Requirements: 7.5_
  
  - [x] 24.3 Add log level configuration
    - Support INFO and ERROR log levels
    - Configure via environment variable
    - _Requirements: 7.5_
  
  - [x] 24.4 Log strategy selection reasoning
    - Log selected strategy and reason
    - Log document characteristics (pages, tokens)
    - Log threshold values used
    - _Requirements: 7.5_
  
  - [x] 24.5 Write tests to verify log structure and content
    - Test log format is valid JSON
    - Test required fields present
    - Test correlation ID propagation
    - _Requirements: 7.5_

- [x] 25. Update API documentation
  - [x] 25.1 Document new BedrockDocumentProcessingProps fields
    - Document enableChunking flag
    - Document chunkingConfig field
    - Add JSDoc with examples
  
  - [x] 25.2 Document ChunkingConfig interface
    - Document all strategy options
    - Document strategy-specific fields
    - Document common settings
    - Add usage examples
  
  - [x] 25.3 Document all three chunking strategies
    - Document fixed-pages strategy (legacy)
    - Document token-based strategy
    - Document hybrid strategy (recommended)
    - Add comparison table
  
  - [x] 25.4 Add usage examples for each strategy
    - Example with fixed-pages strategy
    - Example with token-based strategy
    - Example with hybrid strategy
    - Example with custom configuration
  
  - [x] 25.5 Document configuration precedence
    - Document default values
    - Document environment variable overrides
    - Document per-document configuration

- [ ] 26. Create example applications
  - [ ] 26.1 Create example using fixed-pages strategy
    - Create example stack with fixed-pages config
    - Add README with explanation
    - Add sample documents
  
  - [ ] 26.2 Create example using token-based strategy
    - Create example stack with token-based config
    - Add README with explanation
    - Add sample documents
  
  - [ ] 26.3 Create example using hybrid strategy (recommended)
    - Create example stack with hybrid config
    - Add README with explanation
    - Add sample documents
    - Mark as recommended approach
  
  - [ ] 26.4 Create example with custom configuration
    - Create example with custom thresholds
    - Demonstrate configuration override
    - Add README with explanation
  
  - [ ] 26.5 Add README for each example
    - Explain strategy used
    - Document configuration options
    - Provide deployment instructions
    - Include sample output

- [ ] 27. Update existing examples
  - [ ] 27.1 Update bedrock-document-processing example with chunking
    - Add enableChunking flag
    - Add chunkingConfig with hybrid strategy
    - Update README with chunking information
  
  - [ ] 27.2 Update agentic-document-processing example with chunking
    - Add enableChunking flag
    - Add chunkingConfig with hybrid strategy
    - Update README with chunking information
  
  - [ ] 27.3 Update fraud-detection example with chunking
    - Add enableChunking flag
    - Add chunkingConfig with hybrid strategy
    - Update README with chunking information
  
  - [ ] 27.4 Add chunking configuration to all examples
    - Ensure all examples have chunking option
    - Use hybrid strategy as default
    - Document in each README

- [x] 28. CDK Nag compliance
  - [x] 28.1 Run CDK Nag on BedrockDocumentProcessing with chunking
    - Run AwsSolutions checks
    - Run HIPAA checks if applicable
    - Run PCI-DSS checks if applicable
  
  - [x] 28.2 Address security findings from CDK Nag
    - Fix any high-severity findings
    - Fix any medium-severity findings
    - Document low-severity findings
  
  - [x] 28.3 Add suppressions with justifications where appropriate
    - Add NagSuppressions for false positives
    - Document reason for each suppression
    - Get approval for suppressions
  
  - [x] 28.4 Write CDK Nag tests for chunking constructs
    - Test BedrockDocumentProcessing with chunking enabled
    - Test all Lambda functions pass CDK Nag
    - Test Step Functions workflow passes CDK Nag

- [x] 29. Security hardening
  - [x] 29.1 Ensure all S3 objects encrypted with KMS
    - Enable KMS encryption for bucket
    - Use customer-managed KMS key
    - Grant Lambda functions access to KMS key
  
  - [x] 29.2 Apply least privilege IAM permissions to all Lambda functions
    - Review and minimize S3 permissions
    - Review and minimize DynamoDB permissions
    - Review and minimize KMS permissions
    - Remove any unnecessary permissions
  
  - [x] 29.3 Add VPC support for Lambda functions (optional)
    - Allow VPC configuration for Lambda functions
    - Configure security groups
    - Configure VPC endpoints for AWS services
  
  - [x] 29.4 Enable CloudTrail logging for S3 and DynamoDB operations
    - Enable CloudTrail for S3 data events
    - Enable CloudTrail for DynamoDB data events
    - Configure log retention
  
  - [x] 29.5 Write security tests for IAM permissions
    - Test Lambda functions have minimum required permissions
    - Test Lambda functions cannot access unauthorized resources
    - Test encryption is enforced

- [ ] 30. Deployment preparation
  - [ ] 30.1 Create feature flag for chunking
    - Add CHUNKING_ENABLED environment variable
    - Default to false for initial deployment
    - Document feature flag usage
  
  - [ ] 30.2 Prepare rollback plan
    - Document rollback procedure
    - Test rollback with feature flag
    - Prepare communication for rollback
  
  - [ ] 30.3 Create deployment runbook
    - Document deployment steps
    - Document verification steps
    - Document monitoring steps
    - Document rollback steps
  
  - [ ] 30.4 Set up monitoring dashboard for chunking metrics
    - Create CloudWatch dashboard
    - Add all chunking metrics
    - Add alarms to dashboard
    - Share dashboard with team
  
  - [ ] 30.5 Prepare communication for users about new feature
    - Write announcement email
    - Update documentation
    - Prepare FAQ
    - Schedule announcement

- [ ]* 31. Optional: Performance optimization
  - [ ]* 31.1 Optimize token estimation for speed
    - Profile token estimation performance
    - Identify bottlenecks
    - Implement optimizations
    - Measure improvement
  
  - [ ]* 31.2 Implement S3 streaming for large PDFs
    - Use streaming to avoid loading entire PDF into memory
    - Implement chunked reading
    - Test with very large PDFs (>100MB)
  
  - [ ]* 31.3 Optimize chunk upload with multipart upload
    - Use S3 multipart upload for large chunks
    - Implement parallel upload
    - Measure performance improvement
  
  - [ ]* 31.4 Add caching for frequently processed documents
    - Implement caching layer
    - Cache token analysis results
    - Cache chunk metadata
    - Measure cache hit rate
  
  - [ ]* 31.5 Measure and document performance improvements
    - Benchmark before and after optimizations
    - Document performance gains
    - Update documentation with performance characteristics

- [ ]* 32. Optional: Future enhancements
  - [ ]* 32.1 Upgrade to tiktoken for accurate token counting
    - Replace word-based estimation with tiktoken
    - Measure accuracy improvement
    - Measure performance impact
    - Update documentation
  
  - [ ]* 32.2 Add support for semantic chunking
    - Implement section boundary detection
    - Split at logical boundaries (chapters, sections)
    - Preserve document structure
    - Test with various document types
  
  - [ ]* 32.3 Implement weighted voting for classification aggregation
    - Weight early chunks higher than later chunks
    - Implement configurable weighting strategy
    - Test accuracy improvement
    - Update documentation
  
  - [ ]* 32.4 Add support for custom aggregation strategies
    - Create pluggable aggregation interface
    - Allow users to provide custom aggregation logic
    - Document custom aggregation API
    - Provide examples
  
  - [ ]* 32.5 Implement chunk caching to avoid reprocessing
    - Cache processed chunk results
    - Reuse cached results for identical chunks
    - Implement cache invalidation
    - Measure cost savings
  
  - [ ]* 32.6 Add support for other document formats
    - Add support for DOCX files
    - Add support for PPTX files
    - Add support for TXT files
    - Update documentation
