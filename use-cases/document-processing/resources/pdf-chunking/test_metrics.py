"""
Unit tests for CloudWatch metrics module.

Tests cover:
- ChunkingOperations metric emission
- ChunkCount metric emission
- TokensPerChunk metric emission
- ChunkProcessingTime metric emission
- ChunkFailureRate metric emission
- AggregationTime metric emission
- StrategyUsage metric emission
- Convenience function emit_chunking_metrics
- Timed operation decorator
- Metrics gating via ENABLE_METRICS environment variable

Requirements: 7.4
"""

import unittest
from unittest.mock import Mock, patch, MagicMock
import os
import time

# Set ENABLE_METRICS before importing metrics module
os.environ['ENABLE_METRICS'] = 'true'

from metrics import (
    emit_chunking_operation,
    emit_chunk_count,
    emit_tokens_per_chunk,
    emit_chunk_processing_time,
    emit_chunk_failure_rate,
    emit_aggregation_time,
    emit_strategy_usage,
    emit_chunking_metrics,
    timed_operation,
    get_metrics,
    _is_metrics_enabled
)


class TestEmitChunkingOperation(unittest.TestCase):
    """Test cases for emit_chunking_operation function."""
    
    @patch('metrics.metrics')
    def test_emit_chunking_operation_with_chunking(self, mock_metrics):
        """Test emitting chunking operation metric when chunking is required."""
        emit_chunking_operation(
            strategy='hybrid',
            requires_chunking=True,
            document_id='doc-123'
        )
        
        # Verify dimensions were added
        mock_metrics.add_dimension.assert_any_call(name="Strategy", value="hybrid")
        mock_metrics.add_dimension.assert_any_call(name="RequiresChunking", value="true")
        
        # Verify metric was added
        mock_metrics.add_metric.assert_called_once()
        call_args = mock_metrics.add_metric.call_args
        self.assertEqual(call_args[1]['name'], 'ChunkingOperations')
        self.assertEqual(call_args[1]['value'], 1)
    
    @patch('metrics.metrics')
    def test_emit_chunking_operation_without_chunking(self, mock_metrics):
        """Test emitting chunking operation metric when chunking is not required."""
        emit_chunking_operation(
            strategy='fixed-pages',
            requires_chunking=False,
            document_id='doc-456'
        )
        
        mock_metrics.add_dimension.assert_any_call(name="RequiresChunking", value="false")
    
    @patch('metrics.metrics')
    @patch('metrics.logger')
    def test_emit_chunking_operation_handles_error(self, mock_logger, mock_metrics):
        """Test that errors are logged but not raised."""
        mock_metrics.add_metric.side_effect = Exception("Test error")
        
        # Should not raise
        emit_chunking_operation(
            strategy='hybrid',
            requires_chunking=True,
            document_id='doc-123'
        )
        
        mock_logger.warning.assert_called_once()


class TestEmitChunkCount(unittest.TestCase):
    """Test cases for emit_chunk_count function."""
    
    @patch('metrics.metrics')
    def test_emit_chunk_count(self, mock_metrics):
        """Test emitting chunk count metric."""
        emit_chunk_count(
            chunk_count=5,
            strategy='token-based',
            document_id='doc-123'
        )
        
        mock_metrics.add_dimension.assert_called_with(name="Strategy", value="token-based")
        mock_metrics.add_metric.assert_called_once()
        call_args = mock_metrics.add_metric.call_args
        self.assertEqual(call_args[1]['name'], 'ChunkCount')
        self.assertEqual(call_args[1]['value'], 5)
    
    @patch('metrics.metrics')
    @patch('metrics.logger')
    def test_emit_chunk_count_handles_error(self, mock_logger, mock_metrics):
        """Test that errors are logged but not raised."""
        mock_metrics.add_metric.side_effect = Exception("Test error")
        
        emit_chunk_count(chunk_count=5, strategy='hybrid', document_id='doc-123')
        
        mock_logger.warning.assert_called_once()


class TestEmitTokensPerChunk(unittest.TestCase):
    """Test cases for emit_tokens_per_chunk function."""
    
    @patch('metrics.metrics')
    def test_emit_tokens_per_chunk(self, mock_metrics):
        """Test emitting tokens per chunk metrics."""
        tokens = [1000, 1500, 2000, 1200, 1800]
        
        emit_tokens_per_chunk(
            tokens_per_chunk=tokens,
            strategy='hybrid',
            document_id='doc-123'
        )
        
        # Should emit avg, p99, and max metrics
        self.assertEqual(mock_metrics.add_metric.call_count, 3)
        
        # Verify metric names
        metric_names = [call[1]['name'] for call in mock_metrics.add_metric.call_args_list]
        self.assertIn('TokensPerChunkAvg', metric_names)
        self.assertIn('TokensPerChunkP99', metric_names)
        self.assertIn('TokensPerChunkMax', metric_names)
    
    @patch('metrics.metrics')
    def test_emit_tokens_per_chunk_empty_list(self, mock_metrics):
        """Test that empty list does not emit metrics."""
        emit_tokens_per_chunk(
            tokens_per_chunk=[],
            strategy='hybrid',
            document_id='doc-123'
        )
        
        mock_metrics.add_metric.assert_not_called()
    
    @patch('metrics.metrics')
    def test_emit_tokens_per_chunk_single_value(self, mock_metrics):
        """Test with single token value."""
        emit_tokens_per_chunk(
            tokens_per_chunk=[1500],
            strategy='hybrid',
            document_id='doc-123'
        )
        
        # Should still emit all three metrics
        self.assertEqual(mock_metrics.add_metric.call_count, 3)


