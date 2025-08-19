#!/usr/bin/env python3
"""
Check if knowledge base context injection is working properly
"""

import asyncio
import sys
from pathlib import Path

# Add the current directory to the path so we can import modules
sys.path.append(str(Path(__file__).parent))

async def check_kb_injection():
    """Check knowledge base context injection"""
    
    try:
        from services.supabase import DBConnection
        
        print("=== Checking Knowledge Base Context Injection ===")
        
        # Initialize database connection
        db = DBConnection()
        await db.initialize()
        
        print("✅ Database connection initialized")
        
        client = await db.client
        
        # Test the should_use_knowledge_base function
        print("\n--- Testing should_use_knowledge_base Function ---")
        
        test_queries = [
            "Create a analysis report on the employee data you have",
            "Generate a webpage dashboard for the airlines' data you have",
            "What data do you have about employees?",
            "Show me the passenger data",
            "What's the weather like today?"
        ]
        
        for query in test_queries:
            result = await client.rpc('should_use_knowledge_base', {'p_query': query}).execute()
            should_use = result.data if result.data else False
            print(f"Query: '{query[:50]}...' -> Should use KB: {should_use}")
        
        # Test the get_smart_kb_context function
        print("\n--- Testing get_smart_kb_context Function ---")
        
        # Use a test thread ID
        test_thread_id = "00000000-0000-0000-0000-000000000000"
        
        result = await client.rpc('get_smart_kb_context', {
            'p_thread_id': test_thread_id,
            'p_query': 'Create a analysis report on the employee data you have',
            'p_max_tokens': 6000
        }).execute()
        
        if result.data:
            context = result.data
            print(f"✅ get_smart_kb_context returned data (length: {len(context)})")
            
            # Check if it contains the expected format
            has_data_block = '### DATA BLOCK:' in context
            has_instruction = '(This is extracted content. Use it directly. Do NOT attempt to open or create files.)' in context
            has_pipe_separators = ' | ' in context
            
            print(f"✅ Contains DATA BLOCK: {has_data_block}")
            print(f"✅ Contains instruction: {has_instruction}")
            print(f"✅ Contains pipe separators: {has_pipe_separators}")
            
            # Show sample of context
            print(f"\n--- Sample Context ---")
            lines = context.split('\n')
            for i, line in enumerate(lines[:20]):
                print(f"{i+1}: {line}")
            
            if len(lines) > 20:
                print(f"... (showing first 20 lines, total {len(lines)} lines)")
        else:
            print("❌ get_smart_kb_context returned no data")
        
        # Check if there are any employee-related entries
        print("\n--- Checking Employee Data Entries ---")
        
        result = await client.table('global_knowledge_base_entries').select('*').ilike('name', '%employee%').execute()
        
        if result.data:
            print(f"Found {len(result.data)} employee-related entries:")
            for entry in result.data:
                name = entry.get('name', 'Unknown')
                content = entry.get('content', '')
                has_data_block = '### DATA BLOCK:' in content
                has_pipe_separators = ' | ' in content
                print(f"  - {name}: DATA BLOCK: {has_data_block}, Pipe separators: {has_pipe_separators}")
        else:
            print("❌ No employee-related entries found")
        
    except Exception as e:
        print(f"❌ Check failed with error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(check_kb_injection())
