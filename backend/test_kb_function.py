#!/usr/bin/env python3
"""
Test script to verify the get_combined_knowledge_base_context function
"""

import asyncio
import sys
import os
from pathlib import Path

# Add the backend directory to the path
sys.path.append(str(Path(__file__).parent))

async def test_kb_function():
    """Test the knowledge base function"""
    try:
        from services.supabase import DBConnection
        
        print("Testing knowledge base function...")
        
        # Get database client
        db = DBConnection()
        client = await db.client
        print("✅ Database client obtained successfully")
        
        # Test the function with a sample thread_id
        # You'll need to replace this with a real thread_id from your database
        test_thread_id = "00000000-0000-0000-0000-000000000000"
        
        print(f"Testing with thread_id: {test_thread_id}")
        
        result = await client.rpc('get_combined_knowledge_base_context', {
            'p_thread_id': test_thread_id,
            'p_agent_id': None,
            'p_max_tokens': 4000
        }).execute()
        
        print(f"✅ Function executed successfully")
        print(f"Result data: {result.data}")
        print(f"Result length: {len(result.data) if result.data else 0}")
        
        if result.data:
            # Show a preview of the context
            preview = result.data[:500] + "..." if len(result.data) > 500 else result.data
            print(f"Context preview: {preview}")
        else:
            print("No context returned")
            
    except Exception as e:
        print(f"❌ Error testing function: {e}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")

if __name__ == "__main__":
    asyncio.run(test_kb_function()) 