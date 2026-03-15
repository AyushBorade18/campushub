import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { createClient } from '@supabase/supabase-js'

// Service role client — bypasses RLS for server-side reads
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

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
    const { data } = await supabaseAdmin
      .from('profiles')
      .select('full_name, major, year, college_email, module, off_days')
      .eq('id', userId)
      .single()
    return data
  } catch { return null }
}

async function getMarketplaceListings(): Promise<string> {
  try {
    const { data } = await supabaseAdmin
      .from('listings')
      .select('title, description, price, type, category, status, created_at')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(50)
    if (!data?.length) return 'No active listings on marketplace currently.'
    const grouped: Record<string, any[]> = {}
    data.forEach(l => {
      const key = l.type || 'other'
      if (!grouped[key]) grouped[key] = []
      grouped[key].push(l)
    })
    return Object.entries(grouped).map(([type, items]) => {
      const label = type === 'sell' ? '🛒 FOR SALE' : type === 'buy' ? '🔍 WANTED' : type === 'borrow' ? '🤝 BORROW/LEND' : type === 'lost' ? '🔴 LOST' : type === 'found' ? '🟢 FOUND' : type.toUpperCase()
      return `${label}:\n` + items.map(l =>
        `- ${l.title}${l.price > 0 ? ` (₹${l.price})` : ' (Free/Contact)'}${l.category ? ` [${l.category}]` : ''}${l.description ? ` — ${l.description.slice(0, 80)}` : ''}`
      ).join('\n')
    }).join('\n\n')
  } catch { return '' }
}

async function getCommunityPosts(): Promise<string> {
  try {
    const { data } = await supabaseAdmin
      .from('community_posts')
      .select('content, created_at')
      .order('created_at', { ascending: false })
      .limit(20)
    if (!data?.length) return 'No recent community posts.'
    return data.map(p => `- ${p.content?.slice(0, 120)}${p.content?.length > 120 ? '…' : ''}`).join('\n')
  } catch { return '' }
}

