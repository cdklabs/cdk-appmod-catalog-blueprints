"""
Unit tests for aggregation Lambda handler
"""

import unittest
from unittest.mock import MagicMock
from handler import (
    handler,
    aggregate_classifications,
    deduplicate_entities,
    calculate_chunks_summary
)


class TestAggregationHandler(unittest.TestCase):
    """Test cases for the main handler function"""
    
    def test_handler_success(self):
        """Test successful aggregation"""
        event = {
            'documentId': 'doc-123',
            'chunkResults': [
                {
                    'chunkIndex': 0,
                    'classificationResult': {
                        'documentClassification': 'INVOICE'
                    },
                    'processingResult': {
                        'entities': [
                            {'type': 'AMOUNT', 'value': '100.00'},
                            {'type': 'DATE', 'value': '2024-01-01', 'page': 1}
                        ]
                    }
                },
                {
                    'chunkIndex': 1,
                    'classificationResult': {
                        'documentClassification': 'INVOICE'
                    },
                    'processingResult': {
                        'entities': [
                            {'type': 'AMOUNT', 'value': '100.00'},  # Duplicate without page
                            {'type': 'VENDOR', 'value': 'Acme Corp'}
                        ]
                    }
                }
            ]
        }
        
        context = MagicMock()
        result = handler(event, context)
        
        self.assertEqual(result['documentId'], 'doc-123')
        self.assertEqual(result['classification'], 'INVOICE')
        self.assertEqual(result['classificationConfidence'], 1.0)
        self.assertEqual(len(result['entities']), 3)  # Deduplicated AMOUNT
        self.assertFalse(result['partialResult'])
        self.assertEqual(result['chunksSummary']['totalChunks'], 2)
        self.assertEqual(result['chunksSummary']['successfulChunks'], 2)
        self.assertEqual(result['chunksSummary']['failedChunks'], 0)
    
    def test_handler_missing_document_id(self):
        """Test handler with missing documentId"""
        event = {
            'chunkResults': []
        }
        
        context = MagicMock()
        
        with self.assertRaises(ValueError) as cm:
            handler(event, context)
        
        self.assertIn('documentId', str(cm.exception))
    
    def test_handler_missing_chunk_results(self):
        """Test handler with missing chunkResults"""
        event = {
            'documentId': 'doc-123'
        }
        
        context = MagicMock()
        
        with self.assertRaises(ValueError) as cm:
            handler(event, context)
        
        self.assertIn('chunkResults', str(cm.exception))
    
    def test_handler_partial_result(self):
        """Test handler with partial results (< 50% success)"""
        event = {
            'documentId': 'doc-123',
            'chunkResults': [
                {
                    'chunkIndex': 0,
                    'classificationResult': {
                        'documentClassification': 'INVOICE'
                    },
                    'processingResult': {
                        'entities': []
                    }
                },
                {
                    'chunkIndex': 1,
                    'error': 'Processing failed'
                },
                {
                    'chunkIndex': 2,
                    'error': 'Processing failed'
                }
            ]
        }
        
        context = MagicMock()
        result = handler(event, context)
        
        self.assertTrue(result['partialResult'])
        self.assertEqual(result['chunksSummary']['successfulChunks'], 1)
        self.assertEqual(result['chunksSummary']['failedChunks'], 2)


class TestAggregateClassifications(unittest.TestCase):
    """Test cases for classification aggregation"""
    
    def test_majority_voting_clear_majority(self):
        """Test majority voting with clear majority"""
        chunk_results = [
            {'classificationResult': {'documentClassification': 'INVOICE'}},
            {'classificationResult': {'documentClassification': 'INVOICE'}},
            {'classificationResult': {'documentClassification': 'RECEIPT'}}
        ]
        
        classification, confidence = aggregate_classifications(chunk_results)
        
        self.assertEqual(classification, 'INVOICE')
        self.assertAlmostEqual(confidence, 2/3, places=2)
    
    def test_majority_voting_tie_alphabetical(self):
        """Test majority voting with tie (alphabetical selection)"""
        chunk_results = [
            {'classificationResult': {'documentClassification': 'RECEIPT'}},
            {'classificationResult': {'documentClassification': 'INVOICE'}}
        ]
        
        classification, confidence = aggregate_classifications(chunk_results)
        
        # Should select 'INVOICE' (alphabetically first)
        self.assertEqual(classification, 'INVOICE')
        self.assertAlmostEqual(confidence, 0.5, places=2)
    
    def test_no_classifications(self):
        """Test with no classification results"""
        chunk_results = [
            {'error': 'Failed'},
            {'processingResult': {'entities': []}}
        ]
        
        classification, confidence = aggregate_classifications(chunk_results)
        
        self.assertIsNone(classification)
        self.assertEqual(confidence, 0.0)
    
    def test_skip_failed_chunks(self):
        """Test that failed chunks are skipped"""
        chunk_results = [
            {'classificationResult': {'documentClassification': 'INVOICE'}},
            {'error': 'Processing failed'},
            {'classificationResult': {'documentClassification': 'INVOICE'}}
        ]
        
        classification, confidence = aggregate_classifications(chunk_results)
        
        self.assertEqual(classification, 'INVOICE')
        self.assertEqual(confidence, 1.0)  # 2/2 successful chunks


