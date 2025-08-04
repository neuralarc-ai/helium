from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional, Dict, Any
from pydantic import BaseModel

from utils.logger import logger
from utils.auth_utils import get_current_user_id_from_jwt
from services.supabase import DBConnection

from .template_service import (
    get_template_service,
    AgentTemplate,
    TemplateNotFoundError,
    TemplateAccessDeniedError,
    SunaDefaultAgentTemplateError
)
from .installation_service import (
    get_installation_service,
    TemplateInstallationRequest,
    TemplateInstallationResult,
    TemplateInstallationError,
    InvalidCredentialError
)
from .utils import format_template_for_response

router = APIRouter()

db: Optional[DBConnection] = None


class CreateTemplateRequest(BaseModel):
    agent_id: str
    make_public: bool = False
    tags: Optional[List[str]] = None


class InstallTemplateRequest(BaseModel):
    template_id: str
    instance_name: Optional[str] = None
    custom_system_prompt: Optional[str] = None
    profile_mappings: Optional[Dict[str, str]] = None
    custom_mcp_configs: Optional[Dict[str, Dict[str, Any]]] = None


class PublishTemplateRequest(BaseModel):
    tags: Optional[List[str]] = None


class TemplateResponse(BaseModel):
    template_id: str
    name: str
    description: Optional[str]
    mcp_requirements: List[Dict[str, Any]]
    agentpress_tools: Dict[str, Any]
    tags: List[str]
    is_public: bool
    download_count: int
    marketplace_published_at: Optional[str]
    created_at: str
    creator_name: Optional[str] = None
    avatar: Optional[str]
    avatar_color: Optional[str]


class InstallationResponse(BaseModel):
    status: str
    instance_id: Optional[str] = None
    name: Optional[str] = None
    missing_regular_credentials: List[Dict[str, Any]] = []
    missing_custom_configs: List[Dict[str, Any]] = []
    template_info: Optional[Dict[str, Any]] = None


def initialize(database: DBConnection):
    global db
    db = database


@router.post("", response_model=Dict[str, str])
async def create_template_from_agent(
    request: CreateTemplateRequest,
    user_id: str = Depends(get_current_user_id_from_jwt)
):
    try:
        template_service = get_template_service(db)
        
        template_id = await template_service.create_from_agent(
            agent_id=request.agent_id,
            creator_id=user_id,
            make_public=request.make_public,
            tags=request.tags
        )
        
        return {"template_id": template_id}
        
    except TemplateNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except TemplateAccessDeniedError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except SunaDefaultAgentTemplateError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating template: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/{template_id}/publish")
async def publish_template(
    template_id: str,
    request: PublishTemplateRequest,
    user_id: str = Depends(get_current_user_id_from_jwt)
):
    try:
        template_service = get_template_service(db)
        
        success = await template_service.publish_template(template_id, user_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Template not found or access denied")
        
        return {"message": "Template published successfully"}
        
    except Exception as e:
        logger.error(f"Error publishing template: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/{template_id}/unpublish")
async def unpublish_template(
    template_id: str,
    user_id: str = Depends(get_current_user_id_from_jwt)
):
    try:
        template_service = get_template_service(db)
        
        success = await template_service.unpublish_template(template_id, user_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Template not found or access denied")
        
        return {"message": "Template unpublished successfully"}
        
    except Exception as e:
        logger.error(f"Error unpublishing template: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/install", response_model=InstallationResponse)
async def install_template(
    request: InstallTemplateRequest,
    user_id: str = Depends(get_current_user_id_from_jwt)
):
    try:
        installation_service = get_installation_service(db)
        
        install_request = TemplateInstallationRequest(
            template_id=request.template_id,
            account_id=user_id,
            instance_name=request.instance_name,
            custom_system_prompt=request.custom_system_prompt,
            profile_mappings=request.profile_mappings,
            custom_mcp_configs=request.custom_mcp_configs
        )
        
        result = await installation_service.install_template(install_request)
        
        return InstallationResponse(
            status=result.status,
            instance_id=result.instance_id,
            name=result.name,
            missing_regular_credentials=result.missing_regular_credentials,
            missing_custom_configs=result.missing_custom_configs,
            template_info=result.template_info
        )
        
    except TemplateInstallationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except InvalidCredentialError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error installing template: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/marketplace", response_model=List[TemplateResponse])
async def get_marketplace_templates():
    try:
        template_service = get_template_service(db)
        templates = await template_service.get_public_templates()
        
        return [
            TemplateResponse(
                **format_template_for_response(template),
                creator_name=None 
            )
            for template in templates
        ]
        
    except Exception as e:
        logger.error(f"Error getting marketplace templates: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/my", response_model=List[TemplateResponse])
async def get_my_templates(
    user_id: str = Depends(get_current_user_id_from_jwt)
):
    try:
        template_service = get_template_service(db)
        templates = await template_service.get_user_templates(user_id)
        
        return [
            TemplateResponse(
                **format_template_for_response(template),
                creator_name=None
            )
            for template in templates
        ]
        
    except Exception as e:
        logger.error(f"Error getting user templates: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/{template_id}", response_model=TemplateResponse)
async def get_template(
    template_id: str,
    user_id: str = Depends(get_current_user_id_from_jwt)
):
    try:
        template_service = get_template_service(db)
        template = await template_service.get_template(template_id)
        
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")
        
        await template_service.validate_access(template, user_id)
        
        return TemplateResponse(
            **format_template_for_response(template),
            creator_name=None
        )
        
    except TemplateAccessDeniedError:
        raise HTTPException(status_code=403, detail="Access denied to template")
    except Exception as e:
        logger.error(f"Error getting template: {e}")
        raise HTTPException(status_code=500, detail="Internal server error") 