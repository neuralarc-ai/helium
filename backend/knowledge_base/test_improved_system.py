#!/usr/bin/env python3
"""
Test Script for Improved Knowledge Base System
==============================================

This script demonstrates the key features of the improved knowledge base system.
Run this to test the data block architecture and intelligent retrieval.
"""

import asyncio
import tempfile
import os
from pathlib import Path
import pandas as pd

# Import the improved system
from improved_integration import improved_kb_manager

def create_sample_csv():
    """Create a sample CSV file for testing."""
    # Sample budget data
    data = {
        'department': ['Retail Banking', 'Retail Banking', 'Retail Banking', 'Retail Banking',
                      'Commercial Banking', 'Commercial Banking', 'Commercial Banking', 'Commercial Banking',
                      'Investment Banking', 'Investment Banking', 'Investment Banking', 'Investment Banking'],
        'year': [2023, 2023, 2023, 2023, 2023, 2023, 2023, 2023, 2023, 2023, 2023, 2023],
        'quarter': [1, 2, 3, 4, 1, 2, 3, 4, 1, 2, 3, 4],
        'budget': [1000000, 1100000, 1200000, 1300000, 2000000, 2100000, 2200000, 2300000, 1500000, 1600000, 1700000, 1800000],
        'actual': [950000, 1050000, 1180000, 1280000, 2100000, 2080000, 2250000, 2320000, 1450000, 1580000, 1680000, 1820000]
    }
    
    df = pd.DataFrame(data)
    
    # Create temporary CSV file
    temp_file = tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False)
    df.to_csv(temp_file.name, index=False)
    temp_file.close()
    
    return temp_file.name, df

async def test_improved_ingestion():
    """Test the improved ingestion pipeline."""
    print("🧪 Testing Improved Ingestion Pipeline")
    print("=" * 50)
    
    # Create sample CSV
    csv_path, df = create_sample_csv()
    
    try:
        # Read file content
        with open(csv_path, 'rb') as f:
            file_content = f.read()
        
        print(f"📊 Sample CSV created with {len(df)} rows")
        print(f"📁 File size: {len(file_content)} bytes")
        print(f"🏢 Departments: {', '.join(df['department'].unique())}")
        print(f"📅 Time range: {df['year'].min()}-{df['year'].max()}, Q{df['quarter'].min()}-Q{df['quarter'].max()}")
        print()
        
        # Test improved pipeline processing
        print("🔄 Processing with improved pipeline...")
        result = await improved_kb_manager.process_file_with_improved_pipeline(
            file_content=file_content,
            filename="sample_budget_data.csv",
            account_id="test_user_123",
            name="Sample Budget Analysis",
            description="Test data for improved knowledge base system"
        )
        
        if result['success']:
            print("✅ File processed successfully!")
            print(f"   Entry ID: {result['entry_id']}")
            print(f"   Method: {result['method']}")
            print(f"   Data Blocks: {result['data_blocks_created']}")
            print(f"   Quality Score: {result['quality_score']}")
            print(f"   Message: {result['message']}")
            
            # Store entry ID for further testing
            return result['entry_id']
        else:
            print("❌ Processing failed!")
            print(f"   Error: {result.get('error', 'Unknown error')}")
            return None
            
    finally:
        # Clean up temporary file
        os.unlink(csv_path)

async def test_intelligent_retrieval(entry_id):
    """Test intelligent knowledge base retrieval."""
    print("\n🧠 Testing Intelligent Retrieval")
    print("=" * 50)
    
    if not entry_id:
        print("❌ No entry ID available for testing")
        return
    
    # Test different types of queries
    test_queries = [
        "What's the budget variance for Retail Banking?",
        "Show me Q4 spending across all departments",
        "Which department has the highest budget?",
        "What are the trends in actual spending?",
        "Compare budget vs actual for Investment Banking"
    ]
    
    for i, query in enumerate(test_queries, 1):
        print(f"\n🔍 Query {i}: {query}")
        print("-" * 40)
        
        try:
            context = await improved_kb_manager.get_improved_kb_context(
                query=query,
                account_id="test_user_123",
                max_tokens=4000
            )
            
            print(f"📝 Context retrieved ({len(context)} characters)")
            print(f"📋 Preview: {context[:200]}...")
            
        except Exception as e:
            print(f"❌ Error: {e}")

