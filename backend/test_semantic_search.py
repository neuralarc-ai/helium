#!/usr/bin/env python3
"""
Test semantic search functionality with proper embedding handling
"""

import asyncio
import sys
from pathlib import Path

# Add the backend directory to the Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from services.supabase import DBConnection
from sentence_transformers import SentenceTransformer

async def test_semantic_search():
    """Test semantic search with proper embedding handling."""
    try:
        # Initialize model
        print("🔄 Loading Sentence Transformers model...")
        model = SentenceTransformer('all-MiniLM-L6-v2')
        print("✅ Model loaded successfully")
        
        # Connect to database
        db = DBConnection()
        await db.initialize()
        client = await db.client
        print("✅ Database connected")
        
        # Test query
        query = "BSNL employee data"
        print(f"\n🔍 Testing semantic search for: '{query}'")
        
        # Generate query embedding
        query_embedding = model.encode(query)
        query_embedding_list = [float(x) for x in query_embedding]
        
        print(f"📊 Query embedding generated: {len(query_embedding_list)} dimensions")
        
        # Call the semantic search function
        result = client.rpc('search_knowledge_base_semantic', {
            'query_embedding': query_embedding_list,
            'max_results': 5,
            'similarity_threshold': 0.1
        }).execute()
        
        print(f"\n📋 Search Results:")
        if result.data:
            print(f"Found {len(result.data)} relevant entries:")
            for i, entry in enumerate(result.data, 1):
                name = entry.get('name', 'Unknown')
                similarity = entry.get('similarity', 0)
                content_preview = entry.get('content', '')[:100] + "..." if len(entry.get('content', '')) > 100 else entry.get('content', '')
                
                print(f"  {i}. {name}")
                print(f"     Similarity: {similarity:.3f}")
                print(f"     Preview: {content_preview}")
                print()
        else:
            print("❌ No results found")
            
        # Test another query
        query2 = "financial statements and income"
        print(f"🔍 Testing semantic search for: '{query2}'")
        
        query_embedding2 = model.encode(query2)
        query_embedding_list2 = [float(x) for x in query_embedding2]
        
        result2 = client.rpc('search_knowledge_base', {
            'query_embedding': query_embedding_list2,
            'max_results': 3,
            'similarity_threshold': 0.2
        }).execute()
        
        print(f"\n📋 Search Results for query 2:")
        if result2.data:
            print(f"Found {len(result2.data)} relevant entries:")
            for i, entry in enumerate(result2.data, 1):
                name = entry.get('name', 'Unknown')
                similarity = entry.get('similarity', 0)
                print(f"  {i}. {name} (similarity: {similarity:.3f})")
        else:
            print("❌ No results found")
            
        print("\n🎉 Semantic search test completed!")
        
    except Exception as e:
        print(f"❌ Error during semantic search test: {e}")
        import traceback
        traceback.print_exc()
    finally:
        await db.disconnect()

if __name__ == "__main__":
    asyncio.run(test_semantic_search())
