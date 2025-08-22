#!/usr/bin/env python3
"""
Debug script for company profile extraction
"""

import asyncio
import os
import sys
import httpx
import json
import re
from typing import Any, Dict, Optional

# Add backend to path
sys.path.append('backend')

from backend.utils.logger import logger
from backend.agent.prompts import _call_tavily_json, _fetch_company_pages, _extract_profile_from_html

async def test_tavily_api():
    """Test Tavily API directly"""
    print("=== Testing Tavily API ===")
    
    # Check if API key is set
    api_key = os.getenv("TAVILY_API_KEY")
    if not api_key:
        print("❌ TAVILY_API_KEY not set")
        return False
    
    print("✅ TAVILY_API_KEY is set")
    
    # Test URL
    test_url = "https://he2.ai"
    test_name = "Neural Arc Inc"
    
    query = (
        "Extract company details for " + test_name + " (" + test_url + ").\n\n"
        "Return ONLY valid JSON with these keys:\n\n"
        "{\n"
        '  "company_description": "Brief overview of the company (if not available, use \'description\' key)",\n'
        '  "services": ["List of services"],\n'
        '  "products": ["List of products"]\n'
        "}\n\n"
        "Rules:\n"
        "- Always provide \"company_description\". If website/meta info is missing, infer from trusted sources.\n"
        "- If you only find 'description', still map it to \"company_description\".\n"
        "- For services/products: check /services, /solutions, /products, /offerings, /what-we-do.\n"
        "- If not found, return empty arrays but do not skip the keys."
    )
    
    try:
        print(f"Query: {query}")
        data = await _call_tavily_json(query)
        print(f"✅ Tavily response: {json.dumps(data, indent=2)}")
        return True
    except Exception as e:
        print(f"❌ Tavily API failed: {e}")
        return False

async def test_direct_scraping():
    """Test direct scraping"""
    print("\n=== Testing Direct Scraping ===")
    
    test_url = "https://he2.ai"
    
    try:
        # Test fetching pages
        print(f"Fetching pages from {test_url}")
        pages = await _fetch_company_pages(test_url)
        print(f"✅ Fetched pages: {list(pages.keys())}")
        
        # Test extraction from main page
        if "main" in pages:
            main_html = pages["main"]
            print(f"Main page HTML length: {len(main_html)}")
            
            description, services, products = _extract_profile_from_html(main_html)
            print(f"✅ Extracted - description: '{description[:100]}...'")
            print(f"✅ Services: {services}")
            print(f"✅ Products: {products}")
            return True
        else:
            print("❌ No main page fetched")
            return False
            
    except Exception as e:
        print(f"❌ Direct scraping failed: {e}")
        return False

async def test_simple_http():
    """Test simple HTTP request"""
    print("\n=== Testing Simple HTTP ===")
    
    test_url = "https://he2.ai"
    
    try:
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            resp = await client.get(test_url)
            print(f"✅ HTTP Status: {resp.status_code}")
            print(f"✅ Content length: {len(resp.text)}")
            
            # Check for meta description
            html = resp.text
            meta_desc = re.search(
                r"<meta[^>]+name=[\"']description[\"'][^>]+content=[\"']([^\"']+)[\"']",
                html,
                flags=re.IGNORECASE,
            )
            if meta_desc:
                print(f"✅ Meta description found: {meta_desc.group(1)}")
            else:
                print("❌ No meta description found")
                
            # Check for title
            title_match = re.search(r"<title[^>]*>([^<]+)</title>", html, flags=re.IGNORECASE)
            if title_match:
                print(f"✅ Title found: {title_match.group(1)}")
            else:
                print("❌ No title found")
                
            return True
            
    except Exception as e:
        print(f"❌ HTTP request failed: {e}")
        return False

async def main():
    """Main debug function"""
    print("🔍 Debugging Company Profile Extraction")
    print("=" * 50)
    
    # Test 1: Simple HTTP
    await test_simple_http()
    
    # Test 2: Tavily API
    tavily_success = await test_tavily_api()
    
    # Test 3: Direct scraping
    scraping_success = await test_direct_scraping()
    
    print("\n" + "=" * 50)
    print("📊 Summary:")
    print(f"Tavily API: {'✅ Working' if tavily_success else '❌ Failed'}")
    print(f"Direct Scraping: {'✅ Working' if scraping_success else '❌ Failed'}")
    
    if not tavily_success and not scraping_success:
        print("\n🚨 Both methods failed! This explains why you're getting 'Description currently unavailable'")
    elif not tavily_success:
        print("\n⚠️ Tavily API failed, but direct scraping works. Check your TAVILY_API_KEY")
    else:
        print("\n✅ Both methods working. Check the logs for more details.")

if __name__ == "__main__":
    asyncio.run(main())
