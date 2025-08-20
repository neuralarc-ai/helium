#!/usr/bin/env python3
"""
Check what's actually stored in the database embeddings
"""

import asyncio
import sys
from pathlib import Path

# Add the backend directory to the Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from services.supabase import DBConnection

async def check_embeddings():
    """Check what's stored in the database embeddings."""
    try:
        db = DBConnection()
        await db.initialize()
        client = await db.client
        
        print("✅ Successfully connected to database!")
        print("📊 Database connection established")
        
        # Commented out for now - will run these queries later
        # # Check entries with embeddings
        # result = client.table('global_knowledge_base_entries').select('entry_id, name, embedding').not_.is_('embedding', 'null').limit(3).execute()
        # 
        # if result.data:
        #     print(f"Found {len(result.data)} entries with embeddings:")
        #     for i, entry in enumerate(result.data):
        #         name = entry.get('name', 'Unknown')
        #         embedding = entry.get('embedding', [])
        #         print(f"\n{i+1}. Entry: {name}")
        #         print(f"   Embedding type: {type(embedding)}")
        #         print(f"   Embedding length: {len(embedding)}")
        #         print(f"   First 5 values: {embedding[:5] if len(embedding) > 5 else embedding}")
        #         print(f"   Last 5 values: {embedding[-5:] if len(embedding) > 5 else embedding}")
        # else:
        #     print("No entries with embeddings found")
        #     
        # # Check entries without embeddings
        # no_embedding_result = client.table('global_knowledge_base_entries').select('entry_id, name').is_('embedding', 'null').limit(3).execute()
        # 
        # if no_embedding_result.data:
        #     print(f"\nFound {len(no_embedding_result.data)} entries without embeddings:")
        #     for entry in no_embedding_result.data:
        #         print(f"  - {entry.get('name', 'Unknown')}")
        
    except Exception as e:
        print(f"Error checking embeddings: {e}")
        import traceback
        traceback.print_exc()
    finally:
        await db.disconnect()

if __name__ == "__main__":
    asyncio.run(check_embeddings())
