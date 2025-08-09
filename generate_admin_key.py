#!/usr/bin/env python3
"""
Script to generate a Kortix Admin API Key manually.
This is useful if you need to generate the key outside of the setup wizard.
"""

import secrets
import base64

def generate_admin_api_key():
    """Generates a secure admin API key for Kortix."""
    # Generate 32 random bytes (256 bits)
    key_bytes = secrets.token_bytes(32)
    # Encode as hex for a readable API key
    return key_bytes.hex()

if __name__ == "__main__":
    admin_key = generate_admin_api_key()
    print(f"Generated Kortix Admin API Key: {admin_key}")
    print("\nAdd this to your backend/.env file:")
    print(f"KORTIX_ADMIN_API_KEY={admin_key}")
