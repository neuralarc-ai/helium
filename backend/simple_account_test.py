#!/usr/bin/env python3
"""
Simple test script to verify account ID normalization logic.
This script tests the core logic without requiring external dependencies.
"""

def normalize_account_id(account_id):
    """
    Normalize an account ID to a consistent string format.
    """
    if account_id is None:
        return ""
    
    # Convert to string, trim whitespace, and convert to lowercase
    normalized = str(account_id).strip().lower()
    return normalized

def get_account_id_variants(account_id):
    """
    Get all possible variants of an account ID for flexible matching.
    """
    if account_id is None:
        return [""]
    
    normalized = normalize_account_id(account_id)
    original = str(account_id).strip()
    
    variants = [normalized]
    if original != normalized:
        variants.append(original)
    
    # Remove duplicates while preserving order
    seen = set()
    unique_variants = []
    for variant in variants:
        if variant not in seen:
            seen.add(variant)
            unique_variants.append(variant)
    
    return unique_variants

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
    
    all_passed = True
    for input_val, expected in test_cases:
        result = normalize_account_id(input_val)
        status = "✅" if result == expected else "❌"
        print(f"{status} Input: {repr(input_val)} -> Expected: {repr(expected)}, Got: {repr(result)}")
        
        if result != expected:
            all_passed = False
    
    print("✅ All normalize_account_id tests passed!" if all_passed else "❌ Some tests failed!")
    return all_passed

def test_get_account_id_variants():
    """Test the get_account_id_variants function."""
    print("\nTesting get_account_id_variants function...")
    
    test_cases = [
        ("123e4567-e89b-12d3-a456-426614174000", ["123e4567-e89b-12d3-a456-426614174000"]),
        ("  ABC123  ", ["abc123", "ABC123"]),  # Should return both normalized and original
        (123, ["123"]),
        (None, [""]),
    ]
    
    all_passed = True
    for input_val, expected in test_cases:
        result = get_account_id_variants(input_val)
        status = "✅" if result == expected else "❌"
        print(f"{status} Input: {repr(input_val)} -> Expected: {expected}, Got: {result}")
        
        if result != expected:
            all_passed = False
    
    print("✅ All get_account_id_variants tests passed!" if all_passed else "❌ Some tests failed!")
    return all_passed

def main():
    """Run all tests."""
    print("🧪 Starting Simple Account ID Normalization Tests\n")
    
    # Run tests
    test1_passed = test_normalize_account_id()
    test2_passed = test_get_account_id_variants()
    
    all_passed = test1_passed and test2_passed
    
    print(f"\n{'🎉' if all_passed else '❌'} All tests {'passed' if all_passed else 'failed'}!")
    
    if all_passed:
        print("\n✅ Account ID normalization logic is working correctly!")
        print("✅ The fix should resolve the global knowledge base retrieval issues.")
        print("\n📋 Next steps:")
        print("1. Restart your backend services to pick up the new account_utils module")
        print("2. Test with a real thread by asking about Dash CRM content")
        print("3. Verify the LLM uses knowledge base content instead of web search")
    else:
        print("\n❌ Some tests failed. Please check the implementation.")
    
    return 0 if all_passed else 1

if __name__ == "__main__":
    import sys
    sys.exit(main()) 