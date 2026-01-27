"""
Tests for structured logging module.

This module tests the structured logging functionality including:
- JSON log format validation
- Required fields presence
- Correlation ID propagation
- Document context handling
- Log level configuration

Requirements: 7.5
"""

import json
import logging
import os
import sys
import unittest
from io import StringIO
from unittest.mock import patch, MagicMock

# Add the module path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from structured_logging import (
    StructuredLogFormatter,
    StandardLogFormatter,
    StructuredLogger,
    get_logger,
    log_strategy_selection,
    log_chunking_operation,
    with_correlation_id,
    is_observability_enabled
)


class TestIsObservabilityEnabled(unittest.TestCase):
    """Tests for is_observability_enabled function."""
    
    def test_observability_enabled_when_metrics_not_disabled(self):
        """Test observability is enabled when POWERTOOLS_METRICS_DISABLED is not 'true'."""
        with patch.dict(os.environ, {'POWERTOOLS_METRICS_DISABLED': 'false'}):
            self.assertTrue(is_observability_enabled())
    
    def test_observability_disabled_when_metrics_disabled(self):
        """Test observability is disabled when POWERTOOLS_METRICS_DISABLED is 'true'."""
        with patch.dict(os.environ, {'POWERTOOLS_METRICS_DISABLED': 'true'}):
            self.assertFalse(is_observability_enabled())
    
    def test_observability_enabled_by_default(self):
        """Test observability is enabled by default when env var not set."""
        with patch.dict(os.environ, {}, clear=True):
            # Remove the env var if it exists
            os.environ.pop('POWERTOOLS_METRICS_DISABLED', None)
            self.assertTrue(is_observability_enabled())


