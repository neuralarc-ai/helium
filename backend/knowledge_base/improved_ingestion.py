"""
Improved Knowledge Base Ingestion Pipeline
==========================================

This module implements a comprehensive ingestion pipeline that processes uploaded files
(CSV, PDF, DOCX, etc.) into structured data blocks for effective RAG retrieval.

Key Features:
- Intelligent file parsing and content extraction
- Data block creation with rich metadata
- Embedding generation for semantic search
- Relationship detection and mapping
- Quality scoring and validation
"""

import os
import json
import uuid
import pandas as pd
import numpy as np
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime
import logging
from dataclasses import dataclass, asdict
import hashlib
import re
from pathlib import Path

# Database and ML imports
import psycopg2
from psycopg2.extras import RealDictCursor, Json
import openai
from sentence_transformers import SentenceTransformer

# File processing imports
import PyPDF2
import docx
from openpyxl import load_workbook
import csv
from io import StringIO, BytesIO

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class DataBlock:
    """Represents a single data block with content and metadata."""
    block_id: str
    entry_id: str
    block_type: str
    block_index: int
    content: str
    content_summary: str
    metadata: Dict[str, Any]
    categories: List[str]
    entities: List[str]
    importance_score: float
    context_before: Optional[str] = None
    context_after: Optional[str] = None
    parent_block_id: Optional[str] = None

@dataclass
class FileMetadata:
    """Represents file-level metadata."""
    entry_id: str
    file_type: str
    file_size_bytes: int
    original_filename: str
    csv_columns: Optional[List[Dict]] = None
    csv_row_count: Optional[int] = None
    csv_delimiter: Optional[str] = None
    csv_has_header: Optional[bool] = None
    pdf_page_count: Optional[int] = None
    pdf_has_images: Optional[bool] = None
    pdf_has_tables: Optional[bool] = None
    data_categories: Optional[List[str]] = None
    time_periods: Optional[Dict[str, Any]] = None
    key_entities: Optional[List[str]] = None
    data_quality_score: Optional[float] = None

class EmbeddingGenerator:
    """Handles embedding generation for content and queries."""
    
    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        self.model = SentenceTransformer(model_name)
        self.openai_client = openai.OpenAI()
    
    def generate_embedding(self, text: str, use_openai: bool = True) -> List[float]:
        """Generate embedding for given text."""
        try:
            if use_openai:
                response = self.openai_client.embeddings.create(
                    model="text-embedding-ada-002",
                    input=text
                )
                return response.data[0].embedding
            else:
                # Fallback to sentence transformers
                embedding = self.model.encode(text)
                return embedding.tolist()
        except Exception as e:
            logger.error(f"Error generating embedding: {e}")
            # Return zero vector as fallback
            return [0.0] * 1536

