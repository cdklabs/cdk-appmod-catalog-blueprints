"""
PDF Analysis and Chunking Lambda Handler.

This Lambda function is the first step in the Step Functions workflow for chunked
document processing. It analyzes PDFs to determine if chunking is needed, and if so,
splits the PDF into chunks and uploads them to S3.

This is a single Lambda that does both analysis and chunking to avoid downloading
the PDF twice.
"""

import json
import logging
import os
import time
from typing import Dict, Any, Optional
import boto3
from botocore.exceptions import ClientError

# Import local modules
from token_estimation import analyze_pdf_tokens, estimate_tokens_fast
from chunking_strategies import (
    calculate_chunks_fixed_pages,
    calculate_chunks_token_based,
    calculate_chunks_hybrid,
    validate_configuration,
    ConfigurationError
)
from error_handling import (
    PDFChunkingError,
    InvalidPDFFormatError,
    CorruptedPDFError,
    EncryptedPDFError,
    S3AccessDeniedError,
    S3NotFoundError,
    S3ThrottlingError,
    DynamoDBWriteError,
    ChunkingTimeoutError,
    classify_s3_error,
    classify_pdf_error,
    create_error_response as create_typed_error_response,
    log_error,
    retry_with_exponential_backoff,
    validate_pdf_magic_bytes
)
from metrics import (
    get_metrics,
    emit_chunking_metrics,
    emit_chunking_operation,
    emit_chunk_count,
    emit_tokens_per_chunk,
    emit_chunk_processing_time,
    emit_strategy_usage,
    timed_operation
)
from structured_logging import (
    get_logger,
    log_strategy_selection,
    log_chunking_operation,
    with_correlation_id,
    is_observability_enabled
)

# Configure structured logging
structured_logger = get_logger(__name__)

# Keep standard logger for backward compatibility
logger = logging.getLogger()
logger.setLevel(os.environ.get('LOG_LEVEL', 'INFO'))

# Initialize AWS clients
s3_client = boto3.client('s3')

# Get Powertools metrics instance
metrics = get_metrics()


