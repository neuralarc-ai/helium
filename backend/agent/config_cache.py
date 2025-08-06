"""
Agent configuration caching to improve performance.
"""

import asyncio
import json
from typing import Dict, Optional, Any
from datetime import datetime, timedelta
from utils.logger import logger

class AgentConfigCache:
    """Simple in-memory cache for agent configurations."""
    
    def __init__(self, ttl_seconds: int = 300):  # 5 minutes TTL
        self._cache: Dict[str, Dict[str, Any]] = {}
        self._ttl = ttl_seconds
        self._lock = asyncio.Lock()
    
    def _is_expired(self, cache_entry: Dict[str, Any]) -> bool:
        """Check if a cache entry has expired."""
        cached_at = cache_entry.get('cached_at')
        if not cached_at:
            return True
        
        expiry_time = cached_at + timedelta(seconds=self._ttl)
        return datetime.utcnow() > expiry_time
    
    async def get(self, cache_key: str) -> Optional[Dict[str, Any]]:
        """Get agent config from cache if available and not expired."""
        async with self._lock:
            if cache_key not in self._cache:
                return None
            
            cache_entry = self._cache[cache_key]
            if self._is_expired(cache_entry):
                del self._cache[cache_key]
                return None
            
            logger.debug(f"Cache hit for agent config: {cache_key}")
            return cache_entry['config']
    
    async def set(self, cache_key: str, config: Dict[str, Any]) -> None:
        """Store agent config in cache."""
        async with self._lock:
            self._cache[cache_key] = {
                'config': config,
                'cached_at': datetime.utcnow()
            }
            logger.debug(f"Cached agent config: {cache_key}")
    
    async def invalidate(self, cache_key: str) -> None:
        """Remove specific entry from cache."""
        async with self._lock:
            if cache_key in self._cache:
                del self._cache[cache_key]
                logger.debug(f"Invalidated cache for: {cache_key}")
    
    async def clear(self) -> None:
        """Clear all cache entries."""
        async with self._lock:
            self._cache.clear()
            logger.debug("Cleared agent config cache")
    
    def get_cache_key(self, agent_id: str, version_id: Optional[str] = None, account_id: Optional[str] = None) -> str:
        """Generate cache key for agent configuration."""
        key_parts = [agent_id]
        if version_id:
            key_parts.append(version_id)
        if account_id:
            key_parts.append(account_id)
        return ":".join(key_parts)

# Global cache instance
agent_config_cache = AgentConfigCache()