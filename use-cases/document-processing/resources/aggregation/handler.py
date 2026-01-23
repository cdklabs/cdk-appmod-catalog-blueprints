"""
Aggregation Lambda Handler

This Lambda function aggregates results from multiple chunks into a coherent final result.
It implements majority voting for classification and entity deduplication.

Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 7.2, 7.3, 7.4, 7.5
"""

import json
import logging
import os
import sys
import time
import random
from typing import Dict, Any, List, Optional, Tuple
from collections import Counter
import boto3
from botocore.exceptions import ClientError

from aws_lambda_powertools import Metrics
from aws_lambda_powertools.metrics import MetricUnit

# Try to import structured logging from pdf-chunking module
# Fall back to standard logging if not available
try:
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'pdf-chunking'))
    from structured_logging import (
        get_logger,
        log_chunking_operation,
        with_correlation_id,
        is_observability_enabled
    )
    structured_logger = get_logger(__name__)
    USE_STRUCTURED_LOGGING = True
except ImportError:
    USE_STRUCTURED_LOGGING = False
    structured_logger = None

# Configure standard logging as fallback
logger = logging.getLogger()
logger.setLevel(os.environ.get('LOG_LEVEL', 'INFO'))

# Check if metrics are enabled via environment variable
# This is set by the CDK construct when enableObservability is true
METRICS_ENABLED = os.environ.get('ENABLE_METRICS', 'false').lower() == 'true'

# Initialize Powertools Metrics
metrics = Metrics()

# Initialize DynamoDB client
dynamodb = boto3.resource('dynamodb')


