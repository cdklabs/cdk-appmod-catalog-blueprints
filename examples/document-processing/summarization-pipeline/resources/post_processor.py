import json
import os
import time
from datetime import datetime
from typing import Dict, Any, List
import boto3
from botocore.exceptions import ClientError

# Initialize AWS clients (boto3 is included in Lambda runtime)
bedrock_runtime = boto3.client('bedrock-runtime', region_name=os.environ.get('AWS_REGION', 'us-east-1'))
s3vectors_client = boto3.client('s3vectors', region_name=os.environ.get('AWS_REGION', 'us-east-1'))

# Environment variables
VECTOR_INDEX_ARN = os.environ.get('VECTOR_INDEX_ARN', '')
EMBEDDING_MODEL_ID = 'amazon.nova-2-multimodal-embeddings-v1:0'
EMBEDDING_DIMENSION = 3072


def log(level: str, stage: str, document_filename: str, message: str, details: Dict[str, Any] = None):
    """Structured logging function"""
    log_entry = {
        'timestamp': datetime.utcnow().isoformat() + 'Z',
        'level': level,
        'stage': stage,
        'documentFilename': document_filename,
        'message': message
    }
    if details:
        log_entry['details'] = details
    
    print(json.dumps(log_entry))


def generate_embedding(summary: str, document_filename: str) -> List[float]:
    """
    Generate embeddings using Amazon Nova Multimodal Embeddings
    
    Args:
        summary: The document summary text
        document_filename: Original filename for logging
        
    Returns:
        List of floats representing the embedding vector
        
    Raises:
        Exception: If embedding generation fails after retries
    """
    log('INFO', 'embedding', document_filename, 'Starting embedding generation', 
        {'summaryLength': len(summary)})
    
    max_retries = 3
    last_error = None
    
    for attempt in range(1, max_retries + 1):
        try:
            request_body = {
                'taskType': 'SINGLE_EMBEDDING',
                'singleEmbeddingParams': {
                    'embeddingPurpose': 'GENERIC_INDEX',
                    'embeddingDimension': EMBEDDING_DIMENSION,
                    'text': {'truncationMode': 'END', 'value': summary}
                }
            }
            
            log('INFO', 'embedding', document_filename, 
                f'Invoking Nova embeddings model (attempt {attempt}/{max_retries})',
                {'modelId': EMBEDDING_MODEL_ID})
            
            response = bedrock_runtime.invoke_model(
                modelId=EMBEDDING_MODEL_ID,
                body=json.dumps(request_body),
                contentType='application/json',
                accept='application/json'
            )
            
            response_body = json.loads(response['body'].read())
            
            # Response structure: {"embeddings": [{"embeddingType": "TEXT", "embedding": [...]}]}
            embeddings_array = response_body.get('embeddings', [])
            if not embeddings_array or len(embeddings_array) == 0:
                raise ValueError('No embeddings returned in response')
            
            embedding = embeddings_array[0].get('embedding')
            
            if not isinstance(embedding, list) or len(embedding) != EMBEDDING_DIMENSION:
                raise ValueError(
                    f'Invalid embedding dimension: expected {EMBEDDING_DIMENSION}, got {len(embedding) if embedding else None}'
                )
            
            log('INFO', 'embedding', document_filename, 'Successfully generated embedding',
                {'dimension': len(embedding)})
            
            return embedding
            
        except Exception as error:
            last_error = error
            
            log('WARN', 'embedding', document_filename, 
                f'Embedding generation attempt {attempt} failed',
                {
                    'error': str(error),
                    'attempt': attempt,
                    'maxRetries': max_retries
                })
            
            # Exponential backoff before retry
            if attempt < max_retries:
                backoff_seconds = 2 ** attempt
                time.sleep(backoff_seconds)
    
    # All retries exhausted
    log('ERROR', 'embedding', document_filename, 
        'Failed to generate embedding after all retries',
        {'error': str(last_error), 'maxRetries': max_retries})
    
    raise last_error or Exception('Failed to generate embedding')


