-- Clear all existing embeddings to regenerate them properly
-- Run this in your Supabase SQL editor

-- Clear embeddings from both tables
UPDATE public.global_knowledge_base_entries SET embedding = NULL;
UPDATE public.knowledge_base_entries SET embedding = NULL;

-- Verify they're cleared
SELECT 
    COUNT(*) as total_entries,
    COUNT(embedding) as entries_with_embeddings,
    COUNT(*) - COUNT(embedding) as entries_without_embeddings
FROM public.global_knowledge_base_entries;

-- Show a few sample entries
SELECT entry_id, name, embedding IS NOT NULL as has_embedding
FROM public.global_knowledge_base_entries 
LIMIT 5;
