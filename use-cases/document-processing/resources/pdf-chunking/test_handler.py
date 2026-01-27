"""
Unit tests for PDF analysis and chunking Lambda handler.

Tests cover:
- Small documents (no chunking)
- Large documents (chunking required)
- Invalid PDF format
- S3 access denied
- Configuration validation
- Error handling
"""

import unittest
from unittest.mock import Mock, patch, MagicMock
import json
import io
from botocore.exceptions import ClientError

# Import handler functions
from handler import (
    lambda_handler,
    _merge_configuration,
    _get_no_chunking_reason,
    _calculate_chunk_boundaries,
    _get_strategy_config,
    _create_error_response,
    _split_and_upload_pdf,
    _upload_chunk_with_retry
)


class TestLambdaHandler(unittest.TestCase):
    """Test cases for the main Lambda handler function."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.small_doc_event = {
            'documentId': 'doc-123',
            'contentType': 'file',
            'content': {
                'bucket': 'test-bucket',
                'key': 'raw/small-doc.pdf',
                'location': 's3',
                'filename': 'small-doc.pdf'
            },
            'config': {
                'strategy': 'hybrid',
                'pageThreshold': 100,
                'tokenThreshold': 150000
            }
        }
        
        self.large_doc_event = {
            'documentId': 'doc-456',
            'contentType': 'file',
            'content': {
                'bucket': 'test-bucket',
                'key': 'raw/large-doc.pdf',
                'location': 's3',
                'filename': 'large-doc.pdf'
            },
            'config': {
                'strategy': 'hybrid',
                'pageThreshold': 100,
                'tokenThreshold': 150000
            }
        }
    
    @patch('handler.analyze_pdf_tokens')
    @patch('handler.validate_configuration')
    def test_small_document_no_chunking(self, mock_validate, mock_analyze):
        """Test handler with small document that doesn't require chunking."""
        # Mock configuration validation
        mock_validate.return_value = True
        
        # Mock token analysis - small document
        mock_analyze.return_value = {
            'total_tokens': 45000,
            'total_pages': 30,
            'avg_tokens_per_page': 1500,
            'tokens_per_page': [1500] * 30,
            'requires_chunking': False,
            'strategy': 'hybrid'
        }
        
        # Call handler
        result = lambda_handler(self.small_doc_event, None)
        
        # Verify response
        self.assertEqual(result['documentId'], 'doc-123')
        self.assertFalse(result['requiresChunking'])
        self.assertEqual(result['tokenAnalysis']['totalTokens'], 45000)
        self.assertEqual(result['tokenAnalysis']['totalPages'], 30)
        self.assertIn('reason', result)
        self.assertIn('30 pages', result['reason'])
    
    @patch('handler._split_and_upload_pdf')
    @patch('handler._calculate_chunk_boundaries')
    @patch('handler.analyze_pdf_tokens')
    @patch('handler.validate_configuration')
    def test_large_document_with_chunking(
        self,
        mock_validate,
        mock_analyze,
        mock_calculate,
        mock_split
    ):
        """Test handler with large document that requires chunking."""
        # Mock configuration validation
        mock_validate.return_value = True
        
        # Mock token analysis - large document
        mock_analyze.return_value = {
            'total_tokens': 200000,
            'total_pages': 150,
            'avg_tokens_per_page': 1333,
            'tokens_per_page': [1333] * 150,
            'requires_chunking': True,
            'strategy': 'hybrid'
        }
        
        # Mock chunk boundaries
        mock_calculate.return_value = [
            {'chunk_index': 0, 'start_page': 0, 'end_page': 74, 'page_count': 75},
            {'chunk_index': 1, 'start_page': 70, 'end_page': 149, 'page_count': 80}
        ]
        
        # Mock chunk upload
        mock_split.return_value = [
            {
                'chunkId': 'doc-456_chunk_0',
                'chunkIndex': 0,
                'totalChunks': 2,
                'startPage': 0,
                'endPage': 74,
                'pageCount': 75,
                'estimatedTokens': 100000,
                'bucket': 'test-bucket',
                'key': 'chunks/doc-456/doc-456_chunk_0.pdf'
            },
            {
                'chunkId': 'doc-456_chunk_1',
                'chunkIndex': 1,
                'totalChunks': 2,
                'startPage': 70,
                'endPage': 149,
                'pageCount': 80,
                'estimatedTokens': 106640,
                'bucket': 'test-bucket',
                'key': 'chunks/doc-456/doc-456_chunk_1.pdf'
            }
        ]
        
        # Call handler
        result = lambda_handler(self.large_doc_event, None)
        
        # Verify response
        self.assertEqual(result['documentId'], 'doc-456')
        self.assertTrue(result['requiresChunking'])
        self.assertEqual(result['tokenAnalysis']['totalTokens'], 200000)
        self.assertEqual(result['tokenAnalysis']['totalPages'], 150)
        self.assertEqual(result['strategy'], 'hybrid')
        self.assertEqual(len(result['chunks']), 2)
        self.assertEqual(result['chunks'][0]['chunkId'], 'doc-456_chunk_0')
        self.assertEqual(result['chunks'][1]['chunkId'], 'doc-456_chunk_1')
    
    @patch('handler.analyze_pdf_tokens')
    @patch('handler.validate_configuration')
    def test_invalid_pdf_format(self, mock_validate, mock_analyze):
        """Test handler with invalid PDF format."""
        # Mock configuration validation
        mock_validate.return_value = True
        
        # Mock token analysis failure with InvalidPDFFormatError
        from error_handling import InvalidPDFFormatError
        mock_analyze.side_effect = InvalidPDFFormatError(
            message="Invalid or corrupted PDF format",
            document_id="doc-123"
        )
        
        # Call handler
        result = lambda_handler(self.small_doc_event, None)
        
        # Verify error response
        self.assertEqual(result['documentId'], 'doc-123')
        self.assertFalse(result['requiresChunking'])
        self.assertIn('error', result)
        self.assertEqual(result['error']['type'], 'InvalidPDFFormat')
        self.assertIn('Invalid', result['error']['message'])
    
    @patch('handler.analyze_pdf_tokens')
    @patch('handler.validate_configuration')
    def test_s3_access_denied(self, mock_validate, mock_analyze):
        """Test handler with S3 access denied error."""
        # Mock configuration validation
        mock_validate.return_value = True
        
        # Mock S3 access denied
        error_response = {'Error': {'Code': 'AccessDenied', 'Message': 'Access Denied'}}
        mock_analyze.side_effect = ClientError(error_response, 'GetObject')
        
        # Call handler
        result = lambda_handler(self.small_doc_event, None)
        
        # Verify error response
        self.assertEqual(result['documentId'], 'doc-123')
        self.assertFalse(result['requiresChunking'])
        self.assertIn('error', result)
        self.assertEqual(result['error']['type'], 'S3AccessDenied')
    
    def test_missing_document_id(self):
        """Test handler with missing documentId."""
        event = {
            'contentType': 'file',
            'content': {
                'bucket': 'test-bucket',
                'key': 'raw/doc.pdf'
            }
        }
        
        result = lambda_handler(event, None)
        
        # Verify error response
        self.assertIn('error', result)
        self.assertIn('documentId', result['error']['message'])
    
    def test_missing_content_fields(self):
        """Test handler with missing content fields."""
        event = {
            'documentId': 'doc-789',
            'contentType': 'file',
            'content': {}
        }
        
        result = lambda_handler(event, None)
        
        # Verify error response
        self.assertIn('error', result)
        self.assertIn('bucket', result['error']['message'])
    
    def test_actual_sqs_consumer_payload(self):
        """Test handler with actual payload from SQS consumer."""
        # This is the exact format sent by the SQS consumer
        event = {
            'documentId': 'invoice-2024-001-1705315800000',
            'contentType': 'file',
            'content': {
                'location': 's3',
                'bucket': 'my-document-bucket',
                'key': 'raw/invoice-2024-001.pdf',
                'filename': 'invoice-2024-001.pdf'
            },
            'eventTime': '2024-01-15T10:30:00.000Z',
            'eventName': 'ObjectCreated:Put',
            'source': 'sqs-consumer'
        }
        
        # Mock the analysis to return no chunking needed
        with patch('handler.analyze_pdf_tokens') as mock_analyze, \
             patch('handler.validate_configuration') as mock_validate:
            
            mock_validate.return_value = True
            mock_analyze.return_value = {
                'total_tokens': 45000,
                'total_pages': 30,
                'avg_tokens_per_page': 1500,
                'tokens_per_page': [1500] * 30,
                'requires_chunking': False,
                'strategy': 'hybrid'
            }
            
            result = lambda_handler(event, None)
            
            # Verify it processes correctly
            self.assertEqual(result['documentId'], 'invoice-2024-001-1705315800000')
            self.assertFalse(result['requiresChunking'])
            self.assertIn('tokenAnalysis', result)
    
    def test_unsupported_content_type(self):
        """Test handler with unsupported contentType."""
        event = {
            'documentId': 'doc-999',
            'contentType': 'url',  # Not supported
            'content': {
                'bucket': 'test-bucket',
                'key': 'raw/doc.pdf'
            }
        }
        
        result = lambda_handler(event, None)
        
        # Verify error response
        self.assertIn('error', result)
        self.assertIn('contentType', result['error']['message'])
    
    def test_non_pdf_file_extension(self):
        """Test handler logs warning for non-PDF file extension."""
        event = {
            'documentId': 'doc-888',
            'contentType': 'file',
            'content': {
                'bucket': 'test-bucket',
                'key': 'raw/document.txt',  # Not a PDF extension
                'filename': 'document.txt'
            }
        }
        
        # Mock the analysis to fail with invalid PDF
        with patch('handler.analyze_pdf_tokens') as mock_analyze, \
             patch('handler.validate_configuration') as mock_validate:
            
            mock_validate.return_value = True
            mock_analyze.side_effect = Exception("File is not a valid PDF")
            
            result = lambda_handler(event, None)
            
            # Should return error
            self.assertIn('error', result)


