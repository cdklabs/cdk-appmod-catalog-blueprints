"""
Cleanup Lambda Handler

This Lambda function removes temporary chunk files from S3 after successful aggregation.
It uses batch delete for efficiency and handles errors gracefully without failing the workflow.

Requirements: 8.4, 7.5
"""

import json
import logging
import os
import sys
from typing import Any, Dict, List

import boto3
from botocore.exceptions import ClientError

# Try to import structured logging from pdf-chunking module
# Fall back to standard logging if not available
try:
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'pdf-chunking'))
    from structured_logging import (
        get_logger,
        log_chunking_operation,
        with_correlation_id,
        is_observability_enabled
    )
    structured_logger = get_logger(__name__)
    USE_STRUCTURED_LOGGING = True
except ImportError:
    USE_STRUCTURED_LOGGING = False
    structured_logger = None

# Configure standard logging as fallback
logger = logging.getLogger()
logger.setLevel(os.environ.get('LOG_LEVEL', 'INFO'))

# Initialize S3 client
s3_client = boto3.client('s3')


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Lambda handler for cleaning up temporary chunk files from S3.
    
    Args:
        event: Lambda event payload containing:
            - documentId: Document identifier
            - chunks: Array of chunk metadata with bucket and key information
        context: Lambda context object
        
    Returns:
        CleanupResponse with deletedChunks count and errors array
    """
    # Set up structured logging context if available
    if USE_STRUCTURED_LOGGING and structured_logger:
        correlation_id = event.get('correlationId')
        structured_logger.set_correlation_id(correlation_id)
    
    try:
        # Parse event
        document_id = event.get('documentId')
        chunks = event.get('chunks', [])
        
        if not document_id:
            error_msg = "Missing required field: documentId"
            if USE_STRUCTURED_LOGGING and structured_logger:
                structured_logger.error(error_msg, extra={'event': 'cleanup_error'})
            else:
                logger.error(error_msg)
            return {
                'documentId': None,
                'deletedChunks': 0,
                'errors': [error_msg]
            }
        
        # Set document context for structured logging
        if USE_STRUCTURED_LOGGING and structured_logger:
            structured_logger.set_document_context(document_id=document_id)
        
        if not chunks:
            if USE_STRUCTURED_LOGGING and structured_logger:
                structured_logger.info(
                    f"No chunks to clean up for document {document_id}",
                    extra={'event': 'cleanup_skipped', 'reason': 'no_chunks'}
                )
            else:
                logger.info(f"No chunks to clean up for document {document_id}")
            return {
                'documentId': document_id,
                'deletedChunks': 0,
                'errors': []
            }
        
        if USE_STRUCTURED_LOGGING and structured_logger:
            structured_logger.info(
                f"Starting cleanup for document {document_id}",
                extra={
                    'event': 'cleanup_started',
                    'chunkCount': len(chunks)
                }
            )
        else:
            logger.info(f"Starting cleanup for document {document_id} with {len(chunks)} chunks")
        
        # Extract S3 keys for all chunks
        chunk_keys = []
        for chunk in chunks:
            bucket = chunk.get('bucket')
            key = chunk.get('key')
            
            if bucket and key:
                chunk_keys.append({
                    'bucket': bucket,
                    'key': key,
                    'chunkId': chunk.get('chunkId', 'unknown')
                })
            else:
                if USE_STRUCTURED_LOGGING and structured_logger:
                    structured_logger.warning(
                        f"Chunk missing bucket or key",
                        extra={'chunk': chunk, 'event': 'invalid_chunk'}
                    )
                else:
                    logger.warning(f"Chunk missing bucket or key: {chunk}")
        
        if not chunk_keys:
            if USE_STRUCTURED_LOGGING and structured_logger:
                structured_logger.warning(
                    f"No valid chunk keys found for document {document_id}",
                    extra={'event': 'cleanup_skipped', 'reason': 'no_valid_keys'}
                )
            else:
                logger.warning(f"No valid chunk keys found for document {document_id}")
            return {
                'documentId': document_id,
                'deletedChunks': 0,
                'errors': ['No valid chunk keys found']
            }
        
        # Delete chunks using batch delete
        deleted_count, errors = delete_chunks_batch(chunk_keys, document_id)
        
        if USE_STRUCTURED_LOGGING and structured_logger:
            structured_logger.info(
                f"Cleanup completed for document {document_id}",
                extra={
                    'event': 'cleanup_completed',
                    'deletedChunks': deleted_count,
                    'totalChunks': len(chunk_keys),
                    'errorCount': len(errors)
                }
            )
        else:
            logger.info(
                f"Cleanup completed for document {document_id}: "
                f"deleted {deleted_count}/{len(chunk_keys)} chunks, "
                f"{len(errors)} errors"
            )
        
        return {
            'documentId': document_id,
            'deletedChunks': deleted_count,
            'errors': errors
        }
        
    except Exception as e:
        if USE_STRUCTURED_LOGGING and structured_logger:
            structured_logger.error(
                f"Unexpected error during cleanup: {str(e)}",
                extra={'event': 'cleanup_error', 'errorType': type(e).__name__},
                exc_info=True
            )
        else:
            logger.error(f"Unexpected error during cleanup: {str(e)}", exc_info=True)
        return {
            'documentId': event.get('documentId'),
            'deletedChunks': 0,
            'errors': [f"Unexpected error: {str(e)}"]
        }


def delete_chunks_batch(
    chunk_keys: List[Dict[str, str]], 
    document_id: str
) -> tuple[int, List[str]]:
    """
    Delete chunks from S3 using batch delete operations.
    
    S3 batch delete supports up to 1000 objects per request.
    This function groups chunks by bucket and processes them in batches.
    
    Args:
        chunk_keys: List of dicts with 'bucket', 'key', and 'chunkId'
        document_id: Document identifier for logging
        
    Returns:
        Tuple of (deleted_count, errors_list)
    """
    deleted_count = 0
    errors = []
    
    # Group chunks by bucket
    chunks_by_bucket: Dict[str, List[Dict[str, str]]] = {}
    for chunk in chunk_keys:
        bucket = chunk['bucket']
        if bucket not in chunks_by_bucket:
            chunks_by_bucket[bucket] = []
        chunks_by_bucket[bucket].append(chunk)
    
    # Process each bucket
    for bucket, chunks in chunks_by_bucket.items():
        logger.info(f"Deleting {len(chunks)} chunks from bucket {bucket}")
        
        # Process in batches of 1000 (S3 limit)
        batch_size = 1000
        for i in range(0, len(chunks), batch_size):
            batch = chunks[i:i + batch_size]
            
            # Prepare delete request
            objects_to_delete = [{'Key': chunk['key']} for chunk in batch]
            
            try:
                response = s3_client.delete_objects(
                    Bucket=bucket,
                    Delete={'Objects': objects_to_delete}
                )
                
                # Count successful deletions
                deleted = response.get('Deleted', [])
                deleted_count += len(deleted)
                
                # Log any errors from S3
                s3_errors = response.get('Errors', [])
                for error in s3_errors:
                    error_key = error.get('Key', 'unknown')
                    error_code = error.get('Code', 'unknown')
                    error_message = error.get('Message', 'unknown')
                    
                    error_msg = (
                        f"Failed to delete {error_key}: "
                        f"{error_code} - {error_message}"
                    )
                    logger.warning(error_msg)
                    errors.append(error_msg)
                
                logger.info(
                    f"Batch delete completed: {len(deleted)} deleted, "
                    f"{len(s3_errors)} errors"
                )
                
            except ClientError as e:
                error_code = e.response.get('Error', {}).get('Code', 'Unknown')
                error_message = e.response.get('Error', {}).get('Message', str(e))
                
                error_msg = (
                    f"S3 batch delete failed for bucket {bucket}: "
                    f"{error_code} - {error_message}"
                )
                logger.error(error_msg)
                errors.append(error_msg)
                
                # Log which chunks failed
                for chunk in batch:
                    logger.error(
                        f"Failed to delete chunk {chunk['chunkId']} "
                        f"at s3://{bucket}/{chunk['key']}"
                    )
            
            except Exception as e:
                error_msg = f"Unexpected error during batch delete: {str(e)}"
                logger.error(error_msg, exc_info=True)
                errors.append(error_msg)
    
    return deleted_count, errors
