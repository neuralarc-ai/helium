#!/usr/bin/env python3
"""
Script to enable all available feature flags via environment variables.
This script generates the environment variables you need to add to your Docker deployment.
"""

import os
import sys

def get_available_flags():
    """
    Get all available feature flags and their corresponding environment variable names.
    Returns a dictionary mapping flag names to their environment variable names.
    """
    return {
        "custom_agents": "FLAG_CUSTOM_AGENTS",
        "mcp_module": "FLAG_MCP_MODULE", 
        "templates_api": "FLAG_TEMPLATES_API",
        "triggers_api": "FLAG_TRIGGERS_API",
        "workflows_api": "FLAG_WORKFLOWS_API",
        "knowledge_base": "FLAG_KNOWLEDGE_BASE",
        "pipedream": "FLAG_PIPEDREAM",
        "credentials_api": "FLAG_CREDENTIALS_API",
        "suna_default_agent": "FLAG_SUNA_DEFAULT_AGENT"
    }

def generate_env_vars():
    """Generate environment variables for all available flags"""
    available_flags = get_available_flags()
    
    print("🚀 Helium AI Feature Flags - Environment Variables")
    print("=" * 50)
    print()
    print("Add these environment variables to your Docker deployment to enable all features:")
    print()
    
    for flag_name, env_var in available_flags.items():
        print(f"# Enable {flag_name.replace('_', ' ').title()}")
        print(f"{env_var}=true")
        print()
    
    print("=" * 50)
    print("📝 Example .env file for Docker deployment:")
    print()
    print("# Feature Flags - Enable all features")
    for flag_name, env_var in available_flags.items():
        print(f"{env_var}=true")
    print()
    print("# Other environment variables...")
    print("REDIS_HOST=redis")
    print("REDIS_PORT=6379")
    print("REDIS_PASSWORD=")
    print()
    print("=" * 50)
    print("🐳 Docker Compose example:")
    print()
    print("version: \"3.8\"")
    print("services:")
    print("  backend:")
    print("    build: ./backend")
    print("    environment:")
    print("      # Feature Flags")
    for flag_name, env_var in available_flags.items():
        print(f"      - {env_var}=true")
    print("      # Other environment variables...")
    print("      - REDIS_HOST=redis")
    print("      - REDIS_PORT=6379")
    print("    depends_on:")
    print("      - redis")

def check_current_flags():
    """Check which flags are currently enabled via environment variables"""
    available_flags = get_available_flags()
    
    print("🔍 Current Environment Variable Status:")
    print("=" * 40)
    print()
    
    enabled_count = 0
    for flag_name, env_var in available_flags.items():
        env_value = os.getenv(env_var)
        if env_value is not None:
            enabled = env_value.lower() in ('true', 't', 'yes', 'y', '1')
            status = "✅ ENABLED" if enabled else "❌ DISABLED"
            print(f"{status} {flag_name} ({env_var}={env_value})")
            if enabled:
                enabled_count += 1
        else:
            print(f"⚪ NOT SET {flag_name} ({env_var})")
    
    print()
    print(f"📊 Summary: {enabled_count}/{len(available_flags)} flags enabled via environment variables")
    print()
    print("💡 Tip: Set environment variables to enable features without Redis configuration")

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "check":
        check_current_flags()
    else:
        generate_env_vars()
