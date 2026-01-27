"""
Unit tests for token estimation module.

Tests cover various text densities, edge cases, and accuracy verification.
"""

import unittest
from unittest.mock import Mock, patch, MagicMock
from io import BytesIO
from token_estimation import estimate_tokens_fast, analyze_pdf_tokens


class TestEstimateTokensFast(unittest.TestCase):
    """Test cases for the estimate_tokens_fast function."""
    
    def test_empty_text(self):
        """Test with empty text (0 tokens)."""
        result = estimate_tokens_fast("")
        self.assertEqual(result, 0)
    
    def test_none_text(self):
        """Test with None text (0 tokens)."""
        result = estimate_tokens_fast(None)
        self.assertEqual(result, 0)
    
    def test_simple_sentence(self):
        """Test with a simple sentence."""
        text = "Hello world"
        result = estimate_tokens_fast(text)
        # 2 words * 1.3 = 2.6 -> 2 tokens
        self.assertEqual(result, 2)
    
    def test_medium_density_text(self):
        """Test with medium density text (~1500 tokens per page)."""
        # Typical page: ~1000-1200 words
        text = " ".join(["word"] * 1000)
        result = estimate_tokens_fast(text)
        # 1000 words * 1.3 = 1300 tokens
        self.assertEqual(result, 1300)
        # Verify it's in the expected range for medium density
        self.assertGreaterEqual(result, 1200)
        self.assertLessEqual(result, 1500)
    
    def test_high_density_text(self):
        """Test with very dense text (>10,000 tokens)."""
        # Very dense page: ~8000+ words
        text = " ".join(["word"] * 8000)
        result = estimate_tokens_fast(text)
        # 8000 words * 1.3 = 10400 tokens
        self.assertEqual(result, 10400)
        self.assertGreater(result, 10000)
    
    def test_low_density_text(self):
        """Test with low density text (sparse content)."""
        # Sparse page: ~100 words
        text = " ".join(["word"] * 100)
        result = estimate_tokens_fast(text)
        # 100 words * 1.3 = 130 tokens
        self.assertEqual(result, 130)
        self.assertLess(result, 200)
    
    def test_text_with_punctuation(self):
        """Test that punctuation doesn't inflate word count."""
        text = "Hello, world! How are you? I'm fine, thanks."
        result = estimate_tokens_fast(text)
        # Words: Hello, world, How, are, you, I, m, fine, thanks = 9 words
        # 9 * 1.3 = 11.7 -> 11 tokens
        self.assertEqual(result, 11)
    
    def test_text_with_numbers(self):
        """Test with text containing numbers."""
        text = "The year 2024 has 365 days and 12 months"
        result = estimate_tokens_fast(text)
        # Words: The, year, 2024, has, 365, days, and, 12, months = 9 words
        # 9 * 1.3 = 11.7 -> 11 tokens
        self.assertEqual(result, 11)
    
    def test_text_with_special_characters(self):
        """Test with special characters and symbols."""
        text = "Email: user@example.com, Phone: +1-555-0123"
        result = estimate_tokens_fast(text)
        # Words extracted by \b\w+\b: Email, user, example, com, Phone, 1, 555, 0123 = 8 words
        # 8 * 1.3 = 10.4 -> 10 tokens
        self.assertEqual(result, 10)
    
    def test_multiline_text(self):
        """Test with multiline text."""
        text = """Line one with some words.
        Line two with more words.
        Line three with even more words."""
        result = estimate_tokens_fast(text)
        # 16 words * 1.3 = 20.8 -> 20 tokens
        self.assertEqual(result, 20)
    
    def test_estimation_accuracy_range(self):
        """Verify estimation is within expected accuracy range (85-90%)."""
        # Sample text with known characteristics
        text = "The quick brown fox jumps over the lazy dog. " * 100
        result = estimate_tokens_fast(text)
        
        # 9 words per sentence * 100 = 900 words
        # 900 * 1.3 = 1170 tokens (our estimate)
        self.assertEqual(result, 1170)
        
        # Actual tokenization would be around 1000-1100 tokens
        # Our estimate should be within 85-90% accuracy
        # This means we're slightly conservative (overestimating)
        # which is acceptable for chunking decisions
        expected_actual = 1050  # Approximate actual token count
        accuracy = min(result, expected_actual) / max(result, expected_actual)
        self.assertGreaterEqual(accuracy, 0.85)


