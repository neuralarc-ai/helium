"""
Account ID utilities for consistent handling across the application.
This module provides functions to normalize account IDs for storage and retrieval.
"""

from typing import Union

# Try to import logger, but handle the case where it's not available
try:
    from utils.logger import logger
except ImportError:
    # Create a simple logger if the real one is not available
    import logging
    logger = logging.getLogger(__name__)
    if not logger.handlers:
        handler = logging.StreamHandler()
        formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
        handler.setFormatter(formatter)
        logger.addHandler(handler)
        logger.setLevel(logging.INFO)


def normalize_account_id(account_id: Union[str, int, None]) -> str:
    """
    Normalize an account ID to a consistent string format.
    
    Args:
        account_id: The account ID to normalize (can be string, int, or None)
        
    Returns:
        Normalized account ID as a lowercase string with whitespace trimmed
        
    Examples:
        >>> normalize_account_id("123e4567-e89b-12d3-a456-426614174000")
        '123e4567-e89b-12d3-a456-426614174000'
        >>> normalize_account_id("  ABC123  ")
        'abc123'
        >>> normalize_account_id(123)
        '123'
        >>> normalize_account_id(None)
        ''
    """
    if account_id is None:
        return ""
    
    # Convert to string, trim whitespace, and convert to lowercase
    normalized = str(account_id).strip().lower()
    
    logger.debug(f"Normalized account_id: {account_id} -> {normalized}")
    return normalized


def normalize_account_id_for_storage(account_id: Union[str, int, None]) -> str:
    """
    Normalize an account ID specifically for storage operations.
    This ensures consistent storage format across all knowledge base operations.
    
    Args:
        account_id: The account ID to normalize
        
    Returns:
        Normalized account ID ready for storage
    """
    return normalize_account_id(account_id)


def normalize_account_id_for_retrieval(account_id: Union[str, int, None]) -> str:
    """
    Normalize an account ID specifically for retrieval operations.
    This ensures consistent lookup format across all knowledge base operations.
    
    Args:
        account_id: The account ID to normalize
        
    Returns:
        Normalized account ID ready for retrieval
    """
    return normalize_account_id(account_id)


def get_account_id_variants(account_id: Union[str, int, None]) -> list[str]:
    """
    Get all possible variants of an account ID for flexible matching.
    This is useful when we need to match against multiple possible formats.
    
    Args:
        account_id: The account ID to generate variants for
        
    Returns:
        List of possible account ID variants (normalized and original formats)
        
    Examples:
        >>> get_account_id_variants("123e4567-e89b-12d3-a456-426614174000")
        ['123e4567-e89b-12d3-a456-426614174000', '123e4567-e89b-12d3-a456-426614174000']
        >>> get_account_id_variants("  ABC123  ")
        ['abc123', 'abc123']
    """
    if account_id is None:
        return [""]
    
    normalized = normalize_account_id(account_id)
    original = str(account_id).strip()
    
    variants = [normalized]
    if original != normalized:
        variants.append(original)
    
    # Remove duplicates while preserving order
    seen = set()
    unique_variants = []
    for variant in variants:
        if variant not in seen:
            seen.add(variant)
            unique_variants.append(variant)
    
    logger.debug(f"Account ID variants for {account_id}: {unique_variants}")
    return unique_variants 