class TestStructuredLogFormatter(unittest.TestCase):
    """Tests for StructuredLogFormatter class."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.formatter = StructuredLogFormatter(service_name='test-service')
        self.logger = logging.getLogger('test_formatter')
        self.logger.setLevel(logging.DEBUG)
        self.stream = StringIO()
        self.handler = logging.StreamHandler(self.stream)
        self.handler.setFormatter(self.formatter)
        self.logger.handlers = [self.handler]
        self.logger.propagate = False
    
    def test_log_format_is_valid_json(self):
        """Test that log output is valid JSON."""
        self.logger.info("Test message")
        log_output = self.stream.getvalue().strip()
        
        # Should be valid JSON
        parsed = json.loads(log_output)
        self.assertIsInstance(parsed, dict)
    
    def test_log_contains_required_fields(self):
        """Test that log contains all required fields."""
        self.logger.info("Test message")
        log_output = self.stream.getvalue().strip()
        parsed = json.loads(log_output)
        
        # Check required fields
        self.assertIn('timestamp', parsed)
        self.assertIn('level', parsed)
        self.assertIn('message', parsed)
        self.assertIn('logger', parsed)
        self.assertIn('service', parsed)
    
    def test_log_level_is_correct(self):
        """Test that log level is correctly recorded."""
        self.logger.info("Info message")
        log_output = self.stream.getvalue().strip()
        parsed = json.loads(log_output)
        
        self.assertEqual(parsed['level'], 'INFO')
    
    def test_log_message_is_correct(self):
        """Test that log message is correctly recorded."""
        self.logger.info("Test message content")
        log_output = self.stream.getvalue().strip()
        parsed = json.loads(log_output)
        
        self.assertEqual(parsed['message'], 'Test message content')
    
    def test_log_service_name_is_correct(self):
        """Test that service name is correctly recorded."""
        self.logger.info("Test message")
        log_output = self.stream.getvalue().strip()
        parsed = json.loads(log_output)
        
        self.assertEqual(parsed['service'], 'test-service')
    
    def test_error_log_includes_location(self):
        """Test that error logs include location information."""
        self.logger.error("Error message")
        log_output = self.stream.getvalue().strip()
        parsed = json.loads(log_output)
        
        self.assertIn('location', parsed)
        self.assertIn('file', parsed['location'])
        self.assertIn('line', parsed['location'])
        self.assertIn('function', parsed['location'])
    
    def test_extra_context_is_included(self):
        """Test that extra context fields are included."""
        self.logger.info("Test message", extra={'documentId': 'doc-123', 'chunkIndex': 0})
        log_output = self.stream.getvalue().strip()
        parsed = json.loads(log_output)
        
        self.assertIn('context', parsed)
        self.assertEqual(parsed['context']['documentId'], 'doc-123')
        self.assertEqual(parsed['context']['chunkIndex'], 0)
    
    def test_timestamp_is_iso_format(self):
        """Test that timestamp is in ISO 8601 format."""
        self.logger.info("Test message")
        log_output = self.stream.getvalue().strip()
        parsed = json.loads(log_output)
        
        # Should contain 'T' separator and timezone info
        timestamp = parsed['timestamp']
        self.assertIn('T', timestamp)
        # Should end with timezone indicator (Z or +00:00)
        self.assertTrue(timestamp.endswith('Z') or '+' in timestamp or timestamp.endswith('+00:00'))


class TestStructuredLogger(unittest.TestCase):
    """Tests for StructuredLogger class."""
    
    def setUp(self):
        """Set up test fixtures."""
        # Clear any existing context
        StructuredLogger._correlation_id = None
        StructuredLogger._document_id = None
        StructuredLogger._chunk_index = None
    
    def tearDown(self):
        """Clean up after tests."""
        StructuredLogger._correlation_id = None
        StructuredLogger._document_id = None
        StructuredLogger._chunk_index = None
    
    def test_set_correlation_id_generates_uuid(self):
        """Test that set_correlation_id generates a UUID when none provided."""
        logger = get_logger('test')
        correlation_id = logger.set_correlation_id()
        
        self.assertIsNotNone(correlation_id)
        # UUID format: 8-4-4-4-12 characters
        self.assertEqual(len(correlation_id), 36)
        self.assertEqual(correlation_id.count('-'), 4)
    
    def test_set_correlation_id_uses_provided_value(self):
        """Test that set_correlation_id uses provided value."""
        logger = get_logger('test')
        correlation_id = logger.set_correlation_id('custom-correlation-id')
        
        self.assertEqual(correlation_id, 'custom-correlation-id')
    
    def test_get_correlation_id_returns_set_value(self):
        """Test that get_correlation_id returns the set value."""
        logger = get_logger('test')
        logger.set_correlation_id('test-id')
        
        self.assertEqual(logger.get_correlation_id(), 'test-id')
    
    def test_set_document_context(self):
        """Test that document context is set correctly."""
        logger = get_logger('test')
        logger.set_document_context(document_id='doc-123', chunk_index=5)
        
        self.assertEqual(StructuredLogger._document_id, 'doc-123')
        self.assertEqual(StructuredLogger._chunk_index, 5)
    
    def test_clear_context(self):
        """Test that clear_context clears all context."""
        logger = get_logger('test')
        logger.set_correlation_id('test-id')
        logger.set_document_context(document_id='doc-123', chunk_index=5)
        
        logger.clear_context()
        
        self.assertIsNone(StructuredLogger._correlation_id)
        self.assertIsNone(StructuredLogger._document_id)
        self.assertIsNone(StructuredLogger._chunk_index)
    
    def test_build_extra_includes_correlation_id(self):
        """Test that _build_extra includes correlation ID."""
        logger = get_logger('test')
        logger.set_correlation_id('corr-123')
        
        extra = logger._build_extra()
        
        self.assertEqual(extra['correlationId'], 'corr-123')
    
    def test_build_extra_includes_document_id(self):
        """Test that _build_extra includes document ID."""
        logger = get_logger('test')
        logger.set_document_context(document_id='doc-456')
        
        extra = logger._build_extra()
        
        self.assertEqual(extra['documentId'], 'doc-456')
    
    def test_build_extra_includes_chunk_index(self):
        """Test that _build_extra includes chunk index."""
        logger = get_logger('test')
        logger.set_document_context(chunk_index=3)
        
        extra = logger._build_extra()
        
        self.assertEqual(extra['chunkIndex'], 3)
    
    def test_build_extra_merges_provided_extra(self):
        """Test that _build_extra merges provided extra fields."""
        logger = get_logger('test')
        logger.set_correlation_id('corr-123')
        
        extra = logger._build_extra({'customField': 'value'})
        
        self.assertEqual(extra['correlationId'], 'corr-123')
        self.assertEqual(extra['customField'], 'value')


class TestLogStrategySelection(unittest.TestCase):
    """Tests for log_strategy_selection function."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.logger = get_logger('test_strategy')
        # Clear context
        StructuredLogger._correlation_id = None
        StructuredLogger._document_id = None
        StructuredLogger._chunk_index = None
    
    def test_log_strategy_selection_logs_info(self):
        """Test that log_strategy_selection logs at INFO level."""
        with patch.object(self.logger, 'info') as mock_info:
            log_strategy_selection(
                logger=self.logger,
                strategy='hybrid',
                requires_chunking=True,
                reason='Document exceeds thresholds',
                document_pages=150,
                document_tokens=200000,
                page_threshold=100,
                token_threshold=150000,
                page_threshold_exceeded=True,
                token_threshold_exceeded=True
            )
            
            mock_info.assert_called_once()
            call_args = mock_info.call_args
            self.assertIn('CHUNKING_REQUIRED', call_args[0][0])
    
    def test_log_strategy_selection_includes_all_fields(self):
        """Test that log_strategy_selection includes all required fields."""
        with patch.object(self.logger, 'info') as mock_info:
            log_strategy_selection(
                logger=self.logger,
                strategy='token-based',
                requires_chunking=False,
                reason='Below threshold',
                document_pages=50,
                document_tokens=100000,
                page_threshold=100,
                token_threshold=150000,
                page_threshold_exceeded=False,
                token_threshold_exceeded=False
            )
            
            call_args = mock_info.call_args
            extra = call_args[1]['extra']
            
            self.assertEqual(extra['strategy'], 'token-based')
            self.assertEqual(extra['requiresChunking'], False)
            self.assertIn('documentCharacteristics', extra)
            self.assertIn('thresholds', extra)


