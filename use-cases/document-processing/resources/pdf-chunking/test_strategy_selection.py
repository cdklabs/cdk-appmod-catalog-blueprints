"""
Unit tests for strategy selection module.

Tests cover all three chunking strategies (fixed-pages, token-based, hybrid)
and threshold boundary conditions.
"""

import unittest
import logging
from strategy_selection import (
    check_fixed_pages_threshold,
    check_token_based_threshold,
    check_hybrid_threshold,
    select_strategy_and_check_thresholds,
    StrategySelectionResult
)


class TestCheckFixedPagesThreshold(unittest.TestCase):
    """Test cases for the check_fixed_pages_threshold function."""
    
    def test_below_threshold(self):
        """Test when page count is below threshold."""
        requires_chunking, page_exceeded = check_fixed_pages_threshold(50, 100)
        self.assertFalse(requires_chunking)
        self.assertFalse(page_exceeded)
    
    def test_at_threshold(self):
        """Test when page count equals threshold (boundary condition)."""
        requires_chunking, page_exceeded = check_fixed_pages_threshold(100, 100)
        self.assertFalse(requires_chunking)
        self.assertFalse(page_exceeded)
    
    def test_above_threshold(self):
        """Test when page count exceeds threshold."""
        requires_chunking, page_exceeded = check_fixed_pages_threshold(101, 100)
        self.assertTrue(requires_chunking)
        self.assertTrue(page_exceeded)
    
    def test_significantly_above_threshold(self):
        """Test when page count significantly exceeds threshold."""
        requires_chunking, page_exceeded = check_fixed_pages_threshold(500, 100)
        self.assertTrue(requires_chunking)
        self.assertTrue(page_exceeded)
    
    def test_one_page_document(self):
        """Test with single page document."""
        requires_chunking, page_exceeded = check_fixed_pages_threshold(1, 100)
        self.assertFalse(requires_chunking)
        self.assertFalse(page_exceeded)
    
    def test_custom_threshold(self):
        """Test with custom threshold value."""
        requires_chunking, page_exceeded = check_fixed_pages_threshold(60, 50)
        self.assertTrue(requires_chunking)
        self.assertTrue(page_exceeded)


class TestCheckTokenBasedThreshold(unittest.TestCase):
    """Test cases for the check_token_based_threshold function."""
    
    def test_below_threshold(self):
        """Test when token count is below threshold."""
        requires_chunking, token_exceeded = check_token_based_threshold(100000, 150000)
        self.assertFalse(requires_chunking)
        self.assertFalse(token_exceeded)
    
    def test_at_threshold(self):
        """Test when token count equals threshold (boundary condition)."""
        requires_chunking, token_exceeded = check_token_based_threshold(150000, 150000)
        self.assertFalse(requires_chunking)
        self.assertFalse(token_exceeded)
    
    def test_above_threshold(self):
        """Test when token count exceeds threshold."""
        requires_chunking, token_exceeded = check_token_based_threshold(150001, 150000)
        self.assertTrue(requires_chunking)
        self.assertTrue(token_exceeded)
    
    def test_significantly_above_threshold(self):
        """Test when token count significantly exceeds threshold."""
        requires_chunking, token_exceeded = check_token_based_threshold(500000, 150000)
        self.assertTrue(requires_chunking)
        self.assertTrue(token_exceeded)
    
    def test_small_document(self):
        """Test with small document (few tokens)."""
        requires_chunking, token_exceeded = check_token_based_threshold(1000, 150000)
        self.assertFalse(requires_chunking)
        self.assertFalse(token_exceeded)
    
    def test_custom_threshold(self):
        """Test with custom threshold value."""
        requires_chunking, token_exceeded = check_token_based_threshold(80000, 50000)
        self.assertTrue(requires_chunking)
        self.assertTrue(token_exceeded)


