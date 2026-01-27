"""
Unit tests for error handling module.

Tests cover:
- Invalid PDF format handling
- Corrupted PDF handling
- S3 access denied handling
- Lambda timeout handling
- DynamoDB write failure handling
- Retry logic with exponential backoff

Requirements: 7.1, 7.2, 7.3
"""

import unittest
from unittest.mock import Mock, patch, MagicMock
import time
from botocore.exceptions import ClientError

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
    ConfigurationError,
    classify_s3_error,
    classify_pdf_error,
    create_error_response,
    log_error,
    retry_with_exponential_backoff,
    validate_pdf_magic_bytes
)


class TestPDFChunkingError(unittest.TestCase):
    """Test cases for base PDFChunkingError class."""
    
    def test_error_creation(self):
        """Test creating a PDFChunkingError."""
        error = PDFChunkingError(
            message="Test error",
            error_type="TestError",
            document_id="doc-123",
            recoverable=True,
            details={'key': 'value'}
        )
        
        self.assertEqual(error.message, "Test error")
        self.assertEqual(error.error_type, "TestError")
        self.assertEqual(error.document_id, "doc-123")
        self.assertTrue(error.recoverable)
        self.assertEqual(error.details, {'key': 'value'})
    
    def test_error_str(self):
        """Test error string representation."""
        error = PDFChunkingError(
            message="Test error message",
            error_type="TestError"
        )
        
        self.assertEqual(str(error), "Test error message")


class TestInvalidPDFFormatError(unittest.TestCase):
    """Test cases for InvalidPDFFormatError."""
    
    def test_error_type(self):
        """Test that error type is set correctly."""
        error = InvalidPDFFormatError(
            message="Not a PDF",
            document_id="doc-123"
        )
        
        self.assertEqual(error.error_type, "InvalidPDFFormat")
        self.assertFalse(error.recoverable)
    
    def test_with_details(self):
        """Test error with additional details."""
        error = InvalidPDFFormatError(
            message="Not a PDF",
            document_id="doc-123",
            details={'detected_type': 'HTML'}
        )
        
        self.assertEqual(error.details['detected_type'], 'HTML')


class TestCorruptedPDFError(unittest.TestCase):
    """Test cases for CorruptedPDFError."""
    
    def test_error_type(self):
        """Test that error type is set correctly."""
        error = CorruptedPDFError(
            message="PDF is corrupted",
            document_id="doc-123"
        )
        
        self.assertEqual(error.error_type, "CorruptedPDF")
        self.assertFalse(error.recoverable)


class TestEncryptedPDFError(unittest.TestCase):
    """Test cases for EncryptedPDFError."""
    
    def test_error_type(self):
        """Test that error type is set correctly."""
        error = EncryptedPDFError(
            message="PDF is encrypted",
            document_id="doc-123"
        )
        
        self.assertEqual(error.error_type, "EncryptedPDF")
        self.assertFalse(error.recoverable)


class TestS3AccessDeniedError(unittest.TestCase):
    """Test cases for S3AccessDeniedError."""
    
    def test_error_type(self):
        """Test that error type is set correctly."""
        error = S3AccessDeniedError(
            message="Access denied",
            document_id="doc-123",
            bucket="test-bucket",
            key="test-key"
        )
        
        self.assertEqual(error.error_type, "S3AccessDenied")
        self.assertFalse(error.recoverable)
        self.assertEqual(error.details['bucket'], "test-bucket")
        self.assertEqual(error.details['key'], "test-key")


class TestS3NotFoundError(unittest.TestCase):
    """Test cases for S3NotFoundError."""
    
    def test_error_type(self):
        """Test that error type is set correctly."""
        error = S3NotFoundError(
            message="Object not found",
            document_id="doc-123",
            bucket="test-bucket",
            key="test-key"
        )
        
        self.assertEqual(error.error_type, "S3NotFound")
        self.assertFalse(error.recoverable)


class TestS3ThrottlingError(unittest.TestCase):
    """Test cases for S3ThrottlingError."""
    
    def test_error_type(self):
        """Test that error type is set correctly."""
        error = S3ThrottlingError(
            message="Request throttled",
            document_id="doc-123"
        )
        
        self.assertEqual(error.error_type, "S3Throttling")
        self.assertTrue(error.recoverable)


class TestDynamoDBWriteError(unittest.TestCase):
    """Test cases for DynamoDBWriteError."""
    
    def test_error_type(self):
        """Test that error type is set correctly."""
        error = DynamoDBWriteError(
            message="Write failed",
            document_id="doc-123"
        )
        
        self.assertEqual(error.error_type, "DynamoDBWriteError")
        self.assertTrue(error.recoverable)


