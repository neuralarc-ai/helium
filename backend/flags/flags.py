import json
import logging
import os
from datetime import datetime
from typing import Dict, List, Optional
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from services import redis

logger = logging.getLogger(__name__)

def _check_env_flag(key: str) -> Optional[bool]:
    """
    Check if a feature flag is enabled via environment variable.
    Environment variables should be in the format: FLAG_{UPPERCASE_KEY}
    Example: FLAG_KNOWLEDGE_BASE=true
    """
    env_key = f"FLAG_{key.upper()}"
    env_value = os.getenv(env_key)
    
    if env_value is not None:
        # Convert string to boolean
        enabled = env_value.lower() in ('true', 't', 'yes', 'y', '1')
        logger.info(f"Feature flag {key} set to {enabled} via environment variable {env_key}")
        return enabled
    
    return None

def get_available_flags() -> Dict[str, str]:
    """
    Get all available feature flags and their corresponding environment variable names.
    Returns a dictionary mapping flag names to their environment variable names.
    """
    return {
        "custom_agents": "FLAG_CUSTOM_AGENTS",
        "mcp_module": "FLAG_MCP_MODULE", 
        "templates_api": "FLAG_TEMPLATES_API",
        "triggers_api": "FLAG_TRIGGERS_API",
        "workflows_api": "FLAG_WORKFLOWS_API",
        "knowledge_base": "FLAG_KNOWLEDGE_BASE",
        "pipedream": "FLAG_PIPEDREAM",
        "credentials_api": "FLAG_CREDENTIALS_API",
        "suna_default_agent": "FLAG_SUNA_DEFAULT_AGENT"
    }

class FeatureFlagManager:
    def __init__(self):
        """Initialize with existing Redis service"""
        self.flag_prefix = "feature_flag:"
        self.flag_list_key = "feature_flags:list"
    
    async def set_flag(self, key: str, enabled: bool, description: str = "") -> bool:
        """Set a feature flag to enabled or disabled"""
        try:
            flag_key = f"{self.flag_prefix}{key}"
            flag_data = {
                'enabled': str(enabled).lower(),
                'description': description,
                'updated_at': datetime.utcnow().isoformat()
            }
            
            # Use the existing Redis service
            redis_client = await redis.get_client()
            await redis_client.hset(flag_key, mapping=flag_data)
            await redis_client.sadd(self.flag_list_key, key)
            
            logger.info(f"Set feature flag {key} to {enabled}")
            return True
        except Exception as e:
            logger.error(f"Failed to set feature flag {key}: {e}")
            return False
    
    async def is_enabled(self, key: str) -> bool:
        """Check if a feature flag is enabled"""
        # First check environment variable
        env_flag = _check_env_flag(key)
        if env_flag is not None:
            return env_flag
        
        # Fall back to Redis
        try:
            flag_key = f"{self.flag_prefix}{key}"
            redis_client = await redis.get_client()
            enabled = await redis_client.hget(flag_key, 'enabled')
            return enabled == 'true' if enabled else False
        except Exception as e:
            logger.error(f"Failed to check feature flag {key}: {e}")
            # Return False by default if Redis is unavailable
            return False
    
    async def get_flag(self, key: str) -> Optional[Dict[str, str]]:
        """Get feature flag details"""
        try:
            flag_key = f"{self.flag_prefix}{key}"
            redis_client = await redis.get_client()
            flag_data = await redis_client.hgetall(flag_key)
            return flag_data if flag_data else None
        except Exception as e:
            logger.error(f"Failed to get feature flag {key}: {e}")
            return None
    
    async def delete_flag(self, key: str) -> bool:
        """Delete a feature flag"""
        try:
            flag_key = f"{self.flag_prefix}{key}"
            redis_client = await redis.get_client()
            deleted = await redis_client.delete(flag_key)
            if deleted:
                await redis_client.srem(self.flag_list_key, key)
                logger.info(f"Deleted feature flag: {key}")
                return True
            return False
        except Exception as e:
            logger.error(f"Failed to delete feature flag {key}: {e}")
            return False
    
    async def list_flags(self) -> Dict[str, bool]:
        """List all feature flags with their status"""
        flags = {}
        
        # First check environment variables for all available flags
        available_flags = get_available_flags()
        for flag_name in available_flags.keys():
            env_flag = _check_env_flag(flag_name)
            if env_flag is not None:
                flags[flag_name] = env_flag
        
        # Then check Redis for any additional flags
        try:
            redis_client = await redis.get_client()
            flag_keys = await redis_client.smembers(self.flag_list_key)
            
            for key in flag_keys:
                # Only add if not already set by environment variable
                if key not in flags:
                    flags[key] = await self.is_enabled(key)
        except Exception as e:
            logger.error(f"Failed to list feature flags from Redis: {e}")
        
        return flags
    
    async def get_all_flags_details(self) -> Dict[str, Dict[str, str]]:
        """Get all feature flags with detailed information"""
        try:
            redis_client = await redis.get_client()
            flag_keys = await redis_client.smembers(self.flag_list_key)
            flags = {}
            
            for key in flag_keys:
                flag_data = await self.get_flag(key)
                if flag_data:
                    flags[key] = flag_data
            
            return flags
        except Exception as e:
            logger.error(f"Failed to get all flags details: {e}")
            return {}


_flag_manager: Optional[FeatureFlagManager] = None


def get_flag_manager() -> FeatureFlagManager:
    """Get the global feature flag manager instance"""
    global _flag_manager
    if _flag_manager is None:
        _flag_manager = FeatureFlagManager()
    return _flag_manager


# Async convenience functions
async def set_flag(key: str, enabled: bool, description: str = "") -> bool:
    return await get_flag_manager().set_flag(key, enabled, description)


async def is_enabled(key: str) -> bool:
    return await get_flag_manager().is_enabled(key)


async def enable_flag(key: str, description: str = "") -> bool:
    return await set_flag(key, True, description)


async def disable_flag(key: str, description: str = "") -> bool:
    return await set_flag(key, False, description)


async def delete_flag(key: str) -> bool:
    return await get_flag_manager().delete_flag(key)


async def list_flags() -> Dict[str, bool]:
    return await get_flag_manager().list_flags()


async def get_flag_details(key: str) -> Optional[Dict[str, str]]:
    return await get_flag_manager().get_flag(key)


# Feature Flags

# Custom agents feature flag
custom_agents = True

# MCP module feature flag  
mcp_module = True

# Templates API feature flag
templates_api = True

# Triggers API feature flag
triggers_api = True

# Workflows API feature flag
workflows_api = True

# Knowledge base feature flag
knowledge_base = True

# Pipedream integration feature flag
pipedream = True

# Credentials API feature flag
credentials_api = True

# Suna default agent feature flag
suna_default_agent = True