class TestDeduplicateEntities(unittest.TestCase):
    """Test cases for entity deduplication"""
    
    def test_deduplicate_exact_duplicates(self):
        """Test deduplication of exact duplicates without page numbers"""
        chunk_results = [
            {
                'chunkIndex': 0,
                'processingResult': {
                    'entities': [
                        {'type': 'AMOUNT', 'value': '100.00'},
                        {'type': 'VENDOR', 'value': 'Acme Corp'}
                    ]
                }
            },
            {
                'chunkIndex': 1,
                'processingResult': {
                    'entities': [
                        {'type': 'AMOUNT', 'value': '100.00'},  # Duplicate
                        {'type': 'DATE', 'value': '2024-01-01'}
                    ]
                }
            }
        ]
        
        entities = deduplicate_entities(chunk_results)
        
        # Should have 3 unique entities (AMOUNT deduplicated)
        self.assertEqual(len(entities), 3)
        
        # Check that AMOUNT appears only once
        amount_entities = [e for e in entities if e['type'] == 'AMOUNT']
        self.assertEqual(len(amount_entities), 1)
    
    def test_preserve_entities_with_page_numbers(self):
        """Test that entities with page numbers are preserved"""
        chunk_results = [
            {
                'chunkIndex': 0,
                'processingResult': {
                    'entities': [
                        {'type': 'NAME', 'value': 'John Doe', 'page': 1},
                        {'type': 'NAME', 'value': 'John Doe', 'page': 2}
                    ]
                }
            }
        ]
        
        entities = deduplicate_entities(chunk_results)
        
        # Both entities should be preserved
        self.assertEqual(len(entities), 2)
        self.assertEqual(entities[0]['page'], 1)
        self.assertEqual(entities[1]['page'], 2)
    
    def test_sort_by_chunk_and_page(self):
        """Test that entities are sorted by chunk index and page number"""
        chunk_results = [
            {
                'chunkIndex': 1,
                'processingResult': {
                    'entities': [
                        {'type': 'NAME', 'value': 'Jane Doe', 'page': 5}
                    ]
                }
            },
            {
                'chunkIndex': 0,
                'processingResult': {
                    'entities': [
                        {'type': 'NAME', 'value': 'John Doe', 'page': 2}
                    ]
                }
            }
        ]
        
        entities = deduplicate_entities(chunk_results)
        
        # Should be sorted by chunk index first
        self.assertEqual(entities[0]['chunkIndex'], 0)
        self.assertEqual(entities[1]['chunkIndex'], 1)
    
    def test_skip_failed_chunks(self):
        """Test that failed chunks are skipped"""
        chunk_results = [
            {
                'chunkIndex': 0,
                'processingResult': {
                    'entities': [
                        {'type': 'AMOUNT', 'value': '100.00'}
                    ]
                }
            },
            {
                'chunkIndex': 1,
                'error': 'Processing failed'
            }
        ]
        
        entities = deduplicate_entities(chunk_results)
        
        self.assertEqual(len(entities), 1)
        self.assertEqual(entities[0]['type'], 'AMOUNT')
    
    def test_skip_invalid_entities(self):
        """Test that entities without type or value are skipped"""
        chunk_results = [
            {
                'chunkIndex': 0,
                'processingResult': {
                    'entities': [
                        {'type': 'AMOUNT', 'value': '100.00'},
                        {'type': 'VENDOR'},  # Missing value
                        {'value': 'Acme Corp'},  # Missing type
                        {}  # Missing both
                    ]
                }
            }
        ]
        
        entities = deduplicate_entities(chunk_results)
        
        # Only the valid entity should be included
        self.assertEqual(len(entities), 1)
        self.assertEqual(entities[0]['type'], 'AMOUNT')


class TestCalculateChunksSummary(unittest.TestCase):
    """Test cases for chunks summary calculation"""
    
    def test_all_successful(self):
        """Test summary with all successful chunks"""
        chunk_results = [
            {'chunkIndex': 0, 'classificationResult': {}},
            {'chunkIndex': 1, 'classificationResult': {}}
        ]
        
        summary = calculate_chunks_summary(chunk_results)
        
        self.assertEqual(summary['totalChunks'], 2)
        self.assertEqual(summary['successfulChunks'], 2)
        self.assertEqual(summary['failedChunks'], 0)
    
    def test_all_failed(self):
        """Test summary with all failed chunks"""
        chunk_results = [
            {'chunkIndex': 0, 'error': 'Failed'},
            {'chunkIndex': 1, 'error': 'Failed'}
        ]
        
        summary = calculate_chunks_summary(chunk_results)
        
        self.assertEqual(summary['totalChunks'], 2)
        self.assertEqual(summary['successfulChunks'], 0)
        self.assertEqual(summary['failedChunks'], 2)
    
    def test_mixed_results(self):
        """Test summary with mixed success and failure"""
        chunk_results = [
            {'chunkIndex': 0, 'classificationResult': {}},
            {'chunkIndex': 1, 'error': 'Failed'},
            {'chunkIndex': 2, 'classificationResult': {}}
        ]
        
        summary = calculate_chunks_summary(chunk_results)
        
        self.assertEqual(summary['totalChunks'], 3)
        self.assertEqual(summary['successfulChunks'], 2)
        self.assertEqual(summary['failedChunks'], 1)
    
    def test_50_percent_threshold(self):
        """Test partial results with 50% failure threshold"""
        chunk_results = [
            {'chunkIndex': 0, 'classificationResult': {}},
            {'chunkIndex': 1, 'error': 'Failed'}
        ]
        
        summary = calculate_chunks_summary(chunk_results)
        success_rate = summary['successfulChunks'] / summary['totalChunks']
        
        # Exactly 50% success rate
        self.assertEqual(success_rate, 0.5)


if __name__ == '__main__':
    unittest.main()
