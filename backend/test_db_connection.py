#!/usr/bin/env python3
"""
Test script to check database connection and table structure
"""

import asyncio
import os
import sys
from pathlib import Path

# Add the backend directory to the path
sys.path.append(str(Path(__file__).parent))

from knowledge_base.api import db, get_user_account_id

async def test_database_connection():
    """Test database connection and table structure"""
    
    try:
        print("Testing database connection...")
        
        # Get database client
        client = await db.client
        print("✅ Database client obtained successfully")
        
        # Test basic connection
        result = await client.table('global_knowledge_base_entries').select('entry_id').limit(1).execute()
        print("✅ Can query global_knowledge_base_entries table")
        
        # Check table structure
        print("\nChecking table structure...")
        
        # Test inserting a simple entry
        test_data = {
            'account_id': 'test-user-id',
            'name': 'Test Entry',
            'content': 'This is a test entry',
            'usage_context': 'always',
            'is_active': False  # Set to false so it doesn't interfere with real data
        }
        
        print(f"Attempting to insert test data: {test_data}")
        
        insert_result = await client.table('global_knowledge_base_entries').insert(test_data).execute()
        
        if insert_result.data:
            print("✅ Successfully inserted test entry")
            entry_id = insert_result.data[0]['entry_id']
            
            # Clean up - delete the test entry
            await client.table('global_knowledge_base_entries').delete().eq('entry_id', entry_id).execute()
            print("✅ Successfully deleted test entry")
        else:
            print("❌ Failed to insert test entry")
            print(f"Insert result: {insert_result}")
            
    except Exception as e:
        print(f"❌ Database test failed: {e}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")

async def test_get_user_account_id():
    """Test the get_user_account_id function"""
    
    try:
        print("\nTesting get_user_account_id function...")
        
        client = await db.client
        test_user_id = "test-user-123"
        
        account_id = await get_user_account_id(client, test_user_id)
        print(f"✅ get_user_account_id returned: {account_id}")
        
    except Exception as e:
        print(f"❌ get_user_account_id test failed: {e}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")

if __name__ == "__main__":
    asyncio.run(test_database_connection())
    asyncio.run(test_get_user_account_id())
