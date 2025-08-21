"""
Vector Knowledge Base Service
Handles document processing, embeddings generation, and similarity search for RAG functionality
"""

import asyncio
import logging
from typing import List, Optional, Dict, Any, Tuple
from uuid import UUID
import numpy as np
from sentence_transformers import SentenceTransformer
from supabase import create_client, Client
import os
from pathlib import Path
import fitz  # PyMuPDF for PDF processing
import pandas as pd
from docx import Document
import json
import re

logger = logging.getLogger(__name__)

class VectorKnowledgeBaseService:
    """Service for managing vector-enabled knowledge base operations"""
    
    def __init__(self, supabase_url: str, supabase_key: str):
        self.supabase: Client = create_client(supabase_url, supabase_key)
        
        # Initialize sentence transformer model for embeddings
        # Using 'all-MiniLM-L6-v2' which is fast, lightweight, and produces 384-dimensional embeddings
        try:
            self.embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
            logger.info("Sentence transformer model loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load sentence transformer model: {e}")
            self.embedding_model = None
    
    async def process_document(
        self,
        file_path: str,
        account_id: UUID,
        thread_id: Optional[UUID] = None,
        kb_type: str = 'global'
    ) -> Dict[str, Any]:
        """
        Process a document and create knowledge base entries with vector embeddings
        
        Args:
            file_path: Path to the uploaded document
            account_id: Account ID for the knowledge base
            thread_id: Thread ID if this is thread-specific KB
            kb_type: 'global' or 'thread'
            
        Returns:
            Dict containing processing results
        """
        try:
            # Create document processing queue entry
            queue_entry = await self._create_processing_queue_entry(
                file_path, account_id, thread_id, kb_type
            )
            
            # Extract text from document
            extracted_text = await self._extract_text_from_document(file_path)
            if not extracted_text:
                raise ValueError("No text could be extracted from the document")
            
            # Update queue entry with extracted text
            await self._update_processing_status(
                queue_entry['id'], 'processing', extracted_text=extracted_text
            )
            
            # Chunk the text
            chunks = self._chunk_text(extracted_text)
            
            # Create knowledge base entry
            kb_entry = await self._create_kb_entry(
                account_id, thread_id, kb_type, file_path, extracted_text
            )
            
            # Generate embeddings and store chunks
            await self._process_chunks_with_embeddings(
                queue_entry['id'], kb_entry['id'], kb_type, chunks
            )
            
            # Update processing status to completed
            await self._update_processing_status(
                queue_entry['id'], 'completed', chunk_count=len(chunks)
            )
            
            return {
                'success': True,
                'kb_entry_id': kb_entry['id'],
                'chunks_created': len(chunks),
                'total_tokens': sum(len(chunk.split()) for chunk in chunks)
            }
            
        except Exception as e:
            logger.error(f"Document processing failed: {e}")
            if 'queue_entry' in locals():
                await self._update_processing_status(
                    queue_entry['id'], 'failed', error_message=str(e)
                )
            return {'success': False, 'error': str(e)}
    
    async def search_knowledge_base(
        self,
        query: str,
        account_id: UUID,
        thread_id: Optional[UUID] = None,
        kb_type: Optional[str] = None,
        similarity_threshold: float = 0.7,
        max_chunks: int = 5
    ) -> Dict[str, Any]:
        """
        Search knowledge base for relevant content using vector similarity
        
        Args:
            query: User's query text
            account_id: Account ID to search within
            thread_id: Thread ID if searching thread-specific KB
            kb_type: 'global', 'thread', or None for both
            similarity_threshold: Minimum similarity score (0-1)
            max_chunks: Maximum number of chunks to return
            
        Returns:
            Dict containing search results and relevance information
        """
        try:
            # Check if query is relevant to knowledge base
            is_relevant = await self._check_query_relevance(
                query, account_id, thread_id, kb_type, similarity_threshold
            )
            
            if not is_relevant:
                return {
                    'relevant': False,
                    'chunks': [],
                    'reason': 'Query not relevant to knowledge base content'
                }
            
            # Get relevant chunks
            chunks = await self._get_relevant_chunks(
                query, account_id, thread_id, kb_type, similarity_threshold, max_chunks
            )
            
            # Log the query for analytics
            await self._log_kb_query(
                query, account_id, thread_id, len(chunks), True
            )
            
            return {
                'relevant': True,
                'chunks': chunks,
                'total_chunks_found': len(chunks)
            }
            
        except Exception as e:
            logger.error(f"Knowledge base search failed: {e}")
            return {'relevant': False, 'error': str(e)}
    
    async def _create_processing_queue_entry(
        self,
        file_path: str,
        account_id: UUID,
        thread_id: Optional[UUID],
        kb_type: str
    ) -> Dict[str, Any]:
        """Create a document processing queue entry"""
        file_path_obj = Path(file_path)
        
        data = {
            'account_id': str(account_id),
            'thread_id': str(thread_id) if thread_id else None,
            'kb_type': kb_type,
            'original_filename': file_path_obj.name,
            'file_path': file_path,
            'file_size': file_path_obj.stat().st_size,
            'mime_type': self._get_mime_type(file_path_obj),
            'document_type': self._get_document_type(file_path_obj),
            'status': 'pending'
        }
        
        result = self.supabase.table('document_processing_queue').insert(data).execute()
        return result.data[0]
    
    async def _update_processing_status(
        self,
        queue_id: UUID,
        status: str,
        extracted_text: Optional[str] = None,
        chunk_count: Optional[int] = None,
        error_message: Optional[str] = None
    ):
        """Update document processing status"""
        update_data = {'status': status}
        
        if extracted_text is not None:
            update_data['extracted_text'] = extracted_text
        
        if chunk_count is not None:
            update_data['chunk_count'] = chunk_count
        
        if error_message is not None:
            update_data['error_message'] = error_message
        
        if status == 'processing':
            update_data['processing_started_at'] = 'now()'
        elif status in ['completed', 'failed']:
            update_data['processing_completed_at'] = 'now()'
        
        self.supabase.table('document_processing_queue').update(update_data).eq('id', str(queue_id)).execute()
    
    async def _extract_text_from_document(self, file_path: str) -> str:
        """Extract text from various document formats"""
        file_path_obj = Path(file_path)
        file_extension = file_path_obj.suffix.lower()
        
        try:
            if file_extension == '.pdf':
                return self._extract_pdf_text(file_path)
            elif file_extension == '.docx':
                return self._extract_docx_text(file_path)
            elif file_extension == '.csv':
                return self._extract_csv_text(file_path)
            elif file_extension in ['.txt', '.md', '.json']:
                return self._extract_text_file(file_path)
            else:
                # Try to extract as text file
                return self._extract_text_file(file_path)
        except Exception as e:
            logger.error(f"Text extraction failed for {file_path}: {e}")
            raise
    
    def _extract_pdf_text(self, file_path: str) -> str:
        """Extract text from PDF using PyMuPDF"""
        try:
            doc = fitz.open(file_path)
            text = ""
            for page in doc:
                text += page.get_text()
            doc.close()
            return text
        except Exception as e:
            logger.error(f"PDF text extraction failed: {e}")
            raise
    
    def _extract_docx_text(self, file_path: str) -> str:
        """Extract text from DOCX file"""
        try:
            doc = Document(file_path)
            text = ""
            for paragraph in doc.paragraphs:
                text += paragraph.text + "\n"
            return text
        except Exception as e:
            logger.error(f"DOCX text extraction failed: {e}")
            raise
    
    def _extract_csv_text(self, file_path: str) -> str:
        """Extract text from CSV file"""
        try:
            df = pd.read_csv(file_path)
            # Convert DataFrame to readable text format
            text = df.to_string(index=False)
            return text
        except Exception as e:
            logger.error(f"CSV text extraction failed: {e}")
            raise
    
    def _extract_text_file(self, file_path: str) -> str:
        """Extract text from plain text files"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return f.read()
        except UnicodeDecodeError:
            # Try with different encoding
            try:
                with open(file_path, 'r', encoding='latin-1') as f:
                    return f.read()
            except Exception as e:
                logger.error(f"Text file extraction failed: {e}")
                raise
    
    def _chunk_text(self, text: str, chunk_size: int = 1000, overlap: int = 200) -> List[str]:
        """
        Split text into overlapping chunks for better context preservation
        
        Args:
            text: Text to chunk
            chunk_size: Target chunk size in characters
            overlap: Overlap between chunks in characters
            
        Returns:
            List of text chunks
        """
        if len(text) <= chunk_size:
            return [text]
        
        chunks = []
        start = 0
        
        while start < len(text):
            end = start + chunk_size
            
            # Try to break at sentence boundaries
            if end < len(text):
                # Look for sentence endings within the last 100 characters
                search_start = max(start + chunk_size - 100, start)
                sentence_end = text.rfind('.', search_start, end)
                if sentence_end > start + chunk_size // 2:  # Only break if we find a reasonable sentence end
                    end = sentence_end + 1
            
            chunk = text[start:end].strip()
            if chunk:
                chunks.append(chunk)
            
            start = end - overlap
            if start >= len(text):
                break
        
        return chunks
    
    async def _create_kb_entry(
        self,
        account_id: UUID,
        thread_id: Optional[UUID],
        kb_type: str,
        file_path: str,
        content: str
    ) -> Dict[str, Any]:
        """Create a knowledge base entry"""
        file_path_obj = Path(file_path)
        
        data = {
            'account_id': str(account_id),
            'thread_id': str(thread_id) if thread_id else None,
            'name': file_path_obj.stem,
            'description': f"Document: {file_path_obj.name}",
            'content': content,
            'content_tokens': len(content.split()),
            'source_metadata': {
                'filename': file_path_obj.name,
                'file_size': file_path_obj.stat().st_size,
                'extraction_method': 'vector_kb_service'
            }
        }
        
        table_name = 'global_knowledge_base' if kb_type == 'global' else 'thread_knowledge_base'
        result = self.supabase.table(table_name).insert(data).execute()
        return result.data[0]
    
    async def _process_chunks_with_embeddings(
        self,
        queue_id: UUID,
        kb_entry_id: UUID,
        kb_type: str,
        chunks: List[str]
    ):
        """Process text chunks and generate embeddings"""
        if not self.embedding_model:
            raise RuntimeError("Embedding model not available")
        
        # Generate embeddings for all chunks
        embeddings = self.embedding_model.encode(chunks)
        
        # Store chunks with embeddings
        chunk_data = []
        for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
            chunk_data.append({
                'document_id': str(queue_id),
                'kb_entry_id': str(kb_entry_id),
                'kb_type': kb_type,
                'chunk_index': i,
                'chunk_text': chunk,
                'chunk_tokens': len(chunk.split()),
                'embedding': embedding.tolist(),
                'metadata': {
                    'chunk_index': i,
                    'chunk_size': len(chunk)
                }
            })
        
        # Insert chunks in batches
        batch_size = 100
        for i in range(0, len(chunk_data), batch_size):
            batch = chunk_data[i:i + batch_size]
            self.supabase.table('document_chunks').insert(batch).execute()
    
    async def _check_query_relevance(
        self,
        query: str,
        account_id: UUID,
        thread_id: Optional[UUID],
        kb_type: Optional[str],
        similarity_threshold: float
    ) -> bool:
        """Check if a query is relevant to the knowledge base"""
        if not self.embedding_model:
            return False
        
        # Generate query embedding
        query_embedding = self.embedding_model.encode([query])[0]
        
        # Call the database function to check relevance
        result = self.supabase.rpc(
            'is_query_relevant_to_kb',
            {
                'query_embedding': query_embedding.tolist(),
                'p_kb_type': kb_type,
                'p_thread_id': str(thread_id) if thread_id else None,
                'p_account_id': str(account_id),
                'relevance_threshold': similarity_threshold
            }
        ).execute()
        
        return result.data if result.data else False
    
    async def _get_relevant_chunks(
        self,
        query: str,
        account_id: UUID,
        thread_id: Optional[UUID],
        kb_type: Optional[str],
        similarity_threshold: float,
        max_chunks: int
    ) -> List[Dict[str, Any]]:
        """Get relevant chunks for a query"""
        if not self.embedding_model:
            return []
        
        # Generate query embedding
        query_embedding = self.embedding_model.encode([query])[0]
        
        # Call the database function to get relevant chunks
        result = self.supabase.rpc(
            'get_relevant_kb_chunks',
            {
                'query_embedding': query_embedding.tolist(),
                'p_kb_type': kb_type,
                'p_thread_id': str(thread_id) if thread_id else None,
                'p_account_id': str(account_id),
                'similarity_threshold': similarity_threshold,
                'max_chunks': max_chunks
            }
        ).execute()
        
        return result.data if result.data else []
    
    async def _log_kb_query(
        self,
        query: str,
        account_id: UUID,
        thread_id: Optional[UUID],
        chunks_found: int,
        was_used: bool
    ):
        """Log knowledge base query for analytics"""
        if not self.embedding_model:
            return
        
        # Generate query embedding for logging
        query_embedding = self.embedding_model.encode([query])[0]
        
        log_data = {
            'thread_id': str(thread_id) if thread_id else None,
            'account_id': str(account_id),
            'user_query': query,
            'query_embedding': query_embedding.tolist(),
            'relevant_chunks_found': chunks_found,
            'was_kb_used': was_used
        }
        
        self.supabase.table('kb_query_logs').insert(log_data).execute()
    
    def _get_mime_type(self, file_path: Path) -> str:
        """Get MIME type based on file extension"""
        extension_map = {
            '.pdf': 'application/pdf',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.csv': 'text/csv',
            '.txt': 'text/plain',
            '.md': 'text/markdown',
            '.json': 'application/json'
        }
        return extension_map.get(file_path.suffix.lower(), 'application/octet-stream')
    
    def _get_document_type(self, file_path: Path) -> str:
        """Get document type based on file extension"""
        extension_map = {
            '.pdf': 'pdf',
            '.docx': 'docx',
            '.csv': 'csv',
            '.txt': 'txt',
            '.md': 'md',
            '.json': 'json'
        }
        return extension_map.get(file_path.suffix.lower(), 'other')
    
    async def cleanup_old_processing_jobs(self, days_to_keep: int = 7):
        """Clean up old document processing jobs"""
        try:
            # Delete old completed/failed jobs
            self.supabase.table('document_processing_queue').delete().lt(
                'created_at', f'now() - interval \'{days_to_keep} days\''
            ).in_('status', ['completed', 'failed']).execute()
            
            logger.info(f"Cleaned up processing jobs older than {days_to_keep} days")
        except Exception as e:
            logger.error(f"Failed to cleanup old processing jobs: {e}")
    
    async def get_processing_status(self, queue_id: UUID) -> Dict[str, Any]:
        """Get the status of a document processing job"""
        try:
            result = self.supabase.table('document_processing_queue').select('*').eq('id', str(queue_id)).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            logger.error(f"Failed to get processing status: {e}")
            return None