class TestEmitChunkProcessingTime(unittest.TestCase):
    """Test cases for emit_chunk_processing_time function."""
    
    @patch('metrics.metrics')
    def test_emit_chunk_processing_time(self, mock_metrics):
        """Test emitting chunk processing time metric."""
        emit_chunk_processing_time(
            processing_time_ms=1500.5,
            processing_mode='parallel',
            document_id='doc-123'
        )
        
        mock_metrics.add_dimension.assert_called_with(name="ProcessingMode", value="parallel")
        mock_metrics.add_metric.assert_called_once()
        call_args = mock_metrics.add_metric.call_args
        self.assertEqual(call_args[1]['name'], 'ChunkProcessingTime')
        self.assertEqual(call_args[1]['value'], 1500.5)
    
    @patch('metrics.metrics')
    def test_emit_chunk_processing_time_sequential(self, mock_metrics):
        """Test emitting processing time with sequential mode."""
        emit_chunk_processing_time(
            processing_time_ms=2000.0,
            processing_mode='sequential',
            document_id='doc-123'
        )
        
        mock_metrics.add_dimension.assert_called_with(name="ProcessingMode", value="sequential")


class TestEmitChunkFailureRate(unittest.TestCase):
    """Test cases for emit_chunk_failure_rate function."""
    
    @patch('metrics.metrics')
    def test_emit_chunk_failure_rate(self, mock_metrics):
        """Test emitting chunk failure rate metric."""
        emit_chunk_failure_rate(
            total_chunks=10,
            failed_chunks=2,
            document_id='doc-123'
        )
        
        # Should emit failure rate, failed chunks, and total chunks
        self.assertEqual(mock_metrics.add_metric.call_count, 3)
        
        # Verify failure rate calculation (20%)
        call_args_list = mock_metrics.add_metric.call_args_list
        failure_rate_call = [c for c in call_args_list if c[1]['name'] == 'ChunkFailureRate'][0]
        self.assertEqual(failure_rate_call[1]['value'], 20.0)
    
    @patch('metrics.metrics')
    def test_emit_chunk_failure_rate_zero_total(self, mock_metrics):
        """Test that zero total chunks does not emit metrics."""
        emit_chunk_failure_rate(
            total_chunks=0,
            failed_chunks=0,
            document_id='doc-123'
        )
        
        mock_metrics.add_metric.assert_not_called()
    
    @patch('metrics.metrics')
    def test_emit_chunk_failure_rate_no_failures(self, mock_metrics):
        """Test with no failed chunks."""
        emit_chunk_failure_rate(
            total_chunks=10,
            failed_chunks=0,
            document_id='doc-123'
        )
        
        call_args_list = mock_metrics.add_metric.call_args_list
        failure_rate_call = [c for c in call_args_list if c[1]['name'] == 'ChunkFailureRate'][0]
        self.assertEqual(failure_rate_call[1]['value'], 0.0)


class TestEmitAggregationTime(unittest.TestCase):
    """Test cases for emit_aggregation_time function."""
    
    @patch('metrics.metrics')
    def test_emit_aggregation_time(self, mock_metrics):
        """Test emitting aggregation time metric."""
        emit_aggregation_time(
            aggregation_time_ms=500.25,
            document_id='doc-123'
        )
        
        mock_metrics.add_metric.assert_called_once()
        call_args = mock_metrics.add_metric.call_args
        self.assertEqual(call_args[1]['name'], 'AggregationTime')
        self.assertEqual(call_args[1]['value'], 500.25)
    
    @patch('metrics.metrics')
    @patch('metrics.logger')
    def test_emit_aggregation_time_handles_error(self, mock_logger, mock_metrics):
        """Test that errors are logged but not raised."""
        mock_metrics.add_metric.side_effect = Exception("Test error")
        
        emit_aggregation_time(aggregation_time_ms=500.0, document_id='doc-123')
        
        mock_logger.warning.assert_called_once()


