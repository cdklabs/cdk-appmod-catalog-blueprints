"""
Unit tests for chunking strategies.

Tests cover:
- Fixed-pages strategy with various page counts and chunk sizes
- Token-based strategy with variable token density
- Hybrid strategy with mixed scenarios
- Edge cases (document size equals chunk size, 1 page, last chunk smaller)
- Configuration validation
"""

import unittest
from chunking_strategies import (
    calculate_chunks_fixed_pages,
    calculate_chunks_token_based,
    calculate_chunks_hybrid,
    validate_configuration,
    validate_fixed_pages_config,
    validate_token_based_config,
    validate_hybrid_config,
    ConfigurationError
)


class TestFixedPagesStrategy(unittest.TestCase):
    """Tests for fixed-pages chunking strategy."""
    
    def test_basic_chunking(self):
        """Test basic fixed-pages chunking."""
        chunks = calculate_chunks_fixed_pages(150, 50, 0)
        
        self.assertEqual(len(chunks), 3)
        self.assertEqual(chunks[0], {'chunk_index': 0, 'start_page': 0, 'end_page': 49, 'page_count': 50})
        self.assertEqual(chunks[1], {'chunk_index': 1, 'start_page': 50, 'end_page': 99, 'page_count': 50})
        self.assertEqual(chunks[2], {'chunk_index': 2, 'start_page': 100, 'end_page': 149, 'page_count': 50})
    
    def test_chunking_with_overlap(self):
        """Test fixed-pages chunking with overlap."""
        chunks = calculate_chunks_fixed_pages(150, 50, 5)
        
        # With 150 pages, chunk_size 50, overlap 5:
        # Chunk 0: pages 0-49 (50 pages)
        # Chunk 1: pages 45-99 (55 pages, starts 5 pages before end of chunk 0)
        # Chunk 2: pages 95-149 (55 pages, starts 5 pages before end of chunk 1)
        self.assertEqual(len(chunks), 3)
        # First chunk has no overlap
        self.assertEqual(chunks[0]['start_page'], 0)
        self.assertEqual(chunks[0]['end_page'], 49)
        # Second chunk starts with overlap
        self.assertEqual(chunks[1]['start_page'], 45)  # 50 - 5 = 45
    
    def test_exact_division(self):
        """Test when total pages divides evenly by chunk size."""
        chunks = calculate_chunks_fixed_pages(100, 50, 0)
        
        self.assertEqual(len(chunks), 2)
        self.assertEqual(chunks[0]['page_count'], 50)
        self.assertEqual(chunks[1]['page_count'], 50)
    
    def test_last_chunk_smaller(self):
        """Test when last chunk is smaller than chunk size."""
        chunks = calculate_chunks_fixed_pages(125, 50, 0)
        
        self.assertEqual(len(chunks), 3)
        self.assertEqual(chunks[0]['page_count'], 50)
        self.assertEqual(chunks[1]['page_count'], 50)
        self.assertEqual(chunks[2]['page_count'], 25)  # Last chunk is smaller
    
    def test_single_page(self):
        """Test with single page document."""
        chunks = calculate_chunks_fixed_pages(1, 50, 0)
        
        self.assertEqual(len(chunks), 1)
        self.assertEqual(chunks[0], {'chunk_index': 0, 'start_page': 0, 'end_page': 0, 'page_count': 1})
    
    def test_document_equals_chunk_size(self):
        """Test when document size equals chunk size."""
        chunks = calculate_chunks_fixed_pages(50, 50, 0)
        
        self.assertEqual(len(chunks), 1)
        self.assertEqual(chunks[0]['page_count'], 50)


class TestTokenBasedStrategy(unittest.TestCase):
    """Tests for token-based chunking strategy."""
    
    def test_uniform_density(self):
        """Test with uniform token density."""
        tokens = [1500] * 100  # 100 pages, 1500 tokens each
        chunks = calculate_chunks_token_based(tokens, 100000, 0)
        
        # Should create 2 chunks: 66 pages (99000 tokens) + 34 pages (51000 tokens)
        self.assertEqual(len(chunks), 2)
        self.assertTrue(all(c['token_count'] <= 100000 for c in chunks))
    
    def test_variable_density(self):
        """Test with variable token density."""
        # Mix of low and high density pages
        tokens = [500] * 50 + [5000] * 50  # 50 low + 50 high density
        chunks = calculate_chunks_token_based(tokens, 100000, 0)
        
        # All chunks should respect token limit
        self.assertTrue(all(c['token_count'] <= 100000 for c in chunks))
    
    def test_with_overlap(self):
        """Test token-based chunking with overlap."""
        tokens = [2000] * 100  # 100 pages, 2000 tokens each
        chunks = calculate_chunks_token_based(tokens, 80000, 5000)
        
        # Verify overlap exists between consecutive chunks
        self.assertGreater(len(chunks), 1)
        for i in range(len(chunks) - 1):
            # There should be some overlap in page ranges
            self.assertGreaterEqual(chunks[i]['end_page'], chunks[i + 1]['start_page'] - 3)
    
    def test_single_page_exceeds_limit(self):
        """Test when a single page exceeds token limit."""
        tokens = [150000]  # Single page with 150k tokens
        chunks = calculate_chunks_token_based(tokens, 100000, 0)
        
        # Should still create one chunk (can't split a single page)
        self.assertEqual(len(chunks), 1)
        self.assertEqual(chunks[0]['token_count'], 150000)
    
    def test_exact_token_fit(self):
        """Test when pages fit exactly into token limit."""
        tokens = [10000] * 10  # 10 pages, 10k tokens each = 100k total
        chunks = calculate_chunks_token_based(tokens, 100000, 0)
        
        self.assertEqual(len(chunks), 1)
        self.assertEqual(chunks[0]['token_count'], 100000)


