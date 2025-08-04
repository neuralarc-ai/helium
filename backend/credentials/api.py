from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, validator
import urllib.parse

from utils.logger import logger
from utils.auth_utils import get_current_user_id_from_jwt
from services.supabase import DBConnection

from .credential_service import (
    get_credential_service, 
    MCPCredential, 
    CredentialNotFoundError, 
    CredentialAccessDeniedError
)
from .profile_service import (
    get_profile_service, 
    MCPCredentialProfile, 
    ProfileNotFoundError, 
    ProfileAccessDeniedError
)
from .utils import validate_config_not_empty, decode_mcp_qualified_name, extract_config_keys

router = APIRouter()

db: Optional[DBConnection] = None

class StoreCredentialRequest(BaseModel):
    mcp_qualified_name: str
    display_name: str
    config: Dict[str, Any]
    
    @validator('config')
    def validate_config_not_empty_field(cls, v):
        return validate_config_not_empty(v)


class StoreCredentialProfileRequest(BaseModel):
    mcp_qualified_name: str
    profile_name: str
    display_name: str
    config: Dict[str, Any]
    is_default: bool = False
    
    @validator('config')
    def validate_config_not_empty_field(cls, v):
        return validate_config_not_empty(v)


class CredentialResponse(BaseModel):
    credential_id: str
    mcp_qualified_name: str
    display_name: str
    config_keys: List[str]
    is_active: bool
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class CredentialProfileResponse(BaseModel):
    profile_id: str
    mcp_qualified_name: str
    profile_name: str
    display_name: str
    config_keys: List[str]
    is_active: bool
    is_default: bool
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


def initialize(database: DBConnection):
    global db
    db = database