class TestEmitStrategyUsage(unittest.TestCase):
    """Test cases for emit_strategy_usage function."""
    
    @patch('metrics.metrics')
    def test_emit_strategy_usage_hybrid(self, mock_metrics):
        """Test emitting strategy usage metric for hybrid strategy."""
        emit_strategy_usage(
            strategy='hybrid',
            document_id='doc-123'
        )
        
        mock_metrics.add_dimension.assert_called_with(name="Strategy", value="hybrid")
        mock_metrics.add_metric.assert_called_once()
        call_args = mock_metrics.add_metric.call_args
        self.assertEqual(call_args[1]['name'], 'StrategyUsage')
        self.assertEqual(call_args[1]['value'], 1)
    
    @patch('metrics.metrics')
    def test_emit_strategy_usage_fixed_pages(self, mock_metrics):
        """Test emitting strategy usage metric for fixed-pages strategy."""
        emit_strategy_usage(
            strategy='fixed-pages',
            document_id='doc-123'
        )
        
        mock_metrics.add_dimension.assert_called_with(name="Strategy", value="fixed-pages")
    
    @patch('metrics.metrics')
    def test_emit_strategy_usage_token_based(self, mock_metrics):
        """Test emitting strategy usage metric for token-based strategy."""
        emit_strategy_usage(
            strategy='token-based',
            document_id='doc-123'
        )
        
        mock_metrics.add_dimension.assert_called_with(name="Strategy", value="token-based")


class TestEmitChunkingMetrics(unittest.TestCase):
    """Test cases for emit_chunking_metrics convenience function."""
    
    @patch('metrics.emit_strategy_usage')
    @patch('metrics.emit_chunking_operation')
    def test_emit_chunking_metrics_no_chunking(self, mock_operation, mock_strategy):
        """Test convenience function when chunking is not required."""
        emit_chunking_metrics(
            document_id='doc-123',
            strategy='hybrid',
            requires_chunking=False
        )
        
        mock_operation.assert_called_once_with('hybrid', False, 'doc-123')
        mock_strategy.assert_called_once_with('hybrid', 'doc-123')
    
    @patch('metrics.emit_chunk_processing_time')
    @patch('metrics.emit_tokens_per_chunk')
    @patch('metrics.emit_chunk_count')
    @patch('metrics.emit_strategy_usage')
    @patch('metrics.emit_chunking_operation')
    def test_emit_chunking_metrics_with_chunking(
        self, mock_operation, mock_strategy, mock_count, mock_tokens, mock_time
    ):
        """Test convenience function when chunking is required."""
        emit_chunking_metrics(
            document_id='doc-123',
            strategy='hybrid',
            requires_chunking=True,
            chunk_count=5,
            tokens_per_chunk=[1000, 1500, 2000],
            processing_time_ms=1500.0,
            processing_mode='parallel'
        )
        
        mock_operation.assert_called_once()
        mock_strategy.assert_called_once()
        mock_count.assert_called_once_with(5, 'hybrid', 'doc-123')
        mock_tokens.assert_called_once_with([1000, 1500, 2000], 'hybrid', 'doc-123')
        mock_time.assert_called_once_with(1500.0, 'parallel', 'doc-123')
    
    @patch('metrics.emit_chunk_count')
    @patch('metrics.emit_strategy_usage')
    @patch('metrics.emit_chunking_operation')
    def test_emit_chunking_metrics_zero_chunks(
        self, mock_operation, mock_strategy, mock_count
    ):
        """Test that zero chunk count does not emit chunk metrics."""
        emit_chunking_metrics(
            document_id='doc-123',
            strategy='hybrid',
            requires_chunking=True,
            chunk_count=0
        )
        
        mock_operation.assert_called_once()
        mock_strategy.assert_called_once()
        mock_count.assert_not_called()


class TestTimedOperation(unittest.TestCase):
    """Test cases for timed_operation decorator."""
    
    @patch('metrics.metrics')
    def test_timed_operation_emits_metric(self, mock_metrics):
        """Test that timed operation emits timing metric."""
        @timed_operation(metric_name='TestOperationTime')
        def slow_function():
            time.sleep(0.01)  # 10ms
            return "result"
        
        result = slow_function()
        
        self.assertEqual(result, "result")
        mock_metrics.add_metric.assert_called_once()
        call_args = mock_metrics.add_metric.call_args
        self.assertEqual(call_args[1]['name'], 'TestOperationTime')
        # Verify timing is reasonable (at least 10ms)
        self.assertGreaterEqual(call_args[1]['value'], 10)
    
    @patch('metrics.metrics')
    def test_timed_operation_with_exception(self, mock_metrics):
        """Test that timing is emitted even when function raises."""
        @timed_operation(metric_name='TestOperationTime')
        def failing_function():
            raise ValueError("Test error")
        
        with self.assertRaises(ValueError):
            failing_function()
        
        # Metric should still be emitted
        mock_metrics.add_metric.assert_called_once()
    
    @patch('metrics.metrics')
    @patch('metrics.logger')
    def test_timed_operation_handles_metric_error(self, mock_logger, mock_metrics):
        """Test that metric emission errors are logged but not raised."""
        mock_metrics.add_metric.side_effect = Exception("Metric error")
        
        @timed_operation(metric_name='TestOperationTime')
        def simple_function():
            return "result"
        
        result = simple_function()
        
        self.assertEqual(result, "result")
        mock_logger.warning.assert_called_once()


