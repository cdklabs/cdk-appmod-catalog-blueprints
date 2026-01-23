"""
CloudWatch Metrics Module for PDF Chunking.

This module provides functions to emit CloudWatch metrics for PDF chunking operations
using AWS Lambda Powertools for efficient EMF (Embedded Metric Format) logging.

Metrics are only emitted when observability is enabled via the ENABLE_METRICS
environment variable (set to 'true'). This is controlled by the enableObservability
prop in the CDK construct.

Requirements: 7.4
"""

import os
import time
import logging
from typing import Optional, List
from functools import wraps

from aws_lambda_powertools import Metrics
from aws_lambda_powertools.metrics import MetricUnit

# Configure logging
logger = logging.getLogger(__name__)

# Check if metrics are enabled via environment variable
# This is set by the CDK construct when enableObservability is true
METRICS_ENABLED = os.environ.get('ENABLE_METRICS', 'false').lower() == 'true'

# Initialize Powertools Metrics
# Namespace and service are configured via environment variables:
# - POWERTOOLS_METRICS_NAMESPACE
# - POWERTOOLS_SERVICE_NAME
metrics = Metrics()


def _is_metrics_enabled() -> bool:
    """
    Check if metrics emission is enabled.
    
    Metrics are enabled when the ENABLE_METRICS environment variable is set to 'true'.
    This is controlled by the enableObservability prop in the CDK construct.
    
    Returns:
        True if metrics should be emitted, False otherwise
    """
    return METRICS_ENABLED


def emit_chunking_operation(
    strategy: str,
    requires_chunking: bool,
    document_id: Optional[str] = None
) -> None:
    """
    Emit ChunkingOperations metric.
    
    Emits a count metric for each chunking operation with dimension for strategy.
    Only emits when observability is enabled (ENABLE_METRICS=true).
    
    Args:
        strategy: Chunking strategy used (fixed-pages, token-based, hybrid)
        requires_chunking: Whether chunking was required
        document_id: Optional document ID for logging
        
    Requirements: 7.4
    """
    if not _is_metrics_enabled():
        return
        
    try:
        metrics.add_dimension(name="Strategy", value=strategy)
        metrics.add_dimension(name="RequiresChunking", value=str(requires_chunking).lower())
        metrics.add_metric(name="ChunkingOperations", unit=MetricUnit.Count, value=1)
        
        logger.debug(
            f"Emitted ChunkingOperations metric: strategy={strategy}, "
            f"requires_chunking={requires_chunking}",
            extra={
                'documentId': document_id,
                'strategy': strategy,
                'requiresChunking': requires_chunking
            }
        )
        
    except Exception as e:
        logger.warning(
            f"Failed to emit ChunkingOperations metric: {str(e)}",
            extra={'documentId': document_id, 'error': str(e)}
        )


def emit_chunk_count(
    chunk_count: int,
    strategy: str,
    document_id: Optional[str] = None
) -> None:
    """
    Emit ChunkCount metric.
    
    Emits the number of chunks created for a document.
    Only emits when observability is enabled (ENABLE_METRICS=true).
    
    Args:
        chunk_count: Number of chunks created
        strategy: Chunking strategy used
        document_id: Optional document ID for logging
        
    Requirements: 7.4
    """
    if not _is_metrics_enabled():
        return
        
    try:
        metrics.add_dimension(name="Strategy", value=strategy)
        metrics.add_metric(name="ChunkCount", unit=MetricUnit.Count, value=chunk_count)
        
        logger.debug(
            f"Emitted ChunkCount metric: count={chunk_count}, strategy={strategy}",
            extra={
                'documentId': document_id,
                'chunkCount': chunk_count,
                'strategy': strategy
            }
        )
        
    except Exception as e:
        logger.warning(
            f"Failed to emit ChunkCount metric: {str(e)}",
            extra={'documentId': document_id, 'error': str(e)}
        )


