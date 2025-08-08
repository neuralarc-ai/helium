"""
Knowledge Base Manager with global_kb_map pattern for consistent account ID handling.
This module implements the exact pattern specified for storing and retrieving KB documents.
"""

import asyncio
from typing import Dict, List, Optional, Any
from utils.account_utils import normalize_account_id
from services.supabase import DBConnection

# Try to import logger, but handle the case where it's not available
try:
    from utils.logger import logger
except ImportError:
    # Create a simple logger if the real one is not available
    import logging
    logger = logging.getLogger(__name__)
    if not logger.handlers:
        handler = logging.StreamHandler()
        formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
        handler.setFormatter(formatter)
        logger.addHandler(handler)
        logger.setLevel(logging.INFO)

class KnowledgeBaseManager:
    """
    Manages global knowledge base entries with consistent account ID handling.
    Implements the global_kb_map pattern for reliable storage and retrieval.
    """
    
    def __init__(self):
        self.db = DBConnection()
        self._global_kb_map: Dict[str, List[Dict[str, Any]]] = {}
        self._initialized = False
    
    async def initialize(self):
        """Initialize the global KB map by loading all entries from the database."""
        if self._initialized:
            return
        
        try:
            logger.info("Initializing global KB map...")
            client = await self.db.client
            result = await client.table('global_knowledge_base_entries').select('*').eq('is_active', True).in_('usage_context', ['always', 'contextual']).execute()
            
            # Clear existing map
            self._global_kb_map.clear()
            
            # Load all entries into the map with normalized account IDs
            for entry in result.data or []:
                account_key = normalize_account_id(entry.get('account_id'))
                if account_key not in self._global_kb_map:
                    self._global_kb_map[account_key] = []
                
                self._global_kb_map[account_key].append({
                    'entry_id': entry.get('entry_id'),
                    'name': entry.get('name'),
                    'description': entry.get('description'),
                    'content': entry.get('content'),
                    'content_tokens': entry.get('content_tokens'),
                    'usage_context': entry.get('usage_context'),
                    'is_active': entry.get('is_active'),
                    'created_at': entry.get('created_at')
                })
            
            logger.info(f"Initialized global KB map with {len(self._global_kb_map)} account keys and {sum(len(entries) for entries in self._global_kb_map.values())} total entries")
            
            # Debug: Print all account keys and their entry counts
            for account_key, entries in self._global_kb_map.items():
                logger.info(f"Account key '{account_key}': {len(entries)} entries")
                for entry in entries:
                    logger.info(f"  - {entry['name']} (Content length: {len(entry.get('content', ''))})")
            
            self._initialized = True
            
        except Exception as e:
            logger.error(f"Error initializing global KB map: {e}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            self._initialized = False
    
    async def get_global_kb_entries(self, thread_account_id: str) -> List[Dict[str, Any]]:
        """
        Get global knowledge base entries for a thread using the global_kb_map pattern.
        
        Args:
            thread_account_id: The account ID from the thread
            
        Returns:
            List of global knowledge base entries
        """
        await self.initialize()
        
        # Normalize the account ID for consistent lookup
        account_key = normalize_account_id(thread_account_id)
        logger.info(f"Looking up global KB entries for account_key: {account_key}")
        
        # Try to get entries using the normalized account key
        kb_entries = self._global_kb_map.get(account_key, [])
        logger.info(f"Found {len(kb_entries)} entries for account_key: {account_key}")
        
        # If no entries found, try fallback with the original account_id
        if not kb_entries:
            logger.info(f"No entries found for normalized account_key: {account_key}, trying fallback")
            fallback_key = normalize_account_id(str(thread_account_id))
            if fallback_key != account_key:
                kb_entries = self._global_kb_map.get(fallback_key, [])
                logger.info(f"Fallback lookup for {fallback_key} found {len(kb_entries)} entries")
        
        # If still no entries, try with the raw account_id as string
        if not kb_entries:
            logger.info(f"No entries found with fallback, trying raw account_id")
            raw_key = normalize_account_id(thread_account_id)
            kb_entries = self._global_kb_map.get(raw_key, [])
            logger.info(f"Raw lookup for {raw_key} found {len(kb_entries)} entries")
        
        # If still no entries, try to get all entries (for debugging)
        if not kb_entries:
            logger.info("No entries found with any method, checking all available entries...")
            all_entries = []
            for account_key, entries in self._global_kb_map.items():
                all_entries.extend(entries)
            logger.info(f"Total entries in global KB map: {len(all_entries)}")
            if all_entries:
                logger.info("Available entries:")
                for entry in all_entries:
                    logger.info(f"  - {entry['name']} (Account: {entry.get('account_id', 'unknown')})")
        
        logger.info(f"Total global KB entries found for thread {thread_account_id}: {len(kb_entries)}")
        return kb_entries
    
    async def store_global_kb_entry(self, account_id: str, kb_document_data: Dict[str, Any]) -> bool:
        """
        Store a global knowledge base entry using the global_kb_map pattern.
        
        Args:
            account_id: The account ID for the entry
            kb_document_data: The knowledge base document data
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Normalize the account ID for storage
            account_key = normalize_account_id(account_id)
            logger.info(f"Storing global KB entry for account_key: {account_key}")
            
            # Store in the map
            if account_key not in self._global_kb_map:
                self._global_kb_map[account_key] = []
            
            self._global_kb_map[account_key].append(kb_document_data)
            
            # Also store in the database
            client = await self.db.client
            await client.table('global_knowledge_base_entries').insert({
                'account_id': account_key,
                'name': kb_document_data.get('name'),
                'description': kb_document_data.get('description'),
                'content': kb_document_data.get('content'),
                'content_tokens': kb_document_data.get('content_tokens'),
                'usage_context': kb_document_data.get('usage_context', 'always'),
                'is_active': kb_document_data.get('is_active', True)
            }).execute()
            
            logger.info(f"Successfully stored global KB entry for account_key: {account_key}")
            return True
            
        except Exception as e:
            logger.error(f"Error storing global KB entry: {e}")
            return False
    
    async def refresh_global_kb_map(self):
        """Refresh the global KB map by reloading from the database."""
        self._initialized = False
        await self.initialize()
    
    def get_global_kb_map_stats(self) -> Dict[str, Any]:
        """Get statistics about the global KB map."""
        total_entries = sum(len(entries) for entries in self._global_kb_map.values())
        return {
            'total_account_keys': len(self._global_kb_map),
            'total_entries': total_entries,
            'initialized': self._initialized
        }

# Global instance
global_kb_manager = KnowledgeBaseManager() 