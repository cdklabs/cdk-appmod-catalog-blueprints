"""
Chunking strategies for splitting large PDFs into manageable chunks.

This module implements three chunking strategies:
1. Fixed-pages: Simple page-based chunking (legacy)
2. Token-based: Token-aware chunking that respects model limits
3. Hybrid: Best of both worlds - targets token count but respects page limits (RECOMMENDED)
"""

import math
from typing import List, Dict, Any, Optional


class ConfigurationError(Exception):
    """Raised when chunking configuration is invalid."""
    pass


def calculate_chunks_fixed_pages(
    total_pages: int,
    chunk_size: int,
    overlap_pages: int = 0
) -> List[Dict[str, Any]]:
    """
    Create chunks based on fixed page count (legacy approach).
    
    This is the simplest chunking strategy that splits documents into
    fixed-size page chunks. It's fast and predictable but doesn't account
    for token density, which can lead to chunks exceeding model token limits.
    
    Args:
        total_pages: Total number of pages in the document
        chunk_size: Number of pages per chunk
        overlap_pages: Number of overlapping pages between consecutive chunks
        
    Returns:
        List of chunk metadata dictionaries with:
        - chunk_index: Index of the chunk (0-based)
        - start_page: Starting page number (0-based)
        - end_page: Ending page number (0-based, inclusive)
        - page_count: Number of pages in the chunk
        
    Example:
        >>> chunks = calculate_chunks_fixed_pages(150, 50, 5)
        >>> len(chunks)
        4
        >>> chunks[0]
        {'chunk_index': 0, 'start_page': 0, 'end_page': 49, 'page_count': 50}
    """
    chunks = []
    current_page = 0
    chunk_index = 0
    
    while current_page < total_pages:
        # Calculate overlap for chunks after the first
        start_page = max(0, current_page - overlap_pages) if chunk_index > 0 else 0
        end_page = min(current_page + chunk_size, total_pages) - 1
        
        chunks.append({
            'chunk_index': chunk_index,
            'start_page': start_page,
            'end_page': end_page,
            'page_count': end_page - start_page + 1
        })
        
        current_page = end_page + 1
        chunk_index += 1
    
    return chunks


def calculate_chunks_token_based(
    tokens_per_page: List[int],
    max_tokens_per_chunk: int,
    overlap_tokens: int = 0
) -> List[Dict[str, Any]]:
    """
    Create chunks based on token count instead of fixed pages.
    
    This strategy ensures no chunk exceeds the token limit by analyzing
    token density per page. It's ideal for documents with variable content
    density (e.g., mix of text-heavy and image-heavy pages).
    
    Args:
        tokens_per_page: List of token counts for each page
        max_tokens_per_chunk: Maximum tokens allowed per chunk
        overlap_tokens: Target number of overlapping tokens between chunks
        
    Returns:
        List of chunk metadata dictionaries with:
        - chunk_index: Index of the chunk (0-based)
        - start_page: Starting page number (0-based)
        - end_page: Ending page number (0-based, inclusive)
        - page_count: Number of pages in the chunk
        - token_count: Estimated tokens in the chunk
        
    Example:
        >>> tokens = [1500] * 100  # 100 pages, 1500 tokens each
        >>> chunks = calculate_chunks_token_based(tokens, 100000, 5000)
        >>> all(c['token_count'] <= 100000 for c in chunks)
        True
    """
    chunks = []
    current_chunk_start = 0
    current_chunk_tokens = 0
    chunk_index = 0
    
    for page_num, page_tokens in enumerate(tokens_per_page):
        # Check if adding this page would exceed the limit
        if current_chunk_tokens + page_tokens > max_tokens_per_chunk and current_chunk_tokens > 0:
            # Finalize current chunk
            chunks.append({
                'chunk_index': chunk_index,
                'start_page': current_chunk_start,
                'end_page': page_num - 1,
                'page_count': page_num - current_chunk_start,
                'token_count': current_chunk_tokens
            })
            
            # Calculate overlap: go back to find pages that sum to overlap_tokens
            overlap_start_page = page_num - 1
            overlap_accumulated = 0
            
            while (overlap_start_page >= current_chunk_start and 
                   overlap_accumulated < overlap_tokens):
                overlap_accumulated += tokens_per_page[overlap_start_page]
                overlap_start_page -= 1
            
            # Start new chunk with overlap
            current_chunk_start = max(0, overlap_start_page + 1)
            current_chunk_tokens = overlap_accumulated + page_tokens
            chunk_index += 1
        else:
            # Add page to current chunk
            current_chunk_tokens += page_tokens
    
    # Add final chunk
    if current_chunk_tokens > 0:
        chunks.append({
            'chunk_index': chunk_index,
            'start_page': current_chunk_start,
            'end_page': len(tokens_per_page) - 1,
            'page_count': len(tokens_per_page) - current_chunk_start,
            'token_count': current_chunk_tokens
        })
    
    return chunks



