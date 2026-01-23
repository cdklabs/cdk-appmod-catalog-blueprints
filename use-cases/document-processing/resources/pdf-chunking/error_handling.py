"""
Error handling module for PDF chunking Lambda.

This module provides centralized error handling, classification, and response
generation for the PDF chunking Lambda function.

Requirements: 1.5, 7.1, 7.2, 7.3
"""

import logging
import time
import random
from typing import Dict, Any, Optional, Callable, TypeVar
from functools import wraps
from botocore.exceptions import ClientError

# Configure module logger
logger = logging.getLogger(__name__)

# Type variable for generic retry decorator
T = TypeVar('T')


class PDFChunkingError(Exception):
    """Base exception for PDF chunking errors."""
    
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


class InvalidPDFFormatError(PDFChunkingError):
    """Raised when the file is not a valid PDF format."""
    
    def __init__(
        self,
        message: str,
        document_id: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            message=message,
            error_type='InvalidPDFFormat',
            document_id=document_id,
            recoverable=False,
            details=details
        )


class CorruptedPDFError(PDFChunkingError):
    """Raised when the PDF file is corrupted and cannot be read."""
    
    def __init__(
        self,
        message: str,
        document_id: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            message=message,
            error_type='CorruptedPDF',
            document_id=document_id,
            recoverable=False,
            details=details
        )


class EncryptedPDFError(PDFChunkingError):
    """Raised when the PDF file is encrypted and cannot be processed."""
    
    def __init__(
        self,
        message: str,
        document_id: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            message=message,
            error_type='EncryptedPDF',
            document_id=document_id,
            recoverable=False,
            details=details
        )