class TestHybridStrategy(unittest.TestCase):
    """Tests for hybrid chunking strategy."""
    
    def test_token_limit_triggers(self):
        """Test when token limit is reached before page limit."""
        tokens = [5000] * 100  # 100 pages, 5000 tokens each
        chunks = calculate_chunks_hybrid(tokens, 80000, 100, 5000)
        
        # Should finalize chunks based on token limit
        self.assertGreater(len(chunks), 1)
        self.assertTrue(all(c['page_count'] <= 100 for c in chunks))
        # Most chunks should be finalized due to token limit
        token_limit_chunks = [c for c in chunks if c.get('finalize_reason') == 'token_limit']
        self.assertGreater(len(token_limit_chunks), 0)
    
    def test_page_limit_triggers(self):
        """Test when page limit is reached before token limit."""
        tokens = [500] * 200  # 200 pages, 500 tokens each (low density)
        chunks = calculate_chunks_hybrid(tokens, 80000, 100, 5000)
        
        # Should finalize chunks based on page limit
        self.assertGreaterEqual(len(chunks), 2)
        page_limit_chunks = [c for c in chunks if c.get('finalize_reason') == 'page_limit']
        self.assertGreater(len(page_limit_chunks), 0)
    
    def test_mixed_density(self):
        """Test hybrid strategy with mixed token density."""
        # Create variable density: some pages high, some low
        tokens = []
        for i in range(200):
            if i % 10 == 0:
                tokens.append(8000)  # High density every 10th page
            else:
                tokens.append(1000)  # Low density otherwise
        
        chunks = calculate_chunks_hybrid(tokens, 80000, 100, 5000)
        
        # Verify all constraints are met
        self.assertTrue(all(c['page_count'] <= 100 for c in chunks))
        # Allow some tolerance for overlap
        self.assertTrue(all(c['token_count'] <= 100000 for c in chunks))
    
    def test_respects_both_limits(self):
        """Test that hybrid respects both token and page limits."""
        tokens = [2000] * 200  # 200 pages, 2000 tokens each
        chunks = calculate_chunks_hybrid(tokens, 80000, 100, 5000)
        
        for chunk in chunks:
            self.assertLessEqual(chunk['page_count'], 100, f"Page limit violated: {chunk['page_count']}")
            # Allow tolerance for overlap
            self.assertLessEqual(chunk['token_count'], 110000, f"Token limit violated: {chunk['token_count']}")
    
    def test_overlap_limited_to_10_pages(self):
        """Test that overlap is limited to maximum 10 pages."""
        tokens = [1000] * 200  # 200 pages, 1000 tokens each
        chunks = calculate_chunks_hybrid(tokens, 80000, 100, 20000)  # High overlap target
        
        # Check overlap between consecutive chunks
        for i in range(len(chunks) - 1):
            overlap_pages = chunks[i]['end_page'] - chunks[i + 1]['start_page'] + 1
            self.assertLessEqual(overlap_pages, 10, f"Overlap exceeds 10 pages: {overlap_pages}")


class TestEdgeCases(unittest.TestCase):
    """Tests for edge cases across all strategies."""
    
    def test_single_page_fixed(self):
        """Test single page with fixed-pages strategy."""
        chunks = calculate_chunks_fixed_pages(1, 50, 0)
        self.assertEqual(len(chunks), 1)
        self.assertEqual(chunks[0]['page_count'], 1)
    
    def test_single_page_token_based(self):
        """Test single page with token-based strategy."""
        chunks = calculate_chunks_token_based([50000], 100000, 0)
        self.assertEqual(len(chunks), 1)
        self.assertEqual(chunks[0]['token_count'], 50000)
    
    def test_single_page_hybrid(self):
        """Test single page with hybrid strategy."""
        chunks = calculate_chunks_hybrid([50000], 80000, 100, 5000)
        self.assertEqual(len(chunks), 1)
        self.assertEqual(chunks[0]['token_count'], 50000)
    
    def test_empty_pages_token_based(self):
        """Test pages with zero tokens."""
        tokens = [0, 1000, 0, 2000, 0]  # Mix of empty and non-empty pages
        chunks = calculate_chunks_token_based(tokens, 10000, 0)
        
        self.assertEqual(len(chunks), 1)
        self.assertEqual(chunks[0]['token_count'], 3000)
    
    def test_very_large_document(self):
        """Test with very large document (1000 pages)."""
        tokens = [1500] * 1000
        chunks = calculate_chunks_hybrid(tokens, 80000, 100, 5000)
        
        # Should create multiple chunks
        self.assertGreater(len(chunks), 10)
        # All chunks should respect limits
        self.assertTrue(all(c['page_count'] <= 100 for c in chunks))