class TestCheckHybridThreshold(unittest.TestCase):
    """Test cases for the check_hybrid_threshold function."""
    
    def test_both_below_threshold(self):
        """Test when both page and token counts are below thresholds."""
        requires_chunking, page_exceeded, token_exceeded = check_hybrid_threshold(
            50, 100000, 100, 150000
        )
        self.assertFalse(requires_chunking)
        self.assertFalse(page_exceeded)
        self.assertFalse(token_exceeded)
    
    def test_page_exceeds_only(self):
        """Test when only page count exceeds threshold."""
        requires_chunking, page_exceeded, token_exceeded = check_hybrid_threshold(
            150, 100000, 100, 150000
        )
        self.assertTrue(requires_chunking)
        self.assertTrue(page_exceeded)
        self.assertFalse(token_exceeded)
    
    def test_token_exceeds_only(self):
        """Test when only token count exceeds threshold."""
        requires_chunking, page_exceeded, token_exceeded = check_hybrid_threshold(
            50, 200000, 100, 150000
        )
        self.assertTrue(requires_chunking)
        self.assertFalse(page_exceeded)
        self.assertTrue(token_exceeded)
    
    def test_both_exceed_threshold(self):
        """Test when both page and token counts exceed thresholds."""
        requires_chunking, page_exceeded, token_exceeded = check_hybrid_threshold(
            150, 200000, 100, 150000
        )
        self.assertTrue(requires_chunking)
        self.assertTrue(page_exceeded)
        self.assertTrue(token_exceeded)
    
    def test_at_page_threshold(self):
        """Test when page count equals threshold (boundary condition)."""
        requires_chunking, page_exceeded, token_exceeded = check_hybrid_threshold(
            100, 100000, 100, 150000
        )
        self.assertFalse(requires_chunking)
        self.assertFalse(page_exceeded)
        self.assertFalse(token_exceeded)
    
    def test_at_token_threshold(self):
        """Test when token count equals threshold (boundary condition)."""
        requires_chunking, page_exceeded, token_exceeded = check_hybrid_threshold(
            50, 150000, 100, 150000
        )
        self.assertFalse(requires_chunking)
        self.assertFalse(page_exceeded)
        self.assertFalse(token_exceeded)
    
    def test_one_above_page_threshold(self):
        """Test when page count is one above threshold."""
        requires_chunking, page_exceeded, token_exceeded = check_hybrid_threshold(
            101, 100000, 100, 150000
        )
        self.assertTrue(requires_chunking)
        self.assertTrue(page_exceeded)
        self.assertFalse(token_exceeded)
    
    def test_one_above_token_threshold(self):
        """Test when token count is one above threshold."""
        requires_chunking, page_exceeded, token_exceeded = check_hybrid_threshold(
            50, 150001, 100, 150000
        )
        self.assertTrue(requires_chunking)
        self.assertFalse(page_exceeded)
        self.assertTrue(token_exceeded)


