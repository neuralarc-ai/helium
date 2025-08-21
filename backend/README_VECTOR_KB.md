# Vector Knowledge Base System

This system implements a Retrieval-Augmented Generation (RAG) approach for the Helium AI knowledge base, allowing intelligent retrieval of relevant information only when needed.

## Overview

The Vector Knowledge Base system provides:
- **Document Processing**: Automatic text extraction from PDF, DOCX, CSV, and other formats
- **Vector Embeddings**: Using sentence-transformers for semantic similarity
- **Intelligent Retrieval**: Only invokes knowledge base when queries are relevant
- **Performance Optimization**: Avoids unnecessary processing for unrelated queries

## Architecture

### Database Schema

The system uses several new tables:

1. **`global_knowledge_base`** - Global knowledge entries accessible across all threads
2. **`thread_knowledge_base`** - Thread-specific knowledge entries
3. **`document_processing_queue`** - Queue for processing uploaded documents
4. **`document_chunks`** - Chunked content with vector embeddings
5. **`kb_query_logs`** - Analytics and relevance tracking

### Key Features

- **pgvector Extension**: PostgreSQL extension for vector similarity search
- **Sentence Transformers**: Uses 'all-MiniLM-L6-v2' model (384 dimensions)
- **Smart Chunking**: Overlapping chunks with sentence boundary preservation
- **Relevance Thresholds**: Configurable similarity scores for retrieval

## Setup

### 1. Database Migration

Run the migration to create the vector knowledge base schema:

```bash
# Apply the migration
psql -d your_database -f backend/supabase/migrations/20250808000000_vector_knowledge_base.sql
```

### 2. Install Dependencies

Install the required Python packages:

```bash
pip install -r backend/requirements-vector-kb.txt
```

### 3. Environment Variables

Ensure these environment variables are set:

```bash
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 4. Enable pgvector Extension

The migration will automatically enable the pgvector extension. If you need to do it manually:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

## Usage

### Document Upload

Documents can be uploaded through the API:

```typescript
// Frontend example
const formData = new FormData();
formData.append('file', file);
formData.append('kb_type', 'global'); // or 'thread'
formData.append('thread_id', threadId); // for thread-specific KB

const response = await fetch('/api/vector-kb/upload-document', {
  method: 'POST',
  body: formData,
});
```

### Knowledge Base Search

Search for relevant content:

```typescript
// Using the React hook
const { searchKnowledgeBase } = useVectorKB();

const result = await searchKnowledgeBase({
  query: "What are the company policies?",
  thread_id: "thread-uuid",
  kb_type: "global",
  similarity_threshold: 0.7,
  max_chunks: 5
});

if (result.relevant) {
  console.log(`Found ${result.total_chunks_found} relevant chunks`);
  // Use result.chunks for RAG
}
```

### RAG Integration

The system automatically determines when to use knowledge base content:

```typescript
// Check if query is relevant
const { shouldUseKnowledgeBase } = useVectorKB();
const isRelevant = await shouldUseKnowledgeBase(query, threadId);

if (isRelevant) {
  // Get relevant context
  const { getRelevantContext } = useVectorKB();
  const context = await getRelevantContext(query, threadId);
  
  // Inject context into LLM prompt
  const enhancedPrompt = `${context}User: ${query}`;
}
```

## API Endpoints

### POST `/api/vector-kb/upload-document`
Upload and process a document for vector knowledge base.

**Parameters:**
- `file`: Document file (PDF, DOCX, CSV, TXT, MD, JSON)
- `kb_type`: 'global' or 'thread'
- `thread_id`: Thread ID (required for thread-specific KB)

### POST `/api/vector-kb/search`
Search knowledge base for relevant content.

**Parameters:**
- `query`: Search query text
- `thread_id`: Thread ID (optional)
- `kb_type`: 'global', 'thread', or null for both
- `similarity_threshold`: Minimum similarity score (0-1)
- `max_chunks`: Maximum chunks to return

### GET `/api/vector-kb/processing-status/{queue_id}`
Get document processing status.

### GET `/api/vector-kb/global-entries`
Get global knowledge base entries.

### GET `/api/vector-kb/thread-entries/{thread_id}`
Get thread-specific knowledge base entries.

## Configuration

### Similarity Thresholds

- **Relevance Check**: 0.6 (default) - Determines if KB should be used
- **Search**: 0.7 (default) - Minimum similarity for chunk retrieval
- **High Precision**: 0.8+ - For very specific queries
- **High Recall**: 0.5-0.6 - For broader queries

### Chunking Parameters

- **Chunk Size**: 1000 characters (default)
- **Overlap**: 200 characters (default)
- **Sentence Boundary**: Attempts to break at sentence endings

### Model Configuration

- **Embedding Model**: 'all-MiniLM-L6-v2'
- **Dimensions**: 384
- **Performance**: Fast inference, good quality
- **Memory**: ~90MB model size

## Performance Considerations

### Optimization Strategies

1. **Batch Processing**: Documents are processed in background tasks
2. **Vector Indexing**: Uses IVFFlat index for fast similarity search
3. **Chunking**: Overlapping chunks preserve context
4. **Relevance Filtering**: Only processes relevant queries

### Monitoring

- **Query Logs**: Track which queries use knowledge base
- **Processing Queue**: Monitor document processing status
- **Performance Metrics**: Response times and chunk retrieval counts

## Troubleshooting

### Common Issues

1. **pgvector Extension Not Available**
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```

2. **Model Download Fails**
   - Check internet connection
   - Verify sufficient disk space (~90MB)
   - Check firewall settings

3. **Memory Issues**
   - Reduce batch size in chunk processing
   - Use smaller embedding model
   - Monitor system memory usage

### Debug Mode

Enable debug logging:

```python
import logging
logging.getLogger('vector_knowledge_base_service').setLevel(logging.DEBUG)
```

## Security

### Access Control

- **Row Level Security**: All tables have RLS policies
- **Account Isolation**: Users can only access their own knowledge base
- **Service Role**: Document processing uses service role for database operations

### Data Privacy

- **Local Processing**: Documents are processed locally, not sent to external services
- **Embedding Storage**: Vector embeddings are stored in your database
- **No External APIs**: All processing happens within your infrastructure

## Future Enhancements

### Planned Features

1. **Multi-language Support**: Additional embedding models for different languages
2. **Advanced Chunking**: Semantic chunking based on content structure
3. **Hybrid Search**: Combine vector similarity with keyword search
4. **Real-time Updates**: Live knowledge base updates during conversations
5. **Analytics Dashboard**: Query performance and usage analytics

### Integration Points

1. **LLM Providers**: Direct integration with OpenAI, Anthropic, etc.
2. **Document Sources**: Google Drive, SharePoint, Notion integration
3. **Workflow Automation**: Trigger knowledge base updates on document changes
4. **Collaboration**: Multi-user knowledge base editing and approval workflows

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review database logs for errors
3. Verify environment configuration
4. Check pgvector extension status

## License

This system is part of the Helium AI project and follows the same licensing terms.

