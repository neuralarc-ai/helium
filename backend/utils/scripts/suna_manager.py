#!/usr/bin/env python3
"""
SUNA AGENT INSTALLER

Usage:
    python suna_manager.py install           # Install for users who don't have Suna
"""

import asyncio
import argparse
import sys
import json
from pathlib import Path

backend_dir = Path(__file__).parent.parent.parent
sys.path.insert(0, str(backend_dir))

from agent.suna import SunaSyncService
from utils.logger import logger


def print_success(message: str):
    print(f"✅ {message}")

def print_error(message: str):
    print(f"❌ {message}")

def print_info(message: str):
    print(f"ℹ️  {message}")

def print_warning(message: str):
    print(f"⚠️  {message}")


class SunaManagerCLI:
    def __init__(self):
        self.sync_service = SunaSyncService()
    
    async def install_command(self):
        print("🚀 Installing Suna for users who don't have it")
        
        result = await self.sync_service.install_for_all_missing_users()
        
        if result.success:
            if result.synced_count == 0:
                print_success("All users already have Suna agents!")
            else:
                print_success(f"Successfully installed Suna for {result.synced_count} users")
        else:
            print_error("Installation failed!")
            for error in result.errors:
                print(f"  💥 {error}")
        
        if result.failed_count > 0:
            print_warning(f"Failed to install for {result.failed_count} users")
    


async def main():
    parser = argparse.ArgumentParser(
        description="🌞 Suna Agent Manager - Simple and robust",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__
    )
    
    subparsers = parser.add_subparsers(dest='command', help='Available commands')
    subparsers.add_parser('install', help='📦 Install Suna for users who don\'t have it')
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return
    
    cli = SunaManagerCLI()
    
    try:
        if args.command == 'install':
            await cli.install_command()
        else:
            parser.print_help()
            
    except KeyboardInterrupt:
        print_warning("Operation cancelled by user")
    except Exception as e:
        print_error(f"Unexpected error: {str(e)}")
        logger.error(f"CLI error: {str(e)}")


if __name__ == "__main__":
    asyncio.run(main()) 