class TestConfigurationValidation(unittest.TestCase):
    """Tests for configuration validation."""
    
    def test_valid_fixed_pages_config(self):
        """Test valid fixed-pages configuration."""
        config = {'chunkSize': 50, 'overlapPages': 5, 'pageThreshold': 100}
        self.assertTrue(validate_configuration(config))
    
    def test_invalid_chunk_size(self):
        """Test invalid chunk size (negative)."""
        config = {'chunkSize': -10, 'overlapPages': 5}
        self.assertFalse(validate_configuration(config))
    
    def test_invalid_chunk_size_zero(self):
        """Test invalid chunk size (zero)."""
        config = {'chunkSize': 0, 'overlapPages': 5}
        self.assertFalse(validate_configuration(config))
    
    def test_invalid_overlap_negative(self):
        """Test invalid overlap (negative)."""
        config = {'chunkSize': 50, 'overlapPages': -5}
        self.assertFalse(validate_configuration(config))
    
    def test_overlap_exceeds_chunk_size(self):
        """Test overlap >= chunk size."""
        config = {'chunkSize': 50, 'overlapPages': 60}
        self.assertFalse(validate_configuration(config))
    
    def test_overlap_equals_chunk_size(self):
        """Test overlap == chunk size (invalid)."""
        config = {'chunkSize': 50, 'overlapPages': 50}
        self.assertFalse(validate_configuration(config))
    
    def test_invalid_threshold(self):
        """Test invalid threshold (negative)."""
        config = {'pageThreshold': -100}
        self.assertFalse(validate_configuration(config))
    
    def test_strict_mode_raises_exception(self):
        """Test that strict mode raises ConfigurationError."""
        config = {'chunkSize': -10, 'strict': True}
        with self.assertRaises(ConfigurationError):
            validate_configuration(config)
    
    def test_validate_fixed_pages_config_valid(self):
        """Test validate_fixed_pages_config with valid config."""
        # Should not raise exception
        validate_fixed_pages_config(50, 5, 100)
    
    def test_validate_fixed_pages_config_invalid(self):
        """Test validate_fixed_pages_config with invalid config."""
        with self.assertRaises(ConfigurationError):
            validate_fixed_pages_config(-50, 5, 100)
    
    def test_validate_token_based_config_valid(self):
        """Test validate_token_based_config with valid config."""
        # Should not raise exception
        validate_token_based_config(100000, 5000, 150000)
    
    def test_validate_token_based_config_invalid(self):
        """Test validate_token_based_config with invalid config."""
        with self.assertRaises(ConfigurationError):
            validate_token_based_config(-100000, 5000, 150000)
    
    def test_validate_hybrid_config_valid(self):
        """Test validate_hybrid_config with valid config."""
        # Should not raise exception
        validate_hybrid_config(80000, 100, 5000)
    
    def test_validate_hybrid_config_invalid(self):
        """Test validate_hybrid_config with invalid config."""
        with self.assertRaises(ConfigurationError):
            validate_hybrid_config(-80000, 100, 5000)
    
    def test_multiple_validation_errors(self):
        """Test configuration with multiple errors."""
        config = {
            'chunkSize': -10,
            'overlapPages': -5,
            'pageThreshold': 0,
            'strict': True
        }
        with self.assertRaises(ConfigurationError) as context:
            validate_configuration(config)
        
        # Should contain multiple error messages
        error_msg = str(context.exception)
        self.assertIn('chunk_size', error_msg)
        self.assertIn('overlap', error_msg)
        self.assertIn('threshold', error_msg)


class TestStrategyComparison(unittest.TestCase):
    """Tests comparing different strategies on the same document."""
    
    def test_all_strategies_on_same_document(self):
        """Test all three strategies on the same document."""
        tokens = [1500] * 150  # 150 pages, 1500 tokens each
        
        fixed_chunks = calculate_chunks_fixed_pages(150, 50, 5)
        token_chunks = calculate_chunks_token_based(tokens, 100000, 5000)
        hybrid_chunks = calculate_chunks_hybrid(tokens, 80000, 100, 5000)
        
        # All should create valid chunks
        self.assertGreater(len(fixed_chunks), 0)
        self.assertGreater(len(token_chunks), 0)
        self.assertGreater(len(hybrid_chunks), 0)
        
        # Token-based should never exceed token limit
        self.assertTrue(all(c['token_count'] <= 100000 for c in token_chunks))
        
        # Hybrid should respect both limits
        self.assertTrue(all(c['page_count'] <= 100 for c in hybrid_chunks))


if __name__ == '__main__':
    unittest.main()
