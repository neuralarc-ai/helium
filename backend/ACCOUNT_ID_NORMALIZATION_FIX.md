# Account ID Normalization Fix

## Problem Summary

The global knowledge base was failing to retrieve entries for certain threads due to inconsistent account ID handling between storage and retrieval operations. This caused the LLM to perform web searches instead of using available knowledge base content.

## Root Cause

1. **Inconsistent Account ID Formats**: Account IDs were being stored and retrieved in different formats (UUID vs VARCHAR, with/without whitespace, different cases)
2. **Multiple Storage Patterns**: Different parts of the system used different account ID formats
3. **No Unified Handling**: No consistent approach to account ID normalization across the application

## Solution Implemented

### 1. Created Account ID Utilities (`backend/utils/account_utils.py`)

```python
def normalize_account_id(account_id: Union[str, int, None]) -> str:
    """
    Normalize an account ID to a consistent string format.
    - Converts to string
    - Trims whitespace
    - Converts to lowercase
    """
    if account_id is None:
        return ""
    
    normalized = str(account_id).strip().lower()
    return normalized

def get_account_id_variants(account_id: Union[str, int, None]) -> list[str]:
    """
    Get all possible variants of an account ID for flexible matching.
    Returns both normalized and original formats for backward compatibility.
    """
```

### 2. Updated Knowledge Base API (`backend/knowledge_base/api.py`)

- **Storage**: All new entries use `normalize_account_id_for_storage()`
- **Retrieval**: All queries use `get_account_id_variants()` for flexible matching
- **Consistent Handling**: All endpoints now use the same account ID normalization logic

### 3. Updated Agent Runtime (`backend/agent/run.py`)

- **PromptManager**: Now uses normalized account IDs for global knowledge base lookups
- **Flexible Matching**: Uses account ID variants to find entries regardless of format
- **Enhanced Logging**: Better debugging information for account ID handling

### 4. Updated Database Function (`backend/supabase/migrations/20250808000000_fix_account_id_normalization.sql`)

```sql
-- Updated get_combined_knowledge_base_context function
-- Now uses normalized account IDs and multiple variants for matching

CREATE OR REPLACE FUNCTION get_combined_knowledge_base_context(
    p_thread_id UUID,
    p_agent_id UUID DEFAULT NULL,
    p_max_tokens INTEGER DEFAULT 4000
)
RETURNS TEXT
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
    -- ... existing variables ...
    normalized_account_id VARCHAR(255);
    account_id_variants TEXT[];
BEGIN
    -- ... existing logic ...
    
    -- Normalize the account_id for consistent handling
    normalized_account_id := LOWER(TRIM(thread_account_id::TEXT));
    
    -- Create account_id variants for flexible matching
    account_id_variants := ARRAY[
        normalized_account_id,
        thread_account_id::TEXT,
        TRIM(thread_account_id::TEXT)
    ];
    
    -- Try to find global knowledge base entries with multiple account_id formats
    FOR entry_record IN
        SELECT name, description, content, content_tokens
        FROM global_knowledge_base_entries
        WHERE account_id = ANY(account_id_variants)
        AND is_active = TRUE
        AND usage_context IN ('always', 'contextual')
        ORDER BY created_at DESC
    LOOP
        -- ... existing content processing ...
    END LOOP;
    
    -- ... rest of function ...
END;
$$;
```

## Key Benefits

### 1. **Unified Account ID Handling**
- All account IDs are normalized to lowercase, trimmed strings
- Consistent format across storage and retrieval operations
- Backward compatibility with existing data

### 2. **Flexible Matching**
- Multiple account ID variants are checked during retrieval
- Handles different formats (UUID, VARCHAR, with/without whitespace)
- Ensures no entries are missed due to format differences

### 3. **Enhanced Debugging**
- Better logging for account ID operations
- Clear visibility into normalization process
- Easier troubleshooting of account ID issues

### 4. **Improved Reliability**
- Reduces web search fallbacks when knowledge base content exists
- More consistent user experience
- Better performance (fewer unnecessary web searches)

## Testing

### 1. Unit Tests (`backend/test_account_id_normalization.py`)

```bash
cd backend
python test_account_id_normalization.py
```

Tests cover:
- Account ID normalization with various inputs
- Account ID variant generation
- Storage and retrieval functions
- Database integration

### 2. Manual Testing

1. **Upload a file to global knowledge base**
2. **Ask a question in a thread** about the uploaded content
3. **Verify the LLM uses knowledge base content** instead of web search

## Migration Steps

### 1. Apply Database Migration

```bash
# Run the new migration
supabase db push
```

### 2. Restart Backend Services

```bash
# Restart the backend to pick up the new account_utils module
docker-compose restart backend
```

### 3. Test the Fix

1. Upload a test file to global knowledge base
2. Create a new thread
3. Ask a question about the uploaded content
4. Verify the LLM responds using knowledge base content

## Monitoring

### Key Metrics to Watch

1. **Knowledge Base Hit Rate**: Percentage of queries that use KB content vs web search
2. **Account ID Mismatches**: Log entries showing account ID normalization
3. **User Satisfaction**: Reduced complaints about missing context

### Log Messages to Monitor

```
INFO: Normalized account_id: 123e4567-e89b-12d3-a456-426614174000
INFO: Account ID variants: ['123e4567-e89b-12d3-a456-426614174000', '123e4567-e89b-12d3-a456-426614174000']
INFO: Found 2 global knowledge base entries for account 123e4567-e89b-12d3-a456-426614174000
```

## Rollback Plan

If issues arise, the fix can be rolled back by:

1. **Revert Database Function**: Run the previous version of `get_combined_knowledge_base_context`
2. **Revert Code Changes**: Remove the account_utils imports and usage
3. **Restart Services**: Restart backend to clear any cached changes

## Future Improvements

1. **Data Migration**: Normalize existing account IDs in the database
2. **Performance Optimization**: Add indexes for normalized account IDs
3. **Monitoring**: Add metrics for account ID normalization success rates
4. **Documentation**: Update API documentation to reflect the new behavior 