@router.post("/credentials", response_model=CredentialResponse)
async def store_credential(
    request: StoreCredentialRequest,
    user_id: str = Depends(get_current_user_id_from_jwt)
):
    try:
        credential_service = get_credential_service(db)
        
        credential_id = await credential_service.store_credential(
            account_id=user_id,
            mcp_qualified_name=request.mcp_qualified_name,
            display_name=request.display_name,
            config=request.config
        )
        
        credential = await credential_service.get_credential(user_id, request.mcp_qualified_name)
        if not credential:
            raise HTTPException(status_code=500, detail="Failed to retrieve stored credential")
        
        return CredentialResponse(
            credential_id=credential.credential_id,
            mcp_qualified_name=credential.mcp_qualified_name,
            display_name=credential.display_name,
            config_keys=extract_config_keys(credential.config),
            is_active=credential.is_active,
            created_at=credential.created_at.isoformat() if credential.created_at else None,
            updated_at=credential.updated_at.isoformat() if credential.updated_at else None
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error storing credential: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/credentials", response_model=List[CredentialResponse])
async def get_user_credentials(
    user_id: str = Depends(get_current_user_id_from_jwt)
):
    try:
        credential_service = get_credential_service(db)
        credentials = await credential_service.get_user_credentials(user_id)
        
        return [
            CredentialResponse(
                credential_id=cred.credential_id,
                mcp_qualified_name=cred.mcp_qualified_name,
                display_name=cred.display_name,
                config_keys=extract_config_keys(cred.config),
                is_active=cred.is_active,
                created_at=cred.created_at.isoformat() if cred.created_at else None,
                updated_at=cred.updated_at.isoformat() if cred.updated_at else None
            )
            for cred in credentials
        ]
        
    except Exception as e:
        logger.error(f"Error getting user credentials: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.delete("/credentials/{mcp_qualified_name:path}")
async def delete_credential(
    mcp_qualified_name: str,
    user_id: str = Depends(get_current_user_id_from_jwt)
):
    try:
        decoded_name = decode_mcp_qualified_name(mcp_qualified_name)
        
        credential_service = get_credential_service(db)
        success = await credential_service.delete_credential(user_id, decoded_name)
        
        if not success:
            raise HTTPException(status_code=404, detail="Credential not found")
        
        return {"message": "Credential deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting credential: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/credential-profiles", response_model=CredentialProfileResponse)
async def store_credential_profile(
    request: StoreCredentialProfileRequest,
    user_id: str = Depends(get_current_user_id_from_jwt)
):
    try:
        profile_service = get_profile_service(db)
        
        profile_id = await profile_service.store_profile(
            account_id=user_id,
            mcp_qualified_name=request.mcp_qualified_name,
            profile_name=request.profile_name,
            display_name=request.display_name,
            config=request.config,
            is_default=request.is_default
        )
        
        profile = await profile_service.get_profile(user_id, profile_id)
        if not profile:
            raise HTTPException(status_code=500, detail="Failed to retrieve stored profile")
        
        return CredentialProfileResponse(
            profile_id=profile.profile_id,
            mcp_qualified_name=profile.mcp_qualified_name,
            profile_name=profile.profile_name,
            display_name=profile.display_name,
            config_keys=extract_config_keys(profile.config),
            is_active=profile.is_active,
            is_default=profile.is_default,
            created_at=profile.created_at.isoformat() if profile.created_at else None,
            updated_at=profile.updated_at.isoformat() if profile.updated_at else None
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error storing credential profile: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/credential-profiles", response_model=List[CredentialProfileResponse])
async def get_user_credential_profiles(
    user_id: str = Depends(get_current_user_id_from_jwt)
):
    try:
        profile_service = get_profile_service(db)
        profiles = await profile_service.get_all_user_profiles(user_id)
        
        return [
            CredentialProfileResponse(
                profile_id=profile.profile_id,
                mcp_qualified_name=profile.mcp_qualified_name,
                profile_name=profile.profile_name,
                display_name=profile.display_name,
                config_keys=extract_config_keys(profile.config),
                is_active=profile.is_active,
                is_default=profile.is_default,
                created_at=profile.created_at.isoformat() if profile.created_at else None,
                updated_at=profile.updated_at.isoformat() if profile.updated_at else None
            )
            for profile in profiles
        ]
        
    except Exception as e:
        logger.error(f"Error getting user credential profiles: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/credential-profiles/{mcp_qualified_name:path}", response_model=List[CredentialProfileResponse])
async def get_credential_profiles_for_mcp(
    mcp_qualified_name: str,
    user_id: str = Depends(get_current_user_id_from_jwt)
):
    try:
        decoded_name = decode_mcp_qualified_name(mcp_qualified_name)
        
        profile_service = get_profile_service(db)
        profiles = await profile_service.get_profiles(user_id, decoded_name)
        
        return [
            CredentialProfileResponse(
                profile_id=profile.profile_id,
                mcp_qualified_name=profile.mcp_qualified_name,
                profile_name=profile.profile_name,
                display_name=profile.display_name,
                config_keys=extract_config_keys(profile.config),
                is_active=profile.is_active,
                is_default=profile.is_default,
                created_at=profile.created_at.isoformat() if profile.created_at else None,
                updated_at=profile.updated_at.isoformat() if profile.updated_at else None
            )
            for profile in profiles
        ]
        
    except Exception as e:
        logger.error(f"Error getting credential profiles for MCP: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/credential-profiles/profile/{profile_id}", response_model=CredentialProfileResponse)
async def get_credential_profile(
    profile_id: str,
    user_id: str = Depends(get_current_user_id_from_jwt)
):
    try:
        profile_service = get_profile_service(db)
        profile = await profile_service.get_profile(user_id, profile_id)
        
        if not profile:
            raise HTTPException(status_code=404, detail="Profile not found")
        
        return CredentialProfileResponse(
            profile_id=profile.profile_id,
            mcp_qualified_name=profile.mcp_qualified_name,
            profile_name=profile.profile_name,
            display_name=profile.display_name,
            config_keys=extract_config_keys(profile.config),
            is_active=profile.is_active,
            is_default=profile.is_default,
            created_at=profile.created_at.isoformat() if profile.created_at else None,
            updated_at=profile.updated_at.isoformat() if profile.updated_at else None
        )
        
    except ProfileAccessDeniedError:
        raise HTTPException(status_code=403, detail="Access denied to profile")
    except Exception as e:
        logger.error(f"Error getting credential profile: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.put("/credential-profiles/{profile_id}/set-default")
async def set_default_credential_profile(
    profile_id: str,
    user_id: str = Depends(get_current_user_id_from_jwt)
):
    try:
        profile_service = get_profile_service(db)
        success = await profile_service.set_default_profile(user_id, profile_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Profile not found")
        
        return {"message": "Profile set as default successfully"}
        
    except Exception as e:
        logger.error(f"Error setting default profile: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.delete("/credential-profiles/{profile_id}")
async def delete_credential_profile(
    profile_id: str,
    user_id: str = Depends(get_current_user_id_from_jwt)
):
    try:
        profile_service = get_profile_service(db)
        success = await profile_service.delete_profile(user_id, profile_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Profile not found")
        
        return {"message": "Profile deleted successfully"}
        
    except Exception as e:
        logger.error(f"Error deleting profile: {e}")
        raise HTTPException(status_code=500, detail="Internal server error") 