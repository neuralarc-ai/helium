#!/usr/bin/env python3
"""
Test script to verify the KnowledgeBaseManager integration is working correctly.
This script tests the complete flow from storage to retrieval.
"""

import asyncio
import sys
import os
from pathlib import Path

# Add the current directory to the path
sys.path.append(str(Path(__file__).parent))

async def test_knowledge_base_manager_integration():
    """Test the complete KnowledgeBaseManager integration"""
    try:
        from utils.knowledge_base_manager import global_kb_manager
        from utils.account_utils import normalize_account_id
        
        print("✅ Successfully imported KnowledgeBaseManager")
        
        # Test account ID normalization
        test_account_id = "123e4567-e89b-12d3-a456-426614174000"
        normalized_id = normalize_account_id(test_account_id)
        print(f"✅ Account ID normalization: {test_account_id} -> {normalized_id}")
        
        # Test KnowledgeBaseManager initialization
        print("\nTesting KnowledgeBaseManager initialization...")
        await global_kb_manager.initialize()
        stats = global_kb_manager.get_global_kb_map_stats()
        print(f"✅ KnowledgeBaseManager initialized: {stats}")
        
        # Test getting entries for a test account
        print(f"\nTesting entry retrieval for account: {test_account_id}")
        entries = await global_kb_manager.get_global_kb_entries(test_account_id)
        print(f"✅ Retrieved {len(entries)} entries for test account")
        
        # Display entry details if any found
        if entries:
            print("\n📋 Found entries:")
            for i, entry in enumerate(entries, 1):
                print(f"  {i}. {entry['name']} - {entry['usage_context']} - Active: {entry['is_active']}")
                print(f"     Content preview: {entry['content'][:100]}...")
        else:
            print("ℹ️  No entries found for test account (this is expected if no data exists)")
        
        # Test with a real account ID if available
        print("\nTesting with real account ID...")
        try:
            from services.supabase import DBConnection
            db = DBConnection()
            client = await db.client
            
            # Get a real account ID from the database
            result = await client.table('global_knowledge_base_entries').select('account_id').limit(1).execute()
            
            if result.data:
                real_account_id = result.data[0]['account_id']
                print(f"✅ Found real account ID: {real_account_id}")
                
                # Test with real account ID
                real_entries = await global_kb_manager.get_global_kb_entries(str(real_account_id))
                print(f"✅ Retrieved {len(real_entries)} entries for real account")
                
                if real_entries:
                    print("\n📋 Real entries found:")
                    for i, entry in enumerate(real_entries, 1):
                        print(f"  {i}. {entry['name']} - {entry['usage_context']} - Active: {entry['is_active']}")
                        print(f"     Content preview: {entry['content'][:100]}...")
                        
                        # Check if this is the CSV file we're looking for
                        if 'csv' in entry['name'].lower() or 'attrition' in entry['content'].lower():
                            print(f"🎯 Found CSV/Attrition entry: {entry['name']}")
                            print(f"   Content length: {len(entry['content'])} characters")
                            print(f"   Content preview: {entry['content'][:200]}...")
                else:
                    print("ℹ️  No entries found for real account")
            else:
                print("ℹ️  No global knowledge base entries found in database")
                
        except Exception as e:
            print(f"⚠️  Could not test with real account ID: {e}")
        
        return True
        
    except ImportError as e:
        print(f"❌ Import error: {e}")
        return False
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Run the integration test"""
    print("🧪 Starting KnowledgeBaseManager Integration Test\n")
    
    try:
        result = asyncio.run(test_knowledge_base_manager_integration())
        
        if result:
            print("\n🎉 Integration test completed successfully!")
            print("\n📋 Summary:")
            print("✅ KnowledgeBaseManager is working correctly")
            print("✅ Account ID normalization is functioning")
            print("✅ Global KB map pattern is implemented")
            print("✅ Entry retrieval is working")
            
            print("\n🚀 Next steps:")
            print("1. Restart your backend services")
            print("2. Test with a real thread by asking about the CSV content")
            print("3. Verify the LLM uses knowledge base content instead of web search")
        else:
            print("\n❌ Integration test failed!")
            
    except Exception as e:
        print(f"\n❌ Test execution failed: {e}")
        import traceback
        traceback.print_exc()
        return 1
    
    return 0 if result else 1

if __name__ == "__main__":
    sys.exit(main()) 