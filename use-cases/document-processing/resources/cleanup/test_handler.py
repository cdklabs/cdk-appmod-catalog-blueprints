"""
Unit tests for cleanup Lambda handler

Tests cover:
- Batch delete with multiple chunks
- Error handling for S3 delete failures
- Non-blocking error handling

Requirements: 8.4
"""

import json
import unittest
from unittest.mock import MagicMock, patch, call

from handler import handler, delete_chunks_batch


class TestCleanupHandler(unittest.TestCase):
    """Test cases for cleanup Lambda handler"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.document_id = "test-doc-123"
        self.bucket = "test-bucket"
        
        # Sample chunks
        self.chunks = [
            {
                'chunkId': f'{self.document_id}_chunk_0',
                'bucket': self.bucket,
                'key': f'chunks/{self.document_id}_chunk_0.pdf'
            },
            {
                'chunkId': f'{self.document_id}_chunk_1',
                'bucket': self.bucket,
                'key': f'chunks/{self.document_id}_chunk_1.pdf'
            },
            {
                'chunkId': f'{self.document_id}_chunk_2',
                'bucket': self.bucket,
                'key': f'chunks/{self.document_id}_chunk_2.pdf'
            }
        ]
    
    @patch('handler.s3_client')
    def test_successful_cleanup(self, mock_s3):
        """Test successful cleanup of all chunks"""
        # Mock successful S3 delete
        mock_s3.delete_objects.return_value = {
            'Deleted': [
                {'Key': chunk['key']} for chunk in self.chunks
            ],
            'Errors': []
        }
        
        # Create event
        event = {
            'documentId': self.document_id,
            'chunks': self.chunks
        }
        
        # Call handler
        result = handler(event, None)
        
        # Verify response
        self.assertEqual(result['documentId'], self.document_id)
        self.assertEqual(result['deletedChunks'], 3)
        self.assertEqual(result['errors'], [])
        
        # Verify S3 delete was called
        mock_s3.delete_objects.assert_called_once()
        call_args = mock_s3.delete_objects.call_args
        self.assertEqual(call_args[1]['Bucket'], self.bucket)
        self.assertEqual(len(call_args[1]['Delete']['Objects']), 3)
    
    @patch('handler.s3_client')
    def test_partial_delete_failure(self, mock_s3):
        """Test cleanup with some S3 delete failures"""
        # Mock partial S3 delete failure
        mock_s3.delete_objects.return_value = {
            'Deleted': [
                {'Key': self.chunks[0]['key']},
                {'Key': self.chunks[1]['key']}
            ],
            'Errors': [
                {
                    'Key': self.chunks[2]['key'],
                    'Code': 'AccessDenied',
                    'Message': 'Access Denied'
                }
            ]
        }
        
        # Create event
        event = {
            'documentId': self.document_id,
            'chunks': self.chunks
        }
        
        # Call handler
        result = handler(event, None)
        
        # Verify response
        self.assertEqual(result['documentId'], self.document_id)
        self.assertEqual(result['deletedChunks'], 2)
        self.assertEqual(len(result['errors']), 1)
        self.assertIn('AccessDenied', result['errors'][0])
        self.assertIn(self.chunks[2]['key'], result['errors'][0])
    
    @patch('handler.s3_client')
    def test_complete_delete_failure(self, mock_s3):
        """Test cleanup when all S3 deletes fail"""
        # Mock complete S3 delete failure
        from botocore.exceptions import ClientError
        mock_s3.delete_objects.side_effect = ClientError(
            {
                'Error': {
                    'Code': 'NoSuchBucket',
                    'Message': 'The specified bucket does not exist'
                }
            },
            'DeleteObjects'
        )
        
        # Create event
        event = {
            'documentId': self.document_id,
            'chunks': self.chunks
        }
        
        # Call handler
        result = handler(event, None)
        
        # Verify response - should not fail workflow
        self.assertEqual(result['documentId'], self.document_id)
        self.assertEqual(result['deletedChunks'], 0)
        self.assertEqual(len(result['errors']), 1)
        self.assertIn('NoSuchBucket', result['errors'][0])
    
    @patch('handler.s3_client')
    def test_batch_delete_with_multiple_chunks(self, mock_s3):
        """Test batch delete with multiple chunks"""
        # Create 5 chunks
        chunks = [
            {
                'chunkId': f'{self.document_id}_chunk_{i}',
                'bucket': self.bucket,
                'key': f'chunks/{self.document_id}_chunk_{i}.pdf'
            }
            for i in range(5)
        ]
        
        # Mock successful S3 delete
        mock_s3.delete_objects.return_value = {
            'Deleted': [{'Key': chunk['key']} for chunk in chunks],
            'Errors': []
        }
        
        # Create event
        event = {
            'documentId': self.document_id,
            'chunks': chunks
        }
        
        # Call handler
        result = handler(event, None)
        
        # Verify response
        self.assertEqual(result['documentId'], self.document_id)
        self.assertEqual(result['deletedChunks'], 5)
        self.assertEqual(result['errors'], [])
    
    @patch('handler.s3_client')
    def test_batch_delete_respects_1000_limit(self, mock_s3):
        """Test that batch delete respects S3's 1000 object limit"""
        # Create 1500 chunks (should require 2 batches)
        chunks = [
            {
                'chunkId': f'{self.document_id}_chunk_{i}',
                'bucket': self.bucket,
                'key': f'chunks/{self.document_id}_chunk_{i}.pdf'
            }
            for i in range(1500)
        ]
        
        # Mock successful S3 delete
        def mock_delete_objects(**kwargs):
            objects = kwargs['Delete']['Objects']
            return {
                'Deleted': [{'Key': obj['Key']} for obj in objects],
                'Errors': []
            }
        
        mock_s3.delete_objects.side_effect = mock_delete_objects
        
        # Create event
        event = {
            'documentId': self.document_id,
            'chunks': chunks
        }
        
        # Call handler
        result = handler(event, None)
        
        # Verify response
        self.assertEqual(result['documentId'], self.document_id)
        self.assertEqual(result['deletedChunks'], 1500)
        self.assertEqual(result['errors'], [])
        
        # Verify S3 delete was called twice (2 batches)
        self.assertEqual(mock_s3.delete_objects.call_count, 2)
        
        # Verify first batch has 1000 objects
        first_call = mock_s3.delete_objects.call_args_list[0]
        self.assertEqual(len(first_call[1]['Delete']['Objects']), 1000)
        
        # Verify second batch has 500 objects
        second_call = mock_s3.delete_objects.call_args_list[1]
        self.assertEqual(len(second_call[1]['Delete']['Objects']), 500)
    
    def test_missing_document_id(self):
        """Test handler with missing documentId"""
        event = {
            'chunks': self.chunks
        }
        
        result = handler(event, None)
        
        # Verify error response
        self.assertIsNone(result['documentId'])
        self.assertEqual(result['deletedChunks'], 0)
        self.assertEqual(len(result['errors']), 1)
        self.assertIn('documentId', result['errors'][0])
    
    def test_empty_chunks_array(self):
        """Test handler with empty chunks array"""
        event = {
            'documentId': self.document_id,
            'chunks': []
        }
        
        result = handler(event, None)
        
        # Verify response
        self.assertEqual(result['documentId'], self.document_id)
        self.assertEqual(result['deletedChunks'], 0)
        self.assertEqual(result['errors'], [])
    
    def test_chunks_missing_bucket_or_key(self):
        """Test handler with chunks missing bucket or key"""
        chunks = [
            {
                'chunkId': f'{self.document_id}_chunk_0',
                'bucket': self.bucket,
                # Missing 'key'
            },
            {
                'chunkId': f'{self.document_id}_chunk_1',
                # Missing 'bucket'
                'key': f'chunks/{self.document_id}_chunk_1.pdf'
            },
            {
                'chunkId': f'{self.document_id}_chunk_2',
                'bucket': self.bucket,
                'key': f'chunks/{self.document_id}_chunk_2.pdf'
            }
        ]
        
        event = {
            'documentId': self.document_id,
            'chunks': chunks
        }
        
        # Mock S3 delete for the valid chunk
        with patch('handler.s3_client') as mock_s3:
            mock_s3.delete_objects.return_value = {
                'Deleted': [{'Key': chunks[2]['key']}],
                'Errors': []
            }
            
            result = handler(event, None)
            
            # Verify only valid chunk was deleted
            self.assertEqual(result['documentId'], self.document_id)
            self.assertEqual(result['deletedChunks'], 1)
    
    @patch('handler.s3_client')
    def test_multiple_buckets(self, mock_s3):
        """Test cleanup with chunks in multiple buckets"""
        chunks = [
            {
                'chunkId': f'{self.document_id}_chunk_0',
                'bucket': 'bucket-1',
                'key': f'chunks/{self.document_id}_chunk_0.pdf'
            },
            {
                'chunkId': f'{self.document_id}_chunk_1',
                'bucket': 'bucket-2',
                'key': f'chunks/{self.document_id}_chunk_1.pdf'
            },
            {
                'chunkId': f'{self.document_id}_chunk_2',
                'bucket': 'bucket-1',
                'key': f'chunks/{self.document_id}_chunk_2.pdf'
            }
        ]
        
        # Mock successful S3 delete
        def mock_delete_objects(**kwargs):
            objects = kwargs['Delete']['Objects']
            return {
                'Deleted': [{'Key': obj['Key']} for obj in objects],
                'Errors': []
            }
        
        mock_s3.delete_objects.side_effect = mock_delete_objects
        
        # Create event
        event = {
            'documentId': self.document_id,
            'chunks': chunks
        }
        
        # Call handler
        result = handler(event, None)
        
        # Verify response
        self.assertEqual(result['documentId'], self.document_id)
        self.assertEqual(result['deletedChunks'], 3)
        self.assertEqual(result['errors'], [])
        
        # Verify S3 delete was called twice (once per bucket)
        self.assertEqual(mock_s3.delete_objects.call_count, 2)
    
    @patch('handler.s3_client')
    def test_non_blocking_error_handling(self, mock_s3):
        """Test that errors don't block workflow completion"""
        # Mock S3 delete failure
        from botocore.exceptions import ClientError
        mock_s3.delete_objects.side_effect = ClientError(
            {
                'Error': {
                    'Code': 'InternalError',
                    'Message': 'Internal Server Error'
                }
            },
            'DeleteObjects'
        )
        
        # Create event
        event = {
            'documentId': self.document_id,
            'chunks': self.chunks
        }
        
        # Call handler - should not raise exception
        result = handler(event, None)
        
        # Verify response contains error but doesn't fail
        self.assertEqual(result['documentId'], self.document_id)
        self.assertEqual(result['deletedChunks'], 0)
        self.assertGreater(len(result['errors']), 0)
        self.assertIn('InternalError', result['errors'][0])