class TestLogChunkingOperation(unittest.TestCase):
    """Tests for log_chunking_operation function."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.logger = get_logger('test_operation')
    
    def test_log_chunking_operation_success(self):
        """Test logging successful chunking operation."""
        with patch.object(self.logger, 'info') as mock_info:
            log_chunking_operation(
                logger=self.logger,
                operation='split',
                document_id='doc-123',
                chunk_count=5,
                success=True,
                duration_ms=1500.0
            )
            
            mock_info.assert_called_once()
            call_args = mock_info.call_args
            self.assertIn('split', call_args[0][0])
    
    def test_log_chunking_operation_failure(self):
        """Test logging failed chunking operation."""
        with patch.object(self.logger, 'error') as mock_error:
            log_chunking_operation(
                logger=self.logger,
                operation='upload',
                document_id='doc-456',
                success=False,
                error_message='S3 access denied'
            )
            
            mock_error.assert_called_once()
            call_args = mock_error.call_args
            extra = call_args[1]['extra']
            
            self.assertEqual(extra['success'], False)
            self.assertEqual(extra['errorMessage'], 'S3 access denied')


class TestWithCorrelationIdDecorator(unittest.TestCase):
    """Tests for with_correlation_id decorator."""
    
    def setUp(self):
        """Set up test fixtures."""
        # Clear context
        StructuredLogger._correlation_id = None
        StructuredLogger._document_id = None
        StructuredLogger._chunk_index = None
    
    def tearDown(self):
        """Clean up after tests."""
        StructuredLogger._correlation_id = None
        StructuredLogger._document_id = None
        StructuredLogger._chunk_index = None
    
    def test_decorator_extracts_correlation_id_from_event(self):
        """Test that decorator extracts correlation ID from event."""
        @with_correlation_id
        def handler(event, context):
            logger = get_logger()
            return logger.get_correlation_id()
        
        result = handler({'correlationId': 'event-corr-id'}, None)
        
        self.assertEqual(result, 'event-corr-id')
    
    def test_decorator_extracts_correlation_id_from_headers(self):
        """Test that decorator extracts correlation ID from headers."""
        @with_correlation_id
        def handler(event, context):
            logger = get_logger()
            return logger.get_correlation_id()
        
        result = handler({'headers': {'x-correlation-id': 'header-corr-id'}}, None)
        
        self.assertEqual(result, 'header-corr-id')
    
    def test_decorator_generates_correlation_id_if_not_present(self):
        """Test that decorator generates correlation ID if not in event."""
        @with_correlation_id
        def handler(event, context):
            logger = get_logger()
            return logger.get_correlation_id()
        
        result = handler({}, None)
        
        self.assertIsNotNone(result)
        # UUID format
        self.assertEqual(len(result), 36)
    
    def test_decorator_sets_document_context(self):
        """Test that decorator sets document context from event."""
        @with_correlation_id
        def handler(event, context):
            return StructuredLogger._document_id
        
        result = handler({'documentId': 'doc-789'}, None)
        
        self.assertEqual(result, 'doc-789')
    
    def test_decorator_clears_context_after_execution(self):
        """Test that decorator clears context after handler execution."""
        @with_correlation_id
        def handler(event, context):
            return 'done'
        
        handler({'documentId': 'doc-123', 'correlationId': 'corr-123'}, None)
        
        # Context should be cleared
        self.assertIsNone(StructuredLogger._correlation_id)
        self.assertIsNone(StructuredLogger._document_id)


class TestLogLevelConfiguration(unittest.TestCase):
    """Tests for log level configuration."""
    
    def test_default_log_level_is_info(self):
        """Test that default log level is INFO."""
        with patch.dict(os.environ, {}, clear=True):
            os.environ.pop('LOG_LEVEL', None)
            logger = StructuredLogger('test_level')
            
            self.assertEqual(logger.logger.level, logging.INFO)
    
    def test_log_level_from_environment(self):
        """Test that log level is read from environment."""
        with patch.dict(os.environ, {'LOG_LEVEL': 'ERROR'}):
            logger = StructuredLogger('test_level_env')
            
            self.assertEqual(logger.logger.level, logging.ERROR)
    
    def test_invalid_log_level_defaults_to_info(self):
        """Test that invalid log level defaults to INFO."""
        with patch.dict(os.environ, {'LOG_LEVEL': 'INVALID'}):
            logger = StructuredLogger('test_level_invalid')
            
            self.assertEqual(logger.logger.level, logging.INFO)


if __name__ == '__main__':
    unittest.main()
