#!/usr/bin/env python3
"""
Debug script to check if CSV content is actually in the database and can be retrieved.
"""

import asyncio
import sys
import os
from pathlib import Path

# Add the current directory to the path
sys.path.append(str(Path(__file__).parent))

async def debug_csv_issue():
    """Debug the CSV issue by checking the database directly."""
    try:
        from services.supabase import DBConnection
        
        print("🔍 Debugging CSV issue...")
        
        # Connect to database
        db = DBConnection()
        client = await db.client
        
        # Check for global knowledge base entries
        print("\n1. Checking all global knowledge base entries...")
        result = await client.table('global_knowledge_base_entries').select('*').eq('is_active', True).execute()
        
        if result.data:
            print(f"✅ Found {len(result.data)} global knowledge base entries")
            
            # Look for CSV-related entries
            csv_entries = []
            for entry in result.data:
                name = entry.get('name', '').lower()
                content = entry.get('content', '').lower()
                
                if 'csv' in name or 'csv' in content or 'attrition' in content:
                    csv_entries.append(entry)
            
            if csv_entries:
                print(f"\n🎯 Found {len(csv_entries)} CSV/Attrition related entries:")
                for i, entry in enumerate(csv_entries, 1):
                    print(f"\n  {i}. {entry['name']}")
                    print(f"     Account ID: {entry.get('account_id')}")
                    print(f"     Content length: {len(entry.get('content', ''))} chars")
                    print(f"     Usage context: {entry.get('usage_context')}")
                    print(f"     Is active: {entry.get('is_active')}")
                    print(f"     Created at: {entry.get('created_at')}")
                    print(f"     Content preview: {entry.get('content', '')[:200]}...")
            else:
                print("❌ No CSV/Attrition entries found!")
                
            # Check account IDs
            account_ids = set(entry.get('account_id') for entry in result.data)
            print(f"\n📊 Found {len(account_ids)} unique account IDs:")
            for account_id in account_ids:
                print(f"  - {account_id}")
                
        else:
            print("❌ No global knowledge base entries found!")
        
        # Test with a specific thread ID
        print(f"\n2. Testing with thread ID: cd0d2704-1ad4-4c78-a9df-42a2d614c10b")
        
        # Get the thread's account_id
        thread_result = await client.table('threads').select('account_id').eq('thread_id', 'cd0d2704-1ad4-4c78-a9df-42a2d614c10b').execute()
        
        if thread_result.data:
            thread_account_id = thread_result.data[0]['account_id']
            print(f"✅ Thread account_id: {thread_account_id}")
            
            # Try to find entries for this account_id
            print(f"\n3. Looking for entries with account_id: {thread_account_id}")
            
            # Try different account_id formats
            account_id_variants = [
                thread_account_id,
                str(thread_account_id),
                str(thread_account_id).strip().lower(),
                str(thread_account_id).strip()
            ]
            
            print(f"   Trying variants: {account_id_variants}")
            
            for variant in account_id_variants:
                print(f"\n   Checking variant: {variant}")
                entries_result = await client.table('global_knowledge_base_entries').select('*').eq('account_id', variant).eq('is_active', True).in_('usage_context', ['always', 'contextual']).execute()
                
                if entries_result.data:
                    print(f"   ✅ Found {len(entries_result.data)} entries for variant {variant}")
                    for entry in entries_result.data:
                        print(f"     - {entry['name']} (Content length: {len(entry.get('content', ''))})")
                else:
                    print(f"   ❌ No entries found for variant {variant}")
            
            # Try with IN clause for multiple variants
            print(f"\n4. Trying with IN clause for multiple variants...")
            entries_result = await client.table('global_knowledge_base_entries').select('*').in_('account_id', account_id_variants).eq('is_active', True).in_('usage_context', ['always', 'contextual']).execute()
            
            if entries_result.data:
                print(f"✅ Found {len(entries_result.data)} entries with IN clause")
                for entry in entries_result.data:
                    print(f"  - {entry['name']} (Account: {entry.get('account_id')}, Content length: {len(entry.get('content', ''))})")
            else:
                print("❌ No entries found with IN clause")
                
        else:
            print("❌ Thread not found!")
        
        return True
        
    except ImportError as e:
        print(f"❌ Import error: {e}")
        return False
    except Exception as e:
        print(f"❌ Debug failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Run the debug script."""
    print("🧪 Starting CSV Issue Debug\n")
    
    try:
        result = asyncio.run(debug_csv_issue())
        
        if result:
            print("\n🎉 Debug completed successfully!")
        else:
            print("\n❌ Debug failed!")
            
    except Exception as e:
        print(f"\n❌ Debug execution failed: {e}")
        import traceback
        traceback.print_exc()
        return 1
    
    return 0 if result else 1

if __name__ == "__main__":
    sys.exit(main()) 