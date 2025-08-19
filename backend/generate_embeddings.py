#!/usr/bin/env python3
"""
Generate embeddings for all existing knowledge base entries using Sentence Transformers
"""

import asyncio
import sys
import os
from pathlib import Path

# Add the current directory to the path so we can import modules
sys.path.append(str(Path(__file__).parent))

async def generate_embeddings():
    """Generate embeddings for all existing knowledge base entries using Sentence Transformers"""
    
    try:
        from services.supabase import DBConnection
        
        print("=== Generating Embeddings for Knowledge Base Entries ===")
        print("Using Sentence Transformers (free, open-source) for embeddings")
        
        # Check if Sentence Transformers is available
        try:
            from sentence_transformers import SentenceTransformer
            print("✅ Sentence Transformers imported successfully")
        except ImportError as e:
            print("❌ Sentence Transformers not installed")
            print("Please install it with: pip install sentence-transformers")
            return
        
        # Initialize the embedding model
        print("🔄 Loading Sentence Transformers model...")
        model = SentenceTransformer('all-MiniLM-L6-v2')
        print("✅ Model loaded: all-MiniLM-L6-v2 (384 dimensions)")
        
        # Initialize database connection
        db = DBConnection()
        await db.initialize()
        
        print("✅ Database connection initialized")
        
        client = await db.client
        
        # Get all entries that don't have embeddings yet
        print("\n--- Fetching Entries Without Embeddings ---")
        
        global_result = client.table('global_knowledge_base_entries').select('*').is_('embedding', 'null').execute()
        thread_result = client.table('knowledge_base_entries').select('*').is_('embedding', 'null').execute()
        
        total_entries = len(global_result.data) + len(thread_result.data)
        print(f"Found {total_entries} entries without embeddings:")
        print(f"  - Global entries: {len(global_result.data)}")
        print(f"  - Thread entries: {len(thread_result.data)}")
        
        if total_entries == 0:
            print("🎉 All entries already have embeddings!")
            return
        
        # Process global entries
        print(f"\n--- Processing Global Entries ---")
        processed_count = 0
        error_count = 0
        
        for entry in global_result.data:
            entry_id = entry.get('entry_id')
            name = entry.get('name', 'Unknown')
            content = entry.get('content', '')
            
            if not content.strip():
                print(f"  ⚠️  {name}: Empty content - skipping")
                continue
            
            print(f"  🔄 Processing: {name}")
            
            try:
                # Generate embedding using Sentence Transformers
                embedding = model.encode(content, convert_to_tensor=False)
                embedding_list = embedding.tolist()
                
                # Update the entry with the embedding
                update_result = client.table('global_knowledge_base_entries').update({
                    'embedding': embedding_list
                }).eq('entry_id', entry_id).execute()
                
                if update_result.data:
                    print(f"    ✅ Embedding generated and stored ({len(embedding_list)} dimensions)")
                    processed_count += 1
                else:
                    print(f"    ❌ Failed to update entry")
                    error_count += 1
                    
            except Exception as e:
                print(f"    ❌ Error generating embedding: {e}")
                error_count += 1
        
        # Process thread entries
        print(f"\n--- Processing Thread Entries ---")
        
        for entry in thread_result.data:
            entry_id = entry.get('entry_id')
            name = entry.get('name', 'Unknown')
            content = entry.get('content', '')
            
            if not content.strip():
                print(f"  ⚠️  {name}: Empty content - skipping")
                continue
            
            print(f"  🔄 Processing: {name}")
            
            try:
                # Generate embedding using Sentence Transformers
                embedding = model.encode(content, convert_to_tensor=False)
                embedding_list = embedding.tolist()
                
                # Update the entry with the embedding
                update_result = client.table('knowledge_base_entries').update({
                    'embedding': embedding_list
                }).eq('entry_id', entry_id).execute()
                
                if update_result.data:
                    print(f"    ✅ Embedding generated and stored ({len(embedding_list)} dimensions)")
                    processed_count += 1
                else:
                    print(f"    ❌ Failed to update entry")
                    error_count += 1
                    
            except Exception as e:
                print(f"    ❌ Error generating embedding: {e}")
                error_count += 1
        
        print(f"\n=== Embedding Generation Summary ===")
        print(f"✅ Successfully processed: {processed_count}")
        print(f"❌ Errors: {error_count}")
        print(f"📊 Total entries: {total_entries}")
        
        if processed_count > 0:
            print(f"\n🎉 Successfully generated embeddings for {processed_count} entries!")
            print(f"💡 Your vector database is now ready for semantic search!")
            print(f"🔍 Using Sentence Transformers: all-MiniLM-L6-v2 (384 dimensions)")
        
    except Exception as e:
        print(f"❌ Embedding generation failed with error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(generate_embeddings())
