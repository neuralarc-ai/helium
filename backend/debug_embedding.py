#!/usr/bin/env python3
"""
Debug script to test embedding generation and database storage
"""

import asyncio
import sys
from pathlib import Path

# Add the backend directory to the Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from services.supabase import DBConnection
from sentence_transformers import SentenceTransformer

async def debug_embedding():
    """Debug embedding generation and storage."""
    try:
        # Test embedding generation
        model = SentenceTransformer('all-MiniLM-L6-v2')
        test_content = "This is a test sentence for embedding generation."
        
        # Generate embedding
        embedding = model.encode(test_content)
        print(f"Original embedding type: {type(embedding)}")
        print(f"Original embedding shape: {embedding.shape}")
        print(f"Original embedding length: {len(embedding)}")
        print(f"First 5 values: {embedding[:5]}")
        
        # Convert to list
        embedding_list = [float(x) for x in embedding]
        print(f"\nConverted embedding type: {type(embedding_list)}")
        print(f"Converted embedding length: {len(embedding_list)}")
        print(f"First 5 values: {embedding_list[:5]}")
        
        # Test database connection
        db = DBConnection()
        await db.initialize()
        client = await db.client
        
        # Create a test entry
        test_data = {
            'name': 'DEBUG_TEST_ENTRY',
            'content': test_content,
            'embedding': embedding_list,
            'is_active': True,
            'usage_context': 'always'
        }
        
        print(f"\nData being sent to database:")
        print(f"  name: {test_data['name']}")
        print(f"  embedding type: {type(test_data['embedding'])}")
        print(f"  embedding length: {len(test_data['embedding'])}")
        print(f"  embedding first 3: {test_data['embedding'][:3]}")
        
        # Insert test entry
        result = client.table('global_knowledge_base_entries').insert(test_data).execute()
        print(f"\nInsert result: {result}")
        
        # Retrieve the entry
        retrieve_result = client.table('global_knowledge_base_entries').select('*').eq('name', 'DEBUG_TEST_ENTRY').execute()
        
        if retrieve_result.data:
            retrieved_entry = retrieve_result.data[0]
            retrieved_embedding = retrieved_entry.get('embedding')
            
            print(f"\nRetrieved embedding type: {type(retrieved_embedding)}")
            print(f"Retrieved embedding length: {len(retrieved_embedding) if retrieved_embedding else 0}")
            if retrieved_embedding:
                print(f"Retrieved embedding first chars: {str(retrieved_embedding)[:50]}...")
        
        # Clean up
        client.table('global_knowledge_base_entries').delete().eq('name', 'DEBUG_TEST_ENTRY').execute()
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        await db.disconnect()

if __name__ == "__main__":
    asyncio.run(debug_embedding())
