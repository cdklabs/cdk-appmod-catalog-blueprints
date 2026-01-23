"""
Structured Logging Module for PDF Chunking.

This module provides consistent JSON-formatted logging across all Lambda functions
in the PDF chunking workflow. Structured logging is only enabled when observability
is enabled (POWERTOOLS_METRICS_DISABLED != 'true').

Features:
- Consistent JSON log format with timestamp, level, message, and context
- Document ID, chunk index, and correlation ID in all log entries
- Configurable log levels via LOG_LEVEL environment variable
- Strategy selection reasoning logging

Requirements: 7.5
"""

import json
import logging
import os
import sys
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional
from functools import wraps


# Check if observability is enabled
# When POWERTOOLS_METRICS_DISABLED is 'true', observability is disabled
def is_observability_enabled() -> bool:
    """
    Check if observability is enabled based on environment variables.
    
    Observability is enabled when POWERTOOLS_METRICS_DISABLED is NOT 'true'.
    This aligns with the CDK construct's enableObservability flag.
    
    Returns:
        True if observability is enabled, False otherwise
    """
    metrics_disabled = os.environ.get('POWERTOOLS_METRICS_DISABLED', 'false').lower()
    return metrics_disabled != 'true'


class StructuredLogFormatter(logging.Formatter):
    """
    Custom log formatter that outputs JSON-structured logs.
    
    Log format includes:
    - timestamp: ISO 8601 formatted timestamp in UTC
    - level: Log level (INFO, ERROR, WARNING, DEBUG)
    - message: Log message
    - logger: Logger name
    - context: Additional context fields (documentId, chunkIndex, correlationId, etc.)
    
    Requirements: 7.5
    """
    
    def __init__(self, service_name: Optional[str] = None):
        """
        Initialize the structured log formatter.
        
        Args:
            service_name: Service name to include in logs (from POWERTOOLS_SERVICE_NAME)
        """
        super().__init__()
        self.service_name = service_name or os.environ.get(
            'POWERTOOLS_SERVICE_NAME', 'pdf-chunking'
        )
    
    def format(self, record: logging.LogRecord) -> str:
        """
        Format the log record as JSON.
        
        Args:
            record: Log record to format
            
        Returns:
            JSON-formatted log string
        """
        # Build base log structure
        log_entry = {
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'level': record.levelname,
            'message': record.getMessage(),
            'logger': record.name,
            'service': self.service_name,
        }
        
        # Add location info for errors
        if record.levelno >= logging.ERROR:
            log_entry['location'] = {
                'file': record.filename,
                'line': record.lineno,
                'function': record.funcName
            }
        
        # Add exception info if present
        if record.exc_info:
            log_entry['exception'] = {
                'type': record.exc_info[0].__name__ if record.exc_info[0] else None,
                'message': str(record.exc_info[1]) if record.exc_info[1] else None,
            }
        
        # Add extra context fields
        # These are passed via logger.info(..., extra={...})
        context = {}
        for key, value in record.__dict__.items():
            if key not in [
                'name', 'msg', 'args', 'created', 'filename', 'funcName',
                'levelname', 'levelno', 'lineno', 'module', 'msecs',
                'pathname', 'process', 'processName', 'relativeCreated',
                'stack_info', 'exc_info', 'exc_text', 'thread', 'threadName',
                'message', 'asctime'
            ]:
                context[key] = value
        
        if context:
            log_entry['context'] = context
        
        return json.dumps(log_entry, default=str)


class StandardLogFormatter(logging.Formatter):
    """
    Standard log formatter for when observability is disabled.
    
    Uses a simple format: [LEVEL] message
    """
    
    def __init__(self):
        super().__init__('[%(levelname)s] %(message)s')