def calculate_chunks_hybrid(
    tokens_per_page: List[int],
    target_tokens: int = 80000,
    max_pages: int = 99,
    overlap_tokens: int = 5000
) -> List[Dict[str, Any]]:
    """
    Hybrid chunking: target token count but respect page limits (RECOMMENDED).
    
    This is the recommended strategy for production use. It combines the benefits
    of both fixed-pages and token-based strategies:
    - Targets an optimal token count per chunk (soft limit)
    - Enforces a maximum page count per chunk (hard limit)
    - Maintains token-based overlap for context preservation
    
    The strategy creates balanced chunks that respect both token and page constraints,
    making it suitable for documents with variable content density.
    
    IMPORTANT: The default max_pages is 99 (not 100) because Bedrock has a hard limit
    of 100 pages per PDF. Using 99 provides a safety margin.
    
    Args:
        tokens_per_page: List of token counts for each page
        target_tokens: Target tokens per chunk (soft limit, default: 80000)
        max_pages: Maximum pages per chunk (hard limit, default: 99)
        overlap_tokens: Target overlapping tokens between chunks (default: 5000)
        
    Returns:
        List of chunk metadata dictionaries with:
        - chunk_index: Index of the chunk (0-based)
        - start_page: Starting page number (0-based)
        - end_page: Ending page number (0-based, inclusive)
        - page_count: Number of pages in the chunk
        - token_count: Estimated tokens in the chunk
        - finalize_reason: Why the chunk was finalized ('token_limit', 'page_limit', or 'final_chunk')
        
    Example:
        >>> tokens = [2000] * 200  # 200 pages, 2000 tokens each
        >>> chunks = calculate_chunks_hybrid(tokens, 80000, 99, 5000)
        >>> all(c['page_count'] <= 99 for c in chunks)
        True
        >>> all(c['token_count'] <= 100000 for c in chunks)  # Some tolerance for overlap
        True
    """
    chunks = []
    current_chunk_start = 0
    current_chunk_tokens = 0
    current_chunk_pages = 0
    chunk_index = 0
    
    for page_num, page_tokens in enumerate(tokens_per_page):
        # Check if we should finalize this chunk
        # Note: We use >= for max_pages to ensure we stay UNDER the limit
        # This is critical because Bedrock has a hard 100-page limit for PDF processing
        should_finalize = (
            # Reached target tokens (soft limit)
            (current_chunk_tokens + page_tokens > target_tokens and current_chunk_tokens > 0) or
            # Would exceed max pages (hard limit) - finalize BEFORE adding this page
            (current_chunk_pages >= max_pages and current_chunk_pages > 0)
        )
        
        if should_finalize:
            # Determine finalize reason
            finalize_reason = 'page_limit' if current_chunk_pages >= max_pages else 'token_limit'
            
            # Finalize current chunk
            chunks.append({
                'chunk_index': chunk_index,
                'start_page': current_chunk_start,
                'end_page': page_num - 1,
                'page_count': current_chunk_pages,
                'token_count': current_chunk_tokens,
                'finalize_reason': finalize_reason
            })
            
            # Calculate overlap: go back to find pages that sum to overlap_tokens
            overlap_start_page = page_num - 1
            overlap_accumulated = 0
            overlap_pages = 0
            
            while (overlap_start_page >= current_chunk_start and 
                   overlap_accumulated < overlap_tokens and
                   overlap_pages < 10):  # Max 10 pages overlap
                overlap_accumulated += tokens_per_page[overlap_start_page]
                overlap_pages += 1
                overlap_start_page -= 1
            
            # Start new chunk with overlap
            current_chunk_start = max(0, overlap_start_page + 1)
            current_chunk_tokens = overlap_accumulated + page_tokens
            current_chunk_pages = overlap_pages + 1
            chunk_index += 1
        else:
            # Add page to current chunk
            current_chunk_tokens += page_tokens
            current_chunk_pages += 1
    
    # Add final chunk - but check if it exceeds max_pages
    if current_chunk_tokens > 0:
        # If final chunk exceeds max_pages, we need to split it
        while current_chunk_pages > max_pages:
            # Calculate where to split (at max_pages from current_chunk_start)
            split_end_page = current_chunk_start + max_pages - 1
            split_tokens = sum(tokens_per_page[current_chunk_start:split_end_page + 1])
            
            chunks.append({
                'chunk_index': chunk_index,
                'start_page': current_chunk_start,
                'end_page': split_end_page,
                'page_count': max_pages,
                'token_count': split_tokens,
                'finalize_reason': 'page_limit'
            })
            
            # Calculate overlap for next chunk
            overlap_start_page = split_end_page
            overlap_accumulated = 0
            overlap_pages = 0
            
            while (overlap_start_page >= current_chunk_start and 
                   overlap_accumulated < overlap_tokens and
                   overlap_pages < 10):
                overlap_accumulated += tokens_per_page[overlap_start_page]
                overlap_pages += 1
                overlap_start_page -= 1
            
            # Update for next iteration
            current_chunk_start = max(0, overlap_start_page + 1)
            current_chunk_pages = len(tokens_per_page) - current_chunk_start
            current_chunk_tokens = sum(tokens_per_page[current_chunk_start:])
            chunk_index += 1
        
        # Add the final chunk (now guaranteed to be <= max_pages)
        chunks.append({
            'chunk_index': chunk_index,
            'start_page': current_chunk_start,
            'end_page': len(tokens_per_page) - 1,
            'page_count': current_chunk_pages,
            'token_count': current_chunk_tokens,
            'finalize_reason': 'final_chunk'
        })
    
    return chunks