class TestConfigurationMerging(unittest.TestCase):
    """Test cases for configuration merging logic."""
    
    def test_default_configuration(self):
        """Test default configuration values."""
        config = _merge_configuration({})
        
        self.assertEqual(config['strategy'], 'hybrid')
        self.assertEqual(config['pageThreshold'], 100)
        self.assertEqual(config['tokenThreshold'], 150000)
        self.assertEqual(config['targetTokensPerChunk'], 80000)
        # maxPagesPerChunk is 99 (not 100) to stay under Bedrock's 100-page limit
        self.assertEqual(config['maxPagesPerChunk'], 99)
    
    def test_event_configuration_override(self):
        """Test event configuration overrides defaults."""
        event_config = {
            'strategy': 'token-based',
            'tokenThreshold': 200000,
            'maxTokensPerChunk': 120000
        }
        
        config = _merge_configuration(event_config)
        
        self.assertEqual(config['strategy'], 'token-based')
        self.assertEqual(config['tokenThreshold'], 200000)
        self.assertEqual(config['maxTokensPerChunk'], 120000)
        # Defaults still apply for unspecified values
        self.assertEqual(config['pageThreshold'], 100)
    
    @patch.dict('os.environ', {
        'CHUNKING_STRATEGY': 'fixed-pages',
        'PAGE_THRESHOLD': '150',
        'CHUNK_SIZE': '75'
    })
    def test_environment_variable_configuration(self):
        """Test environment variables override defaults."""
        config = _merge_configuration({})
        
        self.assertEqual(config['strategy'], 'fixed-pages')
        self.assertEqual(config['pageThreshold'], 150)
        self.assertEqual(config['chunkSize'], 75)
    
    @patch.dict('os.environ', {
        'CHUNKING_STRATEGY': 'fixed-pages',
        'PAGE_THRESHOLD': '150'
    })
    def test_event_overrides_environment(self):
        """Test event configuration has highest precedence."""
        event_config = {
            'strategy': 'hybrid',
            'pageThreshold': 200
        }
        
        config = _merge_configuration(event_config)
        
        # Event config should override environment
        self.assertEqual(config['strategy'], 'hybrid')
        self.assertEqual(config['pageThreshold'], 200)


