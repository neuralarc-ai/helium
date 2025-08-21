"""
Vector Knowledge Base API
Provides endpoints for document processing, vector search, and knowledge base management
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks
from fastapi.responses import JSONResponse
from typing import Optional, List, Dict, Any
from uuid import UUID
import os
import tempfile
import shutil
from pathlib import Path

from services.vector_knowledge_base_service import VectorKnowledgeBaseService
from utils.auth_utils import get_current_user_id_from_jwt
from utils.account_utils import normalize_account_id

router = APIRouter(prefix="/vector-kb", tags=["vector-knowledge-base"])

# Helper function to get account_id for a user
async def get_user_account_id(client, user_id: str) -> str:
    """
    Get the account_id for a user. First try to find an existing personal account,
    if not found, try to create one, otherwise use a fallback approach.
    """
    try:
        # First try to get the personal account for this user
        try:
            result = await client.table('basejump.accounts').select('id').eq('primary_owner_user_id', user_id).eq('personal_account', True).execute()
            
            if result.data and len(result.data) > 0:
                account_id = result.data[0]['id']
                return normalize_account_id(account_id)
        except Exception as table_error:
            pass
        
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
                return normalize_account_id(unique_account_id)
            else:
                return normalize_account_id(unique_account_id)
                
        except Exception as create_error:
            pass
        
        # If all else fails, use the user_id directly
        return normalize_account_id(user_id)
        
    except Exception as e:
        # Final fallback: return user_id
        return normalize_account_id(user_id)

# Initialize the vector knowledge base service
def get_vector_kb_service():
    """Get vector knowledge base service instance"""
    # Ensure environment variables are loaded
    from dotenv import load_dotenv
    load_dotenv()
    
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    if not supabase_url or not supabase_key:
        raise HTTPException(status_code=500, detail="Vector KB service not configured")
    
    return VectorKnowledgeBaseService(supabase_url, supabase_key)

@router.post("/upload-document")
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    kb_type: str = Form(..., description="'global' or 'thread'"),
    thread_id: Optional[str] = Form(None, description="Thread ID for thread-specific KB"),
    user_id: str = Depends(get_current_user_id_from_jwt),
    vector_kb_service: VectorKnowledgeBaseService = Depends(get_vector_kb_service)
):
    """
    Upload and process a document for the vector knowledge base
    
    The document will be:
    1. Stored temporarily
    2. Text extracted and chunked
    3. Vector embeddings generated
    4. Stored in the knowledge base
    """
    try:
        # Get account_id from user_id
        from services.supabase import DBConnection
        db = DBConnection()
        await db.initialize()
        client = await db.client
        account_id = await get_user_account_id(client, user_id)
        
        # Validate file type
        allowed_extensions = {'.pdf', '.docx', '.csv', '.txt', '.md', '.json'}
        file_extension = Path(file.filename).suffix.lower()
        
        if file_extension not in allowed_extensions:
            raise HTTPException(
                status_code=400, 
                detail=f"Unsupported file type. Allowed: {', '.join(allowed_extensions)}"
            )
        
        # Validate KB type
        if kb_type not in ['global', 'thread']:
            raise HTTPException(status_code=400, detail="kb_type must be 'global' or 'thread'")
        
        # Validate thread_id for thread-specific KB
        if kb_type == 'thread' and not thread_id:
            raise HTTPException(status_code=400, detail="thread_id required for thread-specific KB")
        
        # Create temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_extension) as temp_file:
            shutil.copyfileobj(file.file, temp_file)
            temp_file_path = temp_file.name
        
        try:
            # Process document in background
            background_tasks.add_task(
                vector_kb_service.process_document,
                temp_file_path,
                account_id,
                UUID(thread_id) if thread_id else None,
                kb_type
            )
            
            return JSONResponse(
                status_code=202,
                content={
                    "message": "Document uploaded and processing started",
                    "filename": file.filename,
                    "kb_type": kb_type,
                    "thread_id": thread_id
                }
            )
            
        finally:
            # Clean up temporary file
            if os.path.exists(temp_file_path):
                os.unlink(temp_file_path)
                
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@router.post("/search")
async def search_knowledge_base(
    query: str = Form(..., description="Search query"),
    thread_id: Optional[str] = Form(None, description="Thread ID to search within"),
    kb_type: Optional[str] = Form(None, description="'global', 'thread', or None for both"),
    similarity_threshold: float = Form(0.7, description="Minimum similarity score (0-1)"),
    max_chunks: int = Form(5, description="Maximum number of chunks to return"),
    user_id: str = Depends(get_current_user_id_from_jwt),
    vector_kb_service: VectorKnowledgeBaseService = Depends(get_vector_kb_service)
):
    """
    Search the knowledge base for relevant content using vector similarity
    
    This endpoint will:
    1. Check if the query is relevant to the knowledge base
    2. If relevant, retrieve the most similar chunks
    3. Return the relevant content for RAG
    """
    try:
        # Get account_id from user_id
        from services.supabase import DBConnection
        db = DBConnection()
        await db.initialize()
        client = await db.client
        account_id = await get_user_account_id(client, user_id)
        
        # Validate parameters
        if not 0 <= similarity_threshold <= 1:
            raise HTTPException(status_code=400, detail="similarity_threshold must be between 0 and 1")
        
        if max_chunks < 1 or max_chunks > 20:
            raise HTTPException(status_code=400, detail="max_chunks must be between 1 and 20")
        
        # Search knowledge base
        result = await vector_kb_service.search_knowledge_base(
            query=query,
            account_id=account_id,
            thread_id=UUID(thread_id) if thread_id else None,
            kb_type=kb_type,
            similarity_threshold=similarity_threshold,
            max_chunks=max_chunks
        )
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")

@router.get("/processing-status/{queue_id}")
async def get_processing_status(
    queue_id: str,
    user_id: str = Depends(get_current_user_id_from_jwt),
    vector_kb_service: VectorKnowledgeBaseService = Depends(get_vector_kb_service)
):
    """Get the status of a document processing job"""
    try:
        status = await vector_kb_service.get_processing_status(UUID(queue_id))
        if not status:
            raise HTTPException(status_code=404, detail="Processing job not found")
        
        return status
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get status: {str(e)}")

@router.get("/global-entries")
async def get_global_knowledge_base_entries(
    include_inactive: bool = False,
    user_id: str = Depends(get_current_user_id_from_jwt),
    vector_kb_service: VectorKnowledgeBaseService = Depends(get_vector_kb_service)
):
    """Get all global knowledge base entries for the current account"""
    try:
        # Get account_id from user_id
        from services.supabase import DBConnection
        db = DBConnection()
        await db.initialize()
        client = await db.client
        account_id = await get_user_account_id(client, user_id)
        
        # Query the global knowledge base table
        from supabase import create_client
        import os
        
        supabase = create_client(
            os.getenv("SUPABASE_URL"),
            os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        )
        
        query = supabase.table('global_knowledge_base').select('*').eq('account_id', str(account_id))
        
        if not include_inactive:
            query = query.eq('is_active', True)
        
        result = query.execute()
        
        if result.error:
            raise HTTPException(status_code=500, detail=f"Database error: {result.error.message}")
        
        entries = result.data or []
        total_tokens = sum(entry.get('content_tokens', 0) for entry in entries)
        
        return {
            "entries": entries,
            "total_count": len(entries),
            "total_tokens": total_tokens
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get entries: {str(e)}")

@router.get("/thread-entries/{thread_id}")
async def get_thread_knowledge_base_entries(
    thread_id: str,
    include_inactive: bool = False,
    user_id: str = Depends(get_current_user_id_from_jwt),
    vector_kb_service: VectorKnowledgeBaseService = Depends(get_vector_kb_service)
):
    """Get all thread-specific knowledge base entries"""
    try:
        # Get account_id from user_id
        from services.supabase import DBConnection
        db = DBConnection()
        await db.initialize()
        client = await db.client
        account_id = await get_user_account_id(client, user_id)
        
        # Query the thread knowledge base table
        from supabase import create_client
        import os
        
        supabase = create_client(
            os.getenv("SUPABASE_URL"),
            os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        )
        
        query = supabase.table('thread_knowledge_base').select('*').eq('thread_id', thread_id).eq('account_id', str(account_id))
        
        if not include_inactive:
            query = query.eq('is_active', True)
        
        result = query.execute()
        
        if result.error:
            raise HTTPException(status_code=500, detail=f"Database error: {result.error.message}")
        
        entries = result.data or []
        total_tokens = sum(entry.get('content_tokens', 0) for entry in entries)
        
        return {
            "entries": entries,
            "total_count": len(entries),
            "total_tokens": total_tokens
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get entries: {str(e)}")

@router.put("/entry/{entry_id}")
async def update_knowledge_base_entry(
    entry_id: str,
    entry_data: dict,
    kb_type: str = Form(..., description="'global' or 'thread'"),
    user_id: str = Depends(get_current_user_id_from_jwt),
    vector_kb_service: VectorKnowledgeBaseService = Depends(get_vector_kb_service)
):
    """Update a knowledge base entry"""
    try:
        # Get account_id from user_id
        from services.supabase import DBConnection
        db = DBConnection()
        await db.initialize()
        client = await db.client
        account_id = await get_user_account_id(client, user_id)
        
        from supabase import create_client
        import os
        
        supabase = create_client(
            os.getenv("SUPABASE_URL"),
            os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        )
        
        # Determine which table to use
        table_name = 'global_knowledge_base' if kb_type == 'global' else 'thread_knowledge_base'
        
        # Add updated_at timestamp
        entry_data['updated_at'] = 'now()'
        
        # Update the entry
        result = supabase.table(table_name).update(entry_data).eq('id', entry_id).eq('account_id', str(account_id)).execute()
        
        if result.error:
            raise HTTPException(status_code=500, detail=f"Database error: {result.error.message}")
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Entry not found")
        
        return result.data[0]
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update entry: {str(e)}")

@router.delete("/entry/{entry_id}")
async def delete_knowledge_base_entry(
    entry_id: str,
    kb_type: str = Form(..., description="'global' or 'thread'"),
    user_id: str = Depends(get_current_user_id_from_jwt),
    vector_kb_service: VectorKnowledgeBaseService = Depends(get_vector_kb_service)
):
    """Delete a knowledge base entry"""
    try:
        # Get account_id from user_id
        from services.supabase import DBConnection
        db = DBConnection()
        await db.initialize()
        client = await db.client
        account_id = await get_user_account_id(client, user_id)
        
        from supabase import create_client
        import os
        
        supabase = create_client(
            os.getenv("SUPABASE_URL"),
            os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        )
        
        # Determine which table to use
        table_name = 'global_knowledge_base' if kb_type == 'global' else 'thread_knowledge_base'
        
        # Delete the entry
        result = supabase.table(table_name).delete().eq('id', entry_id).eq('account_id', str(account_id)).execute()
        
        if result.error:
            raise HTTPException(status_code=500, detail=f"Database error: {result.error.message}")
        
        return {"message": "Entry deleted successfully"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete entry: {str(e)}")

@router.post("/cleanup")
async def cleanup_old_processing_jobs(
    days_to_keep: int = Form(7, description="Number of days to keep old jobs"),
    user_id: str = Depends(get_current_user_id_from_jwt),
    vector_kb_service: VectorKnowledgeBaseService = Depends(get_vector_kb_service)
):
    """Clean up old document processing jobs (admin function)"""
    try:
        # This would need admin privileges check
        await vector_kb_service.cleanup_old_processing_jobs(days_to_keep)
        return {"message": f"Cleaned up jobs older than {days_to_keep} days"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Cleanup failed: {str(e)}")

# Additional CRUD endpoints for knowledge base entries

@router.post("/global-entries")
async def create_global_knowledge_base_entry(
    entry_data: dict,
    user_id: str = Depends(get_current_user_id_from_jwt),
    vector_kb_service: VectorKnowledgeBaseService = Depends(get_vector_kb_service)
):
    """Create a new global knowledge base entry"""
    try:
        # Get account_id from user_id
        from services.supabase import DBConnection
        db = DBConnection()
        await db.initialize()
        client = await db.client
        account_id = await get_user_account_id(client, user_id)
        
        from supabase import create_client
        import os
        
        supabase = create_client(
            os.getenv("SUPABASE_URL"),
            os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        )
        
        # Add account_id and created_at
        entry_data['account_id'] = str(account_id)
        entry_data['created_at'] = 'now()'
        entry_data['updated_at'] = 'now()'
        
        result = supabase.table('global_knowledge_base').insert(entry_data).execute()
        
        if result.error:
            raise HTTPException(status_code=500, detail=f"Database error: {result.error.message}")
        
        return result.data[0] if result.data else {}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create entry: {str(e)}")

@router.put("/global-entries/{entry_id}")
async def update_global_knowledge_base_entry(
    entry_id: str,
    entry_data: dict,
    user_id: str = Depends(get_current_user_id_from_jwt),
    vector_kb_service: VectorKnowledgeBaseService = Depends(get_vector_kb_service)
):
    """Update a global knowledge base entry"""
    try:
        # Get account_id from user_id
        from services.supabase import DBConnection
        db = DBConnection()
        await db.initialize()
        client = await db.client
        account_id = await get_user_account_id(client, user_id)
        
        from supabase import create_client
        import os
        
        supabase = create_client(
            os.getenv("SUPABASE_URL"),
            os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        )
        
        # Add updated_at
        entry_data['updated_at'] = 'now()'
        
        result = supabase.table('global_knowledge_base').update(entry_data).eq('id', entry_id).eq('account_id', str(account_id)).execute()
        
        if result.error:
            raise HTTPException(status_code=500, detail=f"Database error: {result.error.message}")
        
        return result.data[0] if result.data else {}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update entry: {str(e)}")

# Thread-specific knowledge base endpoints
@router.get("/thread-entries/{thread_id}")
async def get_thread_knowledge_base_entries(
    thread_id: str,
    include_inactive: bool = False,
    user_id: str = Depends(get_current_user_id_from_jwt),
    vector_kb_service: VectorKnowledgeBaseService = Depends(get_vector_kb_service)
):
    """Get thread-specific knowledge base entries"""
    try:
        # Get account_id from user_id
        from services.supabase import DBConnection
        db = DBConnection()
        await db.initialize()
        client = await db.client
        account_id = await get_user_account_id(client, user_id)
        
        from supabase import create_client
        import os
        
        supabase = create_client(
            os.getenv("SUPABASE_URL"),
            os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        )
        
        query = supabase.table('thread_knowledge_base').select('*').eq('thread_id', thread_id).eq('account_id', str(account_id))
        
        if not include_inactive:
            query = query.eq('is_active', True)
        
        result = query.execute()
        
        if result.error:
            raise HTTPException(status_code=500, detail=f"Database error: {result.error.message}")
        
        return result.data or []
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get thread entries: {str(e)}")

@router.post("/thread-entries/{thread_id}")
async def create_thread_knowledge_base_entry(
    thread_id: str,
    entry_data: dict,
    user_id: str = Depends(get_current_user_id_from_jwt),
    vector_kb_service: VectorKnowledgeBaseService = Depends(get_vector_kb_service)
):
    """Create a thread-specific knowledge base entry"""
    try:
        # Get account_id from user_id
        from services.supabase import DBConnection
        db = DBConnection()
        await db.initialize()
        client = await db.client
        account_id = await get_user_account_id(client, user_id)
        
        from supabase import create_client
        import os
        
        supabase = create_client(
            os.getenv("SUPABASE_URL"),
            os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        )
        
        # Create the entry
        entry_data['thread_id'] = thread_id
        entry_data['account_id'] = str(account_id)
        entry_data['is_active'] = entry_data.get('is_active', True)
        
        result = supabase.table('thread_knowledge_base').insert(entry_data).execute()
        
        if result.error:
            raise HTTPException(status_code=500, detail=f"Database error: {result.error.message}")
        
        return result.data[0] if result.data else {}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create entry: {str(e)}")

@router.get("/thread-entries/{thread_id}/context")
async def get_thread_knowledge_base_context(
    thread_id: str,
    max_tokens: int = 16000,
    user_id: str = Depends(get_current_user_id_from_jwt),
    vector_kb_service: VectorKnowledgeBaseService = Depends(get_vector_kb_service)
):
    """Get thread-specific knowledge base context for LLM"""
    try:
        # Get account_id from user_id
        from services.supabase import DBConnection
        db = DBConnection()
        await db.initialize()
        client = await db.client
        account_id = await get_user_account_id(client, user_id)
        
        from supabase import create_client
        import os
        
        supabase = create_client(
            os.getenv("SUPABASE_URL"),
            os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        )
        
        # Get active thread entries
        result = supabase.table('thread_knowledge_base').select('content, usage_context').eq('thread_id', thread_id).eq('account_id', str(account_id)).eq('is_active', True).execute()
        
        if result.error:
            raise HTTPException(status_code=500, detail=f"Database error: {result.error.message}")
        
        entries = result.data or []
        
        # Build context
        context_parts = []
        total_tokens = 0
        
        for entry in entries:
            content = entry.get('content', '')
            tokens = len(content.split())  # Rough token estimation
            
            if total_tokens + tokens <= max_tokens:
                context_parts.append(content)
                total_tokens += tokens
            else:
                break
        
        context = '\n\n'.join(context_parts) if context_parts else ''
        
        return {
            "context": context,
            "max_tokens": max_tokens,
            "thread_id": thread_id,
            "account_id": str(account_id)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get thread context: {str(e)}")

@router.get("/thread-entries/{thread_id}/combined-context")
async def get_thread_combined_context(
    thread_id: str,
    max_tokens: int = 16000,
    agent_id: Optional[str] = None,
    user_id: str = Depends(get_current_user_id_from_jwt),
    vector_kb_service: VectorKnowledgeBaseService = Depends(get_vector_kb_service)
):
    """Get combined context from thread knowledge base and agent knowledge base"""
    try:
        # Get account_id from user_id
        from services.supabase import DBConnection
        db = DBConnection()
        await db.initialize()
        client = await db.client
        account_id = await get_user_account_id(client, user_id)
        
        from supabase import create_client
        import os
        
        supabase = create_client(
            os.getenv("SUPABASE_URL"),
            os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        )
        
        # Get thread knowledge base context
        thread_result = supabase.table('thread_knowledge_base').select('content, usage_context').eq('thread_id', thread_id).eq('account_id', str(account_id)).eq('is_active', True).execute()
        
        if thread_result.error:
            raise HTTPException(status_code=500, detail=f"Database error: {thread_result.error.message}")
        
        thread_entries = thread_result.data or []
        
        # Get agent knowledge base context if agent_id is provided
        agent_entries = []
        if agent_id:
            agent_result = supabase.table('agent_knowledge_base').select('content, usage_context').eq('agent_id', agent_id).eq('account_id', str(account_id)).eq('is_active', True).execute()
            
            if not agent_result.error:
                agent_entries = agent_result.data or []
        
        # Combine and build context
        all_entries = thread_entries + agent_entries
        context_parts = []
        total_tokens = 0
        
        for entry in all_entries:
            content = entry.get('content', '')
            tokens = len(content.split())  # Rough token estimation
            
            if total_tokens + tokens <= max_tokens:
                context_parts.append(content)
                total_tokens += tokens
            else:
                break
        
        context = '\n\n'.join(context_parts) if context_parts else ''
        
        return {
            "context": context,
            "max_tokens": max_tokens,
            "thread_id": thread_id,
            "agent_id": agent_id,
            "account_id": str(account_id),
            "thread_entries_count": len(thread_entries),
            "agent_entries_count": len(agent_entries)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get combined context: {str(e)}")

@router.post("/thread-entries/{thread_id}/upload-file")
async def upload_thread_file(
    background_tasks: BackgroundTasks,
    thread_id: str,
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user_id_from_jwt),
    vector_kb_service: VectorKnowledgeBaseService = Depends(get_vector_kb_service)
):
    """Upload a file for thread-specific knowledge base"""
    try:
        # Get account_id from user_id
        from services.supabase import DBConnection
        db = DBConnection()
        await db.initialize()
        client = await db.client
        account_id = await get_user_account_id(client, user_id)
        
        # Process the file using the vector KB service
        result = await vector_kb_service.process_document(
            file_path=file.filename,
            account_id=account_id,
            thread_id=thread_id,
            kb_type='thread'
        )
        
        if not result.get('success'):
            raise HTTPException(status_code=500, detail=f"Failed to process document: {result.get('error', 'Unknown error')}")
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload file: {str(e)}")

@router.post("/thread-entries/{thread_id}/extract-knowledge")
async def extract_thread_knowledge(
    thread_id: str,
    data: dict,
    user_id: str = Depends(get_current_user_id_from_jwt),
    vector_kb_service: VectorKnowledgeBaseService = Depends(get_vector_kb_service)
):
    """Extract knowledge from thread content"""
    try:
        # Get account_id from user_id
        from services.supabase import DBConnection
        db = DBConnection()
        await db.initialize()
        client = await db.client
        account_id = await get_user_account_id(client, user_id)
        
        from supabase import create_client
        import os
        
        supabase = create_client(
            os.getenv("SUPABASE_URL"),
            os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        )
        
        # Create knowledge base entry from extracted content
        entry_data = {
            'thread_id': thread_id,
            'account_id': str(account_id),
            'content': data.get('content', ''),
            'source_type': 'thread_extraction',
            'is_active': True,
            'usage_context': 'contextual'
        }
        
        result = supabase.table('thread_knowledge_base').insert(entry_data).execute()
        
        if result.error:
            raise HTTPException(status_code=500, detail=f"Database error: {result.error.message}")
        
        return result.data[0] if result.data else {}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to extract knowledge: {str(e)}")

@router.post("/thread-entries/{thread_id}/save-to-global")
async def save_thread_to_global(
    thread_id: str,
    user_id: str = Depends(get_current_user_id_from_jwt),
    vector_kb_service: VectorKnowledgeBaseService = Depends(get_vector_kb_service)
):
    """Save thread knowledge base entries to global knowledge base"""
    try:
        # Get account_id from user_id
        from services.supabase import DBConnection
        db = DBConnection()
        await db.initialize()
        client = await db.client
        account_id = await get_user_account_id(client, user_id)
        
        from supabase import create_client
        import os
        
        supabase = create_client(
            os.getenv("SUPABASE_URL"),
            os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        )
        
        # Get thread entries
        result = supabase.table('thread_knowledge_base').select('*').eq('thread_id', thread_id).eq('account_id', str(account_id)).eq('is_active', True).execute()
        
        if result.error:
            raise HTTPException(status_code=500, detail=f"Database error: {result.error.message}")
        
        thread_entries = result.data or []
        
        # Copy to global knowledge base
        global_entries = []
        for entry in thread_entries:
            global_entry = {
                'account_id': str(account_id),
                'content': entry.get('content', ''),
                'source_type': 'thread_import',
                'is_active': True,
                'usage_context': 'contextual'
            }
            global_entries.append(global_entry)
        
        if global_entries:
            result = supabase.table('global_knowledge_base').insert(global_entries).execute()
            
            if result.error:
                raise HTTPException(status_code=500, detail=f"Database error: {result.error.message}")
        
        return {"message": f"Saved {len(global_entries)} entries to global knowledge base"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save to global: {str(e)}")

@router.get("/global-entries/{entry_id}")
async def get_global_knowledge_base_entry(
    entry_id: str,
    user_id: str = Depends(get_current_user_id_from_jwt),
    vector_kb_service: VectorKnowledgeBaseService = Depends(get_vector_kb_service)
):
    """Get a specific global knowledge base entry"""
    try:
        # Get account_id from user_id
        from services.supabase import DBConnection
        db = DBConnection()
        await db.initialize()
        client = await db.client
        account_id = await get_user_account_id(client, user_id)
        
        from supabase import create_client
        import os
        
        supabase = create_client(
            os.getenv("SUPABASE_URL"),
            os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        )
        
        result = supabase.table('global_knowledge_base').select('*').eq('id', entry_id).eq('account_id', str(account_id)).execute()
        
        if result.error:
            raise HTTPException(status_code=500, detail=f"Database error: {result.error.message}")
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Entry not found")
        
        return result.data[0]
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get entry: {str(e)}")

@router.get("/global-entries/context")
async def get_global_knowledge_base_context(
    max_tokens: int = 16000,
    user_id: str = Depends(get_current_user_id_from_jwt),
    vector_kb_service: VectorKnowledgeBaseService = Depends(get_vector_kb_service)
):
    """Get global knowledge base context for LLM"""
    try:
        # Get account_id from user_id
        from services.supabase import DBConnection
        db = DBConnection()
        await db.initialize()
        client = await db.client
        account_id = await get_user_account_id(client, user_id)
        
        from supabase import create_client
        import os
        
        supabase = create_client(
            os.getenv("SUPABASE_URL"),
            os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        )
        
        # Get active global entries
        result = supabase.table('global_knowledge_base').select('content, usage_context').eq('account_id', str(account_id)).eq('is_active', True).execute()
        
        if result.error:
            raise HTTPException(status_code=500, detail=f"Database error: {result.error.message}")
        
        entries = result.data or []
        
        # Filter by usage context and build context
        context_parts = []
        total_tokens = 0
        
        for entry in entries:
            if entry.get('usage_context') == 'always' or entry.get('usage_context') == 'contextual':
                content = entry.get('content', '')
                tokens = len(content.split())  # Rough token estimation
                
                if total_tokens + tokens <= max_tokens:
                    context_parts.append(content)
                    total_tokens += tokens
                else:
                    break
        
        context = '\n\n'.join(context_parts) if context_parts else ''
        
        return {
            "context": context,
            "max_tokens": max_tokens,
            "account_id": str(account_id)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get context: {str(e)}")