class TestGetMetrics(unittest.TestCase):
    """Test cases for get_metrics function."""
    
    def test_get_metrics_returns_instance(self):
        """Test that get_metrics returns a Metrics instance."""
        metrics_instance = get_metrics()
        
        self.assertIsNotNone(metrics_instance)


class TestMetricsGating(unittest.TestCase):
    """Test cases for metrics gating via ENABLE_METRICS environment variable."""
    
    def test_is_metrics_enabled_returns_true_when_enabled(self):
        """Test that _is_metrics_enabled returns True when ENABLE_METRICS=true."""
        # ENABLE_METRICS is set to 'true' at module import time
        self.assertTrue(_is_metrics_enabled())
    
    @patch('metrics.METRICS_ENABLED', False)
    @patch('metrics.metrics')
    def test_emit_chunking_operation_skipped_when_disabled(self, mock_metrics):
        """Test that metrics are not emitted when ENABLE_METRICS=false."""
        emit_chunking_operation(
            strategy='hybrid',
            requires_chunking=True,
            document_id='doc-123'
        )
        
        mock_metrics.add_metric.assert_not_called()
        mock_metrics.add_dimension.assert_not_called()
    
    @patch('metrics.METRICS_ENABLED', False)
    @patch('metrics.metrics')
    def test_emit_chunk_count_skipped_when_disabled(self, mock_metrics):
        """Test that chunk count metrics are not emitted when disabled."""
        emit_chunk_count(
            chunk_count=5,
            strategy='hybrid',
            document_id='doc-123'
        )
        
        mock_metrics.add_metric.assert_not_called()
    
    @patch('metrics.METRICS_ENABLED', False)
    @patch('metrics.metrics')
    def test_emit_tokens_per_chunk_skipped_when_disabled(self, mock_metrics):
        """Test that tokens per chunk metrics are not emitted when disabled."""
        emit_tokens_per_chunk(
            tokens_per_chunk=[1000, 1500, 2000],
            strategy='hybrid',
            document_id='doc-123'
        )
        
        mock_metrics.add_metric.assert_not_called()
    
    @patch('metrics.METRICS_ENABLED', False)
    @patch('metrics.metrics')
    def test_emit_chunk_processing_time_skipped_when_disabled(self, mock_metrics):
        """Test that processing time metrics are not emitted when disabled."""
        emit_chunk_processing_time(
            processing_time_ms=1500.0,
            processing_mode='parallel',
            document_id='doc-123'
        )
        
        mock_metrics.add_metric.assert_not_called()
    
    @patch('metrics.METRICS_ENABLED', False)
    @patch('metrics.metrics')
    def test_emit_chunk_failure_rate_skipped_when_disabled(self, mock_metrics):
        """Test that failure rate metrics are not emitted when disabled."""
        emit_chunk_failure_rate(
            total_chunks=10,
            failed_chunks=2,
            document_id='doc-123'
        )
        
        mock_metrics.add_metric.assert_not_called()
    
    @patch('metrics.METRICS_ENABLED', False)
    @patch('metrics.metrics')
    def test_emit_aggregation_time_skipped_when_disabled(self, mock_metrics):
        """Test that aggregation time metrics are not emitted when disabled."""
        emit_aggregation_time(
            aggregation_time_ms=500.0,
            document_id='doc-123'
        )
        
        mock_metrics.add_metric.assert_not_called()
    
    @patch('metrics.METRICS_ENABLED', False)
    @patch('metrics.metrics')
    def test_emit_strategy_usage_skipped_when_disabled(self, mock_metrics):
        """Test that strategy usage metrics are not emitted when disabled."""
        emit_strategy_usage(
            strategy='hybrid',
            document_id='doc-123'
        )
        
        mock_metrics.add_metric.assert_not_called()
    
    @patch('metrics._is_metrics_enabled', return_value=False)
    @patch('metrics.metrics')
    def test_timed_operation_skipped_when_disabled(self, mock_metrics, mock_enabled):
        """Test that timed operation does not emit metrics when disabled."""
        @timed_operation(metric_name='TestOperationTime')
        def simple_function():
            return "result"
        
        result = simple_function()
        
        self.assertEqual(result, "result")
        mock_metrics.add_metric.assert_not_called()


if __name__ == '__main__':
    unittest.main()