class TestChunkBoundaryCalculation(unittest.TestCase):
    """Test cases for chunk boundary calculation."""
    
    def test_fixed_pages_strategy(self):
        """Test chunk boundary calculation with fixed-pages strategy."""
        token_analysis = {
            'total_pages': 150,
            'tokens_per_page': [1500] * 150
        }
        
        config = {
            'strategy': 'fixed-pages',
            'chunkSize': 50,
            'overlapPages': 5
        }
        
        chunks = _calculate_chunk_boundaries(token_analysis, config)
        
        self.assertGreater(len(chunks), 0)
        self.assertEqual(chunks[0]['start_page'], 0)
        self.assertEqual(chunks[0]['page_count'], 50)
    
    def test_token_based_strategy(self):
        """Test chunk boundary calculation with token-based strategy."""
        token_analysis = {
            'total_pages': 100,
            'tokens_per_page': [2000] * 100
        }
        
        config = {
            'strategy': 'token-based',
            'maxTokensPerChunk': 100000,
            'overlapTokens': 5000
        }
        
        chunks = _calculate_chunk_boundaries(token_analysis, config)
        
        self.assertGreater(len(chunks), 0)
        # Verify no chunk exceeds token limit
        for chunk in chunks:
            self.assertLessEqual(chunk['token_count'], 100000 + 5000)  # Allow overlap
    
    def test_hybrid_strategy(self):
        """Test chunk boundary calculation with hybrid strategy."""
        token_analysis = {
            'total_pages': 200,
            'tokens_per_page': [1500] * 200
        }
        
        config = {
            'strategy': 'hybrid',
            'targetTokensPerChunk': 80000,
            'maxPagesPerChunk': 100,
            'overlapTokens': 5000
        }
        
        chunks = _calculate_chunk_boundaries(token_analysis, config)
        
        self.assertGreater(len(chunks), 0)
        # Verify no chunk exceeds page limit
        for chunk in chunks:
            self.assertLessEqual(chunk['page_count'], 100)