def validate_configuration(config: Dict[str, Any]) -> bool:
    """
    Validate chunking configuration parameters.
    
    Validates that configuration parameters meet the following constraints:
    - chunk_size > 0 (positive chunk size)
    - overlap >= 0 (non-negative overlap)
    - overlap < chunk_size (overlap must be less than chunk size)
    - threshold > 0 (positive threshold)
    - max_tokens_per_chunk > 0 (positive token limit)
    - target_tokens > 0 (positive target tokens)
    - max_pages > 0 (positive page limit)
    
    Args:
        config: Configuration dictionary with chunking parameters
        
    Returns:
        True if configuration is valid, False otherwise
        
    Raises:
        ConfigurationError: If configuration is invalid (when strict=True in config)
        
    Example:
        >>> validate_configuration({'chunkSize': 50, 'overlapPages': 5, 'pageThreshold': 100})
        True
        >>> validate_configuration({'chunkSize': -10, 'overlapPages': 5})
        False
        >>> validate_configuration({'chunkSize': 50, 'overlapPages': 60})
        False
    """
    errors = []
    
    # Validate chunk_size
    chunk_size = config.get('chunkSize', config.get('chunk_size'))
    if chunk_size is not None:
        if not isinstance(chunk_size, (int, float)) or chunk_size <= 0:
            errors.append(f"chunk_size must be positive, got {chunk_size}")
    
    # Validate overlap
    overlap = config.get('overlapPages', config.get('overlap_pages', config.get('overlap', 0)))
    if overlap is not None:
        if not isinstance(overlap, (int, float)) or overlap < 0:
            errors.append(f"overlap must be non-negative, got {overlap}")
        
        # Check overlap < chunk_size
        if chunk_size is not None and overlap >= chunk_size:
            errors.append(f"overlap ({overlap}) must be less than chunk_size ({chunk_size})")
    
    # Validate threshold
    threshold = config.get('pageThreshold', config.get('page_threshold', config.get('threshold')))
    if threshold is not None:
        if not isinstance(threshold, (int, float)) or threshold <= 0:
            errors.append(f"threshold must be positive, got {threshold}")
    
    # Validate token threshold
    token_threshold = config.get('tokenThreshold', config.get('token_threshold'))
    if token_threshold is not None:
        if not isinstance(token_threshold, (int, float)) or token_threshold <= 0:
            errors.append(f"token_threshold must be positive, got {token_threshold}")
    
    # Validate max_tokens_per_chunk
    max_tokens = config.get('maxTokensPerChunk', config.get('max_tokens_per_chunk'))
    if max_tokens is not None:
        if not isinstance(max_tokens, (int, float)) or max_tokens <= 0:
            errors.append(f"max_tokens_per_chunk must be positive, got {max_tokens}")
    
    # Validate target_tokens
    target_tokens = config.get('targetTokensPerChunk', config.get('target_tokens'))
    if target_tokens is not None:
        if not isinstance(target_tokens, (int, float)) or target_tokens <= 0:
            errors.append(f"target_tokens must be positive, got {target_tokens}")
    
    # Validate max_pages
    max_pages = config.get('maxPagesPerChunk', config.get('max_pages'))
    if max_pages is not None:
        if not isinstance(max_pages, (int, float)) or max_pages <= 0:
            errors.append(f"max_pages must be positive, got {max_pages}")
    
    # Validate overlap_tokens
    overlap_tokens = config.get('overlapTokens', config.get('overlap_tokens'))
    if overlap_tokens is not None:
        if not isinstance(overlap_tokens, (int, float)) or overlap_tokens < 0:
            errors.append(f"overlap_tokens must be non-negative, got {overlap_tokens}")
    
    # If strict mode, raise exception
    if errors and config.get('strict', False):
        raise ConfigurationError("; ".join(errors))
    
    return len(errors) == 0