def emit_tokens_per_chunk(
    tokens_per_chunk: List[int],
    strategy: str,
    document_id: Optional[str] = None
) -> None:
    """
    Emit TokensPerChunk metrics.
    
    Emits average and p99 tokens per chunk.
    Only emits when observability is enabled (ENABLE_METRICS=true).
    
    Args:
        tokens_per_chunk: List of token counts for each chunk
        strategy: Chunking strategy used
        document_id: Optional document ID for logging
        
    Requirements: 7.4
    """
    if not _is_metrics_enabled():
        return
        
    if not tokens_per_chunk:
        return
        
    try:
        avg_tokens = sum(tokens_per_chunk) / len(tokens_per_chunk)
        sorted_tokens = sorted(tokens_per_chunk)
        p99_index = int(len(sorted_tokens) * 0.99)
        p99_tokens = sorted_tokens[min(p99_index, len(sorted_tokens) - 1)]
        max_tokens = max(tokens_per_chunk)
        
        metrics.add_dimension(name="Strategy", value=strategy)
        metrics.add_metric(name="TokensPerChunkAvg", unit=MetricUnit.Count, value=avg_tokens)
        metrics.add_metric(name="TokensPerChunkP99", unit=MetricUnit.Count, value=p99_tokens)
        metrics.add_metric(name="TokensPerChunkMax", unit=MetricUnit.Count, value=max_tokens)
        
        logger.debug(
            f"Emitted TokensPerChunk metrics: avg={avg_tokens:.0f}, p99={p99_tokens}, max={max_tokens}",
            extra={
                'documentId': document_id,
                'avgTokens': avg_tokens,
                'p99Tokens': p99_tokens,
                'maxTokens': max_tokens,
                'strategy': strategy
            }
        )
        
    except Exception as e:
        logger.warning(
            f"Failed to emit TokensPerChunk metric: {str(e)}",
            extra={'documentId': document_id, 'error': str(e)}
        )


def emit_chunk_processing_time(
    processing_time_ms: float,
    processing_mode: str,
    document_id: Optional[str] = None
) -> None:
    """
    Emit ChunkProcessingTime metric.
    
    Emits processing time for chunking operation.
    Only emits when observability is enabled (ENABLE_METRICS=true).
    
    Args:
        processing_time_ms: Processing time in milliseconds
        processing_mode: Processing mode (sequential, parallel)
        document_id: Optional document ID for logging
        
    Requirements: 7.4
    """
    if not _is_metrics_enabled():
        return
        
    try:
        metrics.add_dimension(name="ProcessingMode", value=processing_mode)
        metrics.add_metric(name="ChunkProcessingTime", unit=MetricUnit.Milliseconds, value=processing_time_ms)
        
        logger.debug(
            f"Emitted ChunkProcessingTime metric: time={processing_time_ms:.2f}ms, "
            f"mode={processing_mode}",
            extra={
                'documentId': document_id,
                'processingTimeMs': processing_time_ms,
                'processingMode': processing_mode
            }
        )
        
    except Exception as e:
        logger.warning(
            f"Failed to emit ChunkProcessingTime metric: {str(e)}",
            extra={'documentId': document_id, 'error': str(e)}
        )


def emit_chunk_failure_rate(
    total_chunks: int,
    failed_chunks: int,
    document_id: Optional[str] = None
) -> None:
    """
    Emit ChunkFailureRate metric.
    
    Calculates and emits the percentage of failed chunks.
    Only emits when observability is enabled (ENABLE_METRICS=true).
    
    Args:
        total_chunks: Total number of chunks
        failed_chunks: Number of failed chunks
        document_id: Optional document ID for logging
        
    Requirements: 7.4
    """
    if not _is_metrics_enabled():
        return
        
    if total_chunks == 0:
        return
        
    try:
        failure_rate = (failed_chunks / total_chunks) * 100
        
        metrics.add_metric(name="ChunkFailureRate", unit=MetricUnit.Percent, value=failure_rate)
        metrics.add_metric(name="FailedChunks", unit=MetricUnit.Count, value=failed_chunks)
        metrics.add_metric(name="TotalChunks", unit=MetricUnit.Count, value=total_chunks)
        
        logger.debug(
            f"Emitted ChunkFailureRate metric: rate={failure_rate:.2f}%",
            extra={
                'documentId': document_id,
                'failureRate': failure_rate,
                'totalChunks': total_chunks,
                'failedChunks': failed_chunks
            }
        )
        
    except Exception as e:
        logger.warning(
            f"Failed to emit ChunkFailureRate metric: {str(e)}",
            extra={'documentId': document_id, 'error': str(e)}
        )