class TestErrorResponses(unittest.TestCase):
    """Test cases for error response creation."""
    
    def test_create_error_response(self):
        """Test error response creation."""
        response = _create_error_response(
            'doc-123',
            'InvalidPDF',
            'PDF format is invalid'
        )
        
        self.assertEqual(response['documentId'], 'doc-123')
        self.assertFalse(response['requiresChunking'])
        self.assertEqual(response['error']['type'], 'InvalidPDF')
        self.assertEqual(response['error']['message'], 'PDF format is invalid')
    
    def test_get_no_chunking_reason_fixed_pages(self):
        """Test no-chunking reason for fixed-pages strategy."""
        token_analysis = {
            'total_pages': 50,
            'total_tokens': 75000
        }
        
        config = {
            'strategy': 'fixed-pages',
            'pageThreshold': 100
        }
        
        reason = _get_no_chunking_reason(token_analysis, config)
        
        self.assertIn('50 pages', reason)
        self.assertIn('100', reason)
        self.assertIn('fixed-pages', reason)
    
    def test_get_no_chunking_reason_hybrid(self):
        """Test no-chunking reason for hybrid strategy."""
        token_analysis = {
            'total_pages': 80,
            'total_tokens': 120000
        }
        
        config = {
            'strategy': 'hybrid',
            'pageThreshold': 100,
            'tokenThreshold': 150000
        }
        
        reason = _get_no_chunking_reason(token_analysis, config)
        
        self.assertIn('80 pages', reason)
        self.assertIn('120000 tokens', reason)
        self.assertIn('hybrid', reason)


