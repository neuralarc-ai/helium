import json
import uuid
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form, BackgroundTasks
from pydantic import BaseModel, Field, HttpUrl, field_validator
from utils.auth_utils import get_current_user_id_from_jwt
from services.supabase import DBConnection
from knowledge_base.file_processor import FileProcessor
from utils.logger import logger
from flags.flags import is_enabled
from utils.account_utils import normalize_account_id, get_account_id_variants, normalize_account_id_for_storage
from utils.knowledge_base_manager import global_kb_manager

router = APIRouter(prefix="/knowledge-base", tags=["knowledge-base"])

# Helper function to get account_id for a user
async def get_user_account_id(client, user_id: str) -> str:
    """
    Get the account_id for a user. First try to find an existing personal account,
    if not found, try to create one, otherwise use a fallback approach.
    """
    try:
        logger.info(f"Getting account_id for user {user_id}")
        
        # First try to get the personal account for this user
        try:
            result = await client.table('basejump.accounts').select('id').eq('primary_owner_user_id', user_id).eq('personal_account', True).execute()
            
            if result.data and len(result.data) > 0:
                account_id = result.data[0]['id']
                logger.info(f"Found personal account: {account_id}")
                return normalize_account_id(account_id)
        except Exception as table_error:
            logger.warning(f"Could not query basejump.accounts table: {str(table_error)}")
        
        # If no personal account found, try to create one
        try:
            import uuid
            unique_account_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"personal-{user_id}"))
            
            create_result = await client.table('basejump.accounts').insert({
                'id': unique_account_id,
                'primary_owner_user_id': user_id,
                'personal_account': True,
                'name': f"Personal Account ({user_id[:8]})"
            }).execute()
            
            if create_result.data:
                logger.info(f"Created personal account: {unique_account_id}")
                return normalize_account_id(unique_account_id)
            else:
                logger.info(f"Account may already exist: {unique_account_id}")
                return normalize_account_id(unique_account_id)
                
        except Exception as create_error:
            logger.warning(f"Could not create account: {str(create_error)}")
        
        # If all else fails, try to use the user_id directly (this might work if the constraint is not enforced)
        logger.warning(f"Using user_id as account_id as fallback: {user_id}")
        return normalize_account_id(user_id)
        
    except Exception as e:
        logger.error(f"Error in get_user_account_id: {str(e)}", exc_info=True)
        # Final fallback: return user_id
        logger.info(f"Using final fallback account_id for user {user_id}: {user_id}")
        return normalize_account_id(user_id)

class KnowledgeBaseEntry(BaseModel):
    entry_id: Optional[str] = None
    name: str = Field(..., min_length=1, max_length=255)
    description: str = Field(..., min_length=1, max_length=1000)
    content: str = Field(..., min_length=1)
    usage_context: str = Field(default="always", pattern="^(always|on_request|contextual)$")
    is_active: bool = True

class KnowledgeBaseEntryResponse(BaseModel):
    entry_id: str
    name: str
    description: str
    content: str
    usage_context: str
    is_active: bool
    content_tokens: Optional[int]
    created_at: str
    updated_at: str
    source_type: Optional[str] = None
    source_metadata: Optional[dict] = None
    file_size: Optional[int] = None
    file_mime_type: Optional[str] = None

class KnowledgeBaseListResponse(BaseModel):
    entries: List[KnowledgeBaseEntryResponse]
    total_count: int
    total_tokens: int

class CreateKnowledgeBaseEntryRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=1000)
    content: Optional[str] = Field(None)
    usage_context: str = Field(default="always", pattern="^(always|on_request|contextual)$")
    is_active: bool = True
    
    @field_validator('content')
    @classmethod
    def validate_content(cls, v):
        if v is not None and isinstance(v, str) and v.strip():
            # Check for null bytes
            if '\u0000' in v:
                raise ValueError("Content contains null bytes which are not allowed")
            # Check for other problematic control characters
            problematic_chars = [chr(i) for i in range(32) if i not in [9, 10]]  # Allow tab and newline
            for char in problematic_chars:
                if char in v:
                    raise ValueError(f"Content contains invalid control character: {repr(char)}")
        return v

class UpdateKnowledgeBaseEntryRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    content: Optional[str] = None
    usage_context: Optional[str] = Field(None, pattern="^(always|on_request|contextual)$")
    is_active: Optional[bool] = None

class ExtractThreadKnowledgeRequest(BaseModel):
    thread_id: str
    entry_name: str
    description: Optional[str] = None
    usage_context: str = Field(default="always", pattern="^(always|on_request|contextual)$")
    include_messages: bool = True
    include_agent_runs: bool = True
    max_messages: int = Field(default=50, ge=1, le=200)

class GitRepositoryRequest(BaseModel):
    git_url: HttpUrl
    branch: str = "main"
    include_patterns: Optional[List[str]] = None
    exclude_patterns: Optional[List[str]] = None

class ProcessingJobResponse(BaseModel):
    job_id: str
    job_type: str
    status: str
    source_info: dict
    result_info: dict
    entries_created: int
    total_files: int
    created_at: str
    completed_at: Optional[str]
    error_message: Optional[str]

db = DBConnection()

# Global Knowledge Base Endpoints

