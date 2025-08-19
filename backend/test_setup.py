#!/usr/bin/env python3
"""
Test script to verify vector database setup
"""

import os
import sys
from pathlib import Path

# Add the current directory to the path so we can import modules
sys.path.append(str(Path(__file__).parent))

async def test_setup():
    """Test the vector database setup"""
    
    print("=== Testing Vector Database Setup ===")
    
    # Check Sentence Transformers availability
    try:
        from sentence_transformers import SentenceTransformer
        print("✅ Sentence Transformers package imported")
    except ImportError as e:
        print(f"❌ Sentence Transformers import failed: {e}")
        print("Please install it with: pip install sentence-transformers")
        return False
    
    # Test database connection
    try:
        from services.supabase import DBConnection
        print("✅ Supabase import successful")
        
        db = DBConnection()
        await db.initialize()
        print("✅ Database connection initialized")
        
        client = await db.client
        print("✅ Database client obtained")
        
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return False
    
    # Test embedding generation
    try:
        print("🔄 Testing Sentence Transformers embedding generation...")
        
        model = SentenceTransformer('all-MiniLM-L6-v2')
        embedding = model.encode("Test message for embedding generation", convert_to_tensor=False)
        embedding_list = embedding.tolist()
        
        print(f"✅ Embedding generated: {len(embedding_list)} dimensions using Sentence Transformers")
        
    except Exception as e:
        print(f"❌ Embedding generation failed: {e}")
        return False
    
    print("\n🎉 All tests passed! Your vector database setup is ready.")
    print("\nNext steps:")
    print("1. Run the SQL fix: fix_function_overloading.sql")
    print("2. Generate embeddings: python generate_embeddings.py")
    print("3. Test your agent!")
    
    return True

if __name__ == "__main__":
    import asyncio
    success = asyncio.run(test_setup())
    if not success:
        print("\n❌ Setup test failed. Please fix the issues above.")