class CSVProcessor:
    """Processes CSV files into structured data blocks."""
    
    def __init__(self, embedding_generator: EmbeddingGenerator):
        self.embedding_generator = embedding_generator
    
    def process_csv(self, file_path: str, entry_id: str) -> Tuple[FileMetadata, List[DataBlock]]:
        """Process a CSV file and return metadata and data blocks."""
        logger.info(f"Processing CSV file: {file_path}")
        
        # Read CSV file
        df = pd.read_csv(file_path)
        file_size = os.path.getsize(file_path)
        filename = os.path.basename(file_path)
        
        # Analyze CSV structure
        columns_info = self._analyze_columns(df)
        data_categories = self._extract_categories(df, columns_info)
        time_periods = self._extract_time_periods(df, columns_info)
        key_entities = self._extract_entities(df, columns_info)
        
        # Create file metadata
        file_metadata = FileMetadata(
            entry_id=entry_id,
            file_type="csv",
            file_size_bytes=file_size,
            original_filename=filename,
            csv_columns=columns_info,
            csv_row_count=len(df),
            csv_delimiter=",",  # Could be detected
            csv_has_header=True,
            data_categories=data_categories,
            time_periods=time_periods,
            key_entities=key_entities,
            data_quality_score=self._calculate_quality_score(df)
        )
        
        # Create data blocks
        data_blocks = self._create_csv_blocks(df, entry_id, columns_info, data_categories)
        
        return file_metadata, data_blocks
    
    def _analyze_columns(self, df: pd.DataFrame) -> List[Dict]:
        """Analyze CSV columns and their characteristics."""
        columns_info = []
        
        for col in df.columns:
            col_data = df[col].dropna()
            
            # Determine data type
            if pd.api.types.is_numeric_dtype(col_data):
                data_type = "numeric"
            elif pd.api.types.is_datetime64_any_dtype(col_data):
                data_type = "datetime"
            else:
                data_type = "text"
            
            # Get sample values
            sample_values = col_data.head(5).tolist()
            
            # Calculate statistics
            unique_count = col_data.nunique()
            null_count = df[col].isnull().sum()
            
            columns_info.append({
                "name": col,
                "type": data_type,
                "sample_values": sample_values,
                "unique_count": unique_count,
                "null_count": null_count,
                "total_count": len(df)
            })
        
        return columns_info
    
    def _extract_categories(self, df: pd.DataFrame, columns_info: List[Dict]) -> List[str]:
        """Extract data categories from the CSV."""
        categories = []
        
        # Look for common business categories in column names
        business_categories = {
            'financial': ['budget', 'amount', 'cost', 'revenue', 'expense', 'price'],
            'temporal': ['date', 'time', 'year', 'month', 'quarter'],
            'organizational': ['department', 'division', 'team', 'employee'],
            'operational': ['status', 'type', 'category', 'classification']
        }
        
        column_names = [col['name'].lower() for col in columns_info]
        
        for category, keywords in business_categories.items():
            if any(keyword in ' '.join(column_names) for keyword in keywords):
                categories.append(category)
        
        return categories
    
    def _extract_time_periods(self, df: pd.DataFrame, columns_info: List[Dict]) -> Dict[str, Any]:
        """Extract time period information from the CSV."""
        time_info = {}
        
        # Look for date/time columns
        date_columns = [col for col in columns_info if col['type'] == 'datetime' or 
                       any(keyword in col['name'].lower() for keyword in ['date', 'time', 'year'])]
        
        if date_columns:
            # Try to find date range
            for col_info in date_columns:
                col_name = col_info['name']
                if col_name in df.columns:
                    try:
                        dates = pd.to_datetime(df[col_name], errors='coerce').dropna()
                        if not dates.empty:
                            time_info['start'] = dates.min().isoformat()
                            time_info['end'] = dates.max().isoformat()
                            time_info['granularity'] = self._detect_granularity(dates)
                            break
                    except:
                        continue
        
        # Look for year/quarter columns
        if 'year' in df.columns and 'quarter' in df.columns:
            years = df['year'].dropna().unique()
            quarters = df['quarter'].dropna().unique()
            time_info['years'] = sorted(years.tolist())
            time_info['quarters'] = sorted(quarters.tolist())
            time_info['granularity'] = 'quarterly'
        
        return time_info
    
    def _detect_granularity(self, dates: pd.Series) -> str:
        """Detect the granularity of date data."""
        date_diffs = dates.diff().dropna()
        avg_diff = date_diffs.mean()
        
        if avg_diff.days <= 1:
            return 'daily'
        elif avg_diff.days <= 7:
            return 'weekly'
        elif avg_diff.days <= 31:
            return 'monthly'
        elif avg_diff.days <= 93:
            return 'quarterly'
        else:
            return 'yearly'
    
    def _extract_entities(self, df: pd.DataFrame, columns_info: List[Dict]) -> List[str]:
        """Extract key entities from the CSV data."""
        entities = []
        
        # Look for categorical columns with reasonable number of unique values
        for col_info in columns_info:
            col_name = col_info['name']
            if (col_info['type'] == 'text' and 
                col_info['unique_count'] < 50 and 
                col_info['unique_count'] > 1):
                
                # Get top values from this column
                top_values = df[col_name].value_counts().head(10).index.tolist()
                entities.extend([str(val) for val in top_values])
        
        return list(set(entities))  # Remove duplicates
    
    def _calculate_quality_score(self, df: pd.DataFrame) -> float:
        """Calculate a data quality score for the CSV."""
        total_cells = df.size
        null_cells = df.isnull().sum().sum()
        
        # Basic completeness score
        completeness = 1 - (null_cells / total_cells) if total_cells > 0 else 0
        
        # Consistency score (simplified)
        consistency = 0.8  # Placeholder - could implement more sophisticated checks
        
        # Overall quality score
        quality_score = (completeness * 0.6) + (consistency * 0.4)
        
        return round(quality_score, 2)
    
    def _create_csv_blocks(self, df: pd.DataFrame, entry_id: str, 
                          columns_info: List[Dict], categories: List[str]) -> List[DataBlock]:
        """Create data blocks from CSV data."""
        blocks = []
        
        # Strategy 1: Create blocks by grouping similar rows
        blocks.extend(self._create_grouped_blocks(df, entry_id, columns_info, categories))
        
        # Strategy 2: Create summary blocks
        blocks.extend(self._create_summary_blocks(df, entry_id, columns_info, categories))
        
        # Strategy 3: Create metric analysis blocks
        blocks.extend(self._create_analysis_blocks(df, entry_id, columns_info, categories))
        
        return blocks
    
    def _create_grouped_blocks(self, df: pd.DataFrame, entry_id: str, 
                              columns_info: List[Dict], categories: List[str]) -> List[DataBlock]:
        """Create blocks by grouping related rows."""
        blocks = []
        
        # Find good grouping columns
        grouping_cols = self._find_grouping_columns(df, columns_info)
        
        if not grouping_cols:
            # If no good grouping columns, create blocks by row ranges
            return self._create_range_blocks(df, entry_id, categories)
        
        # Group by the identified columns
        for i, (group_key, group_df) in enumerate(df.groupby(grouping_cols)):
            if len(group_df) == 0:
                continue
            
            # Create content for this group
            content = self._format_group_content(group_df, grouping_cols, group_key)
            
            # Create metadata for this group
            metadata = self._create_group_metadata(group_df, grouping_cols, group_key, columns_info)
            
            # Extract entities from this group
            entities = self._extract_group_entities(group_df, columns_info)
            
            # Calculate importance score
            importance_score = self._calculate_block_importance(group_df, df)
            
            block = DataBlock(
                block_id=str(uuid.uuid4()),
                entry_id=entry_id,
                block_type="row_group",
                block_index=i,
                content=content,
                content_summary=f"Data group: {group_key}",
                metadata=metadata,
                categories=categories + ["data_group"],
                entities=entities,
                importance_score=importance_score
            )
            
            blocks.append(block)
        
        return blocks
    
    def _find_grouping_columns(self, df: pd.DataFrame, columns_info: List[Dict]) -> List[str]:
        """Find the best columns for grouping data."""
        grouping_cols = []
        
        # Look for categorical columns with reasonable cardinality
        for col_info in columns_info:
            col_name = col_info['name']
            unique_count = col_info['unique_count']
            
            # Good grouping columns have 2-20 unique values
            if 2 <= unique_count <= 20 and col_info['type'] == 'text':
                grouping_cols.append(col_name)
        
        # Prioritize common business grouping columns
        priority_keywords = ['department', 'category', 'type', 'status', 'year', 'quarter']
        priority_cols = []
        
        for col in grouping_cols:
            if any(keyword in col.lower() for keyword in priority_keywords):
                priority_cols.append(col)
        
        # Return priority columns first, then others, but limit to 2-3 columns
        result = priority_cols + [col for col in grouping_cols if col not in priority_cols]
        return result[:3]
    
    def _create_range_blocks(self, df: pd.DataFrame, entry_id: str, categories: List[str]) -> List[DataBlock]:
        """Create blocks by splitting data into ranges when no good grouping exists."""
        blocks = []
        block_size = 50  # Rows per block
        
        for i in range(0, len(df), block_size):
            end_idx = min(i + block_size, len(df))
            block_df = df.iloc[i:end_idx]
            
            content = block_df.to_csv(index=False)
            
            metadata = {
                "row_range": {"start": i, "end": end_idx - 1},
                "row_count": len(block_df)
            }
            
            block = DataBlock(
                block_id=str(uuid.uuid4()),
                entry_id=entry_id,
                block_type="row_range",
                block_index=i // block_size,
                content=content,
                content_summary=f"Rows {i} to {end_idx - 1}",
                metadata=metadata,
                categories=categories + ["data_range"],
                entities=[],
                importance_score=0.5
            )
            
            blocks.append(block)
        
        return blocks
    
    def _format_group_content(self, group_df: pd.DataFrame, grouping_cols: List[str], group_key) -> str:
        """Format the content for a data group."""
        # Create a readable representation of the group
        content_lines = []
        
        # Add group identifier
        if isinstance(group_key, tuple):
            group_desc = ", ".join([f"{col}={val}" for col, val in zip(grouping_cols, group_key)])
        else:
            group_desc = f"{grouping_cols[0]}={group_key}"
        
        content_lines.append(f"=== DATA GROUP: {group_desc} ===")
        content_lines.append("")
        
        # Add column headers
        content_lines.append("COLUMN HEADERS:")
        content_lines.append(",".join(group_df.columns))
        content_lines.append("")
        
        # Add the actual data
        content_lines.append("DATA ROWS:")
        for _, row in group_df.iterrows():
            content_lines.append(",".join([str(val) for val in row.values]))
        
        return "\n".join(content_lines)
    
    def _create_group_metadata(self, group_df: pd.DataFrame, grouping_cols: List[str], 
                              group_key, columns_info: List[Dict]) -> Dict[str, Any]:
        """Create metadata for a data group."""
        metadata = {}
        
        # Add grouping information
        if isinstance(group_key, tuple):
            for col, val in zip(grouping_cols, group_key):
                metadata[col.lower()] = val
        else:
            metadata[grouping_cols[0].lower()] = group_key
        
        # Add aggregate statistics for numeric columns
        numeric_cols = [col['name'] for col in columns_info if col['type'] == 'numeric']
        
        for col in numeric_cols:
            if col in group_df.columns:
                col_data = pd.to_numeric(group_df[col], errors='coerce').dropna()
                if not col_data.empty:
                    metadata[f"{col}_sum"] = float(col_data.sum())
                    metadata[f"{col}_avg"] = float(col_data.mean())
                    metadata[f"{col}_count"] = int(len(col_data))
        
        # Add row count
        metadata["record_count"] = len(group_df)
        
        return metadata
    
    def _extract_group_entities(self, group_df: pd.DataFrame, columns_info: List[Dict]) -> List[str]:
        """Extract entities from a specific group."""
        entities = []
        
        # Look for ID-like columns and categorical columns
        for col_info in columns_info:
            col_name = col_info['name']
            if col_name in group_df.columns:
                if ('id' in col_name.lower() or 
                    col_info['type'] == 'text' and col_info['unique_count'] < 20):
                    
                    unique_vals = group_df[col_name].dropna().unique()
                    entities.extend([str(val) for val in unique_vals])
        
        return list(set(entities))
    
    def _calculate_block_importance(self, block_df: pd.DataFrame, full_df: pd.DataFrame) -> float:
        """Calculate importance score for a data block."""
        # Base importance on relative size
        size_ratio = len(block_df) / len(full_df)
        
        # Boost importance for blocks with numeric data (likely more queryable)
        numeric_cols = block_df.select_dtypes(include=[np.number]).columns
        numeric_ratio = len(numeric_cols) / len(block_df.columns) if len(block_df.columns) > 0 else 0
        
        # Calculate final score
        importance = (size_ratio * 0.4) + (numeric_ratio * 0.6)
        
        # Ensure score is between 0.1 and 1.0
        return max(0.1, min(1.0, importance))
    
    def _create_summary_blocks(self, df: pd.DataFrame, entry_id: str, 
                              columns_info: List[Dict], categories: List[str]) -> List[DataBlock]:
        """Create summary blocks with aggregated information."""
        blocks = []
        
        # Overall summary block
        summary_content = self._create_overall_summary(df, columns_info)
        
        summary_block = DataBlock(
            block_id=str(uuid.uuid4()),
            entry_id=entry_id,
            block_type="summary",
            block_index=9999,  # High index to appear last
            content=summary_content,
            content_summary="Overall data summary and statistics",
            metadata={"summary_type": "overall", "total_rows": len(df)},
            categories=categories + ["summary"],
            entities=[],
            importance_score=0.9  # High importance for summaries
        )
        
        blocks.append(summary_block)
        
        return blocks
    
    def _create_overall_summary(self, df: pd.DataFrame, columns_info: List[Dict]) -> str:
        """Create an overall summary of the dataset."""
        lines = []
        
        lines.append("=== DATASET SUMMARY ===")
        lines.append(f"Total Rows: {len(df)}")
        lines.append(f"Total Columns: {len(df.columns)}")
        lines.append("")
        
        lines.append("COLUMN INFORMATION:")
        for col_info in columns_info:
            lines.append(f"- {col_info['name']}: {col_info['type']} "
                        f"({col_info['unique_count']} unique values)")
        lines.append("")
        
        # Numeric summaries
        numeric_cols = [col['name'] for col in columns_info if col['type'] == 'numeric']
        if numeric_cols:
            lines.append("NUMERIC SUMMARIES:")
            for col in numeric_cols:
                if col in df.columns:
                    col_data = pd.to_numeric(df[col], errors='coerce').dropna()
                    if not col_data.empty:
                        lines.append(f"- {col}: Sum={col_data.sum():.2f}, "
                                   f"Avg={col_data.mean():.2f}, "
                                   f"Min={col_data.min():.2f}, "
                                   f"Max={col_data.max():.2f}")
        
        return "\n".join(lines)
    
    def _create_analysis_blocks(self, df: pd.DataFrame, entry_id: str, 
                               columns_info: List[Dict], categories: List[str]) -> List[DataBlock]:
        """Create analysis blocks with insights and patterns."""
        blocks = []
        
        # Look for variance analysis if we have budget/actual columns
        variance_block = self._create_variance_analysis(df, entry_id, categories)
        if variance_block:
            blocks.append(variance_block)
        
        # Look for trend analysis if we have time data
        trend_block = self._create_trend_analysis(df, entry_id, categories)
        if trend_block:
            blocks.append(trend_block)
        
        return blocks
    
    def _create_variance_analysis(self, df: pd.DataFrame, entry_id: str, categories: List[str]) -> Optional[DataBlock]:
        """Create variance analysis block if budget/actual data exists."""
        # Look for budget and actual columns
        budget_cols = [col for col in df.columns if 'budget' in col.lower()]
        actual_cols = [col for col in df.columns if 'actual' in col.lower()]
        variance_cols = [col for col in df.columns if 'variance' in col.lower()]
        
        if not (budget_cols and actual_cols):
            return None
        
        # Create variance analysis content
        content_lines = []
        content_lines.append("=== VARIANCE ANALYSIS ===")
        
        # Calculate overall variance
        budget_col = budget_cols[0]
        actual_col = actual_cols[0]
        
        budget_data = pd.to_numeric(df[budget_col], errors='coerce').dropna()
        actual_data = pd.to_numeric(df[actual_col], errors='coerce').dropna()
        
        if not budget_data.empty and not actual_data.empty:
            total_budget = budget_data.sum()
            total_actual = actual_data.sum()
            total_variance = total_actual - total_budget
            variance_pct = (total_variance / total_budget * 100) if total_budget != 0 else 0
            
            content_lines.append(f"Total Budget: ${total_budget:,.2f}")
            content_lines.append(f"Total Actual: ${total_actual:,.2f}")
            content_lines.append(f"Total Variance: ${total_variance:,.2f} ({variance_pct:.1f}%)")
            content_lines.append("")
            
            # Department-level analysis if department column exists
            dept_cols = [col for col in df.columns if 'department' in col.lower()]
            if dept_cols:
                dept_col = dept_cols[0]
                content_lines.append("DEPARTMENT ANALYSIS:")
                
                dept_analysis = df.groupby(dept_col).agg({
                    budget_col: 'sum',
                    actual_col: 'sum'
                }).reset_index()
                
                dept_analysis['variance'] = dept_analysis[actual_col] - dept_analysis[budget_col]
                dept_analysis['variance_pct'] = (dept_analysis['variance'] / dept_analysis[budget_col] * 100)
                
                for _, row in dept_analysis.iterrows():
                    content_lines.append(f"- {row[dept_col]}: "
                                       f"Variance ${row['variance']:,.2f} ({row['variance_pct']:.1f}%)")
        
        metadata = {
            "analysis_type": "variance",
            "budget_column": budget_col,
            "actual_column": actual_col,
            "total_budget": float(total_budget) if 'total_budget' in locals() else 0,
            "total_actual": float(total_actual) if 'total_actual' in locals() else 0,
            "total_variance": float(total_variance) if 'total_variance' in locals() else 0
        }
        
        return DataBlock(
            block_id=str(uuid.uuid4()),
            entry_id=entry_id,
            block_type="analysis",
            block_index=10000,
            content="\n".join(content_lines),
            content_summary="Budget vs Actual variance analysis",
            metadata=metadata,
            categories=categories + ["analysis", "variance"],
            entities=[],
            importance_score=0.8
        )
    
    def _create_trend_analysis(self, df: pd.DataFrame, entry_id: str, categories: List[str]) -> Optional[DataBlock]:
        """Create trend analysis block if time-series data exists."""
        # Look for time-related columns
        time_cols = [col for col in df.columns if any(keyword in col.lower() 
                    for keyword in ['year', 'quarter', 'month', 'date'])]
        
        if not time_cols:
            return None
        
        # Simple trend analysis
        content_lines = []
        content_lines.append("=== TREND ANALYSIS ===")
        
        # If we have year and quarter columns, analyze trends
        if 'year' in df.columns and 'quarter' in df.columns:
            # Look for numeric columns to analyze trends
            numeric_cols = df.select_dtypes(include=[np.number]).columns
            
            for col in numeric_cols:
                if col not in ['year', 'quarter']:
                    trend_data = df.groupby(['year', 'quarter'])[col].sum().reset_index()
                    
                    if len(trend_data) > 1:
                        content_lines.append(f"\n{col.upper()} TRENDS:")
                        for _, row in trend_data.iterrows():
                            content_lines.append(f"- {row['year']} Q{row['quarter']}: {row[col]:,.2f}")
        
        if len(content_lines) <= 1:  # Only header
            return None
        
        metadata = {
            "analysis_type": "trend",
            "time_columns": time_cols,
            "periods_analyzed": len(df[time_cols[0]].unique()) if time_cols else 0
        }
        
        return DataBlock(
            block_id=str(uuid.uuid4()),
            entry_id=entry_id,
            block_type="analysis",
            block_index=10001,
            content="\n".join(content_lines),
            content_summary="Time-based trend analysis",
            metadata=metadata,
            categories=categories + ["analysis", "trend"],
            entities=[],
            importance_score=0.7
        )

