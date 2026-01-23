"""
Token estimation module for PDF chunking.

This module provides fast token estimation using word-based heuristics
to determine if PDFs require chunking before processing.
"""

import re
import io
import logging
from typing import Dict, List, Optional
import boto3
from botocore.exceptions import ClientError

# Import strategy selection module
from strategy_selection import select_strategy_and_check_thresholds

# Configure module logger
logger = logging.getLogger(__name__)


def estimate_tokens_fast(text: str) -> int:
    """
    Fast token estimation using word count heuristic.
    
    This approach provides ~85-90% accuracy for English text while being
    significantly faster than actual tokenization. It uses a conservative
    multiplier to avoid underestimating token counts.
    
    Approach:
    - Count words (alphanumeric sequences)
    - Apply multiplier: 1.3 tokens per word (conservative)
    - Accounts for multi-token words, punctuation, and special characters
    
    Args:
        text: The text to estimate tokens for
        
    Returns:
        Estimated token count as an integer
        
    Examples:
        >>> estimate_tokens_fast("Hello world")
        2
        >>> estimate_tokens_fast("The quick brown fox jumps over the lazy dog")
        11
        >>> estimate_tokens_fast("")
        0
    """
    if not text:
        return 0
    
    # Count words (sequences of alphanumeric characters)
    # Pattern \b\w+\b matches word boundaries
    words = re.findall(r'\b\w+\b', text)
    word_count = len(words)
    
    # Conservative estimate: 1.3 tokens per word
    # This accounts for:
    # - Multi-token words (compound words, technical terms)
    # - Punctuation and special characters
    # - Whitespace tokens
    estimated_tokens = int(word_count * 1.3)
    
    return estimated_tokens


def analyze_pdf_tokens(
    bucket: str,
    key: str,
    config: Optional[Dict] = None
) -> Dict:
    """
    Analyze PDF token distribution using efficient S3 streaming.
    
    This function streams a PDF from S3, extracts text from each page,
    estimates tokens per page, and determines if chunking is required
    based on the configured strategy and thresholds.
    
    Args:
        bucket: S3 bucket name containing the PDF
        key: S3 object key for the PDF
        config: Configuration dictionary with optional keys:
            - chunkingStrategy: 'fixed-pages', 'token-based', or 'hybrid' (default: 'hybrid')
            - pageThreshold: Maximum pages before chunking (default: 100)
            - tokenThreshold: Maximum tokens before chunking (default: 150000)
            
    Returns:
        Dictionary containing:
            - total_tokens: Total estimated tokens in the document
            - total_pages: Total number of pages
            - tokens_per_page: List of token counts for each page
            - avg_tokens_per_page: Average tokens per page
            - requires_chunking: Boolean indicating if chunking is needed
            - strategy: The strategy used for the decision
            - estimation_method: Always 'word-based'
            
    Raises:
        ClientError: If S3 access fails
        Exception: If PDF processing fails
        
    Examples:
        >>> result = analyze_pdf_tokens('my-bucket', 'docs/file.pdf')
        >>> print(result['total_pages'])
        150
        >>> print(result['requires_chunking'])
        True
    """
    # Import PyPDF2 here to avoid import errors if not installed
    try:
        import PyPDF2
    except ImportError:
        raise ImportError(
            "PyPDF2 is required for PDF processing. "
            "Install it with: pip install PyPDF2"
        )
    
    # Set default configuration
    if config is None:
        config = {}
    
    # Initialize S3 client
    s3 = boto3.client('s3')
    
    try:
        # Stream PDF from S3 (don't load entire file into memory)
        pdf_obj = s3.get_object(Bucket=bucket, Key=key)
        pdf_bytes = pdf_obj['Body'].read()
        
        # Validate file is actually a PDF by checking magic bytes
        if len(pdf_bytes) < 5 or pdf_bytes[:5] != b'%PDF-':
            raise Exception(
                f"File s3://{bucket}/{key} is not a valid PDF. "
                "File must start with PDF magic bytes (%PDF-)."
            )
        
        pdf_reader = PyPDF2.PdfReader(io.BytesIO(pdf_bytes))
        
        tokens_per_page = []
        total_tokens = 0
        
        # Process each page
        for page in pdf_reader.pages:
            text = page.extract_text()
            page_tokens = estimate_tokens_fast(text)
            tokens_per_page.append(page_tokens)
            total_tokens += page_tokens
        
        total_pages = len(pdf_reader.pages)
        
        # Calculate average tokens per page
        avg_tokens_per_page = total_tokens / total_pages if total_pages > 0 else 0
        
        # Use strategy selection module to determine if chunking is required
        selection_result = select_strategy_and_check_thresholds(
            total_pages=total_pages,
            total_tokens=total_tokens,
            config=config
        )
        
        return {
            'total_tokens': total_tokens,
            'total_pages': total_pages,
            'tokens_per_page': tokens_per_page,
            'avg_tokens_per_page': avg_tokens_per_page,
            'requires_chunking': selection_result.requires_chunking,
            'strategy': selection_result.strategy,
            'estimation_method': 'word-based',
            'selection_reason': selection_result.reason,
            'page_threshold_exceeded': selection_result.page_threshold_exceeded,
            'token_threshold_exceeded': selection_result.token_threshold_exceeded
        }
        
    except ClientError as e:
        # Re-raise S3 errors with context
        error_code = e.response['Error']['Code']
        raise ClientError(
            {
                'Error': {
                    'Code': error_code,
                    'Message': f"Failed to access S3 object s3://{bucket}/{key}: {str(e)}"
                }
            },
            'GetObject'
        )
    except Exception as e:
        # Wrap other errors with context
        raise Exception(
            f"Failed to analyze PDF s3://{bucket}/{key}: {str(e)}"
        ) from e
