#!/usr/bin/env python3
"""
Test script to verify global knowledge base integration is working.
"""

import asyncio
import sys
from pathlib import Path

# Add the backend directory to the Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from services.supabase import DBConnection
from utils.logger import logger

async def test_global_kb_integration():
    """Test the global knowledge base integration"""
    
    print("🧪 Testing Global Knowledge Base Integration...")
    
    try:
        # Initialize database connection
        db = DBConnection()
        client = await db.client
        
        # Test 1: Check if global knowledge base table exists
        print("\n1. Checking global knowledge base table...")
        try:
            result = await client.table('global_knowledge_base_entries').select('entry_id').limit(1).execute()
            print("✅ Global knowledge base table is accessible")
        except Exception as e:
            print(f"❌ Global knowledge base table error: {e}")
            return False
        
        # Test 2: Check if basejump.accounts table exists
        print("\n2. Checking basejump.accounts table...")
        try:
            result = await client.table('basejump.accounts').select('id').limit(1).execute()
            print("✅ Basejump accounts table is accessible")
        except Exception as e:
            print(f"⚠️ Basejump accounts table error: {e}")
        
        # Test 3: Test the get_combined_knowledge_base_context function
        print("\n3. Testing get_combined_knowledge_base_context function...")
        try:
            # Create a test thread
            test_thread_id = "test-thread-123"
            test_user_id = "test-user-456"
            test_account_id = "test-account-789"
            
            # Test the function with mock data
            result = await client.rpc('get_combined_knowledge_base_context', {
                'p_thread_id': test_thread_id,
                'p_agent_id': None,
                'p_account_id': test_account_id,
                'p_max_tokens': 1000
            }).execute()
            
            print("✅ get_combined_knowledge_base_context function is working")
            print(f"   Result: {result.data}")
            
        except Exception as e:
            print(f"❌ get_combined_knowledge_base_context function error: {e}")
            return False
        
        # Test 4: Test account_id resolution
        print("\n4. Testing account_id resolution...")
        try:
            # Test with a real user_id if available
            test_user_id = "test-user-123"
            
            # Try to get account_id from basejump.accounts
            result = await client.table('basejump.accounts').select('id').eq('primary_owner_user_id', test_user_id).eq('personal_account', True).execute()
            
            if result.data:
                account_id = result.data[0]['id']
                print(f"✅ Found account_id: {account_id}")
            else:
                print("⚠️ No account found, would create one")
                
        except Exception as e:
            print(f"⚠️ Account resolution error: {e}")
        
        print("\n✅ Global Knowledge Base Integration Test Completed!")
        return True
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        return False

async def test_knowledge_base_creation():
    """Test creating a global knowledge base entry"""
    
    print("\n🧪 Testing Global Knowledge Base Entry Creation...")
    
    try:
        db = DBConnection()
        client = await db.client
        
        # Test creating a global knowledge base entry
        test_entry = {
            'account_id': 'test-account-123',
            'name': 'Test Global Entry',
            'description': 'This is a test global knowledge base entry',
            'content': 'This content should be available across all chat threads for this user.',
            'usage_context': 'always',
            'is_active': True
        }
        
        result = await client.table('global_knowledge_base_entries').insert(test_entry).execute()
        
        if result.data:
            entry_id = result.data[0]['entry_id']
            print(f"✅ Created test global knowledge base entry: {entry_id}")
            
            # Clean up - delete the test entry
            await client.table('global_knowledge_base_entries').delete().eq('entry_id', entry_id).execute()
            print("✅ Cleaned up test entry")
            
            return True
        else:
            print("❌ Failed to create test entry")
            return False
            
    except Exception as e:
        print(f"❌ Creation test failed: {e}")
        return False

if __name__ == "__main__":
    async def main():
        success1 = await test_global_kb_integration()
        success2 = await test_knowledge_base_creation()
        
        if success1 and success2:
            print("\n🎉 All tests passed! Global knowledge base should be working.")
        else:
            print("\n❌ Some tests failed. Please check the implementation.")
    
    asyncio.run(main()) 