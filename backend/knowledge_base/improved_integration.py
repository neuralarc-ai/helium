"""
Improved Knowledge Base Integration Module
=========================================

This module integrates the improved ingestion pipeline with the existing
knowledge base system, providing backward compatibility while enabling
the new data block architecture.
"""

import os
import tempfile
from typing import Dict, Any, Optional, List
from pathlib import Path
import asyncio

from utils.logger import logger
from services.supabase import DBConnection
from knowledge_base.improved_ingestion import IngestionPipeline, DataBlock, FileMetadata
from knowledge_base.file_processor import FileProcessor

class ImprovedKnowledgeBaseManager:
    """Manages the improved knowledge base system with data block architecture."""
    
    def __init__(self):
        self.db = DBConnection()
        self.file_processor = FileProcessor()
        
        # Initialize improved pipeline if database connection string is available
        self.improved_pipeline = None
        self._init_improved_pipeline()
    
    def _init_improved_pipeline(self):
        """Initialize the improved ingestion pipeline."""
        try:
            # Get database connection string from environment or Supabase config
            db_url = os.getenv('DATABASE_URL')
            if db_url:
                self.improved_pipeline = IngestionPipeline(db_url)
                logger.info("Improved ingestion pipeline initialized successfully")
            else:
                logger.warning("DATABASE_URL not found - improved pipeline not available")
        except Exception as e:
            logger.error(f"Failed to initialize improved pipeline: {e}")
    
    async def process_file_with_improved_pipeline(
        self,
        file_content: bytes,
        filename: str,
        account_id: str,
        name: str = None,
        description: str = None,
        use_improved_pipeline: bool = True
    ) -> Dict[str, Any]:
        """Process a file using either the improved pipeline or legacy system."""
        
        if use_improved_pipeline and self.improved_pipeline:
            return await self._process_with_improved_pipeline(
                file_content, filename, account_id, name, description
            )
        else:
            return await self._process_with_legacy_system(
                file_content, filename, account_id, name, description
            )
    
    async def _process_with_improved_pipeline(
        self,
        file_content: bytes,
        filename: str,
        account_id: str,
        name: str = None,
        description: str = None
    ) -> Dict[str, Any]:
        """Process file using the improved data block architecture."""
        try:
            # Create temporary file for processing
            with tempfile.NamedTemporaryFile(delete=False, suffix=Path(filename).suffix) as temp_file:
                temp_file.write(file_content)
                temp_file_path = temp_file.name
            
            try:
                # Process with improved pipeline
                entry_id = self.improved_pipeline.process_file(
                    file_path=temp_file_path,
                    account_id=account_id,
                    name=name or Path(filename).stem,
                    description=description or f"Processed with improved pipeline: {filename}"
                )
                
                # Get processed data for response
                result = await self._get_improved_processing_result(entry_id)
                
                logger.info(f"Successfully processed {filename} with improved pipeline")
                return {
                    "success": True,
                    "entry_id": entry_id,
                    "method": "improved_pipeline",
                    "data_blocks_created": result.get("total_blocks", 0),
                    "quality_score": result.get("quality_score", 0.0),
                    "message": f"File processed with {result.get('total_blocks', 0)} data blocks"
                }
                
            finally:
                # Clean up temporary file
                os.unlink(temp_file_path)
                
        except Exception as e:
            logger.error(f"Error in improved pipeline processing: {e}")
            # Fallback to legacy system
            logger.info("Falling back to legacy processing system")
            return await self._process_with_legacy_system(
                file_content, filename, account_id, name, description
            )
    
    async def _process_with_legacy_system(
        self,
        file_content: bytes,
        filename: str,
        account_id: str,
        name: str = None,
        description: str = None
    ) -> Dict[str, Any]:
        """Process file using the legacy system for backward compatibility."""
        try:
            # Use existing file processor
            result = await self.file_processor.process_thread_file_upload(
                thread_id="legacy",  # Placeholder
                account_id=account_id,
                file_content=file_content,
                filename=filename,
                mime_type="application/octet-stream"
            )
            
            return {
                "success": True,
                "entry_id": result.get("entry_id"),
                "method": "legacy_system",
                "message": "File processed with legacy system"
            }
            
        except Exception as e:
            logger.error(f"Error in legacy system processing: {e}")
            return {
                "success": False,
                "error": str(e),
                "method": "legacy_system"
            }
    
    async def _get_improved_processing_result(self, entry_id: str) -> Dict[str, Any]:
        """Get the results of improved pipeline processing."""
        try:
            client = await self.db.client
            
            # First check if the new schema tables exist
            try:
                # Check if kb_data_blocks table exists
                blocks_result = await client.table('kb_data_blocks').select(
                    'block_id, block_type, importance_score'
                ).eq('entry_id', entry_id).execute()
                
                if blocks_result.data:
                    total_blocks = len(blocks_result.data)
                    avg_importance = sum(block.get("importance_score", 0.5) for block in blocks_result.data) / total_blocks
                    
                    return {
                        "total_blocks": total_blocks,
                        "quality_score": round(avg_importance, 2),
                        "block_types": list(set(block.get("block_type") for block in blocks_result.data))
                    }
            except Exception:
                # New schema tables don't exist, fall back to checking global entries
                pass
            
            # Check global_knowledge_base_entries table (existing schema)
            try:
                entry_result = await client.table('global_knowledge_base_entries').select(
                    'content_summary, processing_status'
                ).eq('entry_id', entry_id).execute()
                
                if entry_result.data:
                    entry = entry_result.data[0]
                    return {
                        "total_blocks": 1,  # Legacy system has 1 block per file
                        "processing_status": entry.get("processing_status", "completed"),
                        "summary": entry.get("content_summary", "Legacy entry")
                    }
            except Exception:
                pass
            
            return {"total_blocks": 1, "quality_score": 0.5}
            
        except Exception as e:
            logger.error(f"Error getting processing result: {e}")
            return {"total_blocks": 1, "quality_score": 0.5}
    
    async def get_improved_kb_context(
        self,
        query: str,
        account_id: str,
        max_tokens: int = 8000,
        thread_id: str = None,
        agent_id: str = None
    ) -> str:
        """Get knowledge base context using the improved RAG functions."""
        try:
            client = await self.db.client
            
            # First try to call the improved RAG function if it exists
            try:
                result = await client.rpc('get_intelligent_kb_context', {
                    'p_query': query,
                    'p_account_id': account_id,
                    'p_thread_id': thread_id,
                    'p_agent_id': agent_id,
                    'p_max_tokens': max_tokens
                }).execute()
                
                if result.data:
                    return result.data
            except Exception:
                # Function doesn't exist, continue to fallback
                pass
            
            # Try the legacy function
            try:
                result = await client.rpc('get_relevant_kb_context', {
                    'p_query': query,
                    'p_max_tokens': max_tokens,
                    'p_similarity_threshold': 0.1
                }).execute()
                
                if result.data:
                    return result.data
            except Exception:
                pass
            
            # Final fallback: search global knowledge base entries
            return await self._search_global_kb_fallback(query, account_id, max_tokens)
                
        except Exception as e:
            logger.error(f"Error calling RAG functions: {e}")
            # Final fallback
            return await self._search_global_kb_fallback(query, account_id, max_tokens)
    
    async def _search_global_kb_fallback(self, query: str, account_id: str, max_tokens: int) -> str:
        """Fallback search using the existing global knowledge base."""
        try:
            client = await self.db.client
            
            # Search global knowledge base entries
            result = await client.table('global_knowledge_base_entries').select(
                'content, name, description'
            ).eq('account_id', account_id).eq('is_active', True).execute()
            
            if not result.data:
                return "No knowledge base entries found."
            
            # Simple text-based search (basic fallback)
            relevant_entries = []
            query_lower = query.lower()
            
            for entry in result.data:
                content = entry.get('content', '')
                name = entry.get('name', '')
                description = entry.get('description', '')
                
                # Check if query terms appear in content, name, or description
                if (query_lower in content.lower() or 
                    query_lower in name.lower() or 
                    query_lower in description.lower()):
                    relevant_entries.append(entry)
            
            if not relevant_entries:
                return "No relevant knowledge base entries found for your query."
            
            # Build context from relevant entries
            context_parts = []
            current_tokens = 0
            
            for entry in relevant_entries:
                content = entry.get('content', '')
                estimated_tokens = len(content) // 4
                
                if current_tokens + estimated_tokens > max_tokens:
                    break
                
                context_parts.append(f"## {entry.get('name', 'Unnamed Entry')}")
                if entry.get('description'):
                    context_parts.append(f"**Description**: {entry['description']}")
                context_parts.append(f"**Content**: {content}")
                context_parts.append("")
                
                current_tokens += estimated_tokens
            
            context = "\n".join(context_parts)
            
            return f"# KNOWLEDGE BASE CONTEXT\n\nQuery: \"{query}\"\n\n{context}"
            
        except Exception as e:
            logger.error(f"Error in global KB fallback: {e}")
            return f"Error retrieving knowledge base context: {str(e)}"
    
    async def get_data_blocks_for_entry(
        self,
        entry_id: str,
        block_types: List[str] = None,
        min_importance: float = 0.0
    ) -> List[Dict[str, Any]]:
        """Get data blocks for a specific entry with filtering."""
        try:
            client = await self.db.client
            
            # First try to get from new schema
            try:
                query = client.table('kb_data_blocks').select(
                    'block_id, block_type, content, content_summary, metadata, categories, entities, importance_score'
                ).eq('entry_id', entry_id).gte('importance_score', min_importance)
                
                if block_types:
                    query = query.in_('block_type', block_types)
                
                result = await query.order('importance_score', desc=True).execute()
                
                if result.data:
                    return result.data
            except Exception:
                # New schema doesn't exist, fall back to legacy
                pass
            
            # Fallback: get from global knowledge base entries
            try:
                result = await client.table('global_knowledge_base_entries').select(
                    'entry_id, content, name, description'
                ).eq('entry_id', entry_id).execute()
                
                if result.data:
                    entry = result.data[0]
                    # Create a single "block" from the legacy entry
                    return [{
                        'block_id': entry['entry_id'],
                        'block_type': 'legacy_content',
                        'content': entry['content'],
                        'content_summary': entry['name'],
                        'metadata': {'description': entry.get('description', '')},
                        'categories': ['legacy'],
                        'entities': [],
                        'importance_score': 0.5
                    }]
            except Exception:
                pass
            
            return []
            
        except Exception as e:
            logger.error(f"Error getting data blocks: {e}")
            return []
    
    async def search_data_blocks(
        self,
        query: str,
        account_id: str,
        max_results: int = 10,
        similarity_threshold: float = 0.3
    ) -> List[Dict[str, Any]]:
        """Search data blocks using semantic similarity."""
        try:
            client = await self.db.client
            
            # Try to use the improved search function if it exists
            try:
                result = await client.rpc('get_relevant_data_blocks', {
                    'p_query': query,
                    'p_account_id': account_id,
                    'p_max_blocks': max_results,
                    'p_similarity_threshold': similarity_threshold
                }).execute()
                
                if result.data:
                    return result.data
            except Exception:
                # Function doesn't exist, continue to fallback
                pass
            
            # Fallback: search global knowledge base entries
            return await self._search_global_kb_entries(query, account_id, max_results)
                
        except Exception as e:
            logger.error(f"Error searching data blocks: {e}")
            return await self._search_global_kb_entries(query, account_id, max_results)
    
    async def _search_global_kb_entries(self, query: str, account_id: str, max_results: int) -> List[Dict[str, Any]]:
        """Search global knowledge base entries as fallback."""
        try:
            client = await self.db.client
            
            result = await client.table('global_knowledge_base_entries').select(
                'entry_id, content, name, description'
            ).eq('account_id', account_id).eq('is_active', True).limit(max_results).execute()
            
            if not result.data:
                return []
            
            # Convert to block format for consistency
            blocks = []
            query_lower = query.lower()
            
            for entry in result.data:
                content = entry.get('content', '')
                name = entry.get('name', '')
                
                # Simple relevance scoring based on text matching
                relevance_score = 0.0
                if query_lower in content.lower():
                    relevance_score += 0.5
                if query_lower in name.lower():
                    relevance_score += 0.3
                
                if relevance_score > 0:
                    blocks.append({
                        'block_id': entry['entry_id'],
                        'entry_id': entry['entry_id'],
                        'block_type': 'legacy_content',
                        'content': content,
                        'content_summary': name,
                        'metadata': {'description': entry.get('description', '')},
                        'categories': ['legacy'],
                        'entities': [],
                        'importance_score': relevance_score,
                        'relevance_score': relevance_score
                    })
            
            # Sort by relevance score
            blocks.sort(key=lambda x: x['relevance_score'], reverse=True)
            return blocks[:max_results]
            
        except Exception as e:
            logger.error(f"Error in global KB search: {e}")
            return []
    
    async def get_file_metadata(self, entry_id: str) -> Optional[Dict[str, Any]]:
        """Get detailed file metadata for an entry."""
        try:
            client = await self.db.client
            
            # First try to get from new schema
            try:
                result = await client.table('kb_file_metadata').select('*').eq('entry_id', entry_id).execute()
                
                if result.data:
                    return result.data[0]
            except Exception:
                # New schema doesn't exist, continue to fallback
                pass
            
            # Fallback: get from global knowledge base entries
            try:
                result = await client.table('global_knowledge_base_entries').select(
                    'entry_id, name, description, source_type, source_metadata, file_size, file_mime_type'
                ).eq('entry_id', entry_id).execute()
                
                if result.data:
                    entry = result.data[0]
                    # Convert to metadata format
                    return {
                        'entry_id': entry['entry_id'],
                        'file_type': 'legacy',
                        'original_filename': entry.get('name', 'Unknown'),
                        'data_categories': ['legacy'],
                        'data_quality_score': 0.5,
                        'description': entry.get('description', ''),
                        'source_type': entry.get('source_type', 'manual'),
                        'file_size': entry.get('file_size'),
                        'file_mime_type': entry.get('file_mime_type')
                    }
            except Exception:
                pass
            
            return None
            
        except Exception as e:
            logger.error(f"Error getting file metadata: {e}")
            return None
    
    async def update_block_importance(
        self,
        block_id: str,
        new_importance: float,
        user_feedback: int = None
    ) -> bool:
        """Update the importance score of a data block."""
        try:
            client = await self.db.client
            
            # First try to update in new schema
            try:
                update_data = {
                    'importance_score': new_importance,
                    'updated_at': 'now()'
                }
                
                if user_feedback is not None:
                    update_data['user_feedback'] = user_feedback
                
                result = await client.table('kb_data_blocks').update(update_data).eq('block_id', block_id).execute()
                
                if result.data:
                    return True
            except Exception:
                # New schema doesn't exist, continue to fallback
                pass
            
            # Fallback: update global knowledge base entry
            try:
                update_data = {
                    'updated_at': 'now()'
                }
                
                result = await client.table('global_knowledge_base_entries').update(update_data).eq('entry_id', block_id).execute()
                
                return bool(result.data)
            except Exception:
                pass
            
            return False
            
        except Exception as e:
            logger.error(f"Error updating block importance: {e}")
            return False

# Global instance for easy access
improved_kb_manager = ImprovedKnowledgeBaseManager()
