#!/usr/bin/env python3
"""
Simple test for CSV processing without external dependencies
"""

def test_csv_extraction():
    """Test CSV extraction logic"""
    
    # Sample CSV content
    sample_csv_content = """Name,Email,Phone,Company
John Doe,john@example.com,123-456-7890,Acme Corp
Jane Smith,jane@example.com,098-765-4321,Tech Inc
Bob Johnson,bob@example.com,555-123-4567,Startup LLC"""
    
    # Convert to bytes
    csv_bytes = sample_csv_content.encode('utf-8')
    
    # Simulate the CSV extraction logic
    try:
        # Use utf-8 encoding directly
        raw_text = csv_bytes.decode('utf-8')
        
        # Split the content into lines
        lines = raw_text.splitlines()
        
        # Process the CSV content to make it more readable
        processed_lines = []
        
        # Add a header to indicate this is CSV content
        processed_lines.append("=== CSV FILE CONTENT ===")
        processed_lines.append("")
        
        for i, line in enumerate(lines):
            if i == 0:
                # First line is usually headers
                processed_lines.append(f"COLUMN HEADERS: {line}")
                processed_lines.append("")
            else:
                # Data rows - limit to first 100 rows to avoid overwhelming the context
                if i <= 100:
                    processed_lines.append(f"Row {i}: {line}")
                elif i == 101:
                    processed_lines.append(f"... (showing first 100 rows, total {len(lines)-1} data rows)")
                    break
        
        # Add summary information
        processed_lines.append("")
        processed_lines.append(f"=== SUMMARY ===")
        processed_lines.append(f"Total rows: {len(lines)}")
        processed_lines.append(f"Total columns: {len(lines[0].split(',')) if lines else 0}")
        processed_lines.append(f"Data rows: {len(lines) - 1 if len(lines) > 1 else 0}")
        
        # Combine lines into a single string
        combined_text = '\n'.join(processed_lines)
        
        print("✅ CSV extraction successful")
        print(f"Extracted content length: {len(combined_text)} characters")
        print(f"First 500 characters of extracted content:")
        print("-" * 50)
        print(combined_text[:500])
        print("-" * 50)
        
        return True
        
    except Exception as e:
        print(f"❌ Error testing CSV processing: {str(e)}")
        return False

if __name__ == "__main__":
    success = test_csv_extraction()
    if success:
        print("\n✅ CSV processing test passed!")
    else:
        print("\n❌ CSV processing test failed!") 