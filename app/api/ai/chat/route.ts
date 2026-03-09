import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

async function generateEmbedding(text: string): Promise<number[]> {
  const hfKey = process.env.HUGGINGFACE_API_KEY
  if (!hfKey) return []
  try {
    const res = await fetch(
      'https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2',
      {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${hfKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputs: text, options: { wait_for_model: true } })
      }
    )
    const data = await res.json()
    return Array.isArray(data[0]) ? data[0] : data
  } catch { return [] }
}

async function searchRAG(query: string): Promise<string> {
  try {
    const embedding = await generateEmbedding(query)
    if (!embedding.length) return ''
    const { data, error } = await (supabase as any).rpc('search_rag_documents', {
      query_embedding: embedding,
      match_count: 4,
      similarity_threshold: 0.15
    })
    if (error || !data?.length) return ''
    return data.map((d: any) => `[${d.title}]\n${d.content}`).join('\n\n---\n\n')
  } catch { return '' }
}

async function getUserProfile(userId: string) {
  try {
    const { data } = await supabase
      .from('profiles')
      .select('full_name, major, year, college_email')
      .eq('id', userId)
      .single()
    return data
  } catch { return null }
}

function buildSystemPrompt(profile: any, ragContext: string): string {
  const userName = profile?.full_name || 'Student'
  const userBranch = profile?.major || 'B.Tech'
  const userYear = profile?.year || '1st Year'

  return `### ROLE
You are "CampusHub AI" — the personalized intelligent assistant for VIT Pune (Vishwakarma Institute of Technology).

### USER IDENTITY
You are currently speaking with:
- Name: ${userName}
- Branch: ${userBranch}  
- Year: ${userYear}
- Current Semester: Semester II (March 2026)

When asked "what is my name", "what branch am I in", "who am I" — answer using the identity above. NEVER say you don't have access to personal details.

### RETRIEVED CAMPUS KNOWLEDGE (RAG)
${ragContext
  ? `Relevant VIT Pune information retrieved:\n---\n${ragContext}\n---`
  : 'No specific documents matched — use general VIT Pune knowledge.'}

### RULES
1. Address the user as ${userName} naturally and personally
2. For branch-specific questions, tailor answers to ${userBranch}
3. NEVER invent exam mark breakdowns or question formats not in the context
4. Be friendly, use emojis, keep answers structured
5. STRICT RULE: If information is NOT in the RAG context or User Identity, you MUST say "I don't have verified information about this — please check vit.edu or ask your department directly." NEVER guess or make up faculty names, subjects they teach, or any specific details.

### CURRENT VIT PUNE INFO
- Today: March 9, 2026 | Semester II in progress
- Next exam: Mid-Sem 15–18 April 2026 (~5 weeks away)
- End-Sem: 8–24 June 2026
- Minimum attendance: 75%
- Mess: Breakfast 7–9 AM | Lunch 12:30–2:30 PM | Dinner 7:30–9:30 PM
- Library: Mon–Sat 8 AM–10 PM | Sun 10 AM–6 PM`
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const message = body.message?.trim() || ''
    const history = body.history || []
    const userId = body.userId || null
    const docContent = body.docContent || ''
    const docName = body.docName || ''

    if (!message) return NextResponse.json({ reply: 'Please type a message.' })

    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) return NextResponse.json({ reply: '❌ GROQ_API_KEY missing from .env.local' })

    // 1. Personalization — fetch user profile
    const profile = userId ? await getUserProfile(userId) : null

    // 2. RAG — search relevant campus knowledge
    const ragContext = await searchRAG(message)

    // 3. Build personalized system prompt
    const systemPrompt = buildSystemPrompt(profile, ragContext)

    const userMessage = docContent
      ? `I uploaded "${docName}":\n---\n${docContent.slice(0, 8000)}\n---\nQuestion: ${message}`
      : message

    const messages: { role: string; content: string }[] = [
      { role: 'system', content: systemPrompt }
    ]

    for (const h of history.filter((x: any) => x.role !== 'system').slice(-5)) {
      messages.push({ role: h.role === 'assistant' ? 'assistant' : 'user', content: h.text })
    }
    messages.push({ role: 'user', content: userMessage })

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({ model: 'llama-3.1-8b-instant', messages, max_tokens: 800, temperature: 0.7 })
    })

    const data = await res.json()
    if (!res.ok) {
      if (res.status === 401) return NextResponse.json({ reply: '❌ Invalid Groq API key.' })
      if (res.status === 429) return NextResponse.json({ reply: '⏳ Rate limit hit — wait 10 seconds.' })
      return NextResponse.json({ reply: `❌ Error: ${data?.error?.message}` })
    }

    let reply = data?.choices?.[0]?.message?.content
    if (!reply) return NextResponse.json({ reply: '⚠️ Empty response. Try again.' })
    reply = reply.replace(/`(<\/?[a-zA-Z][a-zA-Z0-9]*(?:\s*\/?)?>)`/g, '$1')

    return NextResponse.json({ reply, ragUsed: !!ragContext, personalized: !!profile })

  } catch (err: any) {
    return NextResponse.json({ reply: `❌ Error: ${err?.message || 'Unknown'}` })
  }
}
