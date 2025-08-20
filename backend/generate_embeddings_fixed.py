#!/usr/bin/env python3
"""
Generate embeddings for all existing knowledge base entries using Sentence Transformers
This script will update the database with 384-dimensional embeddings for semantic search.
"""

import asyncio
import os
import sys
from pathlib import Path

# Add the backend directory to the Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from services.supabase import DBConnection
from sentence_transformers import SentenceTransformer
from utils.logger import logger

async def generate_embeddings_for_existing_entries():
    """Generate embeddings for all existing knowledge base entries."""
    
    # Initialize Sentence Transformers model
    try:
        model = SentenceTransformer('all-MiniLM-L6-v2')
        logger.info("✅ Sentence Transformers model loaded successfully")
    except Exception as e:
        logger.error(f"❌ Failed to load Sentence Transformers model: {e}")
        return False
    
    # Initialize database connection
    try:
        db = DBConnection()
        await db.initialize()
        client = await db.client
        logger.info("✅ Database connection established")
    except Exception as e:
        logger.error(f"❌ Failed to connect to database: {e}")
        return False
    
    try:
        # Get all existing entries without embeddings
        logger.info("📊 Fetching existing knowledge base entries...")
        
        # Check global knowledge base entries
        global_result = client.table('global_knowledge_base_entries').select('entry_id, name, content').not_.is_('embedding', 'null').limit(5).execute()
        
        if global_result.data:
            logger.info(f"✅ Found {len(global_result.data)} entries with existing embeddings")
            
            # Check if we need to regenerate embeddings (wrong dimensions)
            sample_entry = global_result.data[0]
            if 'embedding' in sample_entry and sample_entry['embedding']:
                embedding_length = len(sample_entry['embedding'])
                if embedding_length == 384:
                    logger.info("✅ Embeddings are already 384-dimensional - no need to regenerate")
                    return True
                else:
                    logger.info(f"⚠️  Found embeddings with {embedding_length} dimensions, need to regenerate to 384")
        
        # Get entries without embeddings
        result = client.table('global_knowledge_base_entries').select('entry_id, name, content').is_('embedding', 'null').execute()
        
        if not result.data:
            logger.info("✅ All entries already have embeddings")
            return True
        
        total_entries = len(result.data)
        logger.info(f"📝 Found {total_entries} entries that need embeddings")
        
        # Process entries in batches
        batch_size = 10
        processed = 0
        
        for i in range(0, total_entries, batch_size):
            batch = result.data[i:i + batch_size]
            logger.info(f"🔄 Processing batch {i//batch_size + 1}/{(total_entries + batch_size - 1)//batch_size}")
            
            for entry in batch:
                try:
                    entry_id = entry['entry_id']
                    name = entry.get('name', 'Unknown')
                    content = entry.get('content', '')
                    
                    if not content:
                        logger.warning(f"⚠️  Entry {name} has no content, skipping")
                        continue
                    
                    # Generate embedding
                    embedding = model.encode(content)
                    
                    # Convert numpy array to regular Python list
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
        
        # Verify the results
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

async def test_vector_search():
    """Test if vector search is working."""
    try:
        db = DBConnection()
        await db.initialize()
        client = await db.client
        
        # Test the vector search function
        logger.info("🧪 Testing vector search functionality...")
        
        # Check if we have entries with embeddings
        result = client.table('global_knowledge_base_entries').select('entry_id, name, embedding').not_.is_('embedding', 'null').limit(1).execute()
        
        if not result.data:
            logger.warning("⚠️  No entries with embeddings found")
            return False
        
        sample_entry = result.data[0]
        embedding_length = len(sample_entry['embedding'])
        
        if embedding_length != 384:
            logger.error(f"❌ Wrong embedding dimensions: {embedding_length} (expected 384)")
            return False
        
        logger.info(f"✅ Vector search test passed: {embedding_length}-dimensional embeddings found")
        return True
        
    except Exception as e:
        logger.error(f"❌ Vector search test failed: {e}")
        return False
    finally:
        await db.disconnect()

async def main():
    """Main function to run the embedding generation."""
    logger.info("🚀 Starting knowledge base embedding generation...")
    
    # Step 1: Generate embeddings
    success = await generate_embeddings_for_existing_entries()
    
    if success:
        logger.info("✅ Embedding generation completed successfully")
        
        # Step 2: Test vector search
        test_success = await test_vector_search()
        
        if test_success:
            logger.info("🎉 SUCCESS: Knowledge base is now fully vectorized and ready for semantic search!")
        else:
            logger.error("❌ Vector search test failed")
    else:
        logger.error("❌ Embedding generation failed")

if __name__ == "__main__":
    asyncio.run(main())
