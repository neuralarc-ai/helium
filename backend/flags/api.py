from fastapi import APIRouter
from utils.logger import logger
from .flags import list_flags, is_enabled, get_flag_details, get_available_flags, _check_env_flag

router = APIRouter()


@router.get("/feature-flags")
async def get_feature_flags():
    try:
        flags = await list_flags()
        return {"flags": flags}
    except Exception as e:
        logger.error(f"Error fetching feature flags: {str(e)}")
        return {"flags": {}}

@router.get("/feature-flags/available")
async def get_available_feature_flags():
    """Get all available feature flags and their environment variable names"""
    try:
        available_flags = get_available_flags()
        flags_with_env = {}
        
        for flag_name, env_var in available_flags.items():
            env_value = _check_env_flag(flag_name)
            flags_with_env[flag_name] = {
                "environment_variable": env_var,
                "environment_value": env_value,
                "description": f"Set {env_var}=true to enable this feature"
            }
        
        return {
            "available_flags": flags_with_env,
            "usage": "Set environment variables like FLAG_KNOWLEDGE_BASE=true to enable features"
        }
    except Exception as e:
        logger.error(f"Error fetching available feature flags: {str(e)}")
        return {"available_flags": {}}

@router.get("/feature-flags/{flag_name}")
async def get_feature_flag(flag_name: str):
    try:
        enabled = await is_enabled(flag_name)
        details = await get_flag_details(flag_name)
        
        # Check if flag is set via environment variable
        env_flag = _check_env_flag(flag_name)
        env_info = None
        if env_flag is not None:
            env_info = {
                "environment_variable": f"FLAG_{flag_name.upper()}",
                "environment_value": env_flag,
                "source": "environment"
            }
        
        return {
            "flag_name": flag_name,
            "enabled": enabled,
            "details": details,
            "environment_info": env_info
        }
    except Exception as e:
        logger.error(f"Error fetching feature flag {flag_name}: {str(e)}")
        return {
            "flag_name": flag_name,
            "enabled": False,
            "details": None,
            "environment_info": None
        } 