class StructuredLogger:
    """
    Structured logger wrapper that provides consistent logging interface.
    
    This class wraps the standard Python logger and adds:
    - Automatic correlation ID generation and propagation
    - Document ID and chunk index context
    - Structured JSON output when observability is enabled
    - Standard output when observability is disabled
    
    Requirements: 7.5
    """
    
    _correlation_id: Optional[str] = None
    _document_id: Optional[str] = None
    _chunk_index: Optional[int] = None
    
    def __init__(self, name: str = __name__):
        """
        Initialize the structured logger.
        
        Args:
            name: Logger name (typically __name__)
        """
        self.logger = logging.getLogger(name)
        self._configure_logger()
    
    def _configure_logger(self) -> None:
        """Configure the logger with appropriate formatter and level."""
        # Get log level from environment
        log_level = os.environ.get('LOG_LEVEL', 'INFO').upper()
        
        # Validate log level
        valid_levels = ['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL']
        if log_level not in valid_levels:
            log_level = 'INFO'
        
        self.logger.setLevel(getattr(logging, log_level))
        
        # Remove existing handlers to avoid duplicates
        self.logger.handlers = []
        
        # Create handler
        handler = logging.StreamHandler(sys.stdout)
        handler.setLevel(getattr(logging, log_level))
        
        # Use structured formatter only when observability is enabled
        if is_observability_enabled():
            formatter = StructuredLogFormatter()
        else:
            formatter = StandardLogFormatter()
        
        handler.setFormatter(formatter)
        self.logger.addHandler(handler)
        
        # Prevent propagation to root logger
        self.logger.propagate = False
    
    def set_correlation_id(self, correlation_id: Optional[str] = None) -> str:
        """
        Set or generate a correlation ID for request tracing.
        
        Args:
            correlation_id: Existing correlation ID to use, or None to generate new
            
        Returns:
            The correlation ID being used
        """
        if correlation_id:
            StructuredLogger._correlation_id = correlation_id
        else:
            StructuredLogger._correlation_id = str(uuid.uuid4())
        return StructuredLogger._correlation_id
    
    def get_correlation_id(self) -> Optional[str]:
        """Get the current correlation ID."""
        return StructuredLogger._correlation_id
    
    def set_document_context(
        self,
        document_id: Optional[str] = None,
        chunk_index: Optional[int] = None
    ) -> None:
        """
        Set document context for all subsequent log entries.
        
        Args:
            document_id: Document identifier
            chunk_index: Chunk index (for chunk-specific operations)
        """
        StructuredLogger._document_id = document_id
        StructuredLogger._chunk_index = chunk_index
    
    def clear_context(self) -> None:
        """Clear all context (correlation ID, document ID, chunk index)."""
        StructuredLogger._correlation_id = None
        StructuredLogger._document_id = None
        StructuredLogger._chunk_index = None
    
    def _build_extra(self, extra: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Build extra context dictionary with standard fields.
        
        Args:
            extra: Additional context to include
            
        Returns:
            Combined extra dictionary
        """
        result = {}
        
        # Add correlation ID if set
        if StructuredLogger._correlation_id:
            result['correlationId'] = StructuredLogger._correlation_id
        
        # Add document ID if set
        if StructuredLogger._document_id:
            result['documentId'] = StructuredLogger._document_id
        
        # Add chunk index if set
        if StructuredLogger._chunk_index is not None:
            result['chunkIndex'] = StructuredLogger._chunk_index
        
        # Merge with provided extra
        if extra:
            result.update(extra)
        
        return result
    
    def debug(self, message: str, extra: Optional[Dict[str, Any]] = None) -> None:
        """Log a debug message."""
        self.logger.debug(message, extra=self._build_extra(extra))
    
    def info(self, message: str, extra: Optional[Dict[str, Any]] = None) -> None:
        """Log an info message."""
        self.logger.info(message, extra=self._build_extra(extra))
    
    def warning(self, message: str, extra: Optional[Dict[str, Any]] = None) -> None:
        """Log a warning message."""
        self.logger.warning(message, extra=self._build_extra(extra))
    
    def error(
        self,
        message: str,
        extra: Optional[Dict[str, Any]] = None,
        exc_info: bool = False
    ) -> None:
        """Log an error message."""
        self.logger.error(message, extra=self._build_extra(extra), exc_info=exc_info)
    
    def critical(
        self,
        message: str,
        extra: Optional[Dict[str, Any]] = None,
        exc_info: bool = False
    ) -> None:
        """Log a critical message."""
        self.logger.critical(message, extra=self._build_extra(extra), exc_info=exc_info)


def get_logger(name: str = __name__) -> StructuredLogger:
    """
    Get a structured logger instance.
    
    Args:
        name: Logger name (typically __name__)
        
    Returns:
        StructuredLogger instance
    """
    return StructuredLogger(name)


def log_strategy_selection(
    logger: StructuredLogger,
    strategy: str,
    requires_chunking: bool,
    reason: str,
    document_pages: int,
    document_tokens: int,
    page_threshold: int,
    token_threshold: int,
    page_threshold_exceeded: bool,
    token_threshold_exceeded: bool
) -> None:
    """
    Log strategy selection decision with full context.
    
    This function provides comprehensive logging for strategy selection,
    including all relevant metrics and threshold comparisons.
    
    Args:
        logger: StructuredLogger instance
        strategy: Selected strategy name
        requires_chunking: Whether chunking is required
        reason: Human-readable reason for the decision
        document_pages: Number of pages in the document
        document_tokens: Total tokens in the document
        page_threshold: Page threshold used
        token_threshold: Token threshold used
        page_threshold_exceeded: Whether page threshold was exceeded
        token_threshold_exceeded: Whether token threshold was exceeded
        
    Requirements: 7.5
    """
    decision = "CHUNKING_REQUIRED" if requires_chunking else "NO_CHUNKING_NEEDED"
    
    logger.info(
        f"Strategy selection: {decision}",
        extra={
            'event': 'strategy_selection',
            'strategy': strategy,
            'requiresChunking': requires_chunking,
            'reason': reason,
            'documentCharacteristics': {
                'pages': document_pages,
                'tokens': document_tokens
            },
            'thresholds': {
                'pageThreshold': page_threshold,
                'tokenThreshold': token_threshold,
                'pageThresholdExceeded': page_threshold_exceeded,
                'tokenThresholdExceeded': token_threshold_exceeded
            }
        }
    )


def log_chunking_operation(
    logger: StructuredLogger,
    operation: str,
    document_id: str,
    chunk_count: Optional[int] = None,
    chunk_index: Optional[int] = None,
    success: bool = True,
    error_message: Optional[str] = None,
    duration_ms: Optional[float] = None,
    extra: Optional[Dict[str, Any]] = None
) -> None:
    """
    Log a chunking operation with standard fields.
    
    Args:
        logger: StructuredLogger instance
        operation: Operation name (e.g., 'analyze', 'split', 'upload')
        document_id: Document identifier
        chunk_count: Total number of chunks (if applicable)
        chunk_index: Current chunk index (if applicable)
        success: Whether the operation succeeded
        error_message: Error message if operation failed
        duration_ms: Operation duration in milliseconds
        extra: Additional context
        
    Requirements: 7.5
    """
    log_extra = {
        'event': 'chunking_operation',
        'operation': operation,
        'documentId': document_id,
        'success': success
    }
    
    if chunk_count is not None:
        log_extra['chunkCount'] = chunk_count
    
    if chunk_index is not None:
        log_extra['chunkIndex'] = chunk_index
    
    if duration_ms is not None:
        log_extra['durationMs'] = duration_ms
    
    if error_message:
        log_extra['errorMessage'] = error_message
    
    if extra:
        log_extra.update(extra)
    
    if success:
        logger.info(f"Chunking operation '{operation}' completed", extra=log_extra)
    else:
        logger.error(f"Chunking operation '{operation}' failed", extra=log_extra)


def with_correlation_id(func):
    """
    Decorator to automatically set correlation ID from event.
    
    Looks for correlation ID in:
    1. event.correlationId
    2. event.headers.x-correlation-id
    3. Generates new UUID if not found
    
    Args:
        func: Lambda handler function
        
    Returns:
        Wrapped function with correlation ID handling
    """
    @wraps(func)
    def wrapper(event: Dict[str, Any], context: Any) -> Any:
        logger = get_logger()
        
        # Try to get correlation ID from event
        correlation_id = event.get('correlationId')
        
        # Try headers if not in event root
        if not correlation_id:
            headers = event.get('headers', {})
            correlation_id = headers.get('x-correlation-id') or headers.get('X-Correlation-Id')
        
        # Set or generate correlation ID
        logger.set_correlation_id(correlation_id)
        
        # Set document context if available
        document_id = event.get('documentId')
        if document_id:
            logger.set_document_context(document_id=document_id)
        
        try:
            return func(event, context)
        finally:
            # Clear context after request
            logger.clear_context()
    
    return wrapper
