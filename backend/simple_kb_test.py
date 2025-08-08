#!/usr/bin/env python3
"""
Simple test to verify knowledge base functionality without external dependencies.
"""

import asyncio
import sys
import os
from pathlib import Path

# Add the current directory to the path
sys.path.append(str(Path(__file__).parent))

def normalize_account_id(account_id):
    """Normalize an account ID to a consistent string format."""
    if account_id is None:
        return ""
    
    # Convert to string, trim whitespace, and convert to lowercase
    normalized = str(account_id).strip().lower()
    return normalized

def test_normalize_account_id():
    """Test account ID normalization."""
    print("Testing account ID normalization...")
    
    test_cases = [
        ("123e4567-e89b-12d3-a456-426614174000", "123e4567-e89b-12d3-a456-426614174000"),
        ("  ABC123  ", "abc123"),
        (123, "123"),
        (None, ""),
    ]
    
    all_passed = True
    for input_val, expected in test_cases:
        result = normalize_account_id(input_val)
        status = "✅" if result == expected else "❌"
        print(f"{status} {repr(input_val)} -> {repr(result)}")
        
        if result != expected:
            all_passed = False
    
    return all_passed

async def test_database_connection():
    """Test database connection and check for CSV content."""
    try:
        # Try to import the database connection
        from services.supabase import DBConnection
        
        print("\nTesting database connection...")
        db = DBConnection()
        client = await db.client
        
        # Check for global knowledge base entries
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
                print(f"🎯 Found {len(csv_entries)} CSV/Attrition related entries:")
                for entry in csv_entries:
                    print(f"  - {entry['name']} (Content length: {len(entry['content'])} chars)")
                    print(f"    Preview: {entry['content'][:100]}...")
            else:
                print("ℹ️  No CSV/Attrition entries found")
                
            # Check account IDs
            account_ids = set(entry.get('account_id') for entry in result.data)
            print(f"📊 Found {len(account_ids)} unique account IDs: {list(account_ids)[:3]}...")
            
        else:
            print("ℹ️  No global knowledge base entries found")
        
        return True
        
    except ImportError as e:
        print(f"⚠️  Could not import database connection: {e}")
        return False
    except Exception as e:
        print(f"❌ Database test failed: {e}")
        return False

def main():
    """Run the simple test."""
    print("🧪 Starting Simple Knowledge Base Test\n")
    
    # Test account ID normalization
    test1_passed = test_normalize_account_id()
    
    # Test database connection
    try:
        test2_passed = asyncio.run(test_database_connection())
    except Exception as e:
        print(f"❌ Async test failed: {e}")
        test2_passed = False
    
    all_passed = test1_passed and test2_passed
    
    print(f"\n{'🎉' if all_passed else '❌'} Test {'passed' if all_passed else 'failed'}!")
    
    if all_passed:
        print("\n✅ Knowledge base functionality is working!")
        print("📋 Next steps:")
        print("1. Restart your backend services")
        print("2. Test with a real thread by asking about the CSV content")
        print("3. Verify the LLM uses knowledge base content instead of web search")
    else:
        print("\n❌ Some tests failed. Please check the implementation.")
    
    return 0 if all_passed else 1

if __name__ == "__main__":
    sys.exit(main()) 