class DatabaseManager:
    """Manages database operations for the knowledge base."""
    
    def __init__(self, connection_string: str):
        self.connection_string = connection_string
        self.embedding_generator = EmbeddingGenerator()
    
    def get_connection(self):
        """Get database connection."""
        return psycopg2.connect(self.connection_string, cursor_factory=RealDictCursor)
    
    def store_file_entry(self, account_id: str, name: str, description: str, 
                        file_type: str, file_size: int, filename: str) -> str:
        """Store main file entry and return entry_id."""
        entry_id = str(uuid.uuid4())
        
        with self.get_connection() as conn:
            with conn.cursor() as cur:
                # First try to insert into the new schema if it exists
                try:
                    cur.execute("""
                        INSERT INTO global_knowledge_base_entries 
                        (entry_id, account_id, name, description, file_type, file_size_bytes, 
                         original_filename, processing_status, usage_context, is_active, source_type)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, 'processing', 'general', true, 'file')
                    """, (entry_id, account_id, name, description, file_type, file_size, filename))
                    conn.commit()
                    return entry_id
                except Exception as e:
                    # If new schema doesn't exist, fall back to existing schema
                    logger.info(f"New schema not available, using existing schema: {e}")
                    
                    # Use existing schema with content column
                    cur.execute("""
                        INSERT INTO global_knowledge_base_entries 
                        (entry_id, account_id, name, description, content, source_type, file_size, file_mime_type)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    """, (entry_id, account_id, name, description, f"Processing file: {filename}", 'file', file_size, f"application/{file_type}"))
                    conn.commit()
                    return entry_id
    
    def store_file_metadata(self, file_metadata: FileMetadata):
        """Store file metadata."""
        try:
            with self.get_connection() as conn:
                with conn.cursor() as cur:
                    # Try to insert into new schema first
                    cur.execute("""
                        INSERT INTO kb_file_metadata 
                        (entry_id, file_type, csv_columns, csv_row_count, csv_delimiter, csv_has_header,
                         pdf_page_count, pdf_has_images, pdf_has_tables, data_categories, 
                         time_periods, key_entities, data_quality_score)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """, (
                        file_metadata.entry_id, file_metadata.file_type,
                        Json(file_metadata.csv_columns), file_metadata.csv_row_count,
                        file_metadata.csv_delimiter, file_metadata.csv_has_header,
                        file_metadata.pdf_page_count, file_metadata.pdf_has_images,
                        file_metadata.pdf_has_tables, Json(file_metadata.data_categories),
                        Json(file_metadata.time_periods), Json(file_metadata.key_entities),
                        file_metadata.data_quality_score
                    ))
                    conn.commit()
        except Exception as e:
            # If new schema doesn't exist, store metadata in source_metadata of main entry
            logger.info(f"New metadata schema not available, storing in source_metadata: {e}")
            self._store_metadata_in_source_metadata(file_metadata)
    
    def _store_metadata_in_source_metadata(self, file_metadata: FileMetadata):
        """Store metadata in the source_metadata field of the main entry."""
        try:
            with self.get_connection() as conn:
                with conn.cursor() as cur:
                    metadata_json = {
                        'file_type': file_metadata.file_type,
                        'csv_columns': file_metadata.csv_columns,
                        'csv_row_count': file_metadata.csv_row_count,
                        'data_categories': file_metadata.data_categories,
                        'time_periods': file_metadata.time_periods,
                        'key_entities': file_metadata.key_entities,
                        'data_quality_score': file_metadata.data_quality_score
                    }
                    
                    cur.execute("""
                        UPDATE global_knowledge_base_entries 
                        SET source_metadata = %s
                        WHERE entry_id = %s
                    """, (Json(metadata_json), file_metadata.entry_id))
                    conn.commit()
        except Exception as e:
            logger.error(f"Failed to store metadata in source_metadata: {e}")
    
    def store_data_blocks(self, data_blocks: List[DataBlock]):
        """Store data blocks with embeddings."""
        try:
            with self.get_connection() as conn:
                with conn.cursor() as cur:
                    # Try to insert into new schema first
                    for block in data_blocks:
                        # Generate embedding for the block content
                        embedding_text = f"{block.content_summary}\n\n{block.content}"
                        embedding = self.embedding_generator.generate_embedding(embedding_text)
                        
                        cur.execute("""
                            INSERT INTO kb_data_blocks 
                            (block_id, entry_id, block_type, block_index, content, content_tokens,
                             content_summary, embedding, metadata, categories, entities, 
                             importance_score, parent_block_id, context_before, context_after)
                            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        """, (
                            block.block_id, block.entry_id, block.block_type, block.block_index,
                            block.content, len(block.content) // 4, block.content_summary,
                            embedding, Json(block.metadata), Json(block.categories),
                            Json(block.entities), block.importance_score, block.parent_block_id,
                            block.context_before, block.context_after
                        ))
                    conn.commit()
        except Exception as e:
            # If new schema doesn't exist, store as a single entry with combined content
            logger.info(f"New data blocks schema not available, storing as combined content: {e}")
            self._store_blocks_as_combined_content(data_blocks)
    
    def _store_blocks_as_combined_content(self, data_blocks: List[DataBlock]):
        """Store data blocks as combined content in the main entry."""
        try:
            with self.get_connection() as conn:
                with conn.cursor() as cur:
                    # Combine all blocks into a single content
                    combined_content = []
                    combined_content.append("# PROCESSED FILE CONTENT")
                    combined_content.append("")
                    
                    for block in data_blocks:
                        combined_content.append(f"## {block.content_summary}")
                        combined_content.append(f"**Type**: {block.block_type}")
                        combined_content.append(f"**Categories**: {', '.join(block.categories)}")
                        if block.entities:
                            combined_content.append(f"**Entities**: {', '.join(block.entities)}")
                        combined_content.append("")
                        combined_content.append(block.content)
                        combined_content.append("")
                    
                    content_text = "\n".join(combined_content)
                    
                    # Generate embedding for the combined content
                    embedding = self.embedding_generator.generate_embedding(content_text)
                    
                    # Update the main entry with combined content
                    cur.execute("""
                        UPDATE global_knowledge_base_entries 
                        SET content = %s, embedding = %s, updated_at = NOW()
                        WHERE entry_id = %s
                    """, (content_text, embedding, data_blocks[0].entry_id))
                    conn.commit()
                    
                    logger.info(f"Stored {len(data_blocks)} blocks as combined content")
        except Exception as e:
            logger.error(f"Failed to store blocks as combined content: {e}")
    
    def update_processing_status(self, entry_id: str, status: str, error: str = None):
        """Update processing status of an entry."""
        try:
            with self.get_connection() as conn:
                with conn.cursor() as cur:
                    # Try to update in new schema first
                    try:
                        cur.execute("""
                            UPDATE global_knowledge_base_entries 
                            SET processing_status = %s, processing_error = %s, updated_at = NOW()
                            WHERE entry_id = %s
                        """, (status, error, entry_id))
                        conn.commit()
                    except Exception:
                        # If new schema doesn't exist, update existing schema
                        cur.execute("""
                            UPDATE global_knowledge_base_entries 
                            SET updated_at = NOW()
                            WHERE entry_id = %s
                        """, (entry_id,))
                        conn.commit()
        except Exception as e:
            logger.error(f"Failed to update processing status: {e}")
    
    def update_file_summary(self, entry_id: str, summary: str, total_blocks: int):
        """Update file summary and block count."""
        try:
            # Generate embedding for the summary
            embedding = self.embedding_generator.generate_embedding(summary)
            
            with self.get_connection() as conn:
                with conn.cursor() as cur:
                    # Try to update in new schema first
                    try:
                        cur.execute("""
                            UPDATE global_knowledge_base_entries 
                            SET content_summary = %s, total_data_blocks = %s, embedding = %s, updated_at = NOW()
                            WHERE entry_id = %s
                        """, (summary, total_blocks, embedding, entry_id))
                        conn.commit()
                    except Exception:
                        # If new schema doesn't exist, update existing schema
                        cur.execute("""
                            UPDATE global_knowledge_base_entries 
                            SET description = %s, embedding = %s, updated_at = NOW()
                            WHERE entry_id = %s
                        """, (summary, embedding, entry_id))
                        conn.commit()
        except Exception as e:
            logger.error(f"Failed to update file summary: {e}")