class TestPDFValidation(unittest.TestCase):
    """Test cases for PDF file validation."""
    
    def test_valid_pdf_magic_bytes(self):
        """Test validation with valid PDF magic bytes."""
        from handler import _is_valid_pdf
        
        # Valid PDF starts with %PDF-
        valid_pdf = b'%PDF-1.4\n%\xe2\xe3\xcf\xd3\n'
        self.assertTrue(_is_valid_pdf(valid_pdf))
        
        # Another valid PDF version
        valid_pdf_17 = b'%PDF-1.7\n...'
        self.assertTrue(_is_valid_pdf(valid_pdf_17))
    
    def test_invalid_pdf_magic_bytes(self):
        """Test validation with invalid magic bytes."""
        from handler import _is_valid_pdf
        
        # HTML file
        html_file = b'<html><body>Not a PDF</body></html>'
        self.assertFalse(_is_valid_pdf(html_file))
        
        # Text file
        text_file = b'This is just a text file'
        self.assertFalse(_is_valid_pdf(text_file))
        
        # Binary file with wrong magic bytes
        wrong_magic = b'RIFF....WAVE'
        self.assertFalse(_is_valid_pdf(wrong_magic))
    
    def test_empty_or_short_file(self):
        """Test validation with empty or too short files."""
        from handler import _is_valid_pdf
        
        # Empty file
        self.assertFalse(_is_valid_pdf(b''))
        
        # Too short (less than 5 bytes)
        self.assertFalse(_is_valid_pdf(b'%PDF'))
        self.assertFalse(_is_valid_pdf(b'%'))
    
    def test_pdf_with_leading_whitespace(self):
        """Test that PDFs with leading whitespace are rejected."""
        from handler import _is_valid_pdf
        
        # PDF spec requires %PDF- at the start, no leading whitespace
        pdf_with_space = b' %PDF-1.4\n'
        self.assertFalse(_is_valid_pdf(pdf_with_space))
        
        pdf_with_newline = b'\n%PDF-1.4\n'
        self.assertFalse(_is_valid_pdf(pdf_with_newline))


class TestStrategyConfig(unittest.TestCase):
    """Test cases for strategy-specific configuration extraction."""
    
    def test_get_fixed_pages_config(self):
        """Test extraction of fixed-pages strategy config."""
        config = {
            'strategy': 'fixed-pages',
            'chunkSize': 50,
            'overlapPages': 5,
            'pageThreshold': 100
        }
        
        strategy_config = _get_strategy_config(config)
        
        self.assertIn('chunkSize', strategy_config)
        self.assertIn('overlapPages', strategy_config)
        self.assertIn('pageThreshold', strategy_config)
        self.assertEqual(strategy_config['chunkSize'], 50)
    
    def test_get_token_based_config(self):
        """Test extraction of token-based strategy config."""
        config = {
            'strategy': 'token-based',
            'maxTokensPerChunk': 100000,
            'overlapTokens': 5000,
            'tokenThreshold': 150000
        }
        
        strategy_config = _get_strategy_config(config)
        
        self.assertIn('maxTokensPerChunk', strategy_config)
        self.assertIn('overlapTokens', strategy_config)
        self.assertIn('tokenThreshold', strategy_config)
        self.assertEqual(strategy_config['maxTokensPerChunk'], 100000)
    
    def test_get_hybrid_config(self):
        """Test extraction of hybrid strategy config."""
        config = {
            'strategy': 'hybrid',
            'targetTokensPerChunk': 80000,
            'maxPagesPerChunk': 100,
            'overlapTokens': 5000,
            'pageThreshold': 100,
            'tokenThreshold': 150000
        }
        
        strategy_config = _get_strategy_config(config)
        
        self.assertIn('targetTokensPerChunk', strategy_config)
        self.assertIn('maxPagesPerChunk', strategy_config)
        self.assertIn('overlapTokens', strategy_config)
        self.assertEqual(strategy_config['targetTokensPerChunk'], 80000)


if __name__ == '__main__':
    unittest.main()