class TestSelectStrategyAndCheckThresholds(unittest.TestCase):
    """Test cases for the select_strategy_and_check_thresholds function."""
    
    def test_fixed_pages_strategy_no_chunking(self):
        """Test fixed-pages strategy when no chunking is needed."""
        result = select_strategy_and_check_thresholds(
            total_pages=50,
            total_tokens=200000,  # High tokens, but fixed-pages ignores this
            config={'strategy': 'fixed-pages', 'pageThreshold': 100}
        )
        self.assertFalse(result.requires_chunking)
        self.assertEqual(result.strategy, 'fixed-pages')
        self.assertFalse(result.page_threshold_exceeded)
        self.assertFalse(result.token_threshold_exceeded)  # Not checked
        self.assertIn('50 pages', result.reason)
        self.assertIn('below threshold', result.reason)
    
    def test_fixed_pages_strategy_chunking_required(self):
        """Test fixed-pages strategy when chunking is required."""
        result = select_strategy_and_check_thresholds(
            total_pages=150,
            total_tokens=50000,  # Low tokens, but fixed-pages ignores this
            config={'strategy': 'fixed-pages', 'pageThreshold': 100}
        )
        self.assertTrue(result.requires_chunking)
        self.assertEqual(result.strategy, 'fixed-pages')
        self.assertTrue(result.page_threshold_exceeded)
        self.assertIn('150 pages', result.reason)
        self.assertIn('exceeding threshold', result.reason)
    
    def test_token_based_strategy_no_chunking(self):
        """Test token-based strategy when no chunking is needed."""
        result = select_strategy_and_check_thresholds(
            total_pages=200,  # High pages, but token-based ignores this
            total_tokens=100000,
            config={'strategy': 'token-based', 'tokenThreshold': 150000}
        )
        self.assertFalse(result.requires_chunking)
        self.assertEqual(result.strategy, 'token-based')
        self.assertFalse(result.page_threshold_exceeded)  # Not checked
        self.assertFalse(result.token_threshold_exceeded)
        self.assertIn('100,000 tokens', result.reason)
        self.assertIn('below threshold', result.reason)
    
    def test_token_based_strategy_chunking_required(self):
        """Test token-based strategy when chunking is required."""
        result = select_strategy_and_check_thresholds(
            total_pages=50,  # Low pages, but token-based ignores this
            total_tokens=200000,
            config={'strategy': 'token-based', 'tokenThreshold': 150000}
        )
        self.assertTrue(result.requires_chunking)
        self.assertEqual(result.strategy, 'token-based')
        self.assertTrue(result.token_threshold_exceeded)
        self.assertIn('200,000 tokens', result.reason)
        self.assertIn('exceeding threshold', result.reason)
    
    def test_hybrid_strategy_no_chunking(self):
        """Test hybrid strategy when no chunking is needed."""
        result = select_strategy_and_check_thresholds(
            total_pages=50,
            total_tokens=100000,
            config={'strategy': 'hybrid', 'pageThreshold': 100, 'tokenThreshold': 150000}
        )
        self.assertFalse(result.requires_chunking)
        self.assertEqual(result.strategy, 'hybrid')
        self.assertFalse(result.page_threshold_exceeded)
        self.assertFalse(result.token_threshold_exceeded)
        self.assertIn('below thresholds', result.reason)
    
    def test_hybrid_strategy_page_exceeds(self):
        """Test hybrid strategy when page threshold is exceeded."""
        result = select_strategy_and_check_thresholds(
            total_pages=150,
            total_tokens=100000,
            config={'strategy': 'hybrid', 'pageThreshold': 100, 'tokenThreshold': 150000}
        )
        self.assertTrue(result.requires_chunking)
        self.assertEqual(result.strategy, 'hybrid')
        self.assertTrue(result.page_threshold_exceeded)
        self.assertFalse(result.token_threshold_exceeded)
        self.assertIn('150 pages', result.reason)
        self.assertIn('exceeding threshold', result.reason)
    
    def test_hybrid_strategy_token_exceeds(self):
        """Test hybrid strategy when token threshold is exceeded."""
        result = select_strategy_and_check_thresholds(
            total_pages=50,
            total_tokens=200000,
            config={'strategy': 'hybrid', 'pageThreshold': 100, 'tokenThreshold': 150000}
        )
        self.assertTrue(result.requires_chunking)
        self.assertEqual(result.strategy, 'hybrid')
        self.assertFalse(result.page_threshold_exceeded)
        self.assertTrue(result.token_threshold_exceeded)
        self.assertIn('200,000 tokens', result.reason)
        self.assertIn('exceeding threshold', result.reason)
    
    def test_hybrid_strategy_both_exceed(self):
        """Test hybrid strategy when both thresholds are exceeded."""
        result = select_strategy_and_check_thresholds(
            total_pages=150,
            total_tokens=200000,
            config={'strategy': 'hybrid', 'pageThreshold': 100, 'tokenThreshold': 150000}
        )
        self.assertTrue(result.requires_chunking)
        self.assertEqual(result.strategy, 'hybrid')
        self.assertTrue(result.page_threshold_exceeded)
        self.assertTrue(result.token_threshold_exceeded)
        self.assertIn('both thresholds exceeded', result.reason)
    
    def test_default_strategy_is_hybrid(self):
        """Test that default strategy is hybrid when not specified."""
        result = select_strategy_and_check_thresholds(
            total_pages=50,
            total_tokens=100000
        )
        self.assertEqual(result.strategy, 'hybrid')
    
    def test_default_thresholds(self):
        """Test that default thresholds are applied."""
        result = select_strategy_and_check_thresholds(
            total_pages=50,
            total_tokens=100000
        )
        self.assertEqual(result.page_threshold, 100)
        self.assertEqual(result.token_threshold, 150000)
    
    def test_custom_thresholds(self):
        """Test with custom threshold values."""
        result = select_strategy_and_check_thresholds(
            total_pages=60,
            total_tokens=80000,
            config={'pageThreshold': 50, 'tokenThreshold': 100000}
        )
        self.assertTrue(result.requires_chunking)
        self.assertEqual(result.page_threshold, 50)
        self.assertEqual(result.token_threshold, 100000)
    
    def test_result_to_dict(self):
        """Test that result can be converted to dictionary."""
        result = select_strategy_and_check_thresholds(
            total_pages=50,
            total_tokens=100000
        )
        result_dict = result.to_dict()
        
        self.assertIn('requires_chunking', result_dict)
        self.assertIn('strategy', result_dict)
        self.assertIn('reason', result_dict)
        self.assertIn('document_pages', result_dict)
        self.assertIn('document_tokens', result_dict)
        self.assertIn('page_threshold', result_dict)
        self.assertIn('token_threshold', result_dict)
        self.assertIn('page_threshold_exceeded', result_dict)
        self.assertIn('token_threshold_exceeded', result_dict)
    
    def test_camel_case_config_keys(self):
        """Test that camelCase config keys are supported."""
        result = select_strategy_and_check_thresholds(
            total_pages=150,
            total_tokens=100000,
            config={'chunkingStrategy': 'fixed-pages', 'pageThreshold': 100}
        )
        self.assertEqual(result.strategy, 'fixed-pages')
        self.assertTrue(result.requires_chunking)
    
    def test_snake_case_config_keys(self):
        """Test that snake_case config keys are supported."""
        result = select_strategy_and_check_thresholds(
            total_pages=150,
            total_tokens=100000,
            config={'strategy': 'fixed-pages', 'page_threshold': 100}
        )
        self.assertEqual(result.strategy, 'fixed-pages')
        self.assertTrue(result.requires_chunking)