def store_vector_in_s3(
    embedding: List[float],
    summary: str,
    original_filename: str,
    document_filename: str
) -> str:
    """
    Store vector in S3 Vectors using the PutVectors API
    
    Args:
        embedding: The embedding vector (must be float32)
        summary: The document summary
        original_filename: Original document filename
        document_filename: Filename for logging
        
    Returns:
        The vector key where the vector was stored
        
    Raises:
        Exception: If storage fails
    """
    log('INFO', 'storage', document_filename, 'Starting S3 Vectors storage')
    
    try:
        # Generate unique vector key
        timestamp = int(time.time() * 1000)
        sanitized_filename = ''.join(c if c.isalnum() or c in '._-' else '_' for c in original_filename)
        vector_key = f'{timestamp}_{sanitized_filename}'
        
        # Prepare metadata (non-filterable)
        metadata = {
            'originalFilename': original_filename,
            'summary': summary
        }
        
        # Use PutVectors API to store vector in S3 Vectors index
        # The data field must be a dict with 'float32' key containing the vector
        response = s3vectors_client.put_vectors(
            indexArn=VECTOR_INDEX_ARN,
            vectors=[
                {
                    'key': vector_key,
                    'data': {
                        'float32': embedding
                    },
                    'metadata': metadata
                }
            ]
        )
        
        log('INFO', 'storage', document_filename, 'Successfully stored vector in S3 Vectors',
            {'vectorKey': vector_key, 'indexArn': VECTOR_INDEX_ARN})
        
        return vector_key
        
    except Exception as error:
        log('ERROR', 'storage', document_filename, 'Failed to store vector in S3 Vectors',
            {'error': str(error)})
        raise


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Lambda handler function for post-processing
    
    Args:
        event: Input event containing processingResult with summary and content.filename
        context: Lambda context object
        
    Returns:
        Response dictionary with success status and details
    """
    # Extract data from the event payload structure
    # The processingStep puts results in $.processingResult
    processing_result = event.get('processingResult', {})
    result = processing_result.get('result')
    summary = result.get('summary') if isinstance(processing_result, dict) else None
    
    # Extract filename from $.content.filename
    content = event.get('content', {})
    original_filename = content.get('filename') if isinstance(content, dict) else None
    
    log('INFO', 'handler', original_filename or 'unknown',
        'Post Processor Lambda invoked',
        {
            'summaryLength': len(summary) if summary else None
        })
    
    # Input validation
    if not summary or not isinstance(summary, str):
        error_response = {
            'success': False,
            'documentFilename': original_filename or 'unknown',
            'error': {
                'stage': 'embedding',
                'message': 'Invalid input: summary is required and must be a string'
            }
        }
        
        log('ERROR', 'handler', original_filename or 'unknown',
            'Input validation failed', error_response['error'])
        
        return error_response
    
    if not original_filename or not isinstance(original_filename, str):
        error_response = {
            'success': False,
            'documentFilename': 'unknown',
            'error': {
                'stage': 'embedding',
                'message': 'Invalid input: originalFilename is required and must be a string'
            }
        }
        
        log('ERROR', 'handler', 'unknown', 'Input validation failed', error_response['error'])
        
        return error_response
    
    try:
        # Step 1: Generate embeddings
        embedding = generate_embedding(summary, original_filename)
        
        # Step 2: Store in S3 Vectors
        vector_key = store_vector_in_s3(embedding, summary, original_filename, original_filename)
        
        success_response = {
            'success': True,
            'documentFilename': original_filename,
            'vectorKey': vector_key
        }
        
        log('INFO', 'handler', original_filename,
            'Post processing completed successfully',
            {'vectorKey': vector_key})
        
        return success_response
        
    except Exception as error:
        # Determine which stage failed
        error_message = str(error)
        stage = 'embedding' if 'embedding' in error_message.lower() or 'bedrock' in error_message.lower() else 'storage'
        
        error_response = {
            'success': False,
            'documentFilename': original_filename,
            'error': {
                'stage': stage,
                'message': error_message
            }
        }
        
        log('ERROR', 'handler', original_filename, 'Post processing failed', error_response['error'])
        
        return error_response
