"""
Strategy selection module for PDF chunking.

This module provides explicit threshold checks for each chunking strategy
and determines whether chunking is required based on document characteristics.

Strategies:
- fixed-pages: Chunks based on page count threshold only
- token-based: Chunks based on token count threshold only  
- hybrid: Chunks if either page OR token threshold is exceeded (RECOMMENDED)

Requirements: 7.5
"""

import logging
import os
from typing import Dict, Any, Optional, Tuple

# Try to import structured logging
try:
    from structured_logging import get_logger, log_strategy_selection, is_observability_enabled
    structured_logger = get_logger(__name__)
    USE_STRUCTURED_LOGGING = True
except ImportError:
    USE_STRUCTURED_LOGGING = False
    structured_logger = None

# Configure module logger as fallback
logger = logging.getLogger(__name__)


class StrategySelectionResult:
    """
    Result of strategy selection containing the decision and reasoning.
    
    Attributes:
        requires_chunking: Whether the document requires chunking
        strategy: The strategy used for the decision
        reason: Human-readable explanation of the decision
        document_pages: Number of pages in the document
        document_tokens: Total tokens in the document
        page_threshold: Page threshold used for comparison
        token_threshold: Token threshold used for comparison
        page_threshold_exceeded: Whether page threshold was exceeded
        token_threshold_exceeded: Whether token threshold was exceeded
    """
    
    def __init__(
        self,
        requires_chunking: bool,
        strategy: str,
        reason: str,
        document_pages: int,
        document_tokens: int,
        page_threshold: int,
        token_threshold: int,
        page_threshold_exceeded: bool,
        token_threshold_exceeded: bool
    ):
        self.requires_chunking = requires_chunking
        self.strategy = strategy
        self.reason = reason
        self.document_pages = document_pages
        self.document_tokens = document_tokens
        self.page_threshold = page_threshold
        self.token_threshold = token_threshold
        self.page_threshold_exceeded = page_threshold_exceeded
        self.token_threshold_exceeded = token_threshold_exceeded
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert result to dictionary for serialization."""
        return {
            'requires_chunking': self.requires_chunking,
            'strategy': self.strategy,
            'reason': self.reason,
            'document_pages': self.document_pages,
            'document_tokens': self.document_tokens,
            'page_threshold': self.page_threshold,
            'token_threshold': self.token_threshold,
            'page_threshold_exceeded': self.page_threshold_exceeded,
            'token_threshold_exceeded': self.token_threshold_exceeded
        }


def check_fixed_pages_threshold(
    total_pages: int,
    page_threshold: int
) -> Tuple[bool, bool]:
    """
    Check if document exceeds the fixed-pages strategy threshold.
    
    Fixed-pages strategy only considers page count, ignoring token density.
    This is the simplest and fastest strategy but may not be optimal for
    documents with variable content density.
    
    Args:
        total_pages: Total number of pages in the document
        page_threshold: Maximum pages before chunking is required
        
    Returns:
        Tuple of (requires_chunking, page_threshold_exceeded)
        
    Example:
        >>> check_fixed_pages_threshold(150, 100)
        (True, True)
        >>> check_fixed_pages_threshold(50, 100)
        (False, False)
    """
    page_threshold_exceeded = total_pages > page_threshold
    requires_chunking = page_threshold_exceeded
    
    return requires_chunking, page_threshold_exceeded


def check_token_based_threshold(
    total_tokens: int,
    token_threshold: int
) -> Tuple[bool, bool]:
    """
    Check if document exceeds the token-based strategy threshold.
    
    Token-based strategy only considers total token count, ignoring page count.
    This is ideal for documents with variable content density where token
    limits are the primary concern.
    
    Args:
        total_tokens: Total estimated tokens in the document
        token_threshold: Maximum tokens before chunking is required
        
    Returns:
        Tuple of (requires_chunking, token_threshold_exceeded)
        
    Example:
        >>> check_token_based_threshold(200000, 150000)
        (True, True)
        >>> check_token_based_threshold(100000, 150000)
        (False, False)
    """
    token_threshold_exceeded = total_tokens > token_threshold
    requires_chunking = token_threshold_exceeded
    
    return requires_chunking, token_threshold_exceeded


def check_hybrid_threshold(
    total_pages: int,
    total_tokens: int,
    page_threshold: int,
    token_threshold: int
) -> Tuple[bool, bool, bool]:
    """
    Check if document exceeds the hybrid strategy thresholds.
    
    Hybrid strategy (RECOMMENDED) triggers chunking if EITHER the page count
    OR the token count exceeds their respective thresholds. This provides
    the best balance between processing efficiency and model limits.
    
    Args:
        total_pages: Total number of pages in the document
        total_tokens: Total estimated tokens in the document
        page_threshold: Maximum pages before chunking is required
        token_threshold: Maximum tokens before chunking is required
        
    Returns:
        Tuple of (requires_chunking, page_threshold_exceeded, token_threshold_exceeded)
        
    Example:
        >>> check_hybrid_threshold(150, 100000, 100, 150000)
        (True, True, False)  # Page threshold exceeded
        >>> check_hybrid_threshold(50, 200000, 100, 150000)
        (True, False, True)  # Token threshold exceeded
        >>> check_hybrid_threshold(150, 200000, 100, 150000)
        (True, True, True)   # Both thresholds exceeded
        >>> check_hybrid_threshold(50, 100000, 100, 150000)
        (False, False, False)  # Neither threshold exceeded
    """
    page_threshold_exceeded = total_pages > page_threshold
    token_threshold_exceeded = total_tokens > token_threshold
    requires_chunking = page_threshold_exceeded or token_threshold_exceeded
    
    return requires_chunking, page_threshold_exceeded, token_threshold_exceeded


def select_strategy_and_check_thresholds(
    total_pages: int,
    total_tokens: int,
    config: Optional[Dict[str, Any]] = None
) -> StrategySelectionResult:
    """
    Select chunking strategy and check if document requires chunking.
    
    This is the main entry point for strategy selection. It determines
    which strategy to use based on configuration and checks the appropriate
    thresholds to decide if chunking is required.
    
    Args:
        total_pages: Total number of pages in the document
        total_tokens: Total estimated tokens in the document
        config: Configuration dictionary with optional keys:
            - strategy: 'fixed-pages', 'token-based', or 'hybrid' (default: 'hybrid')
            - pageThreshold: Maximum pages before chunking (default: 100)
            - tokenThreshold: Maximum tokens before chunking (default: 150000)
            
    Returns:
        StrategySelectionResult containing the decision and reasoning
        
    Example:
        >>> result = select_strategy_and_check_thresholds(150, 200000)
        >>> result.requires_chunking
        True
        >>> result.strategy
        'hybrid'
    """
    # Set default configuration
    if config is None:
        config = {}
    
    strategy = config.get('strategy', config.get('chunkingStrategy', 'hybrid'))
    page_threshold = config.get('pageThreshold', config.get('page_threshold', 100))
    token_threshold = config.get('tokenThreshold', config.get('token_threshold', 150000))
    
    # Log document characteristics
    logger.info(
        f"Strategy selection: analyzing document with {total_pages} pages "
        f"and {total_tokens} tokens using '{strategy}' strategy"
    )
    logger.debug(
        f"Threshold values: page_threshold={page_threshold}, "
        f"token_threshold={token_threshold}"
    )
    
    # Check thresholds based on strategy
    if strategy == 'fixed-pages':
        requires_chunking, page_exceeded = check_fixed_pages_threshold(
            total_pages, page_threshold
        )
        token_exceeded = False  # Not checked in fixed-pages strategy
        reason = _build_fixed_pages_reason(
            total_pages, page_threshold, requires_chunking
        )
        
    elif strategy == 'token-based':
        requires_chunking, token_exceeded = check_token_based_threshold(
            total_tokens, token_threshold
        )
        page_exceeded = False  # Not checked in token-based strategy
        reason = _build_token_based_reason(
            total_tokens, token_threshold, requires_chunking
        )
        
    else:  # hybrid (default)
        requires_chunking, page_exceeded, token_exceeded = check_hybrid_threshold(
            total_pages, total_tokens, page_threshold, token_threshold
        )
        reason = _build_hybrid_reason(
            total_pages, total_tokens, page_threshold, token_threshold,
            page_exceeded, token_exceeded, requires_chunking
        )
    
    # Log the decision with reasoning
    _log_strategy_decision(
        strategy=strategy,
        requires_chunking=requires_chunking,
        reason=reason,
        total_pages=total_pages,
        total_tokens=total_tokens,
        page_threshold=page_threshold,
        token_threshold=token_threshold,
        page_exceeded=page_exceeded,
        token_exceeded=token_exceeded
    )
    
    return StrategySelectionResult(
        requires_chunking=requires_chunking,
        strategy=strategy,
        reason=reason,
        document_pages=total_pages,
        document_tokens=total_tokens,
        page_threshold=page_threshold,
        token_threshold=token_threshold,
        page_threshold_exceeded=page_exceeded,
        token_threshold_exceeded=token_exceeded
    )


def _build_fixed_pages_reason(
    total_pages: int,
    page_threshold: int,
    requires_chunking: bool
) -> str:
    """Build human-readable reason for fixed-pages strategy decision."""
    if requires_chunking:
        return (
            f"Document has {total_pages} pages, exceeding threshold of "
            f"{page_threshold} pages (fixed-pages strategy)"
        )
    else:
        return (
            f"Document has {total_pages} pages, below threshold of "
            f"{page_threshold} pages (fixed-pages strategy)"
        )


def _build_token_based_reason(
    total_tokens: int,
    token_threshold: int,
    requires_chunking: bool
) -> str:
    """Build human-readable reason for token-based strategy decision."""
    if requires_chunking:
        return (
            f"Document has {total_tokens:,} tokens, exceeding threshold of "
            f"{token_threshold:,} tokens (token-based strategy)"
        )
    else:
        return (
            f"Document has {total_tokens:,} tokens, below threshold of "
            f"{token_threshold:,} tokens (token-based strategy)"
        )


def _build_hybrid_reason(
    total_pages: int,
    total_tokens: int,
    page_threshold: int,
    token_threshold: int,
    page_exceeded: bool,
    token_exceeded: bool,
    requires_chunking: bool
) -> str:
    """Build human-readable reason for hybrid strategy decision."""
    if requires_chunking:
        if page_exceeded and token_exceeded:
            return (
                f"Document has {total_pages} pages (threshold: {page_threshold}) "
                f"and {total_tokens:,} tokens (threshold: {token_threshold:,}), "
                f"both thresholds exceeded (hybrid strategy)"
            )
        elif page_exceeded:
            return (
                f"Document has {total_pages} pages, exceeding threshold of "
                f"{page_threshold} pages; {total_tokens:,} tokens below "
                f"threshold of {token_threshold:,} (hybrid strategy)"
            )
        else:  # token_exceeded
            return (
                f"Document has {total_tokens:,} tokens, exceeding threshold of "
                f"{token_threshold:,} tokens; {total_pages} pages below "
                f"threshold of {page_threshold} (hybrid strategy)"
            )
    else:
        return (
            f"Document has {total_pages} pages and {total_tokens:,} tokens, "
            f"below thresholds of {page_threshold} pages and "
            f"{token_threshold:,} tokens (hybrid strategy)"
        )


def _log_strategy_decision(
    strategy: str,
    requires_chunking: bool,
    reason: str,
    total_pages: int,
    total_tokens: int,
    page_threshold: int,
    token_threshold: int,
    page_exceeded: bool,
    token_exceeded: bool
) -> None:
    """
    Log the strategy selection decision with full context.
    
    This provides comprehensive logging for observability and debugging,
    including all relevant metrics and threshold comparisons.
    
    Requirements: 7.5
    """
    decision = "CHUNKING REQUIRED" if requires_chunking else "NO CHUNKING NEEDED"
    
    # Use structured logging if available and observability is enabled
    if USE_STRUCTURED_LOGGING and structured_logger and is_observability_enabled():
        log_strategy_selection(
            logger=structured_logger,
            strategy=strategy,
            requires_chunking=requires_chunking,
            reason=reason,
            document_pages=total_pages,
            document_tokens=total_tokens,
            page_threshold=page_threshold,
            token_threshold=token_threshold,
            page_threshold_exceeded=page_exceeded,
            token_threshold_exceeded=token_exceeded
        )
    else:
        # Fall back to standard logging
        logger.info(
            f"Strategy selection result: {decision}",
            extra={
                'strategy': strategy,
                'requires_chunking': requires_chunking,
                'reason': reason,
                'document_pages': total_pages,
                'document_tokens': total_tokens,
                'page_threshold': page_threshold,
                'token_threshold': token_threshold,
                'page_threshold_exceeded': page_exceeded,
                'token_threshold_exceeded': token_exceeded
            }
        )
    
    # Log detailed breakdown at debug level
    logger.debug(
        f"Strategy selection details:\n"
        f"  Strategy: {strategy}\n"
        f"  Document: {total_pages} pages, {total_tokens:,} tokens\n"
        f"  Page threshold: {page_threshold} (exceeded: {page_exceeded})\n"
        f"  Token threshold: {token_threshold:,} (exceeded: {token_exceeded})\n"
        f"  Decision: {decision}\n"
        f"  Reason: {reason}"
    )