class IngestionPipeline:
    """Main ingestion pipeline that orchestrates file processing."""
    
    def __init__(self, db_connection_string: str):
        self.db_manager = DatabaseManager(db_connection_string)
        self.csv_processor = CSVProcessor(EmbeddingGenerator())
        
    def process_file(self, file_path: str, account_id: str, name: str = None, 
                    description: str = None) -> str:
        """Process a file through the complete ingestion pipeline."""
        try:
            # Determine file type and basic info
            file_extension = Path(file_path).suffix.lower()
            file_size = os.path.getsize(file_path)
            filename = os.path.basename(file_path)
            
            if not name:
                name = Path(file_path).stem
            
            # Create main entry
            entry_id = self.db_manager.store_file_entry(
                account_id=account_id,
                name=name,
                description=description or f"Uploaded file: {filename}",
                file_type=file_extension.lstrip('.'),
                file_size=file_size,
                filename=filename
            )
            
            logger.info(f"Created entry {entry_id} for file {filename}")
            
            # Process based on file type
            if file_extension == '.csv':
                file_metadata, data_blocks = self.csv_processor.process_csv(file_path, entry_id)
            else:
                raise ValueError(f"Unsupported file type: {file_extension}")
            
            # Store metadata and blocks
            self.db_manager.store_file_metadata(file_metadata)
            self.db_manager.store_data_blocks(data_blocks)
            
            # Create and store file summary
            summary = self._create_file_summary(file_metadata, data_blocks)
            self.db_manager.update_file_summary(entry_id, summary, len(data_blocks))
            
            # Update status to completed
            self.db_manager.update_processing_status(entry_id, 'completed')
            
            logger.info(f"Successfully processed file {filename} with {len(data_blocks)} blocks")
            return entry_id
            
        except Exception as e:
            logger.error(f"Error processing file {file_path}: {e}")
            if 'entry_id' in locals():
                self.db_manager.update_processing_status(entry_id, 'failed', str(e))
            raise
    
    def _create_file_summary(self, file_metadata: FileMetadata, data_blocks: List[DataBlock]) -> str:
        """Create a comprehensive summary of the processed file."""
        lines = []
        
        lines.append(f"File: {file_metadata.original_filename}")
        lines.append(f"Type: {file_metadata.file_type.upper()}")
        lines.append(f"Size: {file_metadata.file_size_bytes:,} bytes")
        
        if file_metadata.csv_row_count:
            lines.append(f"Rows: {file_metadata.csv_row_count:,}")
        
        if file_metadata.data_categories:
            lines.append(f"Categories: {', '.join(file_metadata.data_categories)}")
        
        if file_metadata.key_entities:
            lines.append(f"Key Entities: {', '.join(file_metadata.key_entities[:10])}")
        
        lines.append(f"Data Blocks Created: {len(data_blocks)}")
        lines.append(f"Quality Score: {file_metadata.data_quality_score}")
        
        # Add block type summary
        block_types = {}
        for block in data_blocks:
            block_types[block.block_type] = block_types.get(block.block_type, 0) + 1
        
        lines.append("Block Types:")
        for block_type, count in block_types.items():
            lines.append(f"- {block_type}: {count}")
        
        return "\n".join(lines)

# Example usage and testing
if __name__ == "__main__":
    # Configuration
    DB_CONNECTION = "postgresql://username:password@localhost:5432/database"
    
    # Initialize pipeline
    pipeline = IngestionPipeline(DB_CONNECTION)
    
    # Process a CSV file
    try:
        entry_id = pipeline.process_file(
            file_path="/path/to/budget_data.csv",
            account_id="user123",
            name="Budget vs Actual Analysis",
            description="Quarterly budget and actual spending data for 2023"
        )
        print(f"Successfully processed file with entry_id: {entry_id}")
    except Exception as e:
        print(f"Error: {e}")