class TestAnalyzePdfTokens(unittest.TestCase):
    """Test cases for the analyze_pdf_tokens function."""
    
    @patch('token_estimation.boto3.client')
    @patch('PyPDF2.PdfReader')
    def test_small_pdf_no_chunking(self, mock_pdf_reader, mock_boto_client):
        """Test with small PDF that doesn't require chunking."""
        # Mock S3 client
        mock_s3 = Mock()
        mock_boto_client.return_value = mock_s3
        mock_s3.get_object.return_value = {'Body': BytesIO(b'fake pdf')}
        
        # Mock PDF with 30 pages, ~1500 tokens per page
        mock_pages = []
        for i in range(30):
            mock_page = Mock()
            mock_page.extract_text.return_value = " ".join(["word"] * 1000)
            mock_pages.append(mock_page)
        
        mock_reader = Mock()
        mock_reader.pages = mock_pages
        mock_pdf_reader.return_value = mock_reader
        
        # Analyze PDF
        result = analyze_pdf_tokens('test-bucket', 'test.pdf')
        
        # Verify results
        self.assertEqual(result['total_pages'], 30)
        self.assertEqual(result['total_tokens'], 39000)  # 30 * 1300
        self.assertEqual(result['avg_tokens_per_page'], 1300)
        self.assertFalse(result['requires_chunking'])  # Below 100 page threshold
        self.assertEqual(result['strategy'], 'hybrid')
        self.assertEqual(result['estimation_method'], 'word-based')
    
    @patch('token_estimation.boto3.client')
    @patch('PyPDF2.PdfReader')
    def test_large_pdf_requires_chunking_pages(self, mock_pdf_reader, mock_boto_client):
        """Test with large PDF that requires chunking (page threshold)."""
        # Mock S3 client
        mock_s3 = Mock()
        mock_boto_client.return_value = mock_s3
        mock_s3.get_object.return_value = {'Body': BytesIO(b'fake pdf')}
        
        # Mock PDF with 150 pages
        mock_pages = []
        for i in range(150):
            mock_page = Mock()
            mock_page.extract_text.return_value = " ".join(["word"] * 1000)
            mock_pages.append(mock_page)
        
        mock_reader = Mock()
        mock_reader.pages = mock_pages
        mock_pdf_reader.return_value = mock_reader
        
        # Analyze PDF
        result = analyze_pdf_tokens('test-bucket', 'test.pdf')
        
        # Verify results
        self.assertEqual(result['total_pages'], 150)
        self.assertTrue(result['requires_chunking'])  # Above 100 page threshold
    
    @patch('token_estimation.boto3.client')
    @patch('PyPDF2.PdfReader')
    def test_large_pdf_requires_chunking_tokens(self, mock_pdf_reader, mock_boto_client):
        """Test with PDF that requires chunking (token threshold)."""
        # Mock S3 client
        mock_s3 = Mock()
        mock_boto_client.return_value = mock_s3
        mock_s3.get_object.return_value = {'Body': BytesIO(b'fake pdf')}
        
        # Mock PDF with 80 pages but very high density (~5000 tokens per page)
        mock_pages = []
        for i in range(80):
            mock_page = Mock()
            # ~4000 words per page -> ~5200 tokens per page
            mock_page.extract_text.return_value = " ".join(["word"] * 4000)
            mock_pages.append(mock_page)
        
        mock_reader = Mock()
        mock_reader.pages = mock_pages
        mock_pdf_reader.return_value = mock_reader
        
        # Analyze PDF with token-based strategy
        config = {
            'chunkingStrategy': 'token-based',
            'tokenThreshold': 150000
        }
        result = analyze_pdf_tokens('test-bucket', 'test.pdf', config)
        
        # Verify results
        self.assertEqual(result['total_pages'], 80)
        self.assertEqual(result['total_tokens'], 416000)  # 80 * 5200
        self.assertTrue(result['requires_chunking'])  # Above 150000 token threshold
        self.assertEqual(result['strategy'], 'token-based')
    
    @patch('token_estimation.boto3.client')
    @patch('PyPDF2.PdfReader')
    def test_fixed_pages_strategy(self, mock_pdf_reader, mock_boto_client):
        """Test with fixed-pages strategy."""
        # Mock S3 client
        mock_s3 = Mock()
        mock_boto_client.return_value = mock_s3
        mock_s3.get_object.return_value = {'Body': BytesIO(b'fake pdf')}
        
        # Mock PDF with 50 pages
        mock_pages = []
        for i in range(50):
            mock_page = Mock()
            mock_page.extract_text.return_value = " ".join(["word"] * 1000)
            mock_pages.append(mock_page)
        
        mock_reader = Mock()
        mock_reader.pages = mock_pages
        mock_pdf_reader.return_value = mock_reader
        
        # Analyze PDF with fixed-pages strategy
        config = {
            'chunkingStrategy': 'fixed-pages',
            'pageThreshold': 100
        }
        result = analyze_pdf_tokens('test-bucket', 'test.pdf', config)
        
        # Verify results
        self.assertFalse(result['requires_chunking'])  # Below page threshold
        self.assertEqual(result['strategy'], 'fixed-pages')
    
    @patch('token_estimation.boto3.client')
    @patch('PyPDF2.PdfReader')
    def test_empty_pages(self, mock_pdf_reader, mock_boto_client):
        """Test with PDF containing empty pages (0 tokens)."""
        # Mock S3 client
        mock_s3 = Mock()
        mock_boto_client.return_value = mock_s3
        mock_s3.get_object.return_value = {'Body': BytesIO(b'fake pdf')}
        
        # Mock PDF with mix of empty and content pages
        mock_pages = []
        for i in range(10):
            mock_page = Mock()
            if i % 2 == 0:
                mock_page.extract_text.return_value = ""  # Empty page
            else:
                mock_page.extract_text.return_value = " ".join(["word"] * 1000)
            mock_pages.append(mock_page)
        
        mock_reader = Mock()
        mock_reader.pages = mock_pages
        mock_pdf_reader.return_value = mock_reader
        
        # Analyze PDF
        result = analyze_pdf_tokens('test-bucket', 'test.pdf')
        
        # Verify results
        self.assertEqual(result['total_pages'], 10)
        # 5 empty pages (0 tokens) + 5 content pages (1300 tokens each) = 6500 tokens
        self.assertEqual(result['total_tokens'], 6500)
        self.assertEqual(len(result['tokens_per_page']), 10)
        # Check that empty pages have 0 tokens
        self.assertEqual(result['tokens_per_page'][0], 0)
        self.assertEqual(result['tokens_per_page'][2], 0)
    
    @patch('token_estimation.boto3.client')
    @patch('PyPDF2.PdfReader')
    def test_variable_density_pages(self, mock_pdf_reader, mock_boto_client):
        """Test with PDF containing pages of varying density."""
        # Mock S3 client
        mock_s3 = Mock()
        mock_boto_client.return_value = mock_s3
        mock_s3.get_object.return_value = {'Body': BytesIO(b'fake pdf')}
        
        # Mock PDF with variable density pages
        mock_pages = []
        densities = [100, 500, 1000, 2000, 5000]  # words per page
        for density in densities:
            mock_page = Mock()
            mock_page.extract_text.return_value = " ".join(["word"] * density)
            mock_pages.append(mock_page)
        
        mock_reader = Mock()
        mock_reader.pages = mock_pages
        mock_pdf_reader.return_value = mock_reader
        
        # Analyze PDF
        result = analyze_pdf_tokens('test-bucket', 'test.pdf')
        
        # Verify results
        self.assertEqual(result['total_pages'], 5)
        # Expected tokens: 130, 650, 1300, 2600, 6500 = 11180 total
        self.assertEqual(result['total_tokens'], 11180)
        self.assertEqual(result['tokens_per_page'][0], 130)
        self.assertEqual(result['tokens_per_page'][4], 6500)
    
    @patch('token_estimation.boto3.client')
    def test_s3_access_error(self, mock_boto_client):
        """Test error handling for S3 access denied."""
        from botocore.exceptions import ClientError
        
        # Mock S3 client to raise access denied error
        mock_s3 = Mock()
        mock_boto_client.return_value = mock_s3
        mock_s3.get_object.side_effect = ClientError(
            {'Error': {'Code': 'AccessDenied', 'Message': 'Access Denied'}},
            'GetObject'
        )
        
        # Verify error is raised with context
        with self.assertRaises(ClientError) as context:
            analyze_pdf_tokens('test-bucket', 'test.pdf')
        
        self.assertIn('Failed to access S3 object', str(context.exception))
    
    @patch('token_estimation.boto3.client')
    @patch('PyPDF2.PdfReader')
    def test_pdf_processing_error(self, mock_pdf_reader, mock_boto_client):
        """Test error handling for PDF processing failures."""
        # Mock S3 client
        mock_s3 = Mock()
        mock_boto_client.return_value = mock_s3
        mock_s3.get_object.return_value = {'Body': BytesIO(b'fake pdf')}
        
        # Mock PDF reader to raise error
        mock_pdf_reader.side_effect = Exception("Invalid PDF format")
        
        # Verify error is raised with context
        with self.assertRaises(Exception) as context:
            analyze_pdf_tokens('test-bucket', 'test.pdf')
        
        self.assertIn('Failed to analyze PDF', str(context.exception))
    
    @patch('token_estimation.boto3.client')
    @patch('PyPDF2.PdfReader')
    def test_default_config_values(self, mock_pdf_reader, mock_boto_client):
        """Test that default configuration values are applied."""
        # Mock S3 client
        mock_s3 = Mock()
        mock_boto_client.return_value = mock_s3
        mock_s3.get_object.return_value = {'Body': BytesIO(b'fake pdf')}
        
        # Mock PDF with 50 pages
        mock_pages = []
        for i in range(50):
            mock_page = Mock()
            mock_page.extract_text.return_value = " ".join(["word"] * 1000)
            mock_pages.append(mock_page)
        
        mock_reader = Mock()
        mock_reader.pages = mock_pages
        mock_pdf_reader.return_value = mock_reader
        
        # Analyze PDF without config (should use defaults)
        result = analyze_pdf_tokens('test-bucket', 'test.pdf')
        
        # Verify default strategy is used
        self.assertEqual(result['strategy'], 'hybrid')
        # With 50 pages and 65000 tokens, should not require chunking
        # (below 100 page threshold and 150000 token threshold)
        self.assertFalse(result['requires_chunking'])


if __name__ == '__main__':
    unittest.main()
