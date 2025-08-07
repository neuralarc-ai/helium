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
        '.txt'
    }
    
    SUPPORTED_DOCUMENT_EXTENSIONS = {
        '.pdf', '.docx'
    }
    
    MAX_FILE_SIZE = 50 * 1024 * 1024
    MAX_ZIP_ENTRIES = 1000
    MAX_CONTENT_LENGTH = 100000
    
    def __init__(self):
        self.db = DBConnection()
    
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
        mime_type: str
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
                return await self._process_global_zip_file(account_id, file_content, filename)
            
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
            
            entry_data = {
                'account_id': account_id,
                'name': f"📄 {filename}",
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
        zip_filename: str
    ) -> Dict[str, Any]:
        """Process ZIP file for global knowledge base"""
        try:
            client = await self.db.client
            
            zip_entry_data = {
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
                return self._extract_text_content(file_content)
            
            elif file_extension == '.pdf':
                logger.info("Processing as PDF file")
                return self._extract_pdf_content(file_content)
            
            elif file_extension == '.docx':
                logger.info("Processing as DOCX file")
                return self._extract_docx_content(file_content)
            
            else:
                logger.error(f"Unsupported file format: {file_extension}")
                raise ValueError(f"Unsupported file format: {file_extension}. Only .txt, .pdf, and .docx files are supported.")
        
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
    
    def _extract_pdf_content(self, file_content: bytes) -> str:
        try:
            logger.info("Starting PDF content extraction")
            pdf_reader = PyPDF2.PdfReader(io.BytesIO(file_content))
            logger.info(f"PDF reader created, pages: {len(pdf_reader.pages)}")
            
            text_content = []
            for i, page in enumerate(pdf_reader.pages):
                try:
                    page_text = page.extract_text()
                    if page_text:
                        text_content.append(page_text)
                        logger.info(f"Extracted text from page {i+1}, length: {len(page_text)}")
                    else:
                        logger.warning(f"No text extracted from page {i+1}")
                except Exception as page_error:
                    logger.error(f"Error extracting text from page {i+1}: {str(page_error)}")
                    text_content.append(f"[Error extracting page {i+1}: {str(page_error)}]")
            
            raw_text = '\n\n'.join(text_content)
            logger.info(f"PDF extraction completed, total text length: {len(raw_text)}")
            
            if not raw_text.strip():
                logger.warning("No text content extracted from PDF")
                return "No text content could be extracted from this PDF file."
            
            return self._sanitize_content(raw_text)
            
        except Exception as e:
            logger.error(f"Error in PDF content extraction: {str(e)}", exc_info=True)
            return f"Error extracting PDF content: {str(e)}"
    
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