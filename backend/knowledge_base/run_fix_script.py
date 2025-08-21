#!/usr/bin/env python3
"""
Python script to run the database fix script
"""

import asyncio
import os
from supabase import create_client, Client

async def run_fix_script():
    """Run the database fix script using Supabase client"""
    
    # Get Supabase credentials from environment variables
    supabase_url = os.getenv('SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')  # Use service role key for admin operations
    
    if not supabase_url or not supabase_key:
        print("❌ Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required")
        print("Set these in your .env file or export them:")
        print("export SUPABASE_URL='your_supabase_url'")
        print("export SUPABASE_SERVICE_ROLE_KEY='your_service_role_key'")
        return
    
    try:
        # Create Supabase client
        supabase: Client = create_client(supabase_url, supabase_key)
        
        print("🔌 Connecting to Supabase...")
        
        # Read the SQL script
        script_path = "backend/knowledge_base/fix_missing_columns.sql"
        with open(script_path, 'r') as f:
            sql_script = f.read()
        
        print(f"📖 Read SQL script from {script_path}")
        print("🚀 Executing database fix script...")
        
        # Execute the SQL script
        result = supabase.rpc('exec_sql', {'sql': sql_script}).execute()
        
        print("✅ Database fix script executed successfully!")
        print("🔄 Restart your application to see the changes")
        
    except Exception as e:
        print(f"❌ Error executing script: {e}")
        print("\n💡 Alternative: Use the Supabase Dashboard SQL Editor")
        print("1. Go to your Supabase project")
        print("2. Open SQL Editor")
        print("3. Copy the content from fix_missing_columns.sql")
        print("4. Paste and run it")

if __name__ == "__main__":
    asyncio.run(run_fix_script())
