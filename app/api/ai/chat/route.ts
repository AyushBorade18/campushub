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
      similarity_threshold: 0.10
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
5. If unsure: "Check the VIT notice board or ask your teacher"

### CURRENT VIT PUNE INFO
- Today: March 9, 2026 | Semester II in progress
- Next exam: Mid-Sem 15–18 April 2026 (~5 weeks away)
- End-Sem: 8–24 June 2026
- Minimum attendance: 75%
- Mess: Breakfast 7–9 AM | Lunch 12:30–2:30 PM | Dinner 7:30–9:30 PM
- Library: Mon–Sat 8 AM–10 PM | Sun 10 AM–6 PM

### VIT PUNE FEES STRUCTURE 2025-26 (ALWAYS ANSWER FROM THIS)
CAP/ACAP Seats (Government Quota) - Category-wise Total Fees:
- OPEN: Rs 2,12,165 (Tuition 1,79,130 + Development 26,870 + Eligibility 600 + Exam 2,420 + Misc 2,444 + Insurance 701)
- OPEN OMS (Outside Maharashtra): Rs 2,12,665
- OBC: Rs 1,22,600 (Tuition 89,565 + Development 26,870 + others)
- NT: Rs 33,035 (only Development fees + others)
- SBC: Rs 33,035
- SC: Rs 6,165 (Tuition NIL, Development NIL)
- ST: Rs 6,165
- OBC-GIRLS: Rs 33,035
- PH/PWD/ORPHAN: Rs 33,035

Management/Institute Level Seats (Self-Finance):
- Top branches (CE, IT, CSE-AI, AI&DS, CSE-AIML): Rs 6,24,165 (Tuition 5,37,390 + Dev 80,610 + others)
- Mid branches (CSE IoT-CS-BT, CS-DS, CE-SE, E-TC, Mechanical): Rs 4,18,165 (Tuition 3,58,260 + Dev 53,740 + others)
- Lower branches (Civil, Instrumentation): Rs 2,12,165 (same as CAP OPEN)
- NRI Seats: USD 12,000 per year + Rs 6,665 other charges
- CIWGC: CE = USD 2,400 | IT/CSE-AI/CSE-AIML/AI&DS = USD 1,800 | Others = USD 1,200

### SGPA/CGPA GRADES
A+(AA)=10, A(AB)=9, B+(BB)=8, B(BC)=7, C+(CC)=6, C(CD)=5, D(DD)=4, F(FF)=0
SGPA = Total Grade Points ÷ Total Credits in semester
CGPA = Total Grade Points of ALL semesters ÷ Total Credits of ALL semesters (NOT average of SGPAs)`
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