class TestStrategySelectionResult(unittest.TestCase):
    """Test cases for the StrategySelectionResult class."""
    
    def test_result_attributes(self):
        """Test that result has all expected attributes."""
        result = StrategySelectionResult(
            requires_chunking=True,
            strategy='hybrid',
            reason='Test reason',
            document_pages=150,
            document_tokens=200000,
            page_threshold=100,
            token_threshold=150000,
            page_threshold_exceeded=True,
            token_threshold_exceeded=True
        )
        
        self.assertTrue(result.requires_chunking)
        self.assertEqual(result.strategy, 'hybrid')
        self.assertEqual(result.reason, 'Test reason')
        self.assertEqual(result.document_pages, 150)
        self.assertEqual(result.document_tokens, 200000)
        self.assertEqual(result.page_threshold, 100)
        self.assertEqual(result.token_threshold, 150000)
        self.assertTrue(result.page_threshold_exceeded)
        self.assertTrue(result.token_threshold_exceeded)
    
    def test_to_dict_returns_all_fields(self):
        """Test that to_dict returns all fields."""
        result = StrategySelectionResult(
            requires_chunking=False,
            strategy='token-based',
            reason='Below threshold',
            document_pages=50,
            document_tokens=100000,
            page_threshold=100,
            token_threshold=150000,
            page_threshold_exceeded=False,
            token_threshold_exceeded=False
        )
        
        result_dict = result.to_dict()
        
        self.assertEqual(len(result_dict), 9)
        self.assertFalse(result_dict['requires_chunking'])
        self.assertEqual(result_dict['strategy'], 'token-based')
        self.assertEqual(result_dict['reason'], 'Below threshold')
        self.assertEqual(result_dict['document_pages'], 50)
        self.assertEqual(result_dict['document_tokens'], 100000)


class TestBoundaryConditions(unittest.TestCase):
    """Test boundary conditions for all strategies."""
    
    def test_fixed_pages_boundary_at_threshold(self):
        """Test fixed-pages at exact threshold boundary."""
        # At threshold - should NOT require chunking
        result = select_strategy_and_check_thresholds(
            total_pages=100,
            total_tokens=100000,
            config={'strategy': 'fixed-pages', 'pageThreshold': 100}
        )
        self.assertFalse(result.requires_chunking)
        
        # One above threshold - should require chunking
        result = select_strategy_and_check_thresholds(
            total_pages=101,
            total_tokens=100000,
            config={'strategy': 'fixed-pages', 'pageThreshold': 100}
        )
        self.assertTrue(result.requires_chunking)
    
    def test_token_based_boundary_at_threshold(self):
        """Test token-based at exact threshold boundary."""
        # At threshold - should NOT require chunking
        result = select_strategy_and_check_thresholds(
            total_pages=50,
            total_tokens=150000,
            config={'strategy': 'token-based', 'tokenThreshold': 150000}
        )
        self.assertFalse(result.requires_chunking)
        
        # One above threshold - should require chunking
        result = select_strategy_and_check_thresholds(
            total_pages=50,
            total_tokens=150001,
            config={'strategy': 'token-based', 'tokenThreshold': 150000}
        )
        self.assertTrue(result.requires_chunking)
    
    def test_hybrid_boundary_at_both_thresholds(self):
        """Test hybrid at exact threshold boundaries."""
        # Both at threshold - should NOT require chunking
        result = select_strategy_and_check_thresholds(
            total_pages=100,
            total_tokens=150000,
            config={'strategy': 'hybrid', 'pageThreshold': 100, 'tokenThreshold': 150000}
        )
        self.assertFalse(result.requires_chunking)
        
        # Page one above, token at threshold - should require chunking
        result = select_strategy_and_check_thresholds(
            total_pages=101,
            total_tokens=150000,
            config={'strategy': 'hybrid', 'pageThreshold': 100, 'tokenThreshold': 150000}
        )
        self.assertTrue(result.requires_chunking)
        
        # Page at threshold, token one above - should require chunking
        result = select_strategy_and_check_thresholds(
            total_pages=100,
            total_tokens=150001,
            config={'strategy': 'hybrid', 'pageThreshold': 100, 'tokenThreshold': 150000}
        )
        self.assertTrue(result.requires_chunking)


if __name__ == '__main__':
    unittest.main()