class TestChunkingTimeoutError(unittest.TestCase):
    """Test cases for ChunkingTimeoutError."""
    
    def test_error_type(self):
        """Test that error type is set correctly."""
        error = ChunkingTimeoutError(
            message="Operation timed out",
            document_id="doc-123"
        )
        
        self.assertEqual(error.error_type, "ChunkingTimeout")
        self.assertFalse(error.recoverable)


class TestClassifyS3Error(unittest.TestCase):
    """Test cases for classify_s3_error function."""
    
    def test_access_denied(self):
        """Test classification of AccessDenied error."""
        error_response = {
            'Error': {'Code': 'AccessDenied', 'Message': 'Access Denied'}
        }
        client_error = ClientError(error_response, 'GetObject')
        
        result = classify_s3_error(
            client_error,
            document_id="doc-123",
            bucket="test-bucket",
            key="test-key"
        )
        
        self.assertIsInstance(result, S3AccessDeniedError)
        self.assertEqual(result.error_type, "S3AccessDenied")
    
    def test_no_such_key(self):
        """Test classification of NoSuchKey error."""
        error_response = {
            'Error': {'Code': 'NoSuchKey', 'Message': 'Key not found'}
        }
        client_error = ClientError(error_response, 'GetObject')
        
        result = classify_s3_error(
            client_error,
            document_id="doc-123",
            bucket="test-bucket",
            key="test-key"
        )
        
        self.assertIsInstance(result, S3NotFoundError)
        self.assertEqual(result.error_type, "S3NotFound")
    
    def test_throttling(self):
        """Test classification of throttling error."""
        error_response = {
            'Error': {'Code': 'SlowDown', 'Message': 'Slow down'}
        }
        client_error = ClientError(error_response, 'PutObject')
        
        result = classify_s3_error(
            client_error,
            document_id="doc-123",
            bucket="test-bucket",
            key="test-key"
        )
        
        self.assertIsInstance(result, S3ThrottlingError)
        self.assertEqual(result.error_type, "S3Throttling")
        self.assertTrue(result.recoverable)
    
    def test_generic_error(self):
        """Test classification of generic S3 error."""
        error_response = {
            'Error': {'Code': 'InternalError', 'Message': 'Internal error'}
        }
        client_error = ClientError(error_response, 'GetObject')
        
        result = classify_s3_error(
            client_error,
            document_id="doc-123",
            bucket="test-bucket",
            key="test-key"
        )
        
        self.assertIsInstance(result, PDFChunkingError)
        self.assertEqual(result.error_type, "S3Error_InternalError")


class TestClassifyPDFError(unittest.TestCase):
    """Test cases for classify_pdf_error function."""
    
    def test_encrypted_pdf(self):
        """Test classification of encrypted PDF error."""
        error = Exception("PDF is encrypted and requires a password")
        
        result = classify_pdf_error(error, document_id="doc-123")
        
        self.assertIsInstance(result, EncryptedPDFError)
        self.assertEqual(result.error_type, "EncryptedPDF")
    
    def test_invalid_pdf(self):
        """Test classification of invalid PDF error."""
        error = Exception("File is not a valid PDF")
        
        result = classify_pdf_error(error, document_id="doc-123")
        
        self.assertIsInstance(result, InvalidPDFFormatError)
        self.assertEqual(result.error_type, "InvalidPDFFormat")
    
    def test_corrupted_pdf(self):
        """Test classification of corrupted PDF error."""
        error = Exception("PDF file is corrupted and cannot be read")
        
        result = classify_pdf_error(error, document_id="doc-123")
        
        self.assertIsInstance(result, CorruptedPDFError)
        self.assertEqual(result.error_type, "CorruptedPDF")
    
    def test_generic_pdf_error(self):
        """Test classification of generic PDF error."""
        error = Exception("Unknown PDF error")
        
        result = classify_pdf_error(error, document_id="doc-123")
        
        self.assertIsInstance(result, PDFChunkingError)
        self.assertEqual(result.error_type, "PDFProcessingError")


class TestCreateErrorResponse(unittest.TestCase):
    """Test cases for create_error_response function."""
    
    def test_error_response_structure(self):
        """Test that error response has correct structure."""
        error = InvalidPDFFormatError(
            message="Not a PDF",
            document_id="doc-123",
            details={'detected_type': 'HTML'}
        )
        
        response = create_error_response("doc-123", error)
        
        self.assertEqual(response['documentId'], "doc-123")
        self.assertFalse(response['requiresChunking'])
        self.assertIn('error', response)
        self.assertEqual(response['error']['type'], "InvalidPDFFormat")
        self.assertEqual(response['error']['message'], "Not a PDF")
        self.assertFalse(response['error']['recoverable'])
        self.assertEqual(response['error']['details']['detected_type'], 'HTML')