@metrics.log_metrics
@with_correlation_id
def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Lambda handler for PDF analysis and chunking.
    
    This function:
    1. Parses the event for document metadata and configuration
    2. Analyzes the PDF to determine token count and page count
    3. Determines if chunking is required based on strategy and thresholds
    4. If no chunking needed: returns analysis metadata only
    5. If chunking needed: splits PDF and uploads chunks to S3
    
    Args:
        event: Step Functions event with:
            - documentId: Unique document identifier
            - contentType: Type of content (should be 'file')
            - content: Object with bucket, key, location, filename
            - config: Optional chunking configuration
        context: Lambda context object
        
    Returns:
        NoChunkingResponse or ChunkingResponse based on analysis
        
    Raises:
        Exception: For any processing errors (caught and returned as error response)
    """
    start_time = time.time()
    
    try:
        # Parse event
        document_id = event.get('documentId')
        content_type = event.get('contentType')
        content = event.get('content', {})
        bucket = content.get('bucket')
        key = content.get('key')
        config = event.get('config', {})
        
        # Validate required fields
        if not document_id:
            raise ValueError("Missing required field: documentId")
        if not bucket or not key:
            raise ValueError("Missing required fields: content.bucket or content.key")
        if content_type and content_type != 'file':
            raise ValueError(f"Unsupported contentType: {content_type}. Only 'file' is supported.")
        
        # Set document context for structured logging
        structured_logger.set_document_context(document_id=document_id)
        
        # Validate file extension (should be PDF)
        if not key.lower().endswith('.pdf'):
            structured_logger.warning(
                f"File {key} does not have .pdf extension. Will validate PDF format using magic bytes.",
                extra={'bucket': bucket, 'key': key}
            )
        
        structured_logger.info(
            f"Processing document {document_id} from s3://{bucket}/{key}",
            extra={
                'bucket': bucket,
                'key': key,
                'strategy': config.get('strategy', 'hybrid'),
                'source': event.get('source', 'unknown'),
                'event': 'processing_started'
            }
        )
        
        # Merge configuration with environment variables and defaults
        merged_config = _merge_configuration(config)
        strategy = merged_config['strategy']
        processing_mode = merged_config.get('processingMode', 'parallel')
        
        # Add metrics dimension for strategy
        metrics.add_dimension(name="Strategy", value=strategy)
        
        # Validate configuration
        if not validate_configuration(merged_config):
            raise ConfigurationError(f"Invalid chunking configuration: {merged_config}")
        
        # Analyze PDF tokens
        structured_logger.info(
            f"Analyzing PDF tokens for document {document_id}",
            extra={'event': 'token_analysis_started'}
        )
        token_analysis = analyze_pdf_tokens(bucket, key, merged_config)
        
        # Log strategy selection with full context
        log_strategy_selection(
            logger=structured_logger,
            strategy=strategy,
            requires_chunking=token_analysis['requires_chunking'],
            reason=_get_no_chunking_reason(token_analysis, merged_config) if not token_analysis['requires_chunking'] else f"Document exceeds thresholds for {strategy} strategy",
            document_pages=token_analysis['total_pages'],
            document_tokens=token_analysis['total_tokens'],
            page_threshold=merged_config.get('pageThreshold', 100),
            token_threshold=merged_config.get('tokenThreshold', 150000),
            page_threshold_exceeded=token_analysis['total_pages'] > merged_config.get('pageThreshold', 100),
            token_threshold_exceeded=token_analysis['total_tokens'] > merged_config.get('tokenThreshold', 150000)
        )
        
        # Check if chunking is required
        if not token_analysis['requires_chunking']:
            # No chunking needed - return analysis only
            structured_logger.info(
                f"Document {document_id} does not require chunking",
                extra={
                    'event': 'chunking_not_required',
                    'totalPages': token_analysis['total_pages'],
                    'totalTokens': token_analysis['total_tokens']
                }
            )
            
            # Emit metrics for non-chunked document
            processing_time_ms = (time.time() - start_time) * 1000
            emit_chunking_metrics(
                document_id=document_id,
                strategy=strategy,
                requires_chunking=False,
                processing_time_ms=processing_time_ms,
                processing_mode=processing_mode
            )
            
            log_chunking_operation(
                logger=structured_logger,
                operation='analyze',
                document_id=document_id,
                success=True,
                duration_ms=processing_time_ms,
                extra={'requiresChunking': False}
            )
            
            return {
                'documentId': document_id,
                'requiresChunking': False,
                'tokenAnalysis': {
                    'totalTokens': token_analysis['total_tokens'],
                    'totalPages': token_analysis['total_pages'],
                    'avgTokensPerPage': token_analysis['avg_tokens_per_page']
                },
                'reason': _get_no_chunking_reason(token_analysis, merged_config)
            }
        
        # Chunking is required - proceed to split PDF
        structured_logger.info(
            f"Document {document_id} requires chunking",
            extra={
                'event': 'chunking_required',
                'totalPages': token_analysis['total_pages'],
                'totalTokens': token_analysis['total_tokens']
            }
        )
        
        # Calculate chunk boundaries
        chunks_metadata = _calculate_chunk_boundaries(
            token_analysis,
            merged_config
        )
        
        # Split PDF and upload chunks
        chunk_results = _split_and_upload_pdf(
            document_id,
            bucket,
            key,
            chunks_metadata,
            token_analysis
        )
        
        # Calculate tokens per chunk for metrics
        tokens_per_chunk = [chunk.get('estimatedTokens', 0) for chunk in chunk_results]
        
        # Emit metrics for chunked document
        processing_time_ms = (time.time() - start_time) * 1000
        emit_chunking_metrics(
            document_id=document_id,
            strategy=strategy,
            requires_chunking=True,
            chunk_count=len(chunk_results),
            tokens_per_chunk=tokens_per_chunk,
            processing_time_ms=processing_time_ms,
            processing_mode=processing_mode
        )
        
        # Log successful chunking operation
        log_chunking_operation(
            logger=structured_logger,
            operation='split',
            document_id=document_id,
            chunk_count=len(chunk_results),
            success=True,
            duration_ms=processing_time_ms,
            extra={
                'strategy': strategy,
                'totalPages': token_analysis['total_pages'],
                'totalTokens': token_analysis['total_tokens']
            }
        )
        
        # Return chunking response
        return {
            'documentId': document_id,
            'requiresChunking': True,
            'tokenAnalysis': {
                'totalTokens': token_analysis['total_tokens'],
                'totalPages': token_analysis['total_pages'],
                'avgTokensPerPage': token_analysis['avg_tokens_per_page'],
                'tokensPerPage': token_analysis['tokens_per_page']
            },
            'strategy': merged_config['strategy'],
            'chunks': chunk_results,
            'config': {
                'strategy': merged_config['strategy'],
                'totalPages': token_analysis['total_pages'],
                'totalTokens': token_analysis['total_tokens'],
                **_get_strategy_config(merged_config)
            }
        }
        
    except ConfigurationError as e:
        error = PDFChunkingError(
            message=str(e),
            error_type='ConfigurationError',
            document_id=event.get('documentId'),
            recoverable=False
        )
        log_error(error, include_stack_trace=True)
        return create_typed_error_response(
            event.get('documentId', 'unknown'),
            error
        )
    
    except InvalidPDFFormatError as e:
        log_error(e, include_stack_trace=True)
        return create_typed_error_response(
            event.get('documentId', 'unknown'),
            e
        )
    
    except CorruptedPDFError as e:
        log_error(e, include_stack_trace=True)
        return create_typed_error_response(
            event.get('documentId', 'unknown'),
            e
        )
    
    except EncryptedPDFError as e:
        log_error(e, include_stack_trace=True)
        return create_typed_error_response(
            event.get('documentId', 'unknown'),
            e
        )
    
    except S3AccessDeniedError as e:
        log_error(e, include_stack_trace=True)
        return create_typed_error_response(
            event.get('documentId', 'unknown'),
            e
        )
    
    except S3NotFoundError as e:
        log_error(e, include_stack_trace=True)
        return create_typed_error_response(
            event.get('documentId', 'unknown'),
            e
        )
    
    except S3ThrottlingError as e:
        log_error(e, include_stack_trace=True)
        return create_typed_error_response(
            event.get('documentId', 'unknown'),
            e
        )
    
    except ClientError as e:
        # Classify the S3 error into a specific type
        classified_error = classify_s3_error(
            e,
            document_id=event.get('documentId'),
            bucket=event.get('content', {}).get('bucket'),
            key=event.get('content', {}).get('key')
        )
        log_error(classified_error, include_stack_trace=True)
        return create_typed_error_response(
            event.get('documentId', 'unknown'),
            classified_error
        )
    
    except PDFChunkingError as e:
        log_error(e, include_stack_trace=True)
        return create_typed_error_response(
            event.get('documentId', 'unknown'),
            e
        )
    
    except Exception as e:
        # Classify unknown errors
        document_id = event.get('documentId', 'unknown')
        
        # Check if it's a PDF-related error
        error_str = str(e).lower()
        if any(keyword in error_str for keyword in ['pdf', 'pypdf', 'page', 'reader']):
            classified_error = classify_pdf_error(e, document_id)
        else:
            classified_error = PDFChunkingError(
                message=str(e),
                error_type='UnexpectedError',
                document_id=document_id,
                recoverable=False,
                details={'original_error_type': type(e).__name__}
            )
        
        log_error(classified_error, include_stack_trace=True)
        return create_typed_error_response(
            document_id,
            classified_error
        )


def _merge_configuration(config: Dict[str, Any]) -> Dict[str, Any]:
    """
    Merge configuration from event, environment variables, and defaults.
    
    Precedence (highest to lowest):
    1. Event configuration (per-document)
    2. Environment variables
    3. Default values
    
    Args:
        config: Configuration from event
        
    Returns:
        Merged configuration dictionary
    """
    # Default configuration
    # Note: maxPagesPerChunk is 99 (not 100) because Bedrock has a hard limit of 100 pages
    # per PDF, and we need a safety margin to avoid hitting that limit exactly
    merged = {
        'strategy': 'hybrid',
        'pageThreshold': 100,
        'tokenThreshold': 150000,
        'chunkSize': 50,
        'overlapPages': 5,
        'maxTokensPerChunk': 100000,
        'overlapTokens': 5000,
        'targetTokensPerChunk': 80000,
        'maxPagesPerChunk': 99,
        'processingMode': 'parallel',
        'maxConcurrency': 10
    }
    
    # Override with environment variables
    env_mapping = {
        'CHUNKING_STRATEGY': 'strategy',
        'PAGE_THRESHOLD': 'pageThreshold',
        'TOKEN_THRESHOLD': 'tokenThreshold',
        'CHUNK_SIZE': 'chunkSize',
        'OVERLAP_PAGES': 'overlapPages',
        'MAX_TOKENS_PER_CHUNK': 'maxTokensPerChunk',
        'OVERLAP_TOKENS': 'overlapTokens',
        'TARGET_TOKENS_PER_CHUNK': 'targetTokensPerChunk',
        'MAX_PAGES_PER_CHUNK': 'maxPagesPerChunk',
        'PROCESSING_MODE': 'processingMode',
        'MAX_CONCURRENCY': 'maxConcurrency'
    }
    
    for env_var, config_key in env_mapping.items():
        env_value = os.environ.get(env_var)
        if env_value is not None:
            # Convert to appropriate type
            if config_key in ['strategy', 'processingMode']:
                merged[config_key] = env_value
            else:
                merged[config_key] = int(env_value)
    
    # Override with event configuration (highest precedence)
    for key, value in config.items():
        if value is not None:
            merged[key] = value
    
    # Normalize key names (support both camelCase and snake_case)
    normalized = {}
    key_mapping = {
        'chunkingStrategy': 'strategy',
        'chunking_strategy': 'strategy',
        'page_threshold': 'pageThreshold',
        'token_threshold': 'tokenThreshold',
        'chunk_size': 'chunkSize',
        'overlap_pages': 'overlapPages',
        'max_tokens_per_chunk': 'maxTokensPerChunk',
        'overlap_tokens': 'overlapTokens',
        'target_tokens_per_chunk': 'targetTokensPerChunk',
        'max_pages_per_chunk': 'maxPagesPerChunk',
        'processing_mode': 'processingMode',
        'max_concurrency': 'maxConcurrency'
    }
    
    for key, value in merged.items():
        normalized_key = key_mapping.get(key, key)
        normalized[normalized_key] = value
    
    return normalized


def _get_no_chunking_reason(
    token_analysis: Dict[str, Any],
    config: Dict[str, Any]
) -> str:
    """
    Generate human-readable reason for not chunking.
    
    Args:
        token_analysis: Token analysis results
        config: Chunking configuration
        
    Returns:
        Reason string
    """
    strategy = config.get('strategy', 'hybrid')
    total_pages = token_analysis['total_pages']
    total_tokens = token_analysis['total_tokens']
    page_threshold = config.get('pageThreshold', 100)
    token_threshold = config.get('tokenThreshold', 150000)
    
    if strategy == 'fixed-pages':
        return (
            f"Document has {total_pages} pages, "
            f"below threshold of {page_threshold} (fixed-pages strategy)"
        )
    elif strategy == 'token-based':
        return (
            f"Document has {total_tokens} tokens, "
            f"below threshold of {token_threshold} (token-based strategy)"
        )
    else:  # hybrid
        return (
            f"Document has {total_pages} pages and {total_tokens} tokens, "
            f"below thresholds of {page_threshold} pages and {token_threshold} tokens (hybrid strategy)"
        )


def _calculate_chunk_boundaries(
    token_analysis: Dict[str, Any],
    config: Dict[str, Any]
) -> list:
    """
    Calculate chunk boundaries based on strategy.
    
    Args:
        token_analysis: Token analysis results
        config: Chunking configuration
        
    Returns:
        List of chunk metadata dictionaries
    """
    strategy = config['strategy']
    total_pages = token_analysis['total_pages']
    tokens_per_page = token_analysis['tokens_per_page']
    
    if strategy == 'fixed-pages':
        return calculate_chunks_fixed_pages(
            total_pages,
            config['chunkSize'],
            config['overlapPages']
        )
    elif strategy == 'token-based':
        return calculate_chunks_token_based(
            tokens_per_page,
            config['maxTokensPerChunk'],
            config['overlapTokens']
        )
    else:  # hybrid
        return calculate_chunks_hybrid(
            tokens_per_page,
            config['targetTokensPerChunk'],
            config['maxPagesPerChunk'],
            config['overlapTokens']
        )


def _get_strategy_config(config: Dict[str, Any]) -> Dict[str, Any]:
    """
    Extract strategy-specific configuration.
    
    Args:
        config: Full configuration
        
    Returns:
        Strategy-specific configuration
    """
    strategy = config['strategy']
    
    if strategy == 'fixed-pages':
        return {
            'chunkSize': config['chunkSize'],
            'overlapPages': config['overlapPages'],
            'pageThreshold': config['pageThreshold']
        }
    elif strategy == 'token-based':
        return {
            'maxTokensPerChunk': config['maxTokensPerChunk'],
            'overlapTokens': config['overlapTokens'],
            'tokenThreshold': config['tokenThreshold']
        }
    else:  # hybrid
        return {
            'targetTokensPerChunk': config['targetTokensPerChunk'],
            'maxPagesPerChunk': config['maxPagesPerChunk'],
            'overlapTokens': config['overlapTokens'],
            'pageThreshold': config['pageThreshold'],
            'tokenThreshold': config['tokenThreshold']
        }


def _create_error_response(
    document_id: str,
    error_type: str,
    error_message: str
) -> Dict[str, Any]:
    """
    Create standardized error response.
    
    Args:
        document_id: Document identifier
        error_type: Type of error
        error_message: Error message
        
    Returns:
        Error response dictionary
    """
    return {
        'documentId': document_id,
        'requiresChunking': False,
        'error': {
            'type': error_type,
            'message': error_message
        }
    }



def _split_and_upload_pdf(
    document_id: str,
    bucket: str,
    key: str,
    chunks_metadata: list,
    token_analysis: Dict[str, Any]
) -> list:
    """
    Split PDF into chunks and upload to S3.
    
    This function:
    1. Downloads the PDF from S3 using streaming
    2. Splits the PDF based on chunk boundaries
    3. Generates chunk IDs: {documentId}_chunk_{index}
    4. Uploads chunks to S3 chunks/{documentId}/ prefix
    5. Generates ChunkMetadata for each chunk
    
    Args:
        document_id: Document identifier
        bucket: S3 bucket name
        key: S3 object key for source PDF
        chunks_metadata: List of chunk boundary metadata
        token_analysis: Token analysis results
        
    Returns:
        List of ChunkMetadata dictionaries
        
    Raises:
        InvalidPDFFormatError: If file is not a valid PDF
        CorruptedPDFError: If PDF is corrupted
        EncryptedPDFError: If PDF is encrypted
        S3AccessDeniedError: If S3 access is denied
        S3NotFoundError: If S3 object is not found
    """
    try:
        import PyPDF2
        import io
        
        logger.info(f"Splitting PDF {document_id} into {len(chunks_metadata)} chunks")
        
        # Download PDF from S3 using streaming
        try:
            pdf_obj = s3_client.get_object(Bucket=bucket, Key=key)
            pdf_bytes = pdf_obj['Body'].read()
            
            # Validate file is actually a PDF by checking magic bytes
            validate_pdf_magic_bytes(pdf_bytes, document_id)
            
        except ClientError as e:
            raise classify_s3_error(e, document_id, bucket, key)
        
        # Attempt to read PDF
        try:
            pdf_reader = PyPDF2.PdfReader(io.BytesIO(pdf_bytes))
            
            # Validate PDF is not encrypted
            if pdf_reader.is_encrypted:
                raise EncryptedPDFError(
                    message=f"PDF {document_id} is encrypted. Encrypted PDFs are not supported.",
                    document_id=document_id
                )
            
            # Validate page count matches analysis
            actual_pages = len(pdf_reader.pages)
            expected_pages = token_analysis['total_pages']
            if actual_pages != expected_pages:
                logger.warning(
                    f"Page count mismatch for {document_id}: "
                    f"expected {expected_pages}, got {actual_pages}"
                )
        
        except PyPDF2.errors.PdfReadError as e:
            raise CorruptedPDFError(
                message=f"Invalid or corrupted PDF format for {document_id}: {str(e)}",
                document_id=document_id,
                details={'original_error': str(e)}
            )
        except EncryptedPDFError:
            raise
        except Exception as e:
            if "encrypted" in str(e).lower():
                raise EncryptedPDFError(
                    message=f"PDF {document_id} is encrypted: {str(e)}",
                    document_id=document_id
                )
            raise classify_pdf_error(e, document_id)
        
        chunk_results = []
        total_chunks = len(chunks_metadata)
        corrupted_pages = []
        
        for chunk_meta in chunks_metadata:
            chunk_index = chunk_meta['chunk_index']
            start_page = chunk_meta['start_page']
            end_page = chunk_meta['end_page']
            page_count = chunk_meta['page_count']
            
            # Generate chunk ID
            chunk_id = f"{document_id}_chunk_{chunk_index}"
            
            logger.info(
                f"Creating chunk {chunk_index + 1}/{total_chunks}: "
                f"pages {start_page}-{end_page} ({page_count} pages)"
            )
            
            # Create new PDF for this chunk
            pdf_writer = PyPDF2.PdfWriter()
            
            # Add pages to chunk (end_page is inclusive)
            pages_added = 0
            for page_num in range(start_page, end_page + 1):
                if page_num < len(pdf_reader.pages):
                    try:
                        pdf_writer.add_page(pdf_reader.pages[page_num])
                        pages_added += 1
                    except Exception as e:
                        # Handle corrupted pages - skip and log warning
                        logger.warning(
                            f"Skipping corrupted page {page_num} in document {document_id}: {str(e)}"
                        )
                        corrupted_pages.append(page_num)
                        continue
            
            # Skip chunk if no pages were successfully added
            if pages_added == 0:
                logger.warning(
                    f"Skipping chunk {chunk_index} for document {document_id}: "
                    f"no valid pages in range {start_page}-{end_page}"
                )
                continue
            
            # Write chunk to bytes
            try:
                chunk_bytes = io.BytesIO()
                pdf_writer.write(chunk_bytes)
                chunk_bytes.seek(0)
            except Exception as e:
                logger.error(
                    f"Failed to write chunk {chunk_index} for document {document_id}: {str(e)}"
                )
                raise CorruptedPDFError(
                    message=f"Failed to create chunk {chunk_index}: {str(e)}",
                    document_id=document_id,
                    details={'chunk_index': chunk_index}
                )
            
            # Upload chunk to S3 with retry logic
            # Chunks are stored in a folder named after the document ID for organization
            chunk_key = f"chunks/{document_id}/{chunk_id}.pdf"
            _upload_chunk_with_retry(
                bucket,
                chunk_key,
                chunk_bytes.getvalue(),
                document_id,
                chunk_index
            )
            
            # Calculate estimated tokens for this chunk
            estimated_tokens = sum(
                token_analysis['tokens_per_page'][i]
                for i in range(start_page, min(end_page + 1, len(token_analysis['tokens_per_page'])))
            )
            
            # Create chunk metadata
            chunk_result = {
                'chunkId': chunk_id,
                'chunkIndex': chunk_index,
                'totalChunks': total_chunks,
                'startPage': start_page,
                'endPage': end_page,
                'pageCount': pages_added,  # Use actual pages added
                'estimatedTokens': estimated_tokens,
                'bucket': bucket,
                'key': chunk_key
            }
            
            chunk_results.append(chunk_result)
            
            logger.info(
                f"Successfully created chunk {chunk_index + 1}/{total_chunks}: "
                f"{chunk_id} with {estimated_tokens} tokens"
            )
        
        # Log summary of corrupted pages
        if corrupted_pages:
            logger.warning(
                f"Document {document_id} had {len(corrupted_pages)} corrupted pages: "
                f"{corrupted_pages[:10]}{'...' if len(corrupted_pages) > 10 else ''}"
            )
        
        # Ensure at least one chunk was created
        if not chunk_results:
            raise CorruptedPDFError(
                message=f"Failed to create any valid chunks for document {document_id}. "
                        f"All pages may be corrupted.",
                document_id=document_id,
                details={'corrupted_pages': corrupted_pages}
            )
        
        logger.info(
            f"Successfully split document {document_id} into {len(chunk_results)} chunks"
        )
        
        return chunk_results
        
    except ImportError as e:
        logger.error(f"PyPDF2 not available: {str(e)}")
        raise PDFChunkingError(
            message="PyPDF2 is required for PDF processing",
            error_type='DependencyError',
            document_id=document_id,
            recoverable=False
        )
    
    except (InvalidPDFFormatError, CorruptedPDFError, EncryptedPDFError,
            S3AccessDeniedError, S3NotFoundError, S3ThrottlingError, PDFChunkingError):
        # Re-raise our custom errors
        raise
    
    except Exception as e:
        logger.error(
            f"Failed to split PDF {document_id}: {str(e)}",
            exc_info=True
        )
        raise classify_pdf_error(e, document_id)


def _upload_chunk_with_retry(
    bucket: str,
    key: str,
    data: bytes,
    document_id: str,
    chunk_index: int,
    max_retries: int = 3
) -> None:
    """
    Upload chunk to S3 with exponential backoff retry.
    
    Args:
        bucket: S3 bucket name
        key: S3 object key
        data: Chunk data bytes
        document_id: Document identifier (for logging)
        chunk_index: Chunk index (for logging)
        max_retries: Maximum number of retry attempts
        
    Raises:
        S3AccessDeniedError: If access is denied
        S3ThrottlingError: If throttled after all retries
        PDFChunkingError: For other S3 errors
    """
    import time
    import random
    
    last_error = None
    
    for attempt in range(max_retries):
        try:
            s3_client.put_object(
                Bucket=bucket,
                Key=key,
                Body=data,
                ContentType='application/pdf',
                Metadata={
                    'documentId': document_id,
                    'chunkIndex': str(chunk_index)
                }
            )
            
            if attempt > 0:
                logger.info(
                    f"Successfully uploaded chunk {chunk_index} for document {document_id} "
                    f"on attempt {attempt + 1}"
                )
            
            return
            
        except ClientError as e:
            error_code = e.response['Error']['Code']
            last_error = e
            
            # Don't retry on access denied or invalid bucket
            if error_code in ['AccessDenied', 'NoSuchBucket', 'InvalidBucketName']:
                logger.error(
                    f"Non-retryable S3 error uploading chunk {chunk_index} "
                    f"for document {document_id}: {error_code}"
                )
                raise classify_s3_error(e, document_id, bucket, key)
            
            # Retry on throttling or server errors
            if attempt < max_retries - 1:
                # Exponential backoff with jitter: 1s, 2s, 4s + random jitter
                base_wait = 2 ** attempt
                jitter = random.uniform(0, 0.5)
                wait_time = base_wait + jitter
                
                logger.warning(
                    f"S3 error uploading chunk {chunk_index} for document {document_id}: "
                    f"{error_code}. Retrying in {wait_time:.2f}s (attempt {attempt + 1}/{max_retries})"
                )
                time.sleep(wait_time)
            else:
                logger.error(
                    f"Failed to upload chunk {chunk_index} for document {document_id} "
                    f"after {max_retries} attempts: {error_code}"
                )
                raise classify_s3_error(e, document_id, bucket, key)
    
    # Should not reach here, but handle edge case
    if last_error:
        raise classify_s3_error(last_error, document_id, bucket, key)



def _is_valid_pdf(data: bytes) -> bool:
    """
    Validate that the file is actually a PDF by checking magic bytes.
    
    PDF files must start with the magic bytes "%PDF-" (hex: 25 50 44 46 2D).
    This is a quick check before attempting to parse the file with PyPDF2.
    
    Args:
        data: File data bytes
        
    Returns:
        True if file starts with PDF magic bytes, False otherwise
        
    Examples:
        >>> _is_valid_pdf(b'%PDF-1.4\\n...')
        True
        >>> _is_valid_pdf(b'<html>...</html>')
        False
        >>> _is_valid_pdf(b'')
        False
    """
    if not data or len(data) < 5:
        return False
    
    # Check for PDF magic bytes: %PDF-
    # This is the standard PDF file signature
    pdf_magic = b'%PDF-'
    return data[:5] == pdf_magic
