#!/usr/bin/env python3
"""
Script to check Daytona usage and help clean up resources.
"""

import asyncio
import sys
from pathlib import Path

# Add the backend directory to the Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from daytona_sdk import AsyncDaytona, DaytonaConfig
from utils.logger import logger

async def check_daytona_usage():
    """Check Daytona usage and list sandboxes"""
    
    print("🔍 Checking Daytona Usage...")
    
    try:
        # Initialize Daytona client
        config = DaytonaConfig(
            api_key='dtn_00647c4fd3f93e4c2a26f865e94a18572b0e9488d54fb9df100dec7fb53b09cb',
            api_url='https://app.daytona.io/api',
            target='us'
        )
        daytona = AsyncDaytona(config)
        
        # Get all sandboxes
        print("\n1. Listing all sandboxes...")
        try:
            sandboxes = await daytona.list()
            
            if not sandboxes:
                print("✅ No sandboxes found")
                return True
            
            print(f"Found {len(sandboxes)} sandboxes:")
            
            total_disk = 0
            active_sandboxes = 0
            stopped_sandboxes = 0
            archived_sandboxes = 0
            
            for sandbox in sandboxes:
                status = sandbox.state
                disk_usage = getattr(sandbox, 'disk_usage', 0) or 0
                total_disk += disk_usage
                
                if status == 'running':
                    active_sandboxes += 1
                    status_emoji = "🟢"
                elif status == 'stopped':
                    stopped_sandboxes += 1
                    status_emoji = "🟡"
                elif status == 'archived':
                    archived_sandboxes += 1
                    status_emoji = "🔴"
                else:
                    status_emoji = "⚪"
                
                print(f"  {status_emoji} {sandbox.id[:8]}... - {status} - {disk_usage}GB")
            
            print(f"\n📊 Summary:")
            print(f"  Total sandboxes: {len(sandboxes)}")
            print(f"  Active: {active_sandboxes}")
            print(f"  Stopped: {stopped_sandboxes}")
            print(f"  Archived: {archived_sandboxes}")
            print(f"  Total disk usage: {total_disk}GB")
            
            # Suggest cleanup
            if stopped_sandboxes > 0 or archived_sandboxes > 0:
                print(f"\n🧹 Cleanup suggestions:")
                if stopped_sandboxes > 0:
                    print(f"  - Delete {stopped_sandboxes} stopped sandboxes to free up space")
                if archived_sandboxes > 0:
                    print(f"  - Delete {archived_sandboxes} archived sandboxes to free up space")
                
                print(f"\n💡 To clean up, visit: https://app.daytona.io/dashboard")
                print(f"   Or use the Daytona CLI to delete sandboxes")
            
            return True
            
        except Exception as e:
            print(f"❌ Error listing sandboxes: {e}")
            return False
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    async def main():
        success = await check_daytona_usage()
        
        if success:
            print("\n✅ Usage check completed!")
        else:
            print("\n❌ Usage check failed!")
    
    asyncio.run(main()) 