class TestDeleteChunksBatch(unittest.TestCase):
    """Test cases for delete_chunks_batch function"""
    
    @patch('handler.s3_client')
    def test_delete_chunks_batch_success(self, mock_s3):
        """Test successful batch delete"""
        chunk_keys = [
            {
                'bucket': 'test-bucket',
                'key': 'chunks/chunk_0.pdf',
                'chunkId': 'chunk_0'
            },
            {
                'bucket': 'test-bucket',
                'key': 'chunks/chunk_1.pdf',
                'chunkId': 'chunk_1'
            }
        ]
        
        mock_s3.delete_objects.return_value = {
            'Deleted': [
                {'Key': 'chunks/chunk_0.pdf'},
                {'Key': 'chunks/chunk_1.pdf'}
            ],
            'Errors': []
        }
        
        deleted_count, errors = delete_chunks_batch(chunk_keys, 'test-doc')
        
        self.assertEqual(deleted_count, 2)
        self.assertEqual(errors, [])
    
    @patch('handler.s3_client')
    def test_delete_chunks_batch_with_errors(self, mock_s3):
        """Test batch delete with some errors"""
        chunk_keys = [
            {
                'bucket': 'test-bucket',
                'key': 'chunks/chunk_0.pdf',
                'chunkId': 'chunk_0'
            },
            {
                'bucket': 'test-bucket',
                'key': 'chunks/chunk_1.pdf',
                'chunkId': 'chunk_1'
            }
        ]
        
        mock_s3.delete_objects.return_value = {
            'Deleted': [
                {'Key': 'chunks/chunk_0.pdf'}
            ],
            'Errors': [
                {
                    'Key': 'chunks/chunk_1.pdf',
                    'Code': 'AccessDenied',
                    'Message': 'Access Denied'
                }
            ]
        }
        
        deleted_count, errors = delete_chunks_batch(chunk_keys, 'test-doc')
        
        self.assertEqual(deleted_count, 1)
        self.assertEqual(len(errors), 1)
        self.assertIn('AccessDenied', errors[0])


if __name__ == '__main__':
    unittest.main()