def validate_fixed_pages_config(
    chunk_size: int,
    overlap_pages: int,
    threshold: int
) -> None:
    """
    Validate fixed-pages strategy configuration.
    
    Args:
        chunk_size: Number of pages per chunk
        overlap_pages: Number of overlapping pages
        threshold: Page count threshold for chunking
        
    Raises:
        ConfigurationError: If configuration is invalid
    """
    config = {
        'chunkSize': chunk_size,
        'overlapPages': overlap_pages,
        'pageThreshold': threshold,
        'strict': True
    }
    validate_configuration(config)


def validate_token_based_config(
    max_tokens_per_chunk: int,
    overlap_tokens: int,
    threshold: int
) -> None:
    """
    Validate token-based strategy configuration.
    
    Args:
        max_tokens_per_chunk: Maximum tokens per chunk
        overlap_tokens: Overlapping tokens between chunks
        threshold: Token count threshold for chunking
        
    Raises:
        ConfigurationError: If configuration is invalid
    """
    config = {
        'maxTokensPerChunk': max_tokens_per_chunk,
        'overlapTokens': overlap_tokens,
        'tokenThreshold': threshold,
        'strict': True
    }
    validate_configuration(config)


def validate_hybrid_config(
    target_tokens: int,
    max_pages: int,
    overlap_tokens: int
) -> None:
    """
    Validate hybrid strategy configuration.
    
    Args:
        target_tokens: Target tokens per chunk
        max_pages: Maximum pages per chunk
        overlap_tokens: Overlapping tokens between chunks
        
    Raises:
        ConfigurationError: If configuration is invalid
    """
    config = {
        'targetTokensPerChunk': target_tokens,
        'maxPagesPerChunk': max_pages,
        'overlapTokens': overlap_tokens,
        'strict': True
    }
    validate_configuration(config)
