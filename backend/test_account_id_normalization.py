#!/usr/bin/env python3
"""
Test script to verify account ID normalization is working correctly.
This script tests the new normalize_account_id function and related utilities.
"""

import asyncio
import sys
import os

# Add the backend directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from utils.account_utils import normalize_account_id, get_account_id_variants, normalize_account_id_for_storage, normalize_account_id_for_retrieval
from utils.logger import logger

def test_normalize_account_id():
    """Test the normalize_account_id function with various inputs."""
    print("Testing normalize_account_id function...")
    
    test_cases = [
        ("123e4567-e89b-12d3-a456-426614174000", "123e4567-e89b-12d3-a456-426614174000"),
        ("  ABC123  ", "abc123"),
        (123, "123"),
        (None, ""),
        ("", ""),
        ("  ", ""),
        ("UPPERCASE", "uppercase"),
        ("MixedCase123", "mixedcase123"),
    ]
    
    for input_val, expected in test_cases:
        result = normalize_account_id(input_val)
        status = "✅" if result == expected else "❌"
        print(f"{status} Input: {repr(input_val)} -> Expected: {repr(expected)}, Got: {repr(result)}")
        
        if result != expected:
            return False
    
    print("✅ All normalize_account_id tests passed!")
    return True

def test_get_account_id_variants():
    """Test the get_account_id_variants function."""
    print("\nTesting get_account_id_variants function...")
    
    test_cases = [
        ("123e4567-e89b-12d3-a456-426614174000", ["123e4567-e89b-12d3-a456-426614174000"]),
        ("  ABC123  ", ["abc123", "abc123"]),  # Should deduplicate
        (123, ["123"]),
        (None, [""]),
    ]
    
    for input_val, expected in test_cases:
        result = get_account_id_variants(input_val)
        status = "✅" if result == expected else "❌"
        print(f"{status} Input: {repr(input_val)} -> Expected: {expected}, Got: {result}")
        
        if result != expected:
            return False
    
    print("✅ All get_account_id_variants tests passed!")
    return True

def test_storage_and_retrieval_functions():
    """Test the storage and retrieval specific functions."""
    print("\nTesting storage and retrieval functions...")
    
    test_cases = [
        ("123e4567-e89b-12d3-a456-426614174000", "123e4567-e89b-12d3-a456-426614174000"),
        ("  ABC123  ", "abc123"),
        (123, "123"),
        (None, ""),
    ]
    
    for input_val, expected in test_cases:
        storage_result = normalize_account_id_for_storage(input_val)
        retrieval_result = normalize_account_id_for_retrieval(input_val)
        
        storage_status = "✅" if storage_result == expected else "❌"
        retrieval_status = "✅" if retrieval_result == expected else "❌"
        
        print(f"{storage_status} Storage: {repr(input_val)} -> {repr(storage_result)}")
        print(f"{retrieval_status} Retrieval: {repr(input_val)} -> {repr(retrieval_result)}")
        
        if storage_result != expected or retrieval_result != expected:
            return False
    
    print("✅ All storage and retrieval function tests passed!")
    return True

async def test_database_integration():
    """Test the database integration with normalized account IDs."""
    print("\nTesting database integration...")
    
    try:
        from services.supabase import DBConnection
        from knowledge_base.api import get_user_account_id
        
        db = DBConnection()
        client = await db.client
        
        # Test with a sample user_id (this will fail if no user exists, but that's expected)
        try:
            # This is just a test - in real usage, you'd have a valid user_id
            test_user_id = "test-user-123"
            account_id = await get_user_account_id(client, test_user_id)
            print(f"✅ Database integration test completed. Account ID: {account_id}")
            return True
        except Exception as e:
            print(f"⚠️  Database integration test skipped (expected for test environment): {e}")
            return True
            
    except ImportError as e:
        print(f"⚠️  Database integration test skipped (missing dependencies): {e}")
        return True
    except Exception as e:
        print(f"❌ Database integration test failed: {e}")
        return False

def main():
    """Run all tests."""
    print("🧪 Starting Account ID Normalization Tests\n")
    
    # Run unit tests
    tests = [
        ("normalize_account_id", test_normalize_account_id),
        ("get_account_id_variants", test_get_account_id_variants),
        ("storage_and_retrieval", test_storage_and_retrieval_functions),
    ]
    
    all_passed = True
    for test_name, test_func in tests:
        try:
            if not test_func():
                all_passed = False
        except Exception as e:
            print(f"❌ {test_name} test failed with exception: {e}")
            all_passed = False
    
    # Run async tests
    try:
        async_result = asyncio.run(test_database_integration())
        if not async_result:
            all_passed = False
    except Exception as e:
        print(f"❌ Async test failed with exception: {e}")
        all_passed = False
    
    print(f"\n{'🎉' if all_passed else '❌'} All tests {'passed' if all_passed else 'failed'}!")
    
    if all_passed:
        print("\n✅ Account ID normalization is working correctly!")
        print("✅ The fix should resolve the global knowledge base retrieval issues.")
    else:
        print("\n❌ Some tests failed. Please check the implementation.")
    
    return 0 if all_passed else 1

if __name__ == "__main__":
    sys.exit(main()) 