async function getUserTimetable(userId: string): Promise<string> {
  try {
    const { data, error } = await supabaseAdmin
      .from('timetable_slots')
      .select('day, slot_start, slot_end, subject_name, slot_type')
      .eq('user_id', userId)
      .order('day').order('slot_start')
    if (error || !data?.length) return ''
    const allDays = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday']
    const SLOT_LABEL: Record<string,string> = {
      '08:00':'8-9 AM','09:00':'9-10 AM','10:00':'10-11 AM','11:00':'11-12 PM',
      '12:00':'12-1 PM','13:00':'1-2 PM','14:00':'2-3 PM','15:00':'3-4 PM',
      '16:00':'4-5 PM','17:00':'5-6 PM','18:00':'6 PM'
    }
    // Use IST time (UTC+5:30) — server may run in UTC
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))
    const todayName = allDays[now.getDay()]
    const tomorrowName = allDays[(now.getDay() + 1) % 7]
    const todayHasSlots = data.some(s => s.day === todayName)
    const tomorrowHasSlots = data.some(s => s.day === tomorrowName)
    const todayNote = todayHasSlots
      ? ` WARNING: ${todayName.charAt(0).toUpperCase()+todayName.slice(1)} HAS CLASSES in the timetable below - do NOT say it is free.`
      : ` (no classes today)`
    const tomorrowNote = tomorrowHasSlots ? ` (has classes)` : ` (no classes)`
    const header = `Today is ${todayName.charAt(0).toUpperCase()+todayName.slice(1)}.${todayNote} Tomorrow is ${tomorrowName.charAt(0).toUpperCase()+tomorrowName.slice(1)}.${tomorrowNote} NO room numbers are stored - NEVER invent them.\n\nCRITICAL RULE: Timetable data overrides off-day settings. If a day has slots listed below, the student HAS class that day - even on Saturday or any other day.\n\n`
    const timetableStr = allDays.slice(1).map(day => {
      const daySlots = data.filter(s => s.day === day)
      if (!daySlots.length) return null
      const slotStr = daySlots.map(s => {
        // Build clean time range from raw slot_start and slot_end
        const startHour = parseInt(s.slot_start.split(':')[0])
        const endHour = parseInt(s.slot_end.split(':')[0])
        const fmt = (h: number) => h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h-12} PM`
        const timeRange = s.slot_type === 'lab'
          ? `${startHour}-${endHour < 12 ? endHour+' AM' : endHour === 12 ? '12 PM' : (endHour-12)+' PM'}`
          : `${fmt(startHour)}-${fmt(endHour)}`
        return `${timeRange}: ${s.subject_name}${s.slot_type === 'lab' ? ' (Lab)' : ''}`
      }).join(', ')
      return `${day.charAt(0).toUpperCase()+day.slice(1)}: ${slotStr}`
    }).filter(Boolean).join('\n')
    return header + timetableStr
  } catch { return '' }
}

function buildSystemPrompt(profile: any, ragContext: string, marketplaceData: string, communityData: string, timetableData: string, message: string): string {
  const userName = profile?.full_name || 'Student'
  const userBranch = profile?.major || 'B.Tech'
  const userYear = profile?.year || '1st Year'
  const CS_BRANCHES = ['CS','CS-AIML','CS-AI','IT','AIDS','CSE-DS','CSE-SE','CSE-IOT & CYBERSECURITY']
  const ENTC_BRANCHES = ['ENTC','INSTRUMENTATION']
  const isCS = CS_BRANCHES.includes(profile?.major)
  const isENTC = ENTC_BRANCHES.includes(profile?.major)
  const isMod1 = profile?.module === 'module_1'
  const isMod2 = profile?.module === 'module_2'

  const userModule = isCS && isMod1 ? 'Module 1 — Linear Algebra, PSP (C language), COA, Web Dev, IKS'
    : isCS && isMod2 ? 'Module 2 — Calculus, Applied Electromechanics, Python for Engineers, Data Analysis, UHV'
    : isENTC && isMod1 ? 'Module 1 — Linear Algebra, PSP (C language), Electronic Circuits, IKS'
    : isENTC && isMod2 ? 'Module 2 — Calculus, Applied Electromechanics, DLD, UHV'
    : null

  // Detect what the message is about — only inject relevant sections
  const msg = message.toLowerCase()
  const wantsFees     = /fee|fees|tuition|cost|pay|amount|lakh|rupee|cap|management|nri|quota|caste|sc|st|obc|sebc|nt|sbc/i.test(message)
  const wantsHoliday  = /holiday|leave|off|vacation|bridge|break|long weekend/i.test(message)
  const wantsMarks    = /mark|marks|assessment|exam pattern|viva|mid.?sem|end.?sem|project|assignment|credit|sgpa|cgpa|grade/i.test(message)
  const wantsModule   = /module|subject|syllabus|coa|psp|web dev|calculus|python|data analysis|linear algebra|electro|dld|iks|uhv|asep|rad|gp|srm|environmental/i.test(message)
  const wantsClubs    = /club|society|ieee|gdsc|microsoft|robotics|coding|technical|co.?curr/i.test(message)
  const wantsExam     = /exam rule|exam instruction|online exam|offline exam|portal|vierp|camera|tab switch/i.test(message)
  const wantsTimetable = /timetable|schedule|today|tomorrow|class|lecture|slot|free period/i.test(message)

  // Always-included core prompt (~400 tokens)
  const offDaysSetting = profile?.off_days || 'sat_sun'
  const offDayNames = offDaysSetting === 'sat_sun' ? ['Saturday','Sunday']
    : offDaysSetting === 'sun_mon' ? ['Sunday','Monday'] : ['Sunday']
  const offDayNums = offDaysSetting === 'sat_sun' ? [0,6]
    : offDaysSetting === 'sun_mon' ? [0,1] : [0]

  const today = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })); today.setHours(0,0,0,0)

  let prompt = `You are CampusHub AI — the smart assistant for VIT Pune students. Be friendly, use emojis, give structured answers.

USER: ${userName} | Branch: ${userBranch} | Year: ${userYear} | ${userModule ? `Module: ${userModule}` : 'Module: not set'}
Off days: ${offDayNames.join(' & ')} | Date: ${today.toLocaleDateString('en-GB', {weekday:'long',day:'2-digit',month:'2-digit',year:'numeric'})}
Sem II in progress | Mid-Sem: 15–18 Apr 2026 | End-Sem: 8–24 Jun 2026 | Min attendance: 75%

CRITICAL SUBJECT RULES — NEVER GET THESE WRONG:
- PSP (Problem Solving using Programming) = C LANGUAGE in Module 1. NOT Python. Never say PSP uses Python.
- Python for Engineers = ONLY in Module 2. Never say Module 1 has Python.
- If user is Module 1: their programming subject is PSP using C language.
- If user is Module 2: their programming subject is Python for Engineers.
- These rules override anything else in this prompt including RAG context.

RULES: Only mention subjects from the student's module. Never invent faculty names, room numbers, or details not in this prompt. If unsure, say "Check vit.edu or your department."
`

  // RAG context
  if (ragContext) prompt += `
RELEVANT VIT KNOWLEDGE:
${ragContext}
`

  // Marks — inject when asked OR for general academic questions
  if (wantsMarks || wantsModule || wantsTimetable) {
    prompt += `
MARKS STRUCTURE:
- BSE Maths (Linear Algebra/Calculus): Mid-Sem 30→25 + End-Sem 100→50 + Assignment 100→25 = 100
- PCC (COA/Electronic Circuits): Mid-Sem 30→25 + End-Sem Written 100→50 + Viva 100→25 = 100
- PSP (C language, Module 1): Mid-Sem 30→25 + End-Sem LAB+Viva 100→50 + Project 100→25 = 100
- Python for Engineers (Module 2): Mid-Sem 30→25 + End-Sem LAB+Viva 100→50 + Project 100→25 = 100
- AE (Applied Electromechanics): NO Mid-Sem + End-Sem Written 100→50 + LAB 100→25 + Project 100→25 = 100
- BSE/VSEC (Web Dev/Data Analysis/DLD): End-Sem LAB+Viva 100→50 + Project 100→50 = 100 (NO Mid-Sem)
- IKS/UHV: End-Sem MCQ 100 only
- Env Studies: End-Sem MCQ 100→50 + PPT 50 = 100
- ASEP: Mid-Sem Review 50→30 + End-Sem Review 100→70 = 100
`
  }

  // Module subjects
  if (wantsModule) {
    if (isCS) {
      prompt += `
CS/IT/AI MODULE SUBJECTS:
Module 1: Linear Algebra, PSP (C language - NOT Python), COA, Web Dev, IKS, Student Activity
Module 2: Calculus, Applied Electromechanics, Python for Engineers (NOT C), Data Analysis, UHV, Env Studies
CRITICAL: PSP in Module 1 = C language programming. Python is ONLY in Module 2.
Common (both): ASEP, RAD, GP, SRM (NO Engineering Graphics for CS/IT/AI)
`
    } else if (isENTC) {
      prompt += `
ENTC/INSTRUMENTATION MODULE SUBJECTS:
Module 1: Linear Algebra, PSP (C language - NOT Python), Electronic Circuits, IKS, Student Activity
Module 2: Calculus, Applied Electromechanics, DLD, UHV, Env Studies
Common: Engineering Graphics, ASEP, RAD, GP, SRM
`
    }
  }

  // Fees — only when asked
  if (wantsFees) {
    prompt += `
VIT PUNE FEES 2025-26:
CAP/OPEN: Rs 2,12,165 | OBC: Rs 1,22,600 | NT/SBC/OBC-GIRLS/PH: Rs 33,035 | SC/ST: Rs 6,165
Management (CS/IT/AI): Rs 6,24,165 | ENTC/Mech: Rs 4,18,165 | Civil/Instrumentation: Rs 2,12,165
NRI: USD 12,000/year
`
  }

  // Holidays — only when asked
  if (wantsHoliday) {
    const allHolidays = [
      { d: new Date('2026-03-19'), label: '19/03 (Thu) — Gudi Padwa' },
      { d: new Date('2026-03-21'), label: '21/03 (Sat) — Ramzan Id' },
      { d: new Date('2026-03-26'), label: '26/03 (Thu) — Ram Navami' },
      { d: new Date('2026-03-31'), label: '31/03 (Tue) — Mahaveer Jayanti' },
      { d: new Date('2026-04-03'), label: '03/04 (Fri) — Good Friday' },
      { d: new Date('2026-04-14'), label: '14/04 (Tue) — Ambedkar Jayanti' },
      { d: new Date('2026-05-01'), label: '01/05 (Fri) — Maharashtra Day' },
      { d: new Date('2026-05-28'), label: '28/05 (Thu) — Bakri Id' },
    ]
    const upcoming = allHolidays.filter(h => h.d >= today)
    const past = allHolidays.filter(h => h.d < today)

    // Bridge days
    const offNums = offDayNums
    const bridges: string[] = []
    for (const {d: hd} of upcoming) {
      for (const offset of [-1,1]) {
        const candidate = new Date(hd); candidate.setDate(hd.getDate()+offset)
        if (offNums.includes(candidate.getDay())) continue
        let streak = 2; let days = [hd, candidate]
        for (const dir of [-1,1]) {
          let cur = new Date(hd)
          for (let i=0;i<3;i++) {
            cur = new Date(cur); cur.setDate(cur.getDate()+dir)
            if (offNums.includes(cur.getDay()) || upcoming.some(u=>u.d.getTime()===cur.getTime())) {streak++;days.push(new Date(cur))} else break
          }
        }
        if (streak>=3) bridges.push(`Take ${candidate.toLocaleDateString('en-GB',{weekday:'long',day:'2-digit',month:'2-digit'})} off → ${streak}+ day break`)
      }
    }
    prompt += `
UPCOMING HOLIDAYS: ${upcoming.map(h=>h.label).join(' | ') || 'None remaining'}
PAST HOLIDAYS: ${past.map(h=>h.label).join(' | ') || 'None'}
`
    if (bridges.length) prompt += `BRIDGE DAY TIPS for ${userName}: ${bridges.join(' | ')}
`
  }

  // Clubs — only when asked
  if (wantsClubs) {
    prompt += `
TECHNICAL CLUBS: Microsoft Learn Student Club, GedIT Coding Club, GDSC, IEEE VIT Pune, CSI VIT Pune, ISA, TRF (Robotics), Team Endurance Racing, Team Griffin India (drones), Team Veloce Racing, Game Dev+, Reality Spectra (AR/VR), InnovSphere, Club Catalyst
CO-CURRICULAR: Pi Editorial, Antariksh, EPEC, RangManch (drama), Abhivridhhi, Team Eklavya (sports), Speaker's Club, VEDC
Overall Incharge: Dr. Vikas Kolekar
`
  }

  // Exam rules — only when asked
  if (wantsExam) {
    prompt += `
ONLINE EXAM: Portal: epvit.vierp.in | Laptop only | Join Google Meet first | Camera ON always | Tab switch = termination
OFFLINE EXAM: Arrive 30 min early | I-card compulsory | No phone | Cannot enter after 30 min
`
  }

  // GRADES always useful
  prompt += `
GRADES: A+(AA)=10, A(AB)=9, B+(BB)=8, B(BC)=7, C+(CC)=6, C(CD)=5, D(DD)=4, F=0. CGPA = total grade points ÷ total credits (not avg of SGPAs)
`

  // Live data — only when relevant
  if (marketplaceData) prompt += `
MARKETPLACE LISTINGS:
${marketplaceData}
`
  if (communityData) prompt += `
COMMUNITY POSTS:
${communityData}
`
  if (timetableData) prompt += `
STUDENT TIMETABLE:
${timetableData}
Use exact times. Never invent room numbers.
`

  return prompt
}


export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const message = body.message?.trim() || ''
    const history = body.history || []
    const userId = body.userId || null
    const rawDoc = body.docContent || ''
    const docName = body.docName || ''
    // Strip non-printable/binary characters so Groq doesn't choke on PDF garbage
    const docContent = rawDoc
      .replace(/[^\x20-\x7E\n\r\t]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    if (!message) return NextResponse.json({ reply: 'Please type a message.' })

    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) return NextResponse.json({ reply: '❌ GROQ_API_KEY missing from .env.local' })

    // 1. Personalization — fetch user profile
    const profile = userId ? await getUserProfile(userId) : null

    // 2. RAG — search relevant campus knowledge
    const ragContext = await searchRAG(message)

    // 3. Fetch live marketplace + community + timetable data
    const isMarketplaceQuery = /market|buy|sell|borrow|listing|available|price|item|object|thing|purchase|lend|lost|found/i.test(message)
    const isCommunityQuery = /community|post|discussion|notice|announcement|recent|latest/i.test(message)
    const isTimetableQuery = /timetable|schedule|today|tomorrow|yesterday|free|slot|class|lecture|when do i|what do i have|monday|tuesday|wednesday|thursday|friday|saturday/i.test(message)
    const [marketplaceData, communityData, timetableData] = await Promise.all([
      isMarketplaceQuery ? getMarketplaceListings() : Promise.resolve(''),
      isCommunityQuery ? getCommunityPosts() : Promise.resolve(''),
      (isTimetableQuery && userId) ? getUserTimetable(userId) : Promise.resolve(''),
    ])

    // 4. Build personalized system prompt
    // When a doc is attached, use a slim system prompt to save token budget
    const systemPrompt = docContent
      ? `You are CampusHub AI for VIT Pune. User: ${profile?.full_name || 'Student'}, Branch: ${profile?.major || 'B.Tech'}. Answer questions from the uploaded document accurately and concisely.`
      : buildSystemPrompt(profile, ragContext, marketplaceData, communityData, timetableData, message)

    // Groq llama-3.1-8b-instant limit: ~6000 TPM
    // Slim prompt ≈ 60 tokens, leave ~2500 for doc content, rest for answer
    // Check if PDF text extraction produced meaningful content
    // After stripping binary, compressed PDFs leave very little readable text
    const wordCount = (docContent.match(/[a-zA-Z]{3,}/g) || []).length
    if (docContent && wordCount < 30) {
      return NextResponse.json({
        reply: `⚠️ I could not read the text from **${docName}**.\n\nThis usually happens because the PDF uses **compressed or encoded content** that cannot be extracted in the browser.\n\n**What you can do:**\n- 📋 **Copy-paste** the text from your PDF directly into the chat\n- 🔄 Convert PDF to text at **smallpdf.com** or **ilovepdf.com**, then paste\n- 📝 Type your question directly — I know the VIT Pune syllabus already!`
      })
    }

    const MAX_DOC_CHARS = 4000
    const truncated = docContent && docContent.length > MAX_DOC_CHARS
    const userMessage = docContent
      ? `I uploaded "${docName}":\n---\n${docContent.slice(0, MAX_DOC_CHARS)}${truncated ? '\n\n[...document truncated to fit context...]' : ''}\n---\nQuestion: ${message}`
      : message

    const messages: { role: string; content: string }[] = [
      { role: 'system', content: systemPrompt }
    ]

    for (const h of history.filter((x: any) => x.role !== 'system').slice(docContent ? -2 : -3)) {
      messages.push({ role: h.role === 'assistant' ? 'assistant' : 'user', content: h.text })
    }
    messages.push({ role: 'user', content: userMessage })

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages, max_tokens: 600, temperature: 0.7 })
    })

    const data = await res.json()
    if (!res.ok) {
      if (res.status === 401) return NextResponse.json({ reply: '❌ Invalid Groq API key.' })
      if (res.status === 429) {
        const retryAfter = res.headers.get('retry-after') || '15'
        return NextResponse.json({ reply: '⏳ Rate limit hit — please wait a moment.', rateLimitSeconds: parseInt(retryAfter) })
      }
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
