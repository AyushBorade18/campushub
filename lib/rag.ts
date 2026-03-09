import { supabase } from './supabase'

// Use HuggingFace free inference API for embeddings
const HF_MODEL = 'sentence-transformers/all-MiniLM-L6-v2'

export async function generateEmbedding(text: string): Promise<number[]> {
  const hfKey = process.env.HUGGINGFACE_API_KEY
  
  if (!hfKey) {
    // Fallback: return empty array (RAG won't work but app won't crash)
    console.warn('HUGGINGFACE_API_KEY not set — RAG disabled')
    return []
  }

  const res = await fetch(
    `https://api-inference.huggingface.co/pipeline/feature-extraction/${HF_MODEL}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${hfKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: text,
        options: { wait_for_model: true }
      })
    }
  )

  if (!res.ok) {
    console.error('HuggingFace embedding error:', await res.text())
    return []
  }

  const data = await res.json()
  // HF returns array of arrays for batch, or flat array for single
  return Array.isArray(data[0]) ? data[0] : data
}

// Search for relevant chunks using vector similarity
export async function searchRelevantChunks(query: string, limit = 4): Promise<string> {
  try {
    const embedding = await generateEmbedding(query)
    if (!embedding.length) return ''

    const { data, error } = await supabase.rpc('search_documents', {
      query_embedding: embedding,
      match_count: limit,
      similarity_threshold: 0.3
    })

    if (error || !data?.length) return ''

    return data
      .map((d: any) => `[${d.title}]\n${d.content}`)
      .join('\n\n---\n\n')
  } catch (err) {
    console.error('RAG search error:', err)
    return ''
  }
}

// Fetch user profile for personalization
export async function getUserProfile(userId: string) {
  try {
    const { data } = await supabase
      .from('profiles')
      .select('full_name, major, year, college_email')
      .eq('id', userId)
      .single()
    return data
  } catch {
    return null
  }
}
