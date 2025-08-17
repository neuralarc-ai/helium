
import os
from typing import List
import logging

logger = logging.getLogger(__name__)

# Files to exclude from operations
EXCLUDED_FILES = {
    ".DS_Store",
    ".gitignore",
    "package-lock.json",
    "postcss.config.js",
    "postcss.config.mjs",
    "jsconfig.json",
    "components.json",
    "tsconfig.tsbuildinfo",
    "tsconfig.json",
}

# Directories to exclude from operations
EXCLUDED_DIRS = {
    "node_modules",
    ".next",
    "dist",
    "build",
    ".git"
}

# File extensions to exclude from operations
EXCLUDED_EXT = {
    ".ico",
    ".svg",
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".bmp",
    ".tiff",
    ".webp",
    ".db",
    ".sql"
}

def should_exclude_file(rel_path: str) -> bool:
    """Check if a file should be excluded based on path, name, or extension
    
    Args:
        rel_path: Relative path of the file to check
        
    Returns:
        True if the file should be excluded, False otherwise
    """
    # Check filename
    filename = os.path.basename(rel_path)
    if filename in EXCLUDED_FILES:
        return True

    # Check directory
    dir_path = os.path.dirname(rel_path)
    if any(excluded in dir_path for excluded in EXCLUDED_DIRS):
        return True

    # Check extension
    _, ext = os.path.splitext(filename)
    if ext.lower() in EXCLUDED_EXT:
        return True

    return False 

def clean_path(path: str, workspace_path: str = "/workspace") -> str:
    """Clean and normalize a path to be relative to the workspace
    
    Args:
        path: The path to clean
        workspace_path: The base workspace path to remove (default: "/workspace")
        
    Returns:
        The cleaned path, relative to the workspace
    """
    # Remove any leading slash
    path = path.lstrip('/')
    
    # Remove workspace prefix if present
    if path.startswith(workspace_path.lstrip('/')):
        path = path[len(workspace_path.lstrip('/')):]
    
    # Remove workspace/ prefix if present
    if path.startswith('workspace/'):
        path = path[9:]
    
    # Remove any remaining leading slash
    path = path.lstrip('/')
    
    return path 

async def validate_workspace_files(file_paths: List[str], sandbox) -> List[str]:
    """
    Validate that files actually exist in the workspace before displaying them.
    
    Args:
        file_paths: List of file paths to validate
        sandbox: The sandbox instance to check files against
        
    Returns:
        List of file paths that actually exist in the workspace
    """
    if not file_paths:
        return []
    
    valid_files = []
    
    try:
        # Ensure sandbox is initialized
        if hasattr(sandbox, '_ensure_sandbox'):
            await sandbox._ensure_sandbox()
        
        workspace_path = "/workspace"
        
        for file_path in file_paths:
            if not file_path:
                continue
                
            try:
                # Clean the path to be relative to workspace
                cleaned_path = clean_path(file_path, workspace_path)
                full_path = f"{workspace_path}/{cleaned_path}"
                
                # Check if file exists
                file_info = await sandbox.fs.get_file_info(full_path)
                if not file_info.is_dir:
                    valid_files.append(file_path)
                    
            except Exception as e:
                # File doesn't exist or can't be accessed, skip it
                logger.debug(f"File validation failed for {file_path}: {str(e)}")
                continue
                
    except Exception as e:
        logger.error(f"Error during file validation: {str(e)}")
        # Return empty list if validation fails completely
        return []
    
    return valid_files

def filter_attachments_by_existence(attachments: List[str], workspace_files: List[str]) -> List[str]:
    """
    Filter attachments to only include files that exist in the workspace.
    
    Args:
        attachments: List of file paths from tool attachments
        workspace_files: List of files that actually exist in the workspace
        
    Returns:
        List of attachments that correspond to existing files
    """
    if not attachments or not workspace_files:
        return []
    
    # Normalize workspace files for comparison
    normalized_workspace_files = set()
    for file_path in workspace_files:
        # Remove /workspace prefix if present
        normalized_path = file_path.replace('/workspace/', '').replace('/workspace', '')
        normalized_workspace_files.add(normalized_path)
    
    valid_attachments = []
    for attachment in attachments:
        # Clean the attachment path
        cleaned_attachment = clean_path(attachment, "/workspace")
        
        # Check if this attachment exists in workspace
        if cleaned_attachment in normalized_workspace_files:
            valid_attachments.append(attachment)
        else:
            logger.debug(f"Filtered out non-existent attachment: {attachment}")
    
    return valid_attachments 