def emit_aggregation_time(
    aggregation_time_ms: float,
    document_id: Optional[str] = None
) -> None:
    """
    Emit AggregationTime metric.
    
    Emits the time taken to aggregate chunk results.
    Only emits when observability is enabled (ENABLE_METRICS=true).
    
    Args:
        aggregation_time_ms: Aggregation time in milliseconds
        document_id: Optional document ID for logging
        
    Requirements: 7.4
    """
    if not _is_metrics_enabled():
        return
        
    try:
        metrics.add_metric(name="AggregationTime", unit=MetricUnit.Milliseconds, value=aggregation_time_ms)
        
        logger.debug(
            f"Emitted AggregationTime metric: time={aggregation_time_ms:.2f}ms",
            extra={
                'documentId': document_id,
                'aggregationTimeMs': aggregation_time_ms
            }
        )
        
    except Exception as e:
        logger.warning(
            f"Failed to emit AggregationTime metric: {str(e)}",
            extra={'documentId': document_id, 'error': str(e)}
        )


def emit_strategy_usage(
    strategy: str,
    document_id: Optional[str] = None
) -> None:
    """
    Emit StrategyUsage metric.
    
    Emits a count metric for strategy usage tracking.
    Only emits when observability is enabled (ENABLE_METRICS=true).
    
    Args:
        strategy: Chunking strategy used (fixed-pages, token-based, hybrid)
        document_id: Optional document ID for logging
        
    Requirements: 7.4
    """
    if not _is_metrics_enabled():
        return
        
    try:
        metrics.add_dimension(name="Strategy", value=strategy)
        metrics.add_metric(name="StrategyUsage", unit=MetricUnit.Count, value=1)
        
        logger.debug(
            f"Emitted StrategyUsage metric: strategy={strategy}",
            extra={
                'documentId': document_id,
                'strategy': strategy
            }
        )
        
    except Exception as e:
        logger.warning(
            f"Failed to emit StrategyUsage metric: {str(e)}",
            extra={'documentId': document_id, 'error': str(e)}
        )


def emit_chunking_metrics(
    document_id: str,
    strategy: str,
    requires_chunking: bool,
    chunk_count: int = 0,
    tokens_per_chunk: Optional[List[int]] = None,
    processing_time_ms: float = 0,
    processing_mode: str = 'parallel'
) -> None:
    """
    Convenience function to emit all chunking-related metrics.
    
    Args:
        document_id: Document identifier
        strategy: Chunking strategy used
        requires_chunking: Whether chunking was required
        chunk_count: Number of chunks created (if chunking was required)
        tokens_per_chunk: List of token counts per chunk
        processing_time_ms: Total processing time in milliseconds
        processing_mode: Processing mode (sequential, parallel)
        
    Requirements: 7.4
    """
    # Always emit operation and strategy usage metrics
    emit_chunking_operation(strategy, requires_chunking, document_id)
    emit_strategy_usage(strategy, document_id)
    
    # Emit chunk-specific metrics only if chunking was performed
    if requires_chunking and chunk_count > 0:
        emit_chunk_count(chunk_count, strategy, document_id)
        
        if tokens_per_chunk:
            emit_tokens_per_chunk(tokens_per_chunk, strategy, document_id)
        
        if processing_time_ms > 0:
            emit_chunk_processing_time(
                processing_time_ms,
                processing_mode,
                document_id
            )


def timed_operation(metric_name: str = 'OperationTime'):
    """
    Decorator to measure and emit operation timing.
    
    Only emits metrics when observability is enabled (ENABLE_METRICS=true).
    
    Args:
        metric_name: Name of the metric to emit
        
    Returns:
        Decorated function
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            start_time = time.time()
            try:
                result = func(*args, **kwargs)
                return result
            finally:
                if _is_metrics_enabled():
                    elapsed_ms = (time.time() - start_time) * 1000
                    try:
                        metrics.add_metric(name=metric_name, unit=MetricUnit.Milliseconds, value=elapsed_ms)
                    except Exception as e:
                        logger.warning(f"Failed to emit timing metric: {str(e)}")
        return wrapper
    return decorator


# Export the metrics instance for use with @metrics.log_metrics decorator
def get_metrics() -> Metrics:
    """
    Get the Powertools Metrics instance.
    
    Use this to access the metrics instance for the @metrics.log_metrics decorator.
    
    Returns:
        Metrics instance
    """
    return metrics