class S3AccessDeniedError(PDFChunkingError):
    """Raised when S3 access is denied."""
    
    def __init__(
        self,
        message: str,
        document_id: Optional[str] = None,
        bucket: Optional[str] = None,
        key: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        error_details = details or {}
        error_details.update({
            'bucket': bucket,
            'key': key
        })
        super().__init__(
            message=message,
            error_type='S3AccessDenied',
            document_id=document_id,
            recoverable=False,
            details=error_details
        )


class S3NotFoundError(PDFChunkingError):
    """Raised when S3 object is not found."""
    
    def __init__(
        self,
        message: str,
        document_id: Optional[str] = None,
        bucket: Optional[str] = None,
        key: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        error_details = details or {}
        error_details.update({
            'bucket': bucket,
            'key': key
        })
        super().__init__(
            message=message,
            error_type='S3NotFound',
            document_id=document_id,
            recoverable=False,
            details=error_details
        )


class S3ThrottlingError(PDFChunkingError):
    """Raised when S3 requests are throttled."""
    
    def __init__(
        self,
        message: str,
        document_id: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            message=message,
            error_type='S3Throttling',
            document_id=document_id,
            recoverable=True,
            details=details
        )


class DynamoDBWriteError(PDFChunkingError):
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


class ChunkingTimeoutError(PDFChunkingError):
    """Raised when chunking operation times out."""
    
    def __init__(
        self,
        message: str,
        document_id: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            message=message,
            error_type='ChunkingTimeout',
            document_id=document_id,
            recoverable=False,
            details=details
        )


class ConfigurationError(PDFChunkingError):
    """Raised when chunking configuration is invalid."""
    
    def __init__(
        self,
        message: str,
        document_id: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            message=message,
            error_type='ConfigurationError',
            document_id=document_id,
            recoverable=False,
            details=details
        )


def classify_s3_error(
    error: ClientError,
    document_id: Optional[str] = None,
    bucket: Optional[str] = None,
    key: Optional[str] = None
) -> PDFChunkingError:
    """
    Classify an S3 ClientError into a specific PDFChunkingError.
    
    Args:
        error: The boto3 ClientError from S3 operation
        document_id: Document identifier for logging
        bucket: S3 bucket name
        key: S3 object key
        
    Returns:
        Appropriate PDFChunkingError subclass
    """
    error_code = error.response.get('Error', {}).get('Code', 'Unknown')
    error_message = error.response.get('Error', {}).get('Message', str(error))
    
    if error_code == 'AccessDenied':
        return S3AccessDeniedError(
            message=f"Access denied to S3 object s3://{bucket}/{key}: {error_message}",
            document_id=document_id,
            bucket=bucket,
            key=key
        )
    elif error_code in ['NoSuchKey', 'NoSuchBucket', '404']:
        return S3NotFoundError(
            message=f"S3 object not found: s3://{bucket}/{key}",
            document_id=document_id,
            bucket=bucket,
            key=key
        )
    elif error_code in ['SlowDown', 'Throttling', 'RequestLimitExceeded']:
        return S3ThrottlingError(
            message=f"S3 request throttled: {error_message}",
            document_id=document_id,
            details={'error_code': error_code}
        )
    else:
        # Return generic error for other S3 errors
        return PDFChunkingError(
            message=f"S3 error ({error_code}): {error_message}",
            error_type=f'S3Error_{error_code}',
            document_id=document_id,
            recoverable=error_code in ['ServiceUnavailable', 'InternalError'],
            details={'error_code': error_code, 'bucket': bucket, 'key': key}
        )


def classify_pdf_error(
    error: Exception,
    document_id: Optional[str] = None
) -> PDFChunkingError:
    """
    Classify a PDF processing error into a specific PDFChunkingError.
    
    Args:
        error: The exception from PDF processing
        document_id: Document identifier for logging
        
    Returns:
        Appropriate PDFChunkingError subclass
    """
    error_str = str(error).lower()
    
    if 'encrypted' in error_str or 'password' in error_str:
        return EncryptedPDFError(
            message=f"PDF is encrypted and cannot be processed: {str(error)}",
            document_id=document_id
        )
    elif 'invalid' in error_str or 'not a pdf' in error_str or 'not a valid pdf' in error_str or 'magic' in error_str:
        return InvalidPDFFormatError(
            message=f"Invalid PDF format: {str(error)}",
            document_id=document_id
        )
    elif 'corrupt' in error_str or 'damaged' in error_str or 'malformed' in error_str:
        return CorruptedPDFError(
            message=f"PDF file is corrupted: {str(error)}",
            document_id=document_id
        )
    else:
        # Check for PyPDF2 specific errors
        error_type = type(error).__name__
        if 'PdfReadError' in error_type:
            return CorruptedPDFError(
                message=f"Failed to read PDF: {str(error)}",
                document_id=document_id,
                details={'original_error_type': error_type}
            )
        
        # Generic PDF error
        return PDFChunkingError(
            message=f"PDF processing error: {str(error)}",
            error_type='PDFProcessingError',
            document_id=document_id,
            recoverable=False,
            details={'original_error_type': error_type}
        )


def create_error_response(
    document_id: str,
    error: PDFChunkingError
) -> Dict[str, Any]:
    """
    Create a standardized error response for the Lambda handler.
    
    Args:
        document_id: Document identifier
        error: The PDFChunkingError to convert to response
        
    Returns:
        Error response dictionary
    """
    return {
        'documentId': document_id,
        'requiresChunking': False,
        'error': {
            'type': error.error_type,
            'message': error.message,
            'recoverable': error.recoverable,
            'details': error.details
        }
    }


def log_error(
    error: PDFChunkingError,
    include_stack_trace: bool = True
) -> None:
    """
    Log an error with structured logging.
    
    Args:
        error: The PDFChunkingError to log
        include_stack_trace: Whether to include stack trace
    """
    log_data = {
        'documentId': error.document_id or 'unknown',
        'errorType': error.error_type,
        'errorMessage': error.message,
        'recoverable': error.recoverable,
        'details': error.details
    }
    
    if include_stack_trace:
        logger.error(
            f"Error processing document {error.document_id}: {error.message}",
            extra=log_data,
            exc_info=True
        )
    else:
        logger.error(
            f"Error processing document {error.document_id}: {error.message}",
            extra=log_data
        )


def retry_with_exponential_backoff(
    max_retries: int = 3,
    base_delay: float = 1.0,
    max_delay: float = 30.0,
    jitter: bool = True,
    retryable_exceptions: tuple = (S3ThrottlingError, DynamoDBWriteError)
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
    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @wraps(func)
        def wrapper(*args, **kwargs) -> T:
            last_exception = None
            
            for attempt in range(max_retries + 1):
                try:
                    return func(*args, **kwargs)
                except retryable_exceptions as e:
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
                        raise
            
            # Should not reach here, but raise last exception if we do
            if last_exception:
                raise last_exception
            
        return wrapper
    return decorator


def validate_pdf_magic_bytes(data: bytes, document_id: Optional[str] = None) -> None:
    """
    Validate that the file data starts with PDF magic bytes.
    
    Args:
        data: File data bytes
        document_id: Document identifier for error messages
        
    Raises:
        InvalidPDFFormatError: If file is not a valid PDF
    """
    if not data or len(data) < 5:
        raise InvalidPDFFormatError(
            message="File is empty or too small to be a valid PDF",
            document_id=document_id,
            details={'file_size': len(data) if data else 0}
        )
    
    # Check for PDF magic bytes: %PDF-
    pdf_magic = b'%PDF-'
    if data[:5] != pdf_magic:
        # Try to identify what type of file it is
        file_type = 'unknown'
        if data[:4] == b'PK\x03\x04':
            file_type = 'ZIP/Office document'
        elif data[:5] == b'<html' or data[:5] == b'<!DOC':
            file_type = 'HTML'
        elif data[:4] == b'RIFF':
            file_type = 'RIFF (audio/video)'
        elif data[:3] == b'\xff\xd8\xff':
            file_type = 'JPEG image'
        elif data[:8] == b'\x89PNG\r\n\x1a\n':
            file_type = 'PNG image'
        
        raise InvalidPDFFormatError(
            message=f"File is not a valid PDF. Expected PDF magic bytes (%PDF-), "
                    f"but found {file_type} format",
            document_id=document_id,
            details={
                'detected_type': file_type,
                'first_bytes': data[:10].hex() if data else None
            }
        )
