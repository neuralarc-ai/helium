#!/usr/bin/env python3
"""
Script to clean up Daytona sandboxes.
"""

import asyncio
import sys
from pathlib import Path

# Add the backend directory to the Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from daytona_sdk import AsyncDaytona, DaytonaConfig, SandboxState
from utils.logger import logger

async def cleanup_daytona_sandboxes():
    """Clean up Daytona sandboxes"""
    
    print("🧹 Cleaning up Daytona sandboxes...")
    
    try:
        # Initialize Daytona client
        config = DaytonaConfig(
            api_key='dtn_00647c4fd3f93e4c2a26f865e94a18572b0e9488d54fb9df100dec7fb53b09cb',
            api_url='https://app.daytona.io/api',
            target='us'
        )
        daytona = AsyncDaytona(config)
        
        # Get all sandboxes
        print("\n1. Getting all sandboxes...")
        sandboxes = await daytona.list()
        
        if not sandboxes:
            print("✅ No sandboxes found to clean up")
            return True
        
        # Filter sandboxes to delete
        sandboxes_to_delete = []
        for sandbox in sandboxes:
            if sandbox.state in [SandboxState.ARCHIVED, SandboxState.STOPPED]:
                sandboxes_to_delete.append(sandbox)
        
        if not sandboxes_to_delete:
            print("✅ No sandboxes to clean up")
            return True
        
        print(f"\n2. Found {len(sandboxes_to_delete)} sandboxes to delete:")
        for sandbox in sandboxes_to_delete:
            print(f"  - {sandbox.id[:8]}... ({sandbox.state})")
        
        # Ask for confirmation
        print(f"\n⚠️  This will delete {len(sandboxes_to_delete)} sandboxes.")
        response = input("Do you want to continue? (y/N): ").strip().lower()
        
        if response not in ['y', 'yes']:
            print("❌ Cleanup cancelled")
            return False
        
        # Delete sandboxes
        print(f"\n3. Deleting sandboxes...")
        deleted_count = 0
        failed_count = 0
        
        for sandbox in sandboxes_to_delete:
            try:
                print(f"  Deleting {sandbox.id[:8]}...")
                await daytona.delete(sandbox)
                deleted_count += 1
                print(f"  ✅ Deleted {sandbox.id[:8]}...")
            except Exception as e:
                print(f"  ❌ Failed to delete {sandbox.id[:8]}...: {e}")
                failed_count += 1
        
        print(f"\n📊 Cleanup completed:")
        print(f"  ✅ Successfully deleted: {deleted_count}")
        print(f"  ❌ Failed to delete: {failed_count}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error during cleanup: {e}")
        return False

if __name__ == "__main__":
    async def main():
        success = await cleanup_daytona_sandboxes()
        
        if success:
            print("\n✅ Cleanup completed!")
        else:
            print("\n❌ Cleanup failed!")
    
    asyncio.run(main()) 