@router.get("/global", response_model=KnowledgeBaseListResponse)
async def get_global_knowledge_base(
    include_inactive: bool = False,
    user_id: str = Depends(get_current_user_id_from_jwt)
):
    if not await is_enabled("knowledge_base"):
        raise HTTPException(
            status_code=403, 
            detail="This feature is not available at the moment."
        )
    
    """Get all global knowledge base entries for the current user's account"""
    try:
        client = await db.client
        
        # Get the proper account_id for this user
        account_id = await get_user_account_id(client, user_id)
        
        # Get all possible variants of the account_id for flexible matching
        account_id_variants = get_account_id_variants(account_id)
        
        # Query the table with multiple account_id variants
        # For Supabase, we need to use 'in' operator for multiple values
        query = client.table('global_knowledge_base_entries').select('*').in_('account_id', account_id_variants)
        
        if not include_inactive:
            query = query.eq('is_active', True)
        
        result = await query.order('created_at', desc=True).execute()
        
        entries = []
        total_tokens = 0
        
        for entry in result.data or []:
            entries.append(KnowledgeBaseEntryResponse(
                entry_id=entry['entry_id'],
                name=entry['name'],
                description=entry['description'],
                content=entry['content'],
                usage_context=entry['usage_context'],
                is_active=entry['is_active'],
                content_tokens=entry.get('content_tokens'),
                created_at=entry['created_at'],
                updated_at=entry.get('updated_at', entry['created_at']),
                source_type=None,
                source_metadata=None,
                file_size=None,
                file_mime_type=None
            ))
            # Estimate tokens if not set
            estimated_tokens = entry.get('content_tokens') or len(entry['content']) // 4
            total_tokens += estimated_tokens
        
        return KnowledgeBaseListResponse(
            entries=entries,
            total_count=len(entries),
            total_tokens=total_tokens
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting global knowledge base: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve global knowledge base")

@router.post("/global", response_model=KnowledgeBaseEntryResponse)
async def create_global_knowledge_base_entry(
    entry_data: CreateKnowledgeBaseEntryRequest,
    user_id: str = Depends(get_current_user_id_from_jwt)
):
    if not await is_enabled("knowledge_base"):
        raise HTTPException(
            status_code=403, 
            detail="This feature is not available at the moment."
        )
    
    """Create a new global knowledge base entry"""
    try:
        client = await db.client
        
        # Get the proper account_id for this user and normalize it for storage
        account_id = await get_user_account_id(client, user_id)
        normalized_account_id = normalize_account_id_for_storage(account_id)
        logger.info(f"Using normalized account_id: {normalized_account_id} for user: {user_id}")
        
        # Also check what account_id is in the threads table for this user
        try:
            threads_result = await client.table('threads').select('account_id').eq('account_id', account_id).limit(1).execute()
            if threads_result.data:
                logger.info(f"Found thread with account_id: {threads_result.data[0]['account_id']}")
            else:
                logger.warning(f"No threads found for account_id: {account_id}")
        except Exception as e:
            logger.warning(f"Could not check threads table: {e}")
        
        # Sanitize content to remove problematic characters
        sanitized_content = entry_data.content or ""
        if isinstance(sanitized_content, str) and sanitized_content.strip():
            # Remove null bytes and other problematic Unicode characters
            sanitized_content = sanitized_content.replace('\u0000', '')
            # Remove other control characters except newlines and tabs
            sanitized_content = ''.join(char for char in sanitized_content if ord(char) >= 32 or char in '\n\t')
            # Normalize line endings
            sanitized_content = sanitized_content.replace('\r\n', '\n').replace('\r', '\n')
        else:
            sanitized_content = ""
        
        # Prepare the KB document data for storage
        kb_document_data = {
            'name': entry_data.name,
            'description': entry_data.description or "",
            'content': sanitized_content,
            'content_tokens': len(sanitized_content) // 4,  # Estimate tokens
            'usage_context': entry_data.usage_context,
            'is_active': entry_data.is_active
        }
        
        # Store using the new KnowledgeBaseManager
        success = await global_kb_manager.store_global_kb_entry(normalized_account_id, kb_document_data)
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to store global knowledge base entry")
        
        # Refresh the global KB map to include the new entry
        await global_kb_manager.refresh_global_kb_map()
        
        # Get the created entry for response
        result = await client.table('global_knowledge_base_entries').select('*').eq('account_id', normalized_account_id).eq('name', entry_data.name).order('created_at', desc=True).limit(1).execute()
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to retrieve created global knowledge base entry")
        
        entry = result.data[0]
        
        return KnowledgeBaseEntryResponse(
            entry_id=entry['entry_id'],
            name=entry['name'],
            description=entry['description'],
            content=entry['content'],
            usage_context=entry['usage_context'],
            is_active=entry['is_active'],
            content_tokens=entry.get('content_tokens'),
            created_at=entry['created_at'],
            updated_at=entry.get('updated_at', entry['created_at']),
            source_type=None,
            source_metadata=None,
            file_size=None,
            file_mime_type=None
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating global knowledge base entry: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create global knowledge base entry")

@router.get("/global/context")
async def get_global_knowledge_base_context(
    max_tokens: int = 4000,
    user_id: str = Depends(get_current_user_id_from_jwt)
):
    if not await is_enabled("knowledge_base"):
        raise HTTPException(
            status_code=403, 
            detail="This feature is not available at the moment."
        )
    
    """Get global knowledge base context for agent prompts"""
    try:
        client = await db.client
        
        # Get the proper account_id for this user
        account_id = await get_user_account_id(client, user_id)
        
        # Use the new KnowledgeBaseManager to get entries
        global_kb_entries = await global_kb_manager.get_global_kb_entries(account_id)
        
        context_text = ''
        current_tokens = 0
        
        for entry in global_kb_entries:
            # Estimate tokens if not set
            estimated_tokens = entry.get('content_tokens') or len(entry['content']) // 4
            
            # Check if adding this entry would exceed the limit
            if current_tokens + estimated_tokens > max_tokens:
                break
            
            # Add entry to context
            context_text += f'\n\n## {entry["name"]}'
            if entry.get('description'):
                context_text += f'\n\n{entry["description"]}'
            context_text += f'\n\n{entry["content"]}'
            
            current_tokens += estimated_tokens
        
        context = context_text.strip() if context_text.strip() else None
        
        return {
            "context": context,
            "max_tokens": max_tokens,
            "account_id": account_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting global knowledge base context: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve global knowledge base context")

@router.put("/global/{entry_id}", response_model=KnowledgeBaseEntryResponse)
async def update_global_knowledge_base_entry(
    entry_id: str,
    entry_data: UpdateKnowledgeBaseEntryRequest,
    user_id: str = Depends(get_current_user_id_from_jwt)
):
    if not await is_enabled("knowledge_base"):
        raise HTTPException(
            status_code=403, 
            detail="This feature is not available at the moment."
        )
    
    """Update an existing global knowledge base entry"""
    try:
        client = await db.client
        
        # Get the proper account_id for this user
        account_id = await get_user_account_id(client, user_id)
        
        # Get all possible variants of the account_id for flexible matching
        account_id_variants = get_account_id_variants(account_id)
        
        # Build update data
        update_data = {}
        if entry_data.name is not None:
            update_data['name'] = entry_data.name
        if entry_data.description is not None:
            update_data['description'] = entry_data.description
        if entry_data.content is not None:
            update_data['content'] = entry_data.content
        if entry_data.usage_context is not None:
            update_data['usage_context'] = entry_data.usage_context
        if entry_data.is_active is not None:
            update_data['is_active'] = entry_data.is_active
        
        if not update_data:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        # Query the table with multiple account_id variants
        query = client.table('global_knowledge_base_entries').update(update_data).eq('entry_id', entry_id)
        
        # Use OR condition for multiple account_id variants
        if len(account_id_variants) == 1:
            query = query.eq('account_id', account_id_variants[0])
        else:
            # For multiple variants, we need to use 'in' operator
            query = query.in_('account_id', account_id_variants)
        
        result = await query.execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Global knowledge base entry not found")
        
        entry = result.data[0]
        
        return KnowledgeBaseEntryResponse(
            entry_id=entry['entry_id'],
            name=entry['name'],
            description=entry['description'],
            content=entry['content'],
            usage_context=entry['usage_context'],
            is_active=entry['is_active'],
            content_tokens=entry.get('content_tokens'),
            created_at=entry['created_at'],
            updated_at=entry.get('updated_at', entry['created_at']),
            source_type=None,
            source_metadata=None,
            file_size=None,
            file_mime_type=None
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating global knowledge base entry: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update global knowledge base entry")

@router.delete("/global/{entry_id}")
async def delete_global_knowledge_base_entry(
    entry_id: str,
    user_id: str = Depends(get_current_user_id_from_jwt)
):
    if not await is_enabled("knowledge_base"):
        raise HTTPException(
            status_code=403, 
            detail="This feature is not available at the moment."
        )
    
    """Delete a global knowledge base entry"""
    try:
        client = await db.client
        
        # Get the proper account_id for this user
        account_id = await get_user_account_id(client, user_id)
        
        # Get all possible variants of the account_id for flexible matching
        account_id_variants = get_account_id_variants(account_id)
        
        # Delete the entry
        query = client.table('global_knowledge_base_entries').delete().eq('entry_id', entry_id)
        
        # Use OR condition for multiple account_id variants
        if len(account_id_variants) == 1:
            query = query.eq('account_id', account_id_variants[0])
        else:
            # For multiple variants, we need to use 'in' operator
            query = query.in_('account_id', account_id_variants)
        
        result = await query.execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Global knowledge base entry not found")
        
        return {"message": "Global knowledge base entry deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting global knowledge base entry: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete global knowledge base entry")

@router.post("/global/upload-file")
async def upload_file_to_global_kb(
    file: UploadFile = File(...),
    custom_name: Optional[str] = Form(None),
    user_id: str = Depends(get_current_user_id_from_jwt)
):
    if not await is_enabled("knowledge_base"):
        raise HTTPException(
            status_code=403, 
            detail="This feature is not available at the moment."
        )
    
    """Upload and process a file for global knowledge base"""
    try:
        logger.info(f"Starting file upload for user {user_id}, filename: {file.filename}")
        logger.info(f"Custom name provided: {custom_name}")
        logger.info(f"File content type: {file.content_type}")
        logger.info(f"File size: {file.size if hasattr(file, 'size') else 'unknown'}")
        
        client = await db.client
        logger.info("Database client obtained")
        
        account_id = await get_user_account_id(client, user_id)
        logger.info(f"Account ID obtained: {account_id}")
        
        file_content = await file.read()
        logger.info(f"File content read, size: {len(file_content)} bytes")
        
        # Process the file using the same FileProcessor as thread knowledge base
        processor = FileProcessor()
        logger.info("FileProcessor initialized")
        
        result = await processor.process_global_file_upload(
            account_id, file_content, file.filename, file.content_type or 'application/octet-stream', custom_name
        )
        logger.info(f"File processing result: {result}")
        
        if result['success']:
            logger.info("File processing successful, returning success response")
            return {
                "success": True,
                "entry_id": result['entry_id'],
                "filename": file.filename,
                "content_length": result['content_length'],
                "extraction_method": result['extraction_method'],
                "message": "File processed and added to global knowledge base"
            }
        else:
            error_msg = result.get('error', 'Failed to process file')
            logger.error(f"File processing failed: {error_msg}")
            raise HTTPException(status_code=400, detail=error_msg)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading file to global KB: {str(e)}", exc_info=True)
        import traceback
        logger.error(f"Full traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Failed to upload file: {str(e)}")

@router.get("/global/{entry_id}", response_model=KnowledgeBaseEntryResponse)
async def get_global_knowledge_base_entry(
    entry_id: str,
    user_id: str = Depends(get_current_user_id_from_jwt)
):
    if not await is_enabled("knowledge_base"):
        raise HTTPException(
            status_code=403, 
            detail="This feature is not available at the moment."
        )
    
    """Get a specific global knowledge base entry"""
    try:
        client = await db.client
        
        # Get the proper account_id for this user
        account_id = await get_user_account_id(client, user_id)
        
        # Get all possible variants of the account_id for flexible matching
        account_id_variants = get_account_id_variants(account_id)
        
        # Get the entry
        query = client.table('global_knowledge_base_entries').select('*').eq('entry_id', entry_id)
        
        # Use OR condition for multiple account_id variants
        if len(account_id_variants) == 1:
            query = query.eq('account_id', account_id_variants[0])
        else:
            # For multiple variants, we need to use 'in' operator
            query = query.in_('account_id', account_id_variants)
        
        result = await query.execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Global knowledge base entry not found")
        
        entry = result.data[0]
        
        return KnowledgeBaseEntryResponse(
            entry_id=entry['entry_id'],
            name=entry['name'],
            description=entry['description'],
            content=entry['content'],
            usage_context=entry['usage_context'],
            is_active=entry['is_active'],
            content_tokens=entry.get('content_tokens'),
            created_at=entry['created_at'],
            updated_at=entry.get('updated_at', entry['created_at']),
            source_type=None,
            source_metadata=None,
            file_size=None,
            file_mime_type=None
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting global knowledge base entry: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve global knowledge base entry")

# Test endpoint to check table accessibility
@router.get("/global/test")
async def test_global_knowledge_base_access(
    user_id: str = Depends(get_current_user_id_from_jwt)
):
    """Test endpoint to check if global knowledge base table is accessible"""
    try:
        client = await db.client
        
        # Get the proper account_id for this user
        account_id = await get_user_account_id(client, user_id)
        
        # Get all possible variants of the account_id for flexible matching
        account_id_variants = get_account_id_variants(account_id)
        
        # Check if user has a personal account
        personal_account_result = None
        try:
            personal_account_result = await client.table('basejump.accounts').select('*').eq('primary_owner_user_id', user_id).eq('personal_account', True).execute()
        except Exception as e:
            personal_account_result = {"error": str(e)}
        
        # Check if user is in account_user table
        account_user_result = None
        try:
            account_user_result = await client.table('basejump.account_user').select('*').eq('user_id', user_id).execute()
        except Exception as e:
            account_user_result = {"error": str(e)}
        
        # Try to select from the global knowledge base table
        kb_result = None
        try:
            kb_result = await client.table('global_knowledge_base_entries').select('entry_id').limit(1).execute()
        except Exception as e:
            kb_result = {"error": str(e)}
        
        # Try to insert a test entry (then delete it)
        test_insert_result = None
        test_entry_id = None
        try:
            test_insert_result = await client.table('global_knowledge_base_entries').insert({
                'account_id': account_id,
                'name': 'TEST_ENTRY_DELETE_ME',
                'content': 'This is a test entry that should be deleted',
                'usage_context': 'always',
                'is_active': False
            }).execute()
            
            # Delete the test entry
            if test_insert_result.data:
                test_entry_id = test_insert_result.data[0]['entry_id']
                await client.table('global_knowledge_base_entries').delete().eq('entry_id', test_entry_id).execute()
        except Exception as e:
            test_insert_result = {"error": str(e)}
        
        return {
            "status": "success",
            "account_id": account_id,
            "user_id": user_id,
            "table_accessible": isinstance(kb_result, dict) == False,
            "personal_accounts": personal_account_result,
            "account_users": account_user_result,
            "kb_result": kb_result.data if not isinstance(kb_result, dict) else kb_result,
            "test_insert_successful": bool(test_insert_result and not isinstance(test_insert_result, dict)),
            "test_insert_error": test_insert_result.get("error") if isinstance(test_insert_result, dict) else None
        }
        
    except Exception as e:
        logger.error(f"Test failed: {str(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        return {
            "status": "error",
            "error": str(e),
            "traceback": traceback.format_exc()
        }

# Thread Knowledge Base Endpoints

@router.get("/threads/{thread_id}", response_model=KnowledgeBaseListResponse)
async def get_thread_knowledge_base(
    thread_id: str,
    include_inactive: bool = False,
    user_id: str = Depends(get_current_user_id_from_jwt)
):
    if not await is_enabled("knowledge_base"):
        raise HTTPException(
            status_code=403, 
            detail="This feature is not available at the moment."
        )
    
    """Get all knowledge base entries for a thread"""
    try:
        client = await db.client

        thread_result = await client.table('threads').select('*').eq('thread_id', thread_id).execute()
        if not thread_result.data:
            raise HTTPException(status_code=404, detail="Thread not found")

        result = await client.rpc('get_thread_knowledge_base', {
            'p_thread_id': thread_id,
            'p_include_inactive': include_inactive
        }).execute()
        
        entries = []
        total_tokens = 0
        
        for entry_data in result.data or []:
            entry = KnowledgeBaseEntryResponse(
                entry_id=entry_data['entry_id'],
                name=entry_data['name'],
                description=entry_data['description'],
                content=entry_data['content'],
                usage_context=entry_data['usage_context'],
                is_active=entry_data['is_active'],
                content_tokens=entry_data.get('content_tokens'),
                created_at=entry_data['created_at'],
                updated_at=entry_data.get('updated_at', entry_data['created_at'])
            )
            entries.append(entry)
            total_tokens += entry_data.get('content_tokens', 0) or 0
        
        return KnowledgeBaseListResponse(
            entries=entries,
            total_count=len(entries),
            total_tokens=total_tokens
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting knowledge base for thread {thread_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve knowledge base")

@router.post("/threads/{thread_id}/upload-file")
async def upload_file_to_thread_kb(
    thread_id: str,
    file: UploadFile = File(...),
    custom_name: Optional[str] = Form(None),
    user_id: str = Depends(get_current_user_id_from_jwt)
):
    if not await is_enabled("knowledge_base"):
        raise HTTPException(
            status_code=403, 
            detail="This feature is not available at the moment."
        )
    
    """Upload and process a file for thread knowledge base"""
    try:
        client = await db.client
        
        # Verify thread exists and user has access; fetch account_id directly from thread
        thread_result = await client.table('threads').select('account_id').eq('thread_id', thread_id).maybe_single().execute()
        if not thread_result.data:
            raise HTTPException(status_code=404, detail="Thread not found")
        account_id = thread_result.data.get('account_id')
        if not account_id:
            raise HTTPException(status_code=400, detail="Thread has no associated account")
        
        file_content = await file.read()
        
        # Process the file directly
        processor = FileProcessor()
        result = await processor.process_thread_file_upload(
            thread_id,
            account_id,
            file_content,
            custom_name or file.filename,
            file.content_type or 'application/octet-stream'
        )
        
        if result['success']:
            # Final verification: ensure row exists (defensive)
            verify = await client.table('knowledge_base_entries').select('entry_id') \
                .eq('entry_id', result['entry_id']).maybe_single().execute()
            if not verify.data:
                logger.warning(f"KB upload reported success but row missing: {result['entry_id']}")
            return {
                "success": True,
                "entry_id": result['entry_id'],
                "filename": custom_name or file.filename,
                "content_length": result.get('content_length'),
                "extraction_method": result.get('extraction_method'),
                "message": "File processed and added to thread knowledge base"
            }
        else:
            # Thread processor returns raw error strings; convert any leftover source_metadata mentions
            err_detail = result.get('error', 'Failed to process file')
            if isinstance(err_detail, str) and 'source_metadata' in err_detail:
                err_detail = "One or more unsupported fields were provided for thread KB entries"
            raise HTTPException(status_code=400, detail=err_detail)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading file to thread KB: {str(e)}", exc_info=True)
        detail = str(e)
        # Normalize common DB validation errors for UI readability
        if 'source_metadata' in detail:
            detail = "One or more unsupported fields were provided for thread KB entries"
        raise HTTPException(status_code=500, detail=detail)

@router.post("/threads/{thread_id}", response_model=KnowledgeBaseEntryResponse)
async def create_knowledge_base_entry(
    thread_id: str,
    entry_data: CreateKnowledgeBaseEntryRequest,
    user_id: str = Depends(get_current_user_id_from_jwt)
):
    if not await is_enabled("knowledge_base"):
        raise HTTPException(
            status_code=403, 
            detail="This feature is not available at the moment."
        )
    
    """Create a new knowledge base entry for a thread"""
    try:
        client = await db.client
        thread_result = await client.table('threads').select('account_id').eq('thread_id', thread_id).execute()
        if not thread_result.data:
            raise HTTPException(status_code=404, detail="Thread not found")
        
        account_id = thread_result.data[0]['account_id']
        
        insert_data = {
            'thread_id': thread_id,
            'account_id': account_id,
            'name': entry_data.name,
            'description': entry_data.description or "",
            'content': entry_data.content or "",
            'usage_context': entry_data.usage_context
        }
        
        result = await client.table('knowledge_base_entries').insert(insert_data).select('*').execute()
        
        if not result.data:
            # Provide more diagnostic information if available
            try:
                error_detail = getattr(result, 'error', None)
                logger.error(f"Insert into knowledge_base_entries returned no data. Error: {error_detail}")
            except Exception:
                pass
            raise HTTPException(status_code=500, detail="Failed to create knowledge base entry")
        
        created_entry = result.data[0]
        
        return KnowledgeBaseEntryResponse(
            entry_id=created_entry['entry_id'],
            name=created_entry['name'],
            description=created_entry['description'],
            content=created_entry['content'],
            usage_context=created_entry['usage_context'],
            is_active=created_entry['is_active'],
            content_tokens=created_entry.get('content_tokens'),
            created_at=created_entry['created_at'],
            updated_at=created_entry['updated_at']
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating knowledge base entry for thread {thread_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create knowledge base entry")

@router.post("/threads/{thread_id}/extract-knowledge", response_model=KnowledgeBaseEntryResponse)
async def extract_thread_knowledge(
    thread_id: str,
    data: ExtractThreadKnowledgeRequest,
    user_id: str = Depends(get_current_user_id_from_jwt)
):
    if not await is_enabled("knowledge_base"):
        raise HTTPException(
            status_code=403, 
            detail="This feature is not available at the moment."
        )
    
    """Extract knowledge from a thread's messages and agent runs"""
    try:
        client = await db.client
        
        # Verify thread exists and user has access
        thread_result = await client.table('threads').select('*').eq('thread_id', thread_id).eq('user_id', user_id).execute()
        if not thread_result.data:
            raise HTTPException(status_code=404, detail="Thread not found or access denied")
        
        # Get messages from the thread
        messages_query = client.table('messages').select('*').eq('thread_id', thread_id).order('created_at', desc=True).limit(data.max_messages)
        messages_result = await messages_query.execute()
        
        # Get agent runs if requested
        agent_runs = []
        if data.include_agent_runs:
            runs_query = client.table('agent_runs').select('*').eq('thread_id', thread_id).order('created_at', desc=True).limit(data.max_messages)
            runs_result = await runs_query.execute()
            agent_runs = runs_result.data or []
        
        # Build knowledge content
        knowledge_parts = []
        
        if data.include_messages and messages_result.data:
            messages = list(reversed(messages_result.data))  # Reverse to get chronological order
            knowledge_parts.append("## Thread Messages")
            for msg in messages:
                role = msg.get('role', 'unknown')
                content = msg.get('content', '')
                if content and content.strip():
                    knowledge_parts.append(f"### {role.title()}")
                    knowledge_parts.append(content.strip())
                    knowledge_parts.append("")
        
        if data.include_agent_runs and agent_runs:
            knowledge_parts.append("## Agent Runs")
            for run in agent_runs:
                run_name = run.get('name', 'Unknown Run')
                run_status = run.get('status', 'unknown')
                run_result = run.get('result', '')
                if run_result and run_result.strip():
                    knowledge_parts.append(f"### {run_name} ({run_status})")
                    knowledge_parts.append(run_result.strip())
                    knowledge_parts.append("")
        
        if not knowledge_parts:
            raise HTTPException(status_code=400, detail="No extractable content found in thread")
        
        # Combine all knowledge parts
        knowledge_content = "\n".join(knowledge_parts)
        
        # Truncate if too long (max 100k characters)
        if len(knowledge_content) > 100000:
            knowledge_content = knowledge_content[:100000] + "\n\n[Content truncated due to length]"
        
        # Create knowledge base entry
        entry_data = {
            'thread_id': thread_id,
            'name': data.entry_name,
            'description': data.description or f"Knowledge extracted from thread {thread_id}",
            'content': knowledge_content,
            'usage_context': data.usage_context,
            'is_active': True,
            'source_type': 'thread_extraction',
            'source_metadata': {
                'thread_id': thread_id,
                'messages_count': len(messages_result.data) if messages_result.data else 0,
                'agent_runs_count': len(agent_runs),
                'extraction_method': 'thread_analysis',
                'include_messages': data.include_messages,
                'include_agent_runs': data.include_agent_runs,
                'max_messages': data.max_messages
            }
        }
        
        result = await client.table('knowledge_base_entries').insert(entry_data).execute()
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create knowledge base entry")
        
        created_entry = result.data[0]
        
        return KnowledgeBaseEntryResponse(
            entry_id=created_entry['entry_id'],
            name=created_entry['name'],
            description=created_entry['description'],
            content=created_entry['content'],
            usage_context=created_entry['usage_context'],
            is_active=created_entry['is_active'],
            content_tokens=created_entry.get('content_tokens'),
            created_at=created_entry['created_at'],
            updated_at=created_entry['updated_at'],
            source_type=created_entry.get('source_type'),
            source_metadata=created_entry.get('source_metadata'),
            file_size=None,
            file_mime_type=None
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error extracting knowledge from thread {thread_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to extract knowledge from thread")

@router.get("/agents/{agent_id}", response_model=KnowledgeBaseListResponse)
async def get_agent_knowledge_base(
    agent_id: str,
    include_inactive: bool = False,
    user_id: str = Depends(get_current_user_id_from_jwt)
):
    if not await is_enabled("knowledge_base"):
        raise HTTPException(
            status_code=403, 
            detail="This feature is not available at the moment."
        )
    
    """Get all knowledge base entries for an agent"""
    try:
        client = await db.client

        agent_result = await client.table('agents').select('*').eq('agent_id', agent_id).eq('account_id', user_id).execute()
        if not agent_result.data:
            raise HTTPException(status_code=404, detail="Agent not found or access denied")

        result = await client.rpc('get_agent_knowledge_base', {
            'p_agent_id': agent_id,
            'p_include_inactive': include_inactive
        }).execute()
        
        entries = []
        total_tokens = 0
        
        for entry_data in result.data or []:
            entry = KnowledgeBaseEntryResponse(
                entry_id=entry_data['entry_id'],
                name=entry_data['name'],
                description=entry_data['description'],
                content=entry_data['content'],
                usage_context=entry_data['usage_context'],
                is_active=entry_data['is_active'],
                content_tokens=entry_data.get('content_tokens'),
                created_at=entry_data['created_at'],
                updated_at=entry_data.get('updated_at', entry_data['created_at']),
                source_type=entry_data.get('source_type'),
                source_metadata=entry_data.get('source_metadata'),
                file_size=entry_data.get('file_size'),
                file_mime_type=entry_data.get('file_mime_type')
            )
            entries.append(entry)
            total_tokens += entry_data.get('content_tokens', 0) or 0
        
        return KnowledgeBaseListResponse(
            entries=entries,
            total_count=len(entries),
            total_tokens=total_tokens
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting knowledge base for agent {agent_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve agent knowledge base")

@router.post("/agents/{agent_id}", response_model=KnowledgeBaseEntryResponse)
async def create_agent_knowledge_base_entry(
    agent_id: str,
    entry_data: CreateKnowledgeBaseEntryRequest,
    user_id: str = Depends(get_current_user_id_from_jwt)
):
    if not await is_enabled("knowledge_base"):
        raise HTTPException(
            status_code=403, 
            detail="This feature is not available at the moment."
        )
    
    """Create a new knowledge base entry for an agent"""
    try:
        client = await db.client
        
        agent_result = await client.table('agents').select('account_id').eq('agent_id', agent_id).eq('account_id', user_id).execute()
        if not agent_result.data:
            raise HTTPException(status_code=404, detail="Agent not found or access denied")
        
        account_id = agent_result.data[0]['account_id']
        
        insert_data = {
            'agent_id': agent_id,
            'account_id': account_id,
            'name': entry_data.name,
            'description': entry_data.description,
            'content': entry_data.content,
            'usage_context': entry_data.usage_context
        }
        
        result = await client.table('agent_knowledge_base_entries').insert(insert_data).execute()
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create agent knowledge base entry")
        
        created_entry = result.data[0]
        
        return KnowledgeBaseEntryResponse(
            entry_id=created_entry['entry_id'],
            name=created_entry['name'],
            description=created_entry['description'],
            content=created_entry['content'],
            usage_context=created_entry['usage_context'],
            is_active=created_entry['is_active'],
            content_tokens=created_entry.get('content_tokens'),
            created_at=created_entry['created_at'],
            updated_at=created_entry['updated_at']
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating knowledge base entry for agent {agent_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create agent knowledge base entry")

@router.post("/agents/{agent_id}/upload-file")
async def upload_file_to_agent_kb(
    agent_id: str,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user_id_from_jwt)
):
    if not await is_enabled("knowledge_base"):
        raise HTTPException(
            status_code=403, 
            detail="This feature is not available at the moment."
        )
    
    """Upload and process a file for agent knowledge base"""
    try:
        client = await db.client
        
        agent_result = await client.table('agents').select('account_id').eq('agent_id', agent_id).eq('account_id', user_id).execute()
        if not agent_result.data:
            raise HTTPException(status_code=404, detail="Agent not found or access denied")
        
        account_id = agent_result.data[0]['account_id']
        
        file_content = await file.read()
        job_id = await client.rpc('create_agent_kb_processing_job', {
            'p_agent_id': agent_id,
            'p_account_id': account_id,
            'p_job_type': 'file_upload',
            'p_source_info': {
                'filename': file.filename,
                'mime_type': file.content_type,
                'file_size': len(file_content)
            }
        }).execute()
        
        if not job_id.data:
            raise HTTPException(status_code=500, detail="Failed to create processing job")
        
        job_id = job_id.data
        background_tasks.add_task(
            process_file_background,
            job_id,
            agent_id,
            account_id,
            file_content,
            file.filename,
            file.content_type or 'application/octet-stream'
        )
        
        return {
            "job_id": job_id,
            "message": "File upload started. Processing in background.",
            "filename": file.filename
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading file to agent {agent_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to upload file")


@router.get("/agents/{agent_id}/processing-jobs", response_model=List[ProcessingJobResponse])
async def get_agent_processing_jobs(
    agent_id: str,
    limit: int = 10,
    user_id: str = Depends(get_current_user_id_from_jwt)
):
    if not await is_enabled("knowledge_base"):
        raise HTTPException(
            status_code=403, 
            detail="This feature is not available at the moment."
        )
    
    """Get processing jobs for an agent"""
    try:
        client = await db.client

        agent_result = await client.table('agents').select('account_id').eq('agent_id', agent_id).eq('account_id', user_id).execute()
        if not agent_result.data:
            raise HTTPException(status_code=404, detail="Agent not found or access denied")
        
        result = await client.rpc('get_agent_kb_processing_jobs', {
            'p_agent_id': agent_id,
            'p_limit': limit
        }).execute()
        
        jobs = []
        for job_data in result.data or []:
            job = ProcessingJobResponse(
                job_id=job_data['job_id'],
                job_type=job_data['job_type'],
                status=job_data['status'],
                source_info=job_data['source_info'],
                result_info=job_data['result_info'],
                entries_created=job_data['entries_created'],
                total_files=job_data['total_files'],
                created_at=job_data['created_at'],
                completed_at=job_data.get('completed_at'),
                error_message=job_data.get('error_message')
            )
            jobs.append(job)
        
        return jobs
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting processing jobs for agent {agent_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get processing jobs")

async def process_file_background(
    job_id: str,
    agent_id: str,
    account_id: str,
    file_content: bytes,
    filename: str,
    mime_type: str
):
    """Background task to process uploaded files"""
    
    processor = FileProcessor()
    client = await processor.db.client
    try:
        await client.rpc('update_agent_kb_job_status', {
            'p_job_id': job_id,
            'p_status': 'processing'
        }).execute()
        
        result = await processor.process_file_upload(
            agent_id, account_id, file_content, filename, mime_type
        )
        
        if result['success']:
            await client.rpc('update_agent_kb_job_status', {
                'p_job_id': job_id,
                'p_status': 'completed',
                'p_result_info': result,
                'p_entries_created': 1,
                'p_total_files': 1
            }).execute()
        else:
            await client.rpc('update_agent_kb_job_status', {
                'p_job_id': job_id,
                'p_status': 'failed',
                'p_error_message': result.get('error', 'Unknown error')
            }).execute()
            
    except Exception as e:
        logger.error(f"Error in background file processing for job {job_id}: {str(e)}")
        try:
            await client.rpc('update_agent_kb_job_status', {
                'p_job_id': job_id,
                'p_status': 'failed',
                'p_error_message': str(e)
            }).execute()
        except:
            pass


@router.get("/agents/{agent_id}/context")
async def get_agent_knowledge_base_context(
    agent_id: str,
    max_tokens: int = 16000,
    user_id: str = Depends(get_current_user_id_from_jwt)
):
    if not await is_enabled("knowledge_base"):
        raise HTTPException(
            status_code=403, 
            detail="This feature is not available at the moment."
        )
    
    """Get knowledge base context for agent prompts"""
    try:
        client = await db.client
        
        agent_result = await client.table('agents').select('agent_id').eq('agent_id', agent_id).eq('account_id', user_id).execute()
        if not agent_result.data:
            raise HTTPException(status_code=404, detail="Agent not found or access denied")
        
        result = await client.rpc('get_agent_knowledge_base_context', {
            'p_agent_id': agent_id,
            'p_max_tokens': max_tokens
        }).execute()
        
        context = result.data if result.data else None
        
        return {
            "context": context,
            "max_tokens": max_tokens,
            "agent_id": agent_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting knowledge base context for agent {agent_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve agent knowledge base context")

@router.get("/agents/{agent_id}/smart-context")
async def get_agent_smart_knowledge_base_context(
    agent_id: str,
    query: str,
    max_tokens: int = 16000,
    similarity_threshold: float = 0.1,
    user_id: str = Depends(get_current_user_id_from_jwt)
):
    if not await is_enabled("knowledge_base"):
        raise HTTPException(
            status_code=403, 
            detail="This feature is not available at the moment."
        )
    
    """Get smart knowledge base context for agent prompts using RAG-based retrieval"""
    try:
        client = await db.client
        
        agent_result = await client.table('agents').select('agent_id').eq('agent_id', agent_id).eq('account_id', user_id).execute()
        if not agent_result.data:
            raise HTTPException(status_code=404, detail="Agent not found or access denied")
        
        # Use the RAG-based function for smart context retrieval
        result = await client.rpc('get_relevant_kb_context', {
            'p_query': query,
            'p_max_tokens': max_tokens,
            'p_similarity_threshold': similarity_threshold
        }).execute()
        
        context = result.data if result.data else None
        
        return {
            "context": context,
            "query": query,
            "max_tokens": max_tokens,
            "similarity_threshold": similarity_threshold,
            "agent_id": agent_id,
            "retrieval_method": "rag_semantic_search"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting smart knowledge base context for agent {agent_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve smart knowledge base context")

@router.get("/global/smart-context")
async def get_global_smart_knowledge_base_context(
    query: str,
    max_tokens: int = 16000,
    similarity_threshold: float = 0.1,
    user_id: str = Depends(get_current_user_id_from_jwt)
):
    if not await is_enabled("knowledge_base"):
        raise HTTPException(
            status_code=403, 
            detail="This feature is not available at the moment."
        )
    
    """Get smart global knowledge base context using RAG-based retrieval"""
    try:
        client = await db.client
        
        # Use the RAG-based function for smart context retrieval
        result = await client.rpc('get_relevant_kb_context', {
            'p_query': query,
            'p_max_tokens': max_tokens,
            'p_similarity_threshold': similarity_threshold
        }).execute()
        
        context = result.data if result.data else None
        
        return {
            "context": context,
            "query": query,
            "max_tokens": max_tokens,
            "similarity_threshold": similarity_threshold,
            "retrieval_method": "rag_semantic_search"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting smart global knowledge base context: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve smart global knowledge base context")

@router.get("/threads/{thread_id}/smart-context")
async def get_thread_smart_knowledge_base_context(
    thread_id: str,
    query: str,
    max_tokens: int = 16000,
    thread_kb_tokens: int = 8000,
    global_kb_tokens: int = 8000,
    user_id: str = Depends(get_current_user_id_from_jwt)
):
    if not await is_enabled("knowledge_base"):
        raise HTTPException(
            status_code=403, 
            detail="This feature is not available at the moment."
        )
    
    """Get smart combined knowledge base context (thread + global) using RAG-based retrieval"""
    try:
        client = await db.client
        
        # Verify thread exists and user has access
        thread_result = await client.table('threads').select('account_id').eq('thread_id', thread_id).maybe_single().execute()
        if not thread_result.data:
            raise HTTPException(status_code=404, detail="Thread not found")
        
        # Use the smart combined context function
        result = await client.rpc('get_smart_kb_context', {
            'p_thread_id': thread_id,
            'p_query': query,
            'p_max_tokens': max_tokens,
            'p_thread_kb_tokens': thread_kb_tokens,
            'p_global_kb_tokens': global_kb_tokens
        }).execute()
        
        context = result.data if result.data else None
        
        return {
            "context": context,
            "query": query,
            "thread_id": thread_id,
            "max_tokens": max_tokens,
            "thread_kb_tokens": thread_kb_tokens,
            "global_kb_tokens": global_kb_tokens,
            "retrieval_method": "smart_combined_rag"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting smart thread knowledge base context: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve smart thread knowledge base context")

@router.get("/should-use-kb")
async def check_should_use_knowledge_base(
    query: str,
    user_id: str = Depends(get_current_user_id_from_jwt)
):
    if not await is_enabled("knowledge_base"):
        raise HTTPException(
            status_code=403, 
            detail="This feature is not available at the moment."
        )
    
    """Check if a query should trigger knowledge base retrieval"""
    try:
        client = await db.client
        
        result = await client.rpc('should_use_knowledge_base', {
            'p_query': query
        }).execute()
        
        should_use = result.data if result.data else False
        
        return {
            "query": query,
            "should_use_knowledge_base": should_use,
            "reasoning": "Query analyzed for knowledge base relevance using keyword matching and pattern detection"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error checking if query should use knowledge base: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to check knowledge base usage")

@router.get("/test-global-access")
async def test_global_knowledge_base_access(
    user_id: str = Depends(get_current_user_id_from_jwt)
):
    if not await is_enabled("knowledge_base"):
        raise HTTPException(
            status_code=403, 
            detail="This feature is not available at the moment."
        )
    
    """Test function to verify global knowledge base access and DATA BLOCK format"""
    try:
        client = await db.client
        
        result = await client.rpc('test_global_kb_access').execute()
        
        context = result.data if result.data else "No knowledge base content found"
        
        return {
            "context": context,
            "format": "DATA_BLOCK",
            "purpose": "Testing global knowledge base access and DATA BLOCK format verification"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error testing global knowledge base access: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to test global knowledge base access")

@router.put("/{entry_id}", response_model=KnowledgeBaseEntryResponse)
async def update_knowledge_base_entry(
    entry_id: str,
    entry_data: UpdateKnowledgeBaseEntryRequest,
    user_id: str = Depends(get_current_user_id_from_jwt)
):
    if not await is_enabled("knowledge_base"):
        raise HTTPException(
            status_code=403, 
            detail="This feature is not available at the moment."
        )
    
    """Update a knowledge base entry (works for both thread and agent entries)"""
    try:
        client = await db.client
        entry_result = await client.table('knowledge_base_entries').select('*').eq('entry_id', entry_id).execute()
        table_name = 'knowledge_base_entries'
        
        if not entry_result.data:
            entry_result = await client.table('agent_knowledge_base_entries').select('*').eq('entry_id', entry_id).execute()
            table_name = 'agent_knowledge_base_entries'
            
        if not entry_result.data:
            raise HTTPException(status_code=404, detail="Knowledge base entry not found")
        
        update_data = {}
        if entry_data.name is not None:
            update_data['name'] = entry_data.name
        if entry_data.description is not None:
            update_data['description'] = entry_data.description
        if entry_data.content is not None:
            update_data['content'] = entry_data.content
        if entry_data.usage_context is not None:
            update_data['usage_context'] = entry_data.usage_context
        if entry_data.is_active is not None:
            update_data['is_active'] = entry_data.is_active
        
        if not update_data:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        result = await client.table(table_name).update(update_data).eq('entry_id', entry_id).execute()
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to update knowledge base entry")
        
        updated_entry = result.data[0]
        
        return KnowledgeBaseEntryResponse(
            entry_id=updated_entry['entry_id'],
            name=updated_entry['name'],
            description=updated_entry['description'],
            content=updated_entry['content'],
            usage_context=updated_entry['usage_context'],
            is_active=updated_entry['is_active'],
            content_tokens=updated_entry.get('content_tokens'),
            created_at=updated_entry['created_at'],
            updated_at=updated_entry['updated_at'],
            source_type=updated_entry.get('source_type'),
            source_metadata=updated_entry.get('source_metadata'),
            file_size=updated_entry.get('file_size'),
            file_mime_type=updated_entry.get('file_mime_type')
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating knowledge base entry {entry_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update knowledge base entry")

@router.delete("/{entry_id}")
async def delete_knowledge_base_entry(
    entry_id: str,
    user_id: str = Depends(get_current_user_id_from_jwt)
):
    if not await is_enabled("knowledge_base"):
        raise HTTPException(
            status_code=403, 
            detail="This feature is not available at the moment."
        )

    """Delete a knowledge base entry (works for both thread and agent entries)"""
    try:
        client = await db.client
        
        entry_result = await client.table('knowledge_base_entries').select('entry_id').eq('entry_id', entry_id).execute()
        table_name = 'knowledge_base_entries'
        
        if not entry_result.data:
            entry_result = await client.table('agent_knowledge_base_entries').select('entry_id').eq('entry_id', entry_id).execute()
            table_name = 'agent_knowledge_base_entries'
            
        if not entry_result.data:
            raise HTTPException(status_code=404, detail="Knowledge base entry not found")
        
        result = await client.table(table_name).delete().eq('entry_id', entry_id).execute()
        
        return {"message": "Knowledge base entry deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting knowledge base entry {entry_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete knowledge base entry")

@router.get("/{entry_id}", response_model=KnowledgeBaseEntryResponse)
async def get_knowledge_base_entry(
    entry_id: str,
    user_id: str = Depends(get_current_user_id_from_jwt)
):
    if not await is_enabled("knowledge_base"):
        raise HTTPException(
            status_code=403, 
            detail="This feature is not available at the moment."
        )
    """Get a specific knowledge base entry (works for both thread and agent entries)"""
    try:
        client = await db.client
        
        result = await client.table('knowledge_base_entries').select('*').eq('entry_id', entry_id).execute()
        
        if not result.data:
            result = await client.table('agent_knowledge_base_entries').select('*').eq('entry_id', entry_id).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Knowledge base entry not found")
        
        entry = result.data[0]
        
        return KnowledgeBaseEntryResponse(
            entry_id=entry['entry_id'],
            name=entry['name'],
            description=entry['description'],
            content=entry['content'],
            usage_context=entry['usage_context'],
            is_active=entry['is_active'],
            content_tokens=entry.get('content_tokens'),
            created_at=entry['created_at'],
            updated_at=entry['updated_at'],
            source_type=entry.get('source_type'),
            source_metadata=entry.get('source_metadata'),
            file_size=entry.get('file_size'),
            file_mime_type=entry.get('file_mime_type')
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting knowledge base entry {entry_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve knowledge base entry")

@router.get("/threads/{thread_id}/context")
async def get_knowledge_base_context(
    thread_id: str,
    max_tokens: int = 16000,
    user_id: str = Depends(get_current_user_id_from_jwt)
):
    if not await is_enabled("knowledge_base"):
        raise HTTPException(
            status_code=403, 
            detail="This feature is not available at the moment."
        )
    
    """Get knowledge base context for agent prompts"""
    try:
        client = await db.client
        thread_result = await client.table('threads').select('thread_id').eq('thread_id', thread_id).execute()
        if not thread_result.data:
            raise HTTPException(status_code=404, detail="Thread not found")
        
        result = await client.rpc('get_knowledge_base_context', {
            'p_thread_id': thread_id,
            'p_max_tokens': max_tokens
        }).execute()
        
        context = result.data if result.data else None
        
        return {
            "context": context,
            "max_tokens": max_tokens,
            "thread_id": thread_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting knowledge base context for thread {thread_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve knowledge base context")

@router.get("/threads/{thread_id}/combined-context")
async def get_combined_knowledge_base_context(
    thread_id: str,
    agent_id: Optional[str] = None,
    max_tokens: int = 16000,
    user_id: str = Depends(get_current_user_id_from_jwt)
):
    if not await is_enabled("knowledge_base"):
        raise HTTPException(
            status_code=403, 
            detail="This feature is not available at the moment."
        )
    
    """Get combined knowledge base context from both thread and agent sources"""
    try:
        client = await db.client
        thread_result = await client.table('threads').select('thread_id').eq('thread_id', thread_id).execute()
        if not thread_result.data:
            raise HTTPException(status_code=404, detail="Thread not found")
        
        # Get user's account ID
        user_result = await client.table('users').select('account_id').eq('user_id', user_id).execute()
        account_id = user_result.data[0]['account_id'] if user_result.data else None
        
        result = await client.rpc('get_combined_knowledge_base_context', {
            'p_thread_id': thread_id,
            'p_account_id': account_id,
            'p_agent_id': agent_id,
            'p_max_tokens': max_tokens
        }).execute()
        
        context = result.data if result.data else None
        
        return {
            "context": context,
            "max_tokens": max_tokens,
            "thread_id": thread_id,
            "agent_id": agent_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting combined knowledge base context for thread {thread_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve combined knowledge base context")

@router.post("/threads/{thread_id}/save-to-global")
async def save_thread_knowledge_to_global(
    thread_id: str,
    user_id: str = Depends(get_current_user_id_from_jwt)
):
    if not await is_enabled("knowledge_base"):
        raise HTTPException(
            status_code=403, 
            detail="This feature is not available at the moment."
        )
    
    """Automatically save thread knowledge base entries to global knowledge base when thread is closed"""
    try:
        client = await db.client
        
        # Get the proper account_id for this user
        account_id = await get_user_account_id(client, user_id)
        
        # Get all possible variants of the account_id for flexible matching
        account_id_variants = get_account_id_variants(account_id)
        
        # Get all active knowledge base entries for the thread
        query = client.table('knowledge_base_entries').select('*').eq('thread_id', thread_id).eq('is_active', True)
        
        # Use OR condition for multiple account_id variants
        if len(account_id_variants) == 1:
            query = query.eq('account_id', account_id_variants[0])
        else:
            # For multiple variants, we need to use 'in' operator
            query = query.in_('account_id', account_id_variants)
        
        thread_kb_result = await query.execute()
        
        if not thread_kb_result.data:
            return {
                "message": "No knowledge base entries found for thread",
                "entries_saved": 0,
                "thread_id": thread_id
            }
        
        # Get existing global knowledge base entries to check for duplicates
        query = client.table('global_knowledge_base_entries').select('*').eq('is_active', True)
        
        # Use OR condition for multiple account_id variants
        if len(account_id_variants) == 1:
            query = query.eq('account_id', account_id_variants[0])
        else:
            # For multiple variants, we need to use 'in' operator
            query = query.in_('account_id', account_id_variants)
        
        global_kb_result = await query.execute()
        
        existing_global_entries = global_kb_result.data or []
        existing_content_hashes = {entry.get('content', '')[:100] for entry in existing_global_entries}
        
        saved_entries = 0
        skipped_entries = 0
        
        for entry in thread_kb_result.data:
            # Check if similar content already exists in global knowledge base
            content_preview = entry.get('content', '')[:100]
            if content_preview in existing_content_hashes:
                skipped_entries += 1
                continue
            
            # Create global knowledge base entry
            global_entry_data = {
                'account_id': account_id,
                'name': f"{entry['name']} (from thread)",
                'description': f"Knowledge extracted from thread {thread_id}: {entry.get('description', '')}",
                'content': entry['content'],
                'usage_context': entry['usage_context'],
                'is_active': True
            }
            
            try:
                await client.table('global_knowledge_base_entries').insert(global_entry_data).execute()
                saved_entries += 1
                existing_content_hashes.add(content_preview)
            except Exception as e:
                logger.error(f"Error saving entry to global knowledge base: {str(e)}")
                continue
        
        return {
            "message": f"Successfully saved {saved_entries} knowledge base entries to global knowledge base",
            "entries_saved": saved_entries,
            "entries_skipped": skipped_entries,
            "thread_id": thread_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error saving thread knowledge to global for thread {thread_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to save thread knowledge to global knowledge base") 

@router.get("/test-combined-context/{thread_id}")
async def test_combined_knowledge_base_context(
    thread_id: str,
    agent_id: Optional[str] = None,
    max_tokens: int = 4000,
    user_id: str = Depends(get_current_user_id_from_jwt)
):
    """Test endpoint to debug combined knowledge base context function"""
    if not await is_enabled("knowledge_base"):
        raise HTTPException(
            status_code=403, 
            detail="This feature is not available at the moment."
        )
    
    """Test the get_combined_knowledge_base_context function directly"""
    try:
        client = await db.client
        
        # Test the function directly
        result = await client.rpc('get_combined_knowledge_base_context', {
            'p_thread_id': thread_id,
            'p_agent_id': agent_id,
            'p_max_tokens': max_tokens
        }).execute()
        
        # Get thread info for debugging
        thread_result = await client.table('threads').select('account_id').eq('thread_id', thread_id).execute()
        thread_account_id = thread_result.data[0]['account_id'] if thread_result.data else None
        
        # Get all possible variants of the account_id for flexible matching
        account_id_variants = get_account_id_variants(thread_account_id)
        
        # Get global knowledge base entries for this account
        global_entries = []
        if thread_account_id:
            try:
                # Try to get the user's account_id from basejump.accounts table first
                account_result = await client.table('basejump.accounts').select('id').eq('id', thread_account_id).eq('personal_account', True).execute()
                user_account_id = account_result.data[0]['id'] if account_result.data else thread_account_id
                
                query = client.table('global_knowledge_base_entries').select('*').eq('is_active', True)
                
                # Use OR condition for multiple account_id variants
                if len(account_id_variants) == 1:
                    query = query.eq('account_id', account_id_variants[0])
                else:
                    # For multiple variants, we need to use 'in' operator
                    query = query.in_('account_id', account_id_variants)
                
                global_result = await query.in_('usage_context', ['always', 'contextual']).execute()
                global_entries = global_result.data or []
            except Exception as e:
                logger.error(f"Error getting global entries: {e}")
        
        context = result.data if result.data else None
        
        return {
            "context": context,
            "context_length": len(context) if context else 0,
            "max_tokens": max_tokens,
            "thread_id": thread_id,
            "agent_id": agent_id,
            "thread_account_id": thread_account_id,
            "global_entries_count": len(global_entries),
            "global_entries": global_entries,
            "function_result": result.data
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error testing combined knowledge base context for thread {thread_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to test combined knowledge base context: {str(e)}") 