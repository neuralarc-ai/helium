#!/usr/bin/env python3
"""
Script to enable the custom_agents feature flag in Redis.
This will fix the "Custom agents is not enabled" error.
"""

import asyncio
import sys
import os

# Add the backend directory to the path so we can import the flags module
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from backend.flags.flags import set_flag

async def enable_custom_agents():
    """Enable the custom_agents feature flag"""
    try:
        print("🔧 Enabling custom_agents feature flag...")
        
        # Set the custom_agents flag to enabled
        success = await set_flag("custom_agents", True, "Enable custom agent creation and management")
        
        if success:
            print("✅ Successfully enabled custom_agents feature flag!")
            print("🔄 You may need to refresh your browser to see the changes.")
        else:
            print("❌ Failed to enable custom_agents feature flag.")
            print("   Make sure your backend is running and Redis is accessible.")
            
    except Exception as e:
        print(f"❌ Error enabling custom_agents flag: {e}")
        print("   Make sure your backend is running and Redis is accessible.")

if __name__ == "__main__":
    asyncio.run(enable_custom_agents()) 