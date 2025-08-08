#!/usr/bin/env python3
"""
Debug script for knowledge base issue
"""

import asyncio
import os
import sys
from pathlib import Path

# Add the current directory to the path
sys.path.append(str(Path(__file__).parent))

async def debug_kb_issue():
    """Debug the knowledge base issue"""
    try:
        # Try to import the necessary modules
        from services.supabase import DBConnection
        
        print("✅ Successfully imported DBConnection")
        
        # Initialize the database connection
        db = DBConnection()
        client = await db.client
        print("✅ Successfully connected to database")
        
        # Test thread_id
        thread_id = "0756806e-8d95-4710-900e-7269a72ae4ef"
        
        print(f"\n🔍 Debugging thread_id: {thread_id}")
        
        # 1. Check if the thread exists
        print("\n1. Checking if thread exists...")
        thread_result = await client.table('threads').select('account_id, created_at').eq('thread_id', thread_id).execute()
        
        if thread_result.data:
            thread_account_id = thread_result.data[0]['account_id']
            print(f"✅ Thread exists with account_id: {thread_account_id}")
        else:
            print("❌ Thread not found")
            return
        
        # 2. Check global knowledge base entries
        print("\n2. Checking global knowledge base entries...")
        global_entries_result = await client.table('global_knowledge_base_entries').select('*').execute()
        
        if global_entries_result.data:
            print(f"✅ Found {len(global_entries_result.data)} total global entries")
            
            # Check active entries
            active_entries = [e for e in global_entries_result.data if e.get('is_active', False)]
            print(f"   - {len(active_entries)} active entries")
            
            # Check contextual entries
            contextual_entries = [e for e in active_entries if e.get('usage_context') in ['always', 'contextual']]
            print(f"   - {len(contextual_entries)} contextual entries")
            
            # Check entries for this account
            account_entries = [e for e in contextual_entries if e.get('account_id') == str(thread_account_id)]
            print(f"   - {len(account_entries)} entries for account {thread_account_id}")
            
            if account_entries:
                print("   📋 Account entries:")
                for entry in account_entries:
                    print(f"     - {entry['name']} ({entry['usage_context']}) - Active: {entry['is_active']}")
            else:
                print("   ❌ No entries found for this account")
                
                # Show all account_ids that exist
                all_account_ids = set(e.get('account_id') for e in global_entries_result.data)
                print(f"   📊 Available account_ids: {list(all_account_ids)[:5]}...")
        else:
            print("❌ No global knowledge base entries found")
        
        # 3. Test the function directly
        print("\n3. Testing the function directly...")
        try:
            function_result = await client.rpc('get_combined_knowledge_base_context', {
                'p_thread_id': thread_id,
                'p_agent_id': None,
                'p_max_tokens': 4000
            }).execute()
            
            if function_result.data:
                print(f"✅ Function returned data (length: {len(function_result.data)})")
                preview = function_result.data[:200] + "..." if len(function_result.data) > 200 else function_result.data
                print(f"   Preview: {preview}")
            else:
                print("❌ Function returned no data")
                
        except Exception as e:
            print(f"❌ Error calling function: {e}")
        
        # 4. Check if there are any entries with different account_id formats
        print("\n4. Checking account_id formats...")
        if global_entries_result.data:
            account_ids = [e.get('account_id') for e in global_entries_result.data]
            unique_account_ids = list(set(account_ids))
            print(f"   Found {len(unique_account_ids)} unique account_ids")
            
            # Check if any match the thread account_id in different formats
            thread_account_str = str(thread_account_id)
            matching_entries = []
            
            for entry in global_entries_result.data:
                entry_account_id = entry.get('account_id')
                if entry_account_id == thread_account_str or entry_account_id == thread_account_id:
                    matching_entries.append(entry)
            
            if matching_entries:
                print(f"   ✅ Found {len(matching_entries)} entries that match the thread account_id")
                for entry in matching_entries:
                    print(f"     - {entry['name']} (account_id: {entry['account_id']})")
            else:
                print(f"   ❌ No entries match the thread account_id ({thread_account_id})")
        
    except ImportError as e:
        print(f"❌ Import error: {e}")
        print("This is expected if running outside the proper environment")
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")

if __name__ == "__main__":
    asyncio.run(debug_kb_issue()) 