class AggregationError(Exception):
    """Base exception for aggregation errors."""
    
    def __init__(
        self,
        message: str,
        error_type: str,
        document_id: Optional[str] = None,
        recoverable: bool = False,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(message)
        self.message = message
        self.error_type = error_type
        self.document_id = document_id
        self.recoverable = recoverable
        self.details = details or {}


class DynamoDBWriteError(AggregationError):
    """Raised when DynamoDB write operation fails."""
    
    def __init__(
        self,
        message: str,
        document_id: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            message=message,
            error_type='DynamoDBWriteError',
            document_id=document_id,
            recoverable=True,
            details=details
        )


def retry_with_exponential_backoff(
    max_retries: int = 3,
    base_delay: float = 1.0,
    max_delay: float = 30.0,
    jitter: bool = True,
    retryable_exceptions: Tuple = (ClientError,)
):
    """
    Decorator for retrying operations with exponential backoff.
    
    Args:
        max_retries: Maximum number of retry attempts
        base_delay: Base delay in seconds between retries
        max_delay: Maximum delay in seconds
        jitter: Whether to add random jitter to delay
        retryable_exceptions: Tuple of exception types to retry
        
    Returns:
        Decorated function
    """
    def decorator(func):
        def wrapper(*args, **kwargs):
            last_exception = None
            
            for attempt in range(max_retries + 1):
                try:
                    return func(*args, **kwargs)
                except retryable_exceptions as e:
                    # Check if it's a retryable DynamoDB error
                    if isinstance(e, ClientError):
                        error_code = e.response.get('Error', {}).get('Code', '')
                        if error_code not in [
                            'ProvisionedThroughputExceededException',
                            'ThrottlingException',
                            'InternalServerError',
                            'ServiceUnavailable'
                        ]:
                            # Non-retryable error
                            raise
                    
                    last_exception = e
                    
                    if attempt < max_retries:
                        # Calculate delay with exponential backoff
                        delay = min(base_delay * (2 ** attempt), max_delay)
                        
                        # Add jitter if enabled
                        if jitter:
                            delay = delay * (0.5 + random.random())
                        
                        logger.warning(
                            f"Retryable error on attempt {attempt + 1}/{max_retries + 1}: "
                            f"{str(e)}. Retrying in {delay:.2f}s",
                            extra={
                                'attempt': attempt + 1,
                                'maxRetries': max_retries + 1,
                                'delay': delay,
                                'errorType': type(e).__name__
                            }
                        )
                        
                        time.sleep(delay)
                    else:
                        logger.error(
                            f"Max retries ({max_retries + 1}) exceeded: {str(e)}",
                            extra={
                                'maxRetries': max_retries + 1,
                                'errorType': type(e).__name__
                            }
                        )
                        raise DynamoDBWriteError(
                            message=f"DynamoDB write failed after {max_retries + 1} attempts: {str(e)}",
                            document_id=kwargs.get('document_id'),
                            details={'original_error': str(e)}
                        )
            
            # Should not reach here, but raise last exception if we do
            if last_exception:
                raise last_exception
            
        return wrapper
    return decorator


@retry_with_exponential_backoff(max_retries=3, base_delay=1.0)
def write_to_dynamodb(
    table_name: str,
    document_id: str,
    aggregated_result: Dict[str, Any]
) -> None:
    """
    Write aggregated result to DynamoDB with retry logic.
    
    Args:
        table_name: DynamoDB table name
        document_id: Document identifier
        aggregated_result: Aggregated result to store
        
    Raises:
        DynamoDBWriteError: If write fails after all retries
    """
    table = dynamodb.Table(table_name)
    
    table.update_item(
        Key={'DocumentId': document_id},
        UpdateExpression='SET AggregatedResult = :result, WorkflowStatus = :status',
        ExpressionAttributeValues={
            ':result': json.dumps(aggregated_result),
            ':status': 'complete'
        }
    )
    
    logger.info(
        f"Successfully wrote aggregated result to DynamoDB for document {document_id}",
        extra={'documentId': document_id}
    )


@metrics.log_metrics
def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Lambda function handler for aggregating chunk results.
    
    Args:
        event: Lambda event payload containing:
            - documentId: Document identifier
            - chunkResults: Array of chunk processing results
            - aggregationStrategy: Strategy to use (default: 'majority-vote')
        context: Lambda context object
        
    Returns:
        AggregatedResult dictionary with:
            - documentId: Document identifier
            - classification: Aggregated classification
            - classificationConfidence: Confidence score (0-1)
            - entities: Deduplicated entities
            - chunksSummary: Summary of chunk processing
            - partialResult: Whether result is partial due to failures
    """
    start_time = time.time()
    
    # Set up structured logging context if available
    if USE_STRUCTURED_LOGGING and structured_logger:
        # Get correlation ID from event
        correlation_id = event.get('correlationId')
        structured_logger.set_correlation_id(correlation_id)
    
    try:
        # Parse event
        document_id = event.get('documentId')
        chunk_results = event.get('chunkResults', [])
        aggregation_strategy = event.get('aggregationStrategy', 'majority-vote')
        
        if not document_id:
            raise ValueError('Missing required field: documentId')
        
        if not chunk_results:
            raise ValueError('Missing required field: chunkResults')
        
        # Set document context for structured logging
        if USE_STRUCTURED_LOGGING and structured_logger:
            structured_logger.set_document_context(document_id=document_id)
            structured_logger.info(
                f'Aggregating results for document {document_id}',
                extra={
                    'event': 'aggregation_started',
                    'totalChunks': len(chunk_results),
                    'aggregationStrategy': aggregation_strategy
                }
            )
        else:
            logger.info(f'Aggregating results for document {document_id}', extra={
                'documentId': document_id,
                'totalChunks': len(chunk_results),
                'aggregationStrategy': aggregation_strategy
            })
        
        # Calculate chunks summary
        chunks_summary = calculate_chunks_summary(chunk_results)
        
        # Determine if result is partial (< 50% success threshold)
        success_rate = chunks_summary['successfulChunks'] / chunks_summary['totalChunks']
        partial_result = success_rate < 0.5
        
        # Handle insufficient successful chunks
        if partial_result:
            logger.warning(
                f'Insufficient successful chunks for document {document_id}: '
                f'{chunks_summary["successfulChunks"]}/{chunks_summary["totalChunks"]} '
                f'({success_rate:.1%})',
                extra={
                    'documentId': document_id,
                    'successfulChunks': chunks_summary['successfulChunks'],
                    'totalChunks': chunks_summary['totalChunks'],
                    'successRate': success_rate
                }
            )
        
        # Aggregate classifications
        classification, confidence = aggregate_classifications(chunk_results)
        
        # Deduplicate entities
        entities = deduplicate_entities(chunk_results)
        
        # Build aggregated result
        aggregated_result = {
            'documentId': document_id,
            'classification': classification,
            'classificationConfidence': confidence,
            'entities': entities,
            'chunksSummary': chunks_summary,
            'partialResult': partial_result
        }
        
        # Emit aggregation metrics (Requirements: 7.4)
        aggregation_time_ms = (time.time() - start_time) * 1000
        _emit_aggregation_metrics(
            document_id=document_id,
            aggregation_time_ms=aggregation_time_ms,
            total_chunks=chunks_summary['totalChunks'],
            failed_chunks=chunks_summary['failedChunks']
        )
        
        logger.info(
            f'Successfully aggregated results for document {document_id}',
            extra={
                'documentId': document_id,
                'classification': classification,
                'confidence': confidence,
                'entityCount': len(entities),
                'partialResult': partial_result,
                'aggregationTimeMs': aggregation_time_ms
            }
        )
        
        return aggregated_result
        
    except Exception as e:
        logger.error(
            f'Error aggregating results for document {event.get("documentId", "unknown")}',
            extra={
                'documentId': event.get('documentId', 'unknown'),
                'error': str(e),
                'errorType': type(e).__name__
            },
            exc_info=True
        )
        raise


def _emit_aggregation_metrics(
    document_id: str,
    aggregation_time_ms: float,
    total_chunks: int,
    failed_chunks: int
) -> None:
    """
    Emit CloudWatch metrics for aggregation operations.
    
    Only emits when observability is enabled (ENABLE_METRICS=true).
    
    Args:
        document_id: Document identifier
        aggregation_time_ms: Time taken for aggregation in milliseconds
        total_chunks: Total number of chunks processed
        failed_chunks: Number of failed chunks
        
    Requirements: 7.4
    """
    if not METRICS_ENABLED:
        return
        
    try:
        # Emit AggregationTime metric
        metrics.add_metric(
            name="AggregationTime",
            unit=MetricUnit.Milliseconds,
            value=aggregation_time_ms
        )
        
        # Emit ChunkFailureRate metric
        if total_chunks > 0:
            failure_rate = (failed_chunks / total_chunks) * 100
            metrics.add_metric(
                name="ChunkFailureRate",
                unit=MetricUnit.Percent,
                value=failure_rate
            )
            metrics.add_metric(
                name="FailedChunks",
                unit=MetricUnit.Count,
                value=failed_chunks
            )
            metrics.add_metric(
                name="TotalChunks",
                unit=MetricUnit.Count,
                value=total_chunks
            )
        
        logger.debug(
            f"Emitted aggregation metrics for document {document_id}",
            extra={
                'documentId': document_id,
                'aggregationTimeMs': aggregation_time_ms,
                'totalChunks': total_chunks,
                'failedChunks': failed_chunks
            }
        )
        
    except Exception as e:
        logger.warning(
            f"Failed to emit aggregation metrics: {str(e)}",
            extra={'documentId': document_id, 'error': str(e)}
        )


def calculate_chunks_summary(chunk_results: List[Dict[str, Any]]) -> Dict[str, int]:
    """
    Calculate summary statistics for chunk processing.
    
    Args:
        chunk_results: List of chunk processing results
        
    Returns:
        Dictionary with totalChunks, successfulChunks, failedChunks
    """
    total_chunks = len(chunk_results)
    failed_chunks = sum(1 for result in chunk_results if result.get('error'))
    successful_chunks = total_chunks - failed_chunks
    
    return {
        'totalChunks': total_chunks,
        'successfulChunks': successful_chunks,
        'failedChunks': failed_chunks
    }


def aggregate_classifications(chunk_results: List[Dict[str, Any]]) -> tuple[Optional[str], float]:
    """
    Aggregate classification results using majority voting.
    
    Strategy:
    - Count classification results from all chunks
    - Select the classification that appears most frequently
    - Calculate confidence as (count of majority / total chunks)
    - If tie, select first classification alphabetically
    
    Args:
        chunk_results: List of chunk processing results
        
    Returns:
        Tuple of (classification, confidence)
        Returns (None, 0.0) if no classifications found
    """
    classifications = []
    
    for result in chunk_results:
        # Skip failed chunks
        if result.get('error'):
            continue
            
        # Extract classification result
        classification_result = result.get('classificationResult')
        if classification_result:
            classification = classification_result.get('documentClassification')
            if classification:
                classifications.append(classification)
    
    if not classifications:
        logger.warning('No classification results found in chunk results')
        return None, 0.0
    
    # Count occurrences
    classification_counts = Counter(classifications)
    
    # Get most common classification
    # If tie, Counter.most_common() returns them in order of first occurrence
    # We'll sort alphabetically to ensure deterministic behavior
    max_count = max(classification_counts.values())
    most_common = [
        cls for cls, count in classification_counts.items()
        if count == max_count
    ]
    
    # Sort alphabetically to handle ties deterministically
    most_common.sort()
    majority_classification = most_common[0]
    
    # Calculate confidence
    confidence = classification_counts[majority_classification] / len(classifications)
    
    logger.info(
        f'Aggregated classification: {majority_classification} '
        f'(confidence: {confidence:.2%}, votes: {classification_counts[majority_classification]}/{len(classifications)})',
        extra={
            'classification': majority_classification,
            'confidence': confidence,
            'votes': classification_counts[majority_classification],
            'totalVotes': len(classifications),
            'allClassifications': dict(classification_counts)
        }
    )
    
    return majority_classification, confidence


def deduplicate_entities(chunk_results: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Deduplicate entities from multiple chunks.
    
    Strategy:
    - Combine entities from all chunks
    - Remove exact duplicates by (type, value) for entities without page numbers
    - Preserve all entities with page numbers (may appear on multiple pages)
    - Sort entities by chunk index and page number
    
    Args:
        chunk_results: List of chunk processing results
        
    Returns:
        List of deduplicated entities
    """
    entities = []
    seen_without_page = set()
    
    for result in chunk_results:
        # Skip failed chunks
        if result.get('error'):
            continue
            
        # Extract processing result
        processing_result = result.get('processingResult')
        if not processing_result:
            continue
            
        chunk_index = result.get('chunkIndex', 0)
        chunk_entities = processing_result.get('entities', [])
        
        for entity in chunk_entities:
            entity_type = entity.get('type')
            entity_value = entity.get('value')
            
            if not entity_type or not entity_value:
                continue
            
            # Add chunk index to entity for sorting
            entity_with_chunk = {**entity, 'chunkIndex': chunk_index}
            
            # For entities without page numbers, deduplicate by (type, value)
            if 'page' not in entity:
                key = (entity_type, entity_value)
                if key not in seen_without_page:
                    entities.append(entity_with_chunk)
                    seen_without_page.add(key)
            else:
                # Keep all instances with page numbers
                entities.append(entity_with_chunk)
    
    # Sort entities by chunk index and page number
    def sort_key(entity):
        chunk_idx = entity.get('chunkIndex', 0)
        page = entity.get('page', 0)
        return (chunk_idx, page)
    
    entities.sort(key=sort_key)
    
    logger.info(
        f'Deduplicated entities: {len(entities)} total',
        extra={
            'totalEntities': len(entities),
            'entitiesWithoutPage': len(seen_without_page),
            'entitiesWithPage': len(entities) - len(seen_without_page)
        }
    )
    
    return entities
