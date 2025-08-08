#!/usr/bin/env python3
"""
Test script to check file processing functionality
"""

import asyncio
import sys
from pathlib import Path

# Add the backend directory to the path
sys.path.append(str(Path(__file__).parent))

from knowledge_base.file_processor import FileProcessor

async def test_file_processing():
    """Test file processing functionality"""
    
    try:
        print("Testing file processing...")
        
        # Create a test PDF content (simplified)
        test_pdf_content = b"%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n/Contents 4 0 R\n>>\nendobj\n4 0 obj\n<<\n/Length 44\n>>\nstream\nBT\n/F1 12 Tf\n72 720 Td\n(Test PDF Content) Tj\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000204 00000 n \ntrailer\n<<\n/Size 5\n/Root 1 0 R\n>>\nstartxref\n364\n%%EOF"
        
        processor = FileProcessor()
        print("✅ FileProcessor initialized")
        
        # Test PDF processing
        print("Testing PDF processing...")
        result = await processor.process_global_file_upload(
            account_id="test-user-123",
            file_content=test_pdf_content,
            filename="test.pdf",
            mime_type="application/pdf"
        )
        
        print(f"PDF processing result: {result}")
        
        if result['success']:
            print("✅ PDF processing successful")
        else:
            print(f"❌ PDF processing failed: {result.get('error', 'Unknown error')}")
            
    except Exception as e:
        print(f"❌ File processing test failed: {e}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")

if __name__ == "__main__":
    asyncio.run(test_file_processing())
