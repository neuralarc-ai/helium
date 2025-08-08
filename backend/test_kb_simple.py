#!/usr/bin/env python3
"""
Simple test for knowledge base function
"""

import asyncio
import os
import sys

# Add the current directory to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

async def test_kb_simple():
    """Simple test for knowledge base function"""
    try:
        # Try to import the necessary modules
        from services.supabase import DBConnection
        
        print("✅ Successfully imported DBConnection")
        
        # Initialize the database connection
        db = DBConnection()
        client = await db.client
        print("✅ Successfully connected to database")
        
        # Test with a real thread_id (you'll need to replace this)
        # For now, let's just test the function call
        test_thread_id = "00000000-0000-0000-0000-000000000000"
        
        print(f"Testing with thread_id: {test_thread_id}")
        
        # Call the function
        result = await client.rpc('get_combined_knowledge_base_context', {
            'p_thread_id': test_thread_id,
            'p_agent_id': None,
            'p_max_tokens': 4000
        }).execute()
        
        print(f"✅ Function call successful")
        print(f"Result: {result.data if result.data else 'No data'}")
        
    except ImportError as e:
        print(f"❌ Import error: {e}")
        print("This is expected if running outside the proper environment")
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")

if __name__ == "__main__":
    asyncio.run(test_kb_simple()) 