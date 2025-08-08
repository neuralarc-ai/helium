#!/usr/bin/env python3
"""
Test script to verify CSV processing in the knowledge base
"""

import asyncio
import sys
import os
from pathlib import Path

# Add the current directory to the path
sys.path.append(str(Path(__file__).parent))

async def test_csv_processing():
    """Test CSV processing functionality"""
    try:
        from knowledge_base.file_processor import FileProcessor
        
        print("✅ Successfully imported FileProcessor")
        
        # Create a sample CSV content
        sample_csv_content = """Name,Email,Phone,Company
John Doe,john@example.com,123-456-7890,Acme Corp
Jane Smith,jane@example.com,098-765-4321,Tech Inc
Bob Johnson,bob@example.com,555-123-4567,Startup LLC"""
        
        # Convert to bytes
        csv_bytes = sample_csv_content.encode('utf-8')
        
        # Create FileProcessor instance
        processor = FileProcessor()
        print("✅ FileProcessor instance created")
        
        # Test CSV extraction
        print("Testing CSV content extraction...")
        extracted_content = processor._extract_csv_content(csv_bytes)
        
        print(f"✅ CSV extraction successful")
        print(f"Extracted content length: {len(extracted_content)} characters")
        print(f"First 500 characters of extracted content:")
        print("-" * 50)
        print(extracted_content[:500])
        print("-" * 50)
        
        # Test the full file processing
        print("\nTesting full file processing...")
        result = await processor.process_global_file_upload(
            account_id="test-account-id",
            file_content=csv_bytes,
            filename="test_leads.csv",
            mime_type="text/csv"
        )
        
        print(f"✅ File processing result: {result}")
        
        if result['success']:
            print(f"✅ Successfully processed CSV file")
            print(f"Entry ID: {result.get('entry_id', 'N/A')}")
            print(f"Content length: {result.get('content_length', 'N/A')}")
            print(f"Extraction method: {result.get('extraction_method', 'N/A')}")
        else:
            print(f"❌ Failed to process CSV file: {result.get('error', 'Unknown error')}")
        
    except Exception as e:
        print(f"❌ Error testing CSV processing: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_csv_processing()) 