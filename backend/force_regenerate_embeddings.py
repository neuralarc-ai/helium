#!/usr/bin/env python3
"""
Force complete regeneration of all embeddings by clearing them first
"""

import asyncio
import sys
from pathlib import Path

# Add the backend directory to the Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from services.supabase import DBConnection
from sentence_transformers import SentenceTransformer
from utils.logger import logger

async def force_regenerate_embeddings():
    """Force complete regeneration of all embeddings."""
    try:
        # Initialize Sentence Transformers model
        model = SentenceTransformer('all-MiniLM-L6-v2')
        logger.info("✅ Sentence Transformers model loaded successfully")
        
        # Connect to database
        db = DBConnection()
        await db.initialize()
        client = await db.client
        logger.info("✅ Database connection established")
        
        # Step 1: Clear ALL existing embeddings
        logger.info("🧹 Clearing all existing embeddings...")
        # First get all entries with embeddings
        entries_with_embeddings = client.table('global_knowledge_base_entries').select('entry_id').not_.is_('embedding', 'null').execute()
        
        if entries_with_embeddings.data:
            for entry in entries_with_embeddings.data:
                client.table('global_knowledge_base_entries').update({'embedding': None}).eq('entry_id', entry['entry_id']).execute()
            logger.info(f"✅ Cleared embeddings from {len(entries_with_embeddings.data)} entries")
        else:
            logger.info("✅ No entries with embeddings found to clear")
        
        # Step 2: Get all entries without embeddings
        result = client.table('global_knowledge_base_entries').select('entry_id, name, content').is_('embedding', 'null').execute()
        
        if not result.data:
            logger.info("✅ No entries found without embeddings")
            return True
            
        total_entries = len(result.data)
        logger.info(f"📊 Found {total_entries} entries that need embeddings")
        
        # Step 3: Generate embeddings for all entries
        processed = 0
        for entry in result.data:
            try:
                entry_id = entry['entry_id']
                name = entry.get('name', 'Unknown')
                content = entry.get('content', '')
                
                if not content or not content.strip():
                    logger.warning(f"⚠️  Entry {name} has no content, skipping")
                    continue
                
                # Generate embedding
                embedding = model.encode(content)
                embedding_list = [float(x) for x in embedding]
                
                # Update database
                client.table('global_knowledge_base_entries').update({
                    'embedding': embedding_list
                }).eq('entry_id', entry_id).execute()
                
                processed += 1
                logger.info(f"✅ Generated embedding for: {name} ({processed}/{total_entries})")
                
            except Exception as e:
                logger.error(f"❌ Failed to process entry {entry.get('name', 'Unknown')}: {e}")
                continue
        
        logger.info(f"🎉 Successfully processed {processed}/{total_entries} entries")
        
        # Step 4: Verify the results
        verify_result = client.table('global_knowledge_base_entries').select('entry_id, name, embedding').not_.is_('embedding', 'null').limit(5).execute()
        
        if verify_result.data:
            sample_entry = verify_result.data[0]
            embedding_length = len(sample_entry['embedding'])
            logger.info(f"✅ Verification: Sample entry has {embedding_length}-dimensional embedding")
            
            if embedding_length == 384:
                logger.info("🎯 SUCCESS: All embeddings are now 384-dimensional!")
                return True
            else:
                logger.error(f"❌ ERROR: Embeddings still have wrong dimensions: {embedding_length}")
                return False
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Error during embedding generation: {e}")
        return False
    
    finally:
        await db.disconnect()

async def main():
    """Main function to run the forced embedding regeneration."""
    logger.info("🚀 Starting forced embedding regeneration...")
    
    success = await force_regenerate_embeddings()
    
    if success:
        logger.info("✅ Forced embedding regeneration completed successfully")
    else:
        logger.error("❌ Forced embedding regeneration failed")

if __name__ == "__main__":
    asyncio.run(main())
