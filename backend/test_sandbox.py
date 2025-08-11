#!/usr/bin/env python3
"""
Test script to verify sandbox creation is working.
"""

import asyncio
import sys
from pathlib import Path

# Add the backend directory to the Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from sandbox.sandbox import daytona_config, create_sandbox, delete_sandbox
from utils.logger import logger

async def test_sandbox_creation():
    """Test sandbox creation"""
    
    print("🧪 Testing Sandbox Creation...")
    
    try:
        # Test 1: Check Daytona configuration
        print("\n1. Checking Daytona configuration...")
        if daytona_config.api_key:
            print(f"✅ Daytona API key configured: {daytona_config.api_key[:10]}...")
        else:
            print("❌ No Daytona API key found")
            return False
            
        if daytona_config.api_url:
            print(f"✅ Daytona API URL: {daytona_config.api_url}")
        else:
            print("❌ No Daytona API URL found")
            return False
            
        if daytona_config.target:
            print(f"✅ Daytona target: {daytona_config.target}")
        else:
            print("❌ No Daytona target found")
            return False
        
        # Test 2: Try to create a sandbox
        print("\n2. Testing sandbox creation...")
        try:
            test_password = "test123"
            test_project_id = "test-project-123"
            
            print("Creating sandbox...")
            sandbox = await create_sandbox(test_password, test_project_id)
            
            if sandbox and sandbox.id:
                print(f"✅ Sandbox created successfully: {sandbox.id}")
                
                # Test 3: Get preview links
                print("\n3. Testing preview links...")
                try:
                    vnc_link = await sandbox.get_preview_link(6080)
                    website_link = await sandbox.get_preview_link(8080)
                    
                    print(f"✅ VNC link: {vnc_link}")
                    print(f"✅ Website link: {website_link}")
                    
                except Exception as e:
                    print(f"⚠️ Preview links error: {e}")
                
                # Test 4: Clean up - delete the sandbox
                print("\n4. Cleaning up...")
                try:
                    await delete_sandbox(sandbox.id)
                    print(f"✅ Sandbox deleted successfully: {sandbox.id}")
                except Exception as e:
                    print(f"⚠️ Sandbox deletion error: {e}")
                
                return True
            else:
                print("❌ Sandbox creation failed - no sandbox ID returned")
                return False
                
        except Exception as e:
            print(f"❌ Sandbox creation error: {e}")
            import traceback
            traceback.print_exc()
            return False
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    async def main():
        success = await test_sandbox_creation()
        
        if success:
            print("\n🎉 Sandbox creation test passed!")
        else:
            print("\n❌ Sandbox creation test failed!")
    
    asyncio.run(main()) 