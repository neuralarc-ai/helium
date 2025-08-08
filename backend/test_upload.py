#!/usr/bin/env python3
"""
Test script to check the global knowledge base upload endpoint
"""

import asyncio
import aiohttp
import json
import os
from pathlib import Path

async def test_upload_endpoint():
    """Test the upload endpoint directly"""
    
    # Create a simple test file
    test_content = "This is a test file for the global knowledge base upload."
    test_file_path = "test_upload.txt"
    
    with open(test_file_path, "w") as f:
        f.write(test_content)
    
    try:
        # Test the endpoint
        url = "http://localhost:8000/api/knowledge-base/global/upload-file"
        
        # You'll need to get a valid JWT token from your frontend
        # For now, we'll test without authentication to see the error
        headers = {
            "Content-Type": "multipart/form-data"
        }
        
        data = aiohttp.FormData()
        data.add_field('file', 
                      open(test_file_path, 'rb'),
                      filename='test_upload.txt',
                      content_type='text/plain')
        
        async with aiohttp.ClientSession() as session:
            async with session.post(url, data=data) as response:
                print(f"Status: {response.status}")
                print(f"Headers: {dict(response.headers)}")
                
                try:
                    response_text = await response.text()
                    print(f"Response: {response_text}")
                except Exception as e:
                    print(f"Error reading response: {e}")
                    
    except Exception as e:
        print(f"Error testing upload: {e}")
    finally:
        # Clean up test file
        if os.path.exists(test_file_path):
            os.remove(test_file_path)

if __name__ == "__main__":
    asyncio.run(test_upload_endpoint())
