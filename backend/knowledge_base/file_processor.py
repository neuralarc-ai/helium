import os
import io
import zipfile
import tempfile
import shutil
import asyncio
import subprocess
import re
from typing import List, Dict, Any, Optional, Tuple
from pathlib import Path
import mimetypes
import chardet

import PyPDF2
import docx

from utils.logger import logger
from services.supabase import DBConnection

class FileProcessor:
    SUPPORTED_TEXT_EXTENSIONS = {
        '.txt', '.csv'
    }
    
    SUPPORTED_DOCUMENT_EXTENSIONS = {
        '.pdf', '.docx'
    }
    
    MAX_FILE_SIZE = 100 * 1024 * 1024
    MAX_ZIP_ENTRIES = 1000
    MAX_CONTENT_LENGTH = 100000
    
    def __init__(self):
        self.db = DBConnection()
    
    async def process_thread_file_upload(
        self,
        thread_id: str,
        account_id: str,
        file_content: bytes,
        filename: str,
        mime_type: str,
    ) -> Dict[str, Any]:
        """Process file upload for thread knowledge base (creates entry in knowledge_base_entries)."""
        try:
            file_size = len(file_content)
            if file_size > self.MAX_FILE_SIZE:
                raise ValueError(
                    f"File too large: {file_size} bytes (max: {self.MAX_FILE_SIZE})"
                )

            file_extension = Path(filename).suffix.lower()
            extraction_method = self._get_extraction_method(file_extension, mime_type)

            # Extract content or handle ZIP specially in future if needed
            content = await self._extract_file_content(
                file_content, filename, mime_type
            )

            if not content or not content.strip():
                raise ValueError(f"No extractable content found in {filename}")

            client = await self.db.client

            # Sanitize and clamp content size
            sanitized_content = self._sanitize_content(
                content[: self.MAX_CONTENT_LENGTH]
            )

            # knowledge_base_entries has a slimmer schema than agent/global tables
            entry_data = {
                'thread_id': thread_id,
                'account_id': account_id,
                'name': f"📄 {filename}",
                'description': f"Content extracted from uploaded file: {filename}",
                'content': sanitized_content,
                'usage_context': 'always',
                'is_active': True,
            }

            # Deduplicate: if an entry with same thread, name, and identical content exists, reuse it
            try:
                existing = await client.table('knowledge_base_entries') \
                    .select('entry_id, content') \
                    .eq('thread_id', thread_id) \
                    .eq('name', entry_data['name']) \
                    .order('created_at', desc=True) \
                    .limit(1) \
                    .execute()
                if existing.data:
                    existing_row = existing.data[0]
                    if existing_row.get('content') == entry_data['content']:
                        logger.info("Duplicate knowledge base upload detected; returning existing entry_id")
                        return {
                            'success': True,
                            'entry_id': existing_row['entry_id'],
                            'filename': filename,
                            'content_length': len(sanitized_content),
                            'extraction_method': extraction_method,
                        }
            except Exception as dedup_err:
                logger.warning(f"Dedup check failed: {dedup_err}")

            result = (
                await client.table('knowledge_base_entries').insert(entry_data).execute()
            )

            if not result.data:
                raise Exception("Failed to create thread knowledge base entry")

            return {
                'success': True,
                'entry_id': result.data[0]['entry_id'],
                'filename': filename,
                'content_length': len(sanitized_content),
                'extraction_method': extraction_method,
            }

        except Exception as e:
            logger.error(f"Error processing thread file {filename}: {str(e)}")
            return {
                'success': False,
                'filename': filename,
                'error': str(e),
            }

    async def process_file_upload(
        self, 
        agent_id: str, 
        account_id: str, 
        file_content: bytes, 
        filename: str, 
        mime_type: str
    ) -> Dict[str, Any]:
        try:
            file_size = len(file_content)
            if file_size > self.MAX_FILE_SIZE:
                raise ValueError(f"File too large: {file_size} bytes (max: {self.MAX_FILE_SIZE})")
            
            file_extension = Path(filename).suffix.lower()

            if file_extension == '.zip':
                return await self._process_zip_file(agent_id, account_id, file_content, filename)
            
            content = await self._extract_file_content(file_content, filename, mime_type)
            
            if not content or not content.strip():
                raise ValueError(f"No extractable content found in {filename}")
            
            client = await self.db.client
            
            entry_data = {
                'agent_id': agent_id,
                'account_id': account_id,
                'name': f"📄 {filename}",
                'description': f"Content extracted from uploaded file: {filename}",
                'content': content[:self.MAX_CONTENT_LENGTH],
                'source_type': 'file',
                'source_metadata': {
                    'filename': filename,
                    'mime_type': mime_type,
                    'file_size': file_size,
                    'extraction_method': self._get_extraction_method(file_extension, mime_type)
                },
                'file_size': file_size,
                'file_mime_type': mime_type,
                'usage_context': 'always',
                'is_active': True
            }
            
            result = await client.table('agent_knowledge_base_entries').insert(entry_data).execute()
            
            if not result.data:
                raise Exception("Failed to create knowledge base entry")
            
            return {
                'success': True,
                'entry_id': result.data[0]['entry_id'],
                'filename': filename,
                'content_length': len(content),
                'extraction_method': entry_data['source_metadata']['extraction_method']
            }
            
        except Exception as e:
            logger.error(f"Error processing file {filename}: {str(e)}")
            return {
                'success': False,
                'filename': filename,
                'error': str(e)
            }
    
    async def process_global_file_upload(
        self, 
        account_id: str, 
        file_content: bytes, 
        filename: str, 
        mime_type: str,
        custom_name: str = None
    ) -> Dict[str, Any]:
        """Process file upload for global knowledge base (no agent_id required)"""
        try:
            logger.info(f"Processing global file upload: {filename}, size: {len(file_content)} bytes")
            
            file_size = len(file_content)
            if file_size > self.MAX_FILE_SIZE:
                raise ValueError(f"File too large: {file_size} bytes (max: {self.MAX_FILE_SIZE})")
            
            file_extension = Path(filename).suffix.lower()
            logger.info(f"File extension: {file_extension}")

            if file_extension == '.zip':
                logger.info("Processing ZIP file")
                return await self._process_global_zip_file(account_id, file_content, filename, custom_name)
            
            logger.info("Extracting file content")
            content = await self._extract_file_content(file_content, filename, mime_type)
            
            if not content or not content.strip():
                raise ValueError(f"No extractable content found in {filename}")
            
            logger.info(f"Content extracted, length: {len(content)} characters")
            
            client = await self.db.client
            logger.info("Database client obtained")
            
            # Sanitize the content to remove any problematic characters
            sanitized_content = self._sanitize_content(content[:self.MAX_CONTENT_LENGTH])
            logger.info(f"Content sanitized, final length: {len(sanitized_content)} characters")
            
            # Use custom name if provided, otherwise use filename
            display_name = custom_name if custom_name else filename
            
        # Deduplicate: avoid inserting duplicates for same account
        try:
            logger.info("Checking for existing global KB entries to avoid duplicates")
            existing_query = (
                await client.table('global_knowledge_base_entries')
                .select('entry_id, name, content, source_metadata')
                .eq('account_id', account_id)
                .eq('name', display_name)
                .order('created_at', desc=True)
                .limit(5)
                .execute()
            )

            if existing_query.data:
                for row in existing_query.data:
                    try:
                        existing_filename = (row.get('source_metadata') or {}).get('filename')
                    except Exception:
                        existing_filename = None

                    if (row.get('content') == sanitized_content) or (
                        isinstance(existing_filename, str) and existing_filename == filename
                    ):
                        logger.info("Duplicate detected; reusing existing entry_id")
                        return {
                            'success': True,
                            'entry_id': row['entry_id'],
                            'filename': filename,
                            'content_length': len(sanitized_content),
                            'extraction_method': self._get_extraction_method(file_extension, mime_type),
                            'deduplicated': True,
                        }
        except Exception as dedup_err:
            logger.warning(f"Global KB dedup check failed: {dedup_err}")

            entry_data = {
                'account_id': account_id,
                'name': display_name,
                'description': f"Content extracted from uploaded file: {filename}",
                'content': sanitized_content,
                'source_type': 'file',
                'source_metadata': {
                    'filename': filename,
                    'mime_type': mime_type,
                    'file_size': file_size,
                    'extraction_method': self._get_extraction_method(file_extension, mime_type)
                },
                'file_size': file_size,
                'file_mime_type': mime_type,
                'usage_context': 'always',
                'is_active': True
            }
            
            logger.info(f"Preparing to insert entry into global_knowledge_base_entries table")
            logger.info(f"Entry data keys: {list(entry_data.keys())}")
            
            # Try to insert the entry
            try:
                result = await client.table('global_knowledge_base_entries').insert(entry_data).execute()
                logger.info(f"Insert result: {result}")
                
                if not result.data:
                    logger.error("Database insertion failed - no data returned")
                    raise Exception("Failed to create global knowledge base entry")
                
                logger.info(f"Entry created successfully with ID: {result.data[0]['entry_id']}")
                
                return {
                    'success': True,
                    'entry_id': result.data[0]['entry_id'],
                    'filename': filename,
                    'content_length': len(sanitized_content),
                    'extraction_method': entry_data['source_metadata']['extraction_method']
                }
                
            except Exception as db_error:
                logger.error(f"Database insertion error: {str(db_error)}", exc_info=True)
                # Try to get more details about the error
                if hasattr(db_error, 'message'):
                    logger.error(f"Database error message: {db_error.message}")
                if hasattr(db_error, 'details'):
                    logger.error(f"Database error details: {db_error.details}")
                raise db_error
            
        except Exception as e:
            logger.error(f"Error processing global file {filename}: {str(e)}", exc_info=True)
            return {
                'success': False,
                'filename': filename,
                'error': str(e)
            }
    
    async def _process_global_zip_file(
        self, 
        account_id: str, 
        zip_content: bytes, 
        zip_filename: str,
        custom_name: str = None
    ) -> Dict[str, Any]:
        """Process ZIP file for global knowledge base"""
        try:
            client = await self.db.client
            
            # Use custom name if provided, otherwise use filename with emoji
            display_name = custom_name if custom_name else f"📦 {zip_filename}"
            
            zip_entry_data = {
                'account_id': account_id,
                'name': display_name,
                'description': f"ZIP archive: {zip_filename}",
                'content': f"ZIP archive containing multiple files. Extracted files will appear as separate entries.",
                'source_type': 'file',
                'source_metadata': {
                    'filename': zip_filename,
                    'mime_type': 'application/zip',
                    'file_size': len(zip_content),
                    'is_zip_container': True
                },
                'file_size': len(zip_content),
                'file_mime_type': 'application/zip',
                'usage_context': 'always',
                'is_active': True
            }
            
            zip_result = await client.table('global_knowledge_base_entries').insert(zip_entry_data).execute()
            zip_entry_id = zip_result.data[0]['entry_id']
            
            extracted_files = []
            failed_files = []
            
            with zipfile.ZipFile(io.BytesIO(zip_content), 'r') as zip_ref:
                file_list = zip_ref.namelist()
                
                if len(file_list) > self.MAX_ZIP_ENTRIES:
                    raise ValueError(f"ZIP contains too many files: {len(file_list)} (max: {self.MAX_ZIP_ENTRIES})")
                
                for file_path in file_list:
                    if file_path.endswith('/'):
                        continue
                    
                    try:
                        file_content = zip_ref.read(file_path)
                        filename = os.path.basename(file_path)
                        
                        if not filename:
                            continue
                        
                        mime_type, _ = mimetypes.guess_type(filename)
                        if not mime_type:
                            mime_type = 'application/octet-stream'
                        
                        content = await self._extract_file_content(file_content, filename, mime_type)
                        
                        if content and content.strip():
                            extracted_entry_data = {
                                'account_id': account_id,
                                'name': f"📄 {filename}",
                                'description': f"Extracted from {zip_filename}: {file_path}",
                                'content': content[:self.MAX_CONTENT_LENGTH],
                                'source_type': 'zip_extracted',
                                'source_metadata': {
                                    'filename': filename,
                                    'original_path': file_path,
                                    'zip_filename': zip_filename,
                                    'mime_type': mime_type,
                                    'file_size': len(file_content),
                                    'extraction_method': self._get_extraction_method(Path(filename).suffix.lower(), mime_type)
                                },
                                'file_size': len(file_content),
                                'file_mime_type': mime_type,
                                'extracted_from_zip_id': zip_entry_id,
                                'usage_context': 'always',
                                'is_active': True
                            }
                            
                            extracted_result = await client.table('global_knowledge_base_entries').insert(extracted_entry_data).execute()
                            if extracted_result.data:
                                extracted_files.append(filename)
                            else:
                                failed_files.append(filename)
                        else:
                            failed_files.append(filename)
                            
                    except Exception as e:
                        logger.error(f"Error processing file {file_path} from ZIP: {str(e)}")
                        failed_files.append(file_path)
            
            return {
                'success': True,
                'entry_id': zip_entry_id,
                'filename': zip_filename,
                'content_length': len(f"ZIP archive with {len(extracted_files)} extracted files"),
                'extraction_method': 'zip_extraction',
                'extracted_files': extracted_files,
                'failed_files': failed_files
            }
            
        except Exception as e:
            logger.error(f"Error processing global ZIP file {zip_filename}: {str(e)}")
            return {
                'success': False,
                'filename': zip_filename,
                'error': str(e)
            }
    
    async def _process_zip_file(
        self, 
        agent_id: str, 
        account_id: str, 
        zip_content: bytes, 
        zip_filename: str
    ) -> Dict[str, Any]:
        try:
            client = await self.db.client
            
            zip_entry_data = {
                'agent_id': agent_id,
                'account_id': account_id,
                'name': f"📦 {zip_filename}",
                'description': f"ZIP archive: {zip_filename}",
                'content': f"ZIP archive containing multiple files. Extracted files will appear as separate entries.",
                'source_type': 'file',
                'source_metadata': {
                    'filename': zip_filename,
                    'mime_type': 'application/zip',
                    'file_size': len(zip_content),
                    'is_zip_container': True
                },
                'file_size': len(zip_content),
                'file_mime_type': 'application/zip',
                'usage_context': 'always',
                'is_active': True
            }
            
            zip_result = await client.table('agent_knowledge_base_entries').insert(zip_entry_data).execute()
            zip_entry_id = zip_result.data[0]['entry_id']
            
            extracted_files = []
            failed_files = []
            
            with zipfile.ZipFile(io.BytesIO(zip_content), 'r') as zip_ref:
                file_list = zip_ref.namelist()
                
                if len(file_list) > self.MAX_ZIP_ENTRIES:
                    raise ValueError(f"ZIP contains too many files: {len(file_list)} (max: {self.MAX_ZIP_ENTRIES})")
                
                for file_path in file_list:
                    if file_path.endswith('/'):
                        continue
                    
                    try:
                        file_content = zip_ref.read(file_path)
                        filename = os.path.basename(file_path)
                        
                        if not filename:
                            continue
                        
                        mime_type, _ = mimetypes.guess_type(filename)
                        if not mime_type:
                            mime_type = 'application/octet-stream'
                        
                        content = await self._extract_file_content(file_content, filename, mime_type)
                        
                        if content and content.strip():
                            extracted_entry_data = {
                                'agent_id': agent_id,
                                'account_id': account_id,
                                'name': f"📄 {filename}",
                                'description': f"Extracted from {zip_filename}: {file_path}",
                                'content': content[:self.MAX_CONTENT_LENGTH],
                                'source_type': 'zip_extracted',
                                'source_metadata': {
                                    'filename': filename,
                                    'original_path': file_path,
                                    'zip_filename': zip_filename,
                                    'mime_type': mime_type,
                                    'file_size': len(file_content),
                                    'extraction_method': self._get_extraction_method(Path(filename).suffix.lower(), mime_type)
                                },
                                'file_size': len(file_content),
                                'file_mime_type': mime_type,
                                'extracted_from_zip_id': zip_entry_id,
                                'usage_context': 'always',
                                'is_active': True
                            }
                            
                            extracted_result = await client.table('agent_knowledge_base_entries').insert(extracted_entry_data).execute()
                            
                            extracted_files.append({
                                'filename': filename,
                                'path': file_path,
                                'entry_id': extracted_result.data[0]['entry_id'],
                                'content_length': len(content)
                            })
                        
                    except Exception as e:
                        logger.error(f"Error extracting {file_path} from ZIP: {str(e)}")
                        failed_files.append({
                            'filename': os.path.basename(file_path),
                            'path': file_path,
                            'error': str(e)
                        })
            
            return {
                'success': True,
                'zip_entry_id': zip_entry_id,
                'zip_filename': zip_filename,
                'extracted_files': extracted_files,
                'failed_files': failed_files,
                'total_extracted': len(extracted_files),
                'total_failed': len(failed_files)
            }
            
        except Exception as e:
            logger.error(f"Error processing ZIP file {zip_filename}: {str(e)}")
            return {
                'success': False,
                'zip_filename': zip_filename,
                'error': str(e)
            }
    
    async def process_git_repository(
        self, 
        agent_id: str, 
        account_id: str, 
        git_url: str,
        branch: str = 'main',
        include_patterns: List[str] = None,
        exclude_patterns: List[str] = None
    ) -> Dict[str, Any]:
        if include_patterns is None:
            include_patterns = ['*.txt', '*.pdf', '*.docx']
        
        if exclude_patterns is None:
            exclude_patterns = ['node_modules/*', '.git/*', '*.pyc', '__pycache__/*', '.env', '*.log']
        
        temp_dir = None
        try:
            temp_dir = tempfile.mkdtemp()
            
            clone_cmd = ['git', 'clone', '--depth', '1', '--branch', branch, git_url, temp_dir]
            process = await asyncio.create_subprocess_exec(
                *clone_cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout, stderr = await process.communicate()
            
            if process.returncode != 0:
                raise Exception(f"Git clone failed: {stderr.decode()}")
            
            client = await self.db.client
            
            repo_name = git_url.split('/')[-1].replace('.git', '')
            repo_entry_data = {
                'agent_id': agent_id,
                'account_id': account_id,
                'name': f"🔗 {repo_name}",
                'description': f"Git repository: {git_url} (branch: {branch})",
                'content': f"Git repository cloned from {git_url}. Individual files are processed as separate entries.",
                'source_type': 'git_repo',
                'source_metadata': {
                    'git_url': git_url,
                    'branch': branch,
                    'include_patterns': include_patterns,
                    'exclude_patterns': exclude_patterns
                },
                'usage_context': 'always',
                'is_active': True
            }
            
            repo_result = await client.table('agent_knowledge_base_entries').insert(repo_entry_data).execute()
            repo_entry_id = repo_result.data[0]['entry_id']
            
            processed_files = []
            failed_files = []
            
            for root, dirs, files in os.walk(temp_dir):
                if '.git' in dirs:
                    dirs.remove('.git')
                
                for file in files:
                    file_path = os.path.join(root, file)
                    relative_path = os.path.relpath(file_path, temp_dir)
                    
                    if not self._should_include_file(relative_path, include_patterns, exclude_patterns):
                        continue
                    
                    try:
                        with open(file_path, 'rb') as f:
                            file_content = f.read()
                        
                        if len(file_content) > self.MAX_FILE_SIZE:
                            continue
                        
                        mime_type, _ = mimetypes.guess_type(file)
                        if not mime_type:
                            mime_type = 'application/octet-stream'
                        
                        content = await self._extract_file_content(file_content, file, mime_type)
                        
                        if content and content.strip():
                            file_entry_data = {
                                'agent_id': agent_id,
                                'account_id': account_id,
                                'name': f"📄 {file}",
                                'description': f"From {repo_name}: {relative_path}",
                                'content': content[:self.MAX_CONTENT_LENGTH],
                                'source_type': 'git_repo',
                                'source_metadata': {
                                    'filename': file,
                                    'relative_path': relative_path,
                                    'git_url': git_url,
                                    'branch': branch,
                                    'repo_name': repo_name,
                                    'mime_type': mime_type,
                                    'file_size': len(file_content),
                                    'extraction_method': self._get_extraction_method(Path(file).suffix.lower(), mime_type)
                                },
                                'file_size': len(file_content),
                                'file_mime_type': mime_type,
                                'extracted_from_zip_id': repo_entry_id,
                                'usage_context': 'always',
                                'is_active': True
                            }
                            
                            file_result = await client.table('agent_knowledge_base_entries').insert(file_entry_data).execute()
                            
                            processed_files.append({
                                'filename': file,
                                'relative_path': relative_path,
                                'entry_id': file_result.data[0]['entry_id'],
                                'content_length': len(content)
                            })
                    
                    except Exception as e:
                        logger.error(f"Error processing {relative_path} from git repo: {str(e)}")
                        failed_files.append({
                            'filename': file,
                            'relative_path': relative_path,
                            'error': str(e)
                        })
            
            return {
                'success': True,
                'repo_entry_id': repo_entry_id,
                'repo_name': repo_name,
                'git_url': git_url,
                'branch': branch,
                'processed_files': processed_files,
                'failed_files': failed_files,
                'total_processed': len(processed_files),
                'total_failed': len(failed_files)
            }
            
        except Exception as e:
            logger.error(f"Error processing git repository {git_url}: {str(e)}")
            return {
                'success': False,
                'git_url': git_url,
                'error': str(e)
            }
        
        finally:
            if temp_dir and os.path.exists(temp_dir):
                shutil.rmtree(temp_dir, ignore_errors=True)
    
    async def _extract_file_content(self, file_content: bytes, filename: str, mime_type: str) -> str:
        file_extension = Path(filename).suffix.lower()
        logger.info(f"Extracting content from file: {filename}, extension: {file_extension}, mime_type: {mime_type}")
        
        try:
            if file_extension in self.SUPPORTED_TEXT_EXTENSIONS or mime_type.startswith('text/'):
                logger.info("Processing as text file")
                if file_extension == '.csv':
                    logger.info("Processing as CSV file")
                    return self._extract_csv_content(file_content)
                else:
                    return self._extract_text_content(file_content)
            
            elif file_extension == '.pdf':
                logger.info("Processing as PDF file")
                return self._extract_pdf_content(file_content)
            
            elif file_extension == '.docx':
                logger.info("Processing as DOCX file")
                return self._extract_docx_content(file_content)
            
            else:
                logger.error(f"Unsupported file format: {file_extension}")
                raise ValueError(f"Unsupported file format: {file_extension}. Only .txt, .csv, .pdf, and .docx files are supported.")
        
        except Exception as e:
            logger.error(f"Error extracting content from {filename}: {str(e)}", exc_info=True)
            return f"Error extracting content: {str(e)}"
    
    def _extract_text_content(self, file_content: bytes) -> str:
        detected = chardet.detect(file_content)
        encoding = detected.get('encoding', 'utf-8')
        
        try:
            raw_text = file_content.decode(encoding)
        except UnicodeDecodeError:
            raw_text = file_content.decode('utf-8', errors='replace')
        
        return self._sanitize_content(raw_text)
    
    def _extract_csv_content(self, file_content: bytes) -> str:
        """Extract content from CSV files, preserving structure and headers"""
        try:
            logger.info("Starting CSV content extraction")
            
            # Use chardet to detect encoding
            detected = chardet.detect(file_content)
            encoding = detected.get('encoding', 'utf-8')
            logger.info(f"Detected encoding: {encoding}")
            
            # Read the file content with the detected encoding
            try:
                raw_text = file_content.decode(encoding)
            except UnicodeDecodeError:
                logger.warning(f"Failed to decode with {encoding}, trying utf-8")
                raw_text = file_content.decode('utf-8', errors='replace')
            
            # Split the content into lines
            lines = raw_text.splitlines()
            logger.info(f"CSV has {len(lines)} lines")
            
            if not lines:
                return "Empty CSV file"
            
            # Process the CSV content to make it more readable
            processed_lines = []
            
            # Add a header to indicate this is CSV content
            processed_lines.append("=== CSV FILE CONTENT ===")
            processed_lines.append("")
            
            for i, line in enumerate(lines):
                if i == 0:
                    # First line is usually headers
                    processed_lines.append(f"COLUMN HEADERS: {line}")
                    processed_lines.append("")
                else:
                    # Data rows - limit to first 100 rows to avoid overwhelming the context
                    if i <= 100:
                        processed_lines.append(f"Row {i}: {line}")
                    elif i == 101:
                        processed_lines.append(f"... (showing first 100 rows, total {len(lines)-1} data rows)")
                        break
            
            # Add summary information
            processed_lines.append("")
            processed_lines.append(f"=== SUMMARY ===")
            processed_lines.append(f"Total rows: {len(lines)}")
            processed_lines.append(f"Total columns: {len(lines[0].split(',')) if lines else 0}")
            processed_lines.append(f"Data rows: {len(lines) - 1 if len(lines) > 1 else 0}")
            
            # Combine lines into a single string
            combined_text = '\n'.join(processed_lines)
            logger.info(f"CSV extraction completed, total text length: {len(combined_text)}")
            
            return self._sanitize_content(combined_text)
            
        except Exception as e:
            logger.error(f"Error extracting CSV content: {str(e)}", exc_info=True)
            return f"Error extracting CSV content: {str(e)}"
    
    def _extract_pdf_content(self, file_content: bytes) -> str:
        """Extract text from a PDF using PyMuPDF first, then fall back to pdfminer if needed."""
        # 1) Primary: PyMuPDF (fitz)
        try:
            import fitz  # PyMuPDF
            logger.info("Starting PDF content extraction with PyMuPDF")
            text_chunks = []
            with fitz.open(stream=file_content, filetype="pdf") as doc:
                logger.info(f"PyMuPDF opened PDF with {doc.page_count} pages")
                for i, page in enumerate(doc):
                    try:
                        # 'text' gives layout-aware text; if empty try 'raw'
                        txt = page.get_text("text") or ""
                        if not txt.strip():
                            txt = page.get_text("raw") or ""
                        if txt.strip():
                            text_chunks.append(txt)
                            if i < 3:
                                logger.info(f"PyMuPDF extracted text from page {i+1}, length: {len(txt)}")
                        else:
                            logger.debug(f"PyMuPDF empty text on page {i+1}")
                    except Exception as p_err:
                        logger.warning(f"PyMuPDF page {i+1} extraction error: {p_err}")
            raw_text = "\n\n".join(text_chunks)
            if raw_text.strip():
                logger.info(f"PyMuPDF extraction completed, total text length: {len(raw_text)}")
                return self._sanitize_content(raw_text)
            else:
                logger.warning("PyMuPDF produced no text; attempting pdfminer fallback")
        except Exception as fitz_err:
            logger.warning(f"PyMuPDF not available or failed: {fitz_err}")

        # 2) Fallback: pdfminer.six
        try:
            from pdfminer.high_level import extract_text as pdfminer_extract_text
            logger.info("Attempting PDF extraction with pdfminer.six")
            try:
                text2 = pdfminer_extract_text(io.BytesIO(file_content))
            except TypeError:
                with tempfile.NamedTemporaryFile(suffix='.pdf', delete=True) as tmp:
                    tmp.write(file_content)
                    tmp.flush()
                    text2 = pdfminer_extract_text(tmp.name)
            if text2 and text2.strip():
                logger.info(f"pdfminer fallback extracted text successfully, length: {len(text2)}")
                return self._sanitize_content(text2)
            else:
                logger.warning("pdfminer produced no text; attempting PyPDF2 fallback")
        except Exception as pm_err:
            logger.warning(f"pdfminer fallback failed: {pm_err}")

        # 3) Final fallback: PyPDF2
        try:
            logger.info("Attempting PDF extraction with PyPDF2")
            pdf_reader = PyPDF2.PdfReader(io.BytesIO(file_content))
            text_chunks = []
            
            for i, page in enumerate(pdf_reader.pages):
                try:
                    text = page.extract_text()
                    if text.strip():
                        text_chunks.append(text)
                        if i < 3:
                            logger.info(f"PyPDF2 extracted text from page {i+1}, length: {len(text)}")
                    else:
                        logger.debug(f"PyPDF2 empty text on page {i+1}")
                except Exception as page_err:
                    logger.warning(f"PyPDF2 page {i+1} extraction error: {page_err}")
            
            raw_text = "\n\n".join(text_chunks)
            if raw_text.strip():
                logger.info(f"PyPDF2 extraction completed, total text length: {len(raw_text)}")
                return self._sanitize_content(raw_text)
            else:
                logger.warning("PyPDF2 produced no text")
        except Exception as pypdf2_err:
            logger.warning(f"PyPDF2 fallback failed: {pypdf2_err}")

        # If all methods fail, provide detailed error message
        logger.error("All PDF extraction methods failed")
        return "No text content could be extracted from this PDF file. This may be because the PDF contains only images, is encrypted, or is corrupted."
    
    def _extract_docx_content(self, file_content: bytes) -> str:
        doc = docx.Document(io.BytesIO(file_content))
        text_content = []
        
        for paragraph in doc.paragraphs:
            text_content.append(paragraph.text)
        
        raw_text = '\n'.join(text_content)
        return self._sanitize_content(raw_text)
    
    def _sanitize_content(self, content: str) -> str:
        if not content:
            return content

        sanitized = ''.join(char for char in content if ord(char) >= 32 or char in '\n\r\t')

        sanitized = sanitized.replace('\x00', '')
        sanitized = sanitized.replace('\u0000', '')
        
        sanitized = sanitized.replace('\ufeff', '')
        
        sanitized = sanitized.replace('\r\n', '\n').replace('\r', '\n')

        sanitized = re.sub(r'\n{4,}', '\n\n\n', sanitized)

        return sanitized.strip()

    def _get_extraction_method(self, file_extension: str, mime_type: str) -> str:
        if file_extension == '.pdf':
            return 'PyPDF2'
        elif file_extension == '.docx':
            return 'python-docx'
        elif file_extension == '.txt':
            return 'text encoding detection'
        elif file_extension == '.csv':
            return 'csv parsing'
        else:
            return 'text encoding detection'
    
    def _should_include_file(self, file_path: str, include_patterns: List[str], exclude_patterns: List[str]) -> bool:
        import fnmatch
        
        for pattern in exclude_patterns:
            if fnmatch.fnmatch(file_path, pattern):
                return False
        
        for pattern in include_patterns:
            if fnmatch.fnmatch(file_path, pattern):
                return True
        
        return False 