async def test_data_block_search(entry_id):
    """Test data block search functionality."""
    print("\n🔍 Testing Data Block Search")
    print("=" * 50)
    
    if not entry_id:
        print("❌ No entry ID available for testing")
        return
    
    # Test search queries
    search_queries = [
        "Retail Banking",
        "budget variance",
        "Q4 2023",
        "Commercial Banking spending"
    ]
    
    for query in search_queries:
        print(f"\n🔎 Searching for: {query}")
        print("-" * 30)
        
        try:
            blocks = await improved_kb_manager.search_data_blocks(
                query=query,
                account_id="test_user_123",
                max_results=3,
                similarity_threshold=0.3
            )
            
            if blocks:
                print(f"✅ Found {len(blocks)} relevant blocks:")
                for j, block in enumerate(blocks, 1):
                    print(f"   {j}. {block.get('content_summary', 'No summary')}")
                    print(f"      Type: {block.get('block_type', 'Unknown')}")
                    print(f"      Relevance: {block.get('relevance_score', 0.0):.2f}")
            else:
                print("❌ No relevant blocks found")
                
        except Exception as e:
            print(f"❌ Error: {e}")

async def test_data_block_retrieval(entry_id):
    """Test retrieving data blocks for a specific entry."""
    print("\n📦 Testing Data Block Retrieval")
    print("=" * 50)
    
    if not entry_id:
        print("❌ No entry ID available for testing")
        return
    
    try:
        # Get all data blocks
        print("📊 Retrieving all data blocks...")
        all_blocks = await improved_kb_manager.get_data_blocks_for_entry(
            entry_id=entry_id,
            min_importance=0.0
        )
        
        if all_blocks:
            print(f"✅ Found {len(all_blocks)} data blocks:")
            
            # Group by block type
            block_types = {}
            for block in all_blocks:
                block_type = block.get('block_type', 'unknown')
                if block_type not in block_types:
                    block_types[block_type] = []
                block_types[block_type].append(block)
            
            for block_type, blocks in block_types.items():
                print(f"   📋 {block_type}: {len(blocks)} blocks")
                for block in blocks[:2]:  # Show first 2 of each type
                    print(f"      - {block.get('content_summary', 'No summary')}")
                    print(f"        Importance: {block.get('importance_score', 0.0):.2f}")
        else:
            print("❌ No data blocks found")
            
    except Exception as e:
        print(f"❌ Error: {e}")

async def test_file_metadata(entry_id):
    """Test file metadata retrieval."""
    print("\n📋 Testing File Metadata")
    print("=" * 50)
    
    if not entry_id:
        print("❌ No entry ID available for testing")
        return
    
    try:
        metadata = await improved_kb_manager.get_file_metadata(entry_id)
        
        if metadata:
            print("✅ File metadata retrieved:")
            print(f"   📁 File type: {metadata.get('file_type', 'Unknown')}")
            print(f"   📊 Data categories: {metadata.get('data_categories', [])}")
            print(f"   🎯 Quality score: {metadata.get('data_quality_score', 0.0)}")
            
            if metadata.get('file_type') == 'csv':
                print(f"   📈 CSV columns: {len(metadata.get('csv_columns', []))}")
                print(f"   📊 Row count: {metadata.get('csv_row_count', 0)}")
                print(f"   🕒 Time periods: {metadata.get('time_periods', {})}")
                print(f"   🏷️ Key entities: {metadata.get('key_entities', [])[:5]}...")
        else:
            print("❌ No metadata found")
            
    except Exception as e:
        print(f"❌ Error: {e}")

async def main():
    """Main test function."""
    print("🚀 Improved Knowledge Base System - Test Suite")
    print("=" * 60)
    print()
    
    # Check if improved pipeline is available
    if not improved_kb_manager.improved_pipeline:
        print("❌ Improved pipeline not available!")
        print("   Make sure DATABASE_URL is set and database is accessible")
        return
    
    print("✅ Improved pipeline initialized successfully")
    print()
    
    # Run tests
    entry_id = await test_improved_ingestion()
    
    if entry_id:
        await test_file_metadata(entry_id)
        await test_data_block_retrieval(entry_id)
        await test_intelligent_retrieval(entry_id)
        await test_data_block_search(entry_id)
    
    print("\n🎉 Test suite completed!")
    print("=" * 60)

if __name__ == "__main__":
    # Run the test suite
    asyncio.run(main())