class TestValidatePDFMagicBytes(unittest.TestCase):
    """Test cases for validate_pdf_magic_bytes function."""
    
    def test_valid_pdf(self):
        """Test validation with valid PDF magic bytes."""
        valid_pdf = b'%PDF-1.4\n%\xe2\xe3\xcf\xd3\n'
        
        # Should not raise
        validate_pdf_magic_bytes(valid_pdf, "doc-123")
    
    def test_invalid_pdf_html(self):
        """Test validation with HTML file."""
        html_file = b'<html><body>Not a PDF</body></html>'
        
        with self.assertRaises(InvalidPDFFormatError) as context:
            validate_pdf_magic_bytes(html_file, "doc-123")
        
        self.assertIn('HTML', context.exception.details['detected_type'])
    
    def test_invalid_pdf_zip(self):
        """Test validation with ZIP file."""
        zip_file = b'PK\x03\x04...'
        
        with self.assertRaises(InvalidPDFFormatError) as context:
            validate_pdf_magic_bytes(zip_file, "doc-123")
        
        self.assertIn('ZIP', context.exception.details['detected_type'])
    
    def test_empty_file(self):
        """Test validation with empty file."""
        with self.assertRaises(InvalidPDFFormatError) as context:
            validate_pdf_magic_bytes(b'', "doc-123")
        
        self.assertIn('empty', context.exception.message.lower())
    
    def test_too_short_file(self):
        """Test validation with file too short to be PDF."""
        with self.assertRaises(InvalidPDFFormatError) as context:
            validate_pdf_magic_bytes(b'%PDF', "doc-123")
        
        self.assertIn('too small', context.exception.message.lower())


class TestRetryWithExponentialBackoff(unittest.TestCase):
    """Test cases for retry_with_exponential_backoff decorator."""
    
    def test_successful_call(self):
        """Test that successful calls return immediately."""
        call_count = 0
        
        @retry_with_exponential_backoff(max_retries=3)
        def successful_function():
            nonlocal call_count
            call_count += 1
            return "success"
        
        result = successful_function()
        
        self.assertEqual(result, "success")
        self.assertEqual(call_count, 1)
    
    def test_retry_on_recoverable_error(self):
        """Test that recoverable errors trigger retries."""
        call_count = 0
        
        @retry_with_exponential_backoff(
            max_retries=2,
            base_delay=0.01,
            retryable_exceptions=(S3ThrottlingError,)
        )
        def failing_then_succeeding():
            nonlocal call_count
            call_count += 1
            if call_count < 3:
                raise S3ThrottlingError("Throttled", document_id="doc-123")
            return "success"
        
        result = failing_then_succeeding()
        
        self.assertEqual(result, "success")
        self.assertEqual(call_count, 3)
    
    def test_max_retries_exceeded(self):
        """Test that max retries raises exception."""
        call_count = 0
        
        @retry_with_exponential_backoff(
            max_retries=2,
            base_delay=0.01,
            retryable_exceptions=(S3ThrottlingError,)
        )
        def always_failing():
            nonlocal call_count
            call_count += 1
            raise S3ThrottlingError("Throttled", document_id="doc-123")
        
        with self.assertRaises(S3ThrottlingError):
            always_failing()
        
        self.assertEqual(call_count, 3)  # Initial + 2 retries
    
    def test_non_retryable_error(self):
        """Test that non-retryable errors are raised immediately."""
        call_count = 0
        
        @retry_with_exponential_backoff(
            max_retries=3,
            base_delay=0.01,
            retryable_exceptions=(S3ThrottlingError,)
        )
        def non_retryable_error():
            nonlocal call_count
            call_count += 1
            raise InvalidPDFFormatError("Not a PDF", document_id="doc-123")
        
        with self.assertRaises(InvalidPDFFormatError):
            non_retryable_error()
        
        self.assertEqual(call_count, 1)  # No retries


class TestLogError(unittest.TestCase):
    """Test cases for log_error function."""
    
    @patch('error_handling.logger')
    def test_log_error_with_stack_trace(self, mock_logger):
        """Test logging error with stack trace."""
        error = InvalidPDFFormatError(
            message="Not a PDF",
            document_id="doc-123"
        )
        
        log_error(error, include_stack_trace=True)
        
        mock_logger.error.assert_called_once()
        call_args = mock_logger.error.call_args
        self.assertIn("doc-123", call_args[0][0])
        self.assertTrue(call_args[1]['exc_info'])
    
    @patch('error_handling.logger')
    def test_log_error_without_stack_trace(self, mock_logger):
        """Test logging error without stack trace."""
        error = InvalidPDFFormatError(
            message="Not a PDF",
            document_id="doc-123"
        )
        
        log_error(error, include_stack_trace=False)
        
        mock_logger.error.assert_called_once()
        call_args = mock_logger.error.call_args
        self.assertNotIn('exc_info', call_args[1])


if __name__ == '__main__':
    unittest.main()
