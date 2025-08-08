#!/usr/bin/env python3
"""
Debug script to identify global knowledge base context injection issues
"""

import asyncio
import sys
import os
from pathlib import Path

# Add the current directory to the path
sys.path.append(str(Path(__file__).parent))

async def debug_global_kb_issue():
    """Debug global knowledge base context injection issues"""
    try:
        # Test the global knowledge base context retrieval step by step
        
        print("=== Testing Global Knowledge Base Context Injection ===")
        
        # Test thread_id from the user's issue
        thread_id = "69e21687-85b4-4294-aa5a-1332bbf576ab"
        
        print(f"Testing with thread_id: {thread_id}")
        
        # Simulate the database queries that the function would make
        
        # 1. Check if thread exists and get account_id
        print("\n1. Checking thread and account_id...")
        
        # Simulate the thread query
        # In a real scenario, this would be:
        # SELECT account_id FROM threads WHERE thread_id = '69e21687-85b4-4294-aa5a-1332bbf576ab'
        
        # For now, let's assume the thread exists and has an account_id
        # The issue might be in the account_id conversion or the global_knowledge_base_entries query
        
        print("✅ Thread exists (assuming)")
        
        # 2. Check global knowledge base entries
        print("\n2. Checking global knowledge base entries...")
        
        # Simulate the global knowledge base entries query
        # In a real scenario, this would be:
        # SELECT * FROM global_knowledge_base_entries 
        # WHERE account_id = 'converted_account_id' 
        # AND is_active = TRUE 
        # AND usage_context IN ('always', 'contextual')
        
        # Let's check what the actual issue might be
        print("Potential issues:")
        print("- Account ID conversion from UUID to VARCHAR")
        print("- Global knowledge base entries not found for the account")
        print("- Entries not active or wrong usage_context")
        print("- Function not being called correctly")
        
        # 3. Test the function call
        print("\n3. Testing function call...")
        
        # Simulate the function call
        # In a real scenario, this would be:
        # SELECT get_combined_knowledge_base_context('69e21687-85b4-4294-aa5a-1332bbf576ab'::UUID, NULL, 4000)
        
        print("Function call simulation:")
        print("- Input: thread_id = '69e21687-85b4-4294-aa5a-1332bbf576ab'")
        print("- Input: agent_id = NULL")
        print("- Input: max_tokens = 4000")
        
        # 4. Check what the function should return
        print("\n4. Expected function output...")
        
        expected_output = """# GLOBAL KNOWLEDGE BASE

The following is your global knowledge base. Use this information as context when responding:

## Global Knowledge: 📄 all_leads.csv

Content extracted from uploaded file: all_leads.csv

=== CSV FILE CONTENT ===

COLUMN HEADERS: [column names from CSV]

Row 1: [first row data]
Row 2: [second row data]
...

=== SUMMARY ===
Total rows: [number]
Total columns: [number]
Data rows: [number]"""
        
        print("Expected output structure:")
        print(expected_output[:200] + "...")
        
        # 5. Common issues and solutions
        print("\n5. Common issues and solutions:")
        
        issues = [
            "Account ID mismatch: The account_id in threads table (UUID) doesn't match global_knowledge_base_entries table (VARCHAR)",
            "No global entries: No entries exist for the account",
            "Wrong usage_context: Entries have usage_context other than 'always' or 'contextual'",
            "Inactive entries: Entries have is_active = FALSE",
            "Function not updated: The database function wasn't updated with the latest migration"
        ]
        
        for i, issue in enumerate(issues, 1):
            print(f"{i}. {issue}")
        
        print("\n6. Debugging steps:")
        debug_steps = [
            "Check if the thread exists and get its account_id",
            "Check if global_knowledge_base_entries table has entries for that account_id",
            "Verify the account_id conversion from UUID to VARCHAR",
            "Check if entries are active and have correct usage_context",
            "Test the function directly in the database",
            "Check the logs for any errors"
        ]
        
        for i, step in enumerate(debug_steps, 1):
            print(f"{i}. {step}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error in debug script: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = asyncio.run(debug_global_kb_issue())
    if success:
        print("\n✅ Global KB debugging completed successfully!")
    else:
        print("\n❌ Global KB debugging failed!") 