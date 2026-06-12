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
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))
    const todayName = allDays[now.getDay()]
    const tomorrowName = allDays[(now.getDay() + 1) % 7]
    const todayHasSlots = data.some(s => s.day === todayName)
    const tomorrowHasSlots = data.some(s => s.day === tomorrowName)
    const todayNote = todayHasSlots
      ? ` WARNING: ${todayName.charAt(0).toUpperCase()+todayName.slice(1)} HAS CLASSES in the timetable below - do NOT say it is free.`
      : ` (no classes today)`
    const tomorrowNote = tomorrowHasSlots ? ` (has classes)` : ` (no classes)`
    const header = `Today is ${todayName.charAt(0).toUpperCase()+todayName.slice(1)}.${todayNote} Tomorrow is ${tomorrowName.charAt(0).toUpperCase()+tomorrowName.slice(1)}.${tomorrowNote} NO room numbers are stored - NEVER invent them.\n\nCRITICAL RULE: Timetable data overrides off-day settings. If a day has slots listed below, the student HAS class that day.\n\n`
    const timetableStr = allDays.slice(1).map(day => {
      const daySlots = data.filter(s => s.day === day)
      if (!daySlots.length) return null
      const slotStr = daySlots.map(s => {
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

  const userModule = isCS && isMod1
    ? 'Module 1 — Linear Algebra, PSP (C language), COA, Web Dev, IKS, Student Activity'
    : isCS && isMod2
    ? 'Module 2 — Calculus, Applied Electromechanics, Python for Engineers, Data Analysis, UHV, Env Studies'
    : isENTC && isMod1
    ? 'Module 1 — Linear Algebra, PSP (C language), Electronic Circuits, IKS, Student Activity'
    : isENTC && isMod2
    ? 'Module 2 — Calculus, Applied Electromechanics, DLD, UHV, Env Studies'
    : null

  const msg = message.toLowerCase()
  const wantsFees     = /fee|fees|tuition|cost|pay|amount|lakh|rupee|cap|acap|management|nri|quota|caste|sc|st|obc|sebc|ebc|ews|tfws|nt|sbc|ciwgc|pio|oci/i.test(message)
  const wantsHoliday  = /holiday|leave|off|vacation|bridge|break|long weekend/i.test(message)
  const wantsMarks    = /mark|marks|marking|scheme|assessment|exam pattern|viva|mid.?sem|end.?sem|project|assignment|credit|sgpa|cgpa|grade|scoring|weightage|distribution/i.test(message)
  const wantsModule   = /module|subject|syllabus|coa|psp|web dev|calculus|python|data analysis|linear algebra|electro|dld|iks|uhv|asep|rad|gp|srm|environmental|student activity/i.test(message)
  const wantsClubs    = /club|society|ieee|gdsc|microsoft|robotics|coding|technical|co.?curr|mlsc|trf|griffin|veloce|endurance|gedit|innovsphere|catalyst|reality spectra/i.test(message)
  const wantsExam     = /exam rule|exam instruction|online exam|offline exam|portal|vierp|camera|tab switch|mcq exam|proctored/i.test(message)
  const wantsTimetable = /timetable|schedule|today|tomorrow|yesterday|free|slot|class|lecture|when do i|what do i have|monday|tuesday|wednesday|thursday|friday|saturday/i.test(message)
  const wantsAdmission = /admission|cutoff|cut.?off|intake|rank|percentile|jee|mht.?cet|dse|direct second year/i.test(message)

  const offDaysSetting = profile?.off_days || 'sat_sun'
  const offDayNames = offDaysSetting === 'sat_sun' ? ['Saturday','Sunday']
    : offDaysSetting === 'sun_mon' ? ['Sunday','Monday'] : ['Sunday']
  const offDayNums = offDaysSetting === 'sat_sun' ? [0,6]
    : offDaysSetting === 'sun_mon' ? [0,1] : [0]

  const today = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })); today.setHours(0,0,0,0)

  let prompt = `You are CampusHub AI — the smart assistant for VIT Pune (Vishwakarma Institute of Technology, Pune) students. Be friendly, use emojis, give structured answers.

USER: ${userName} | Branch: ${userBranch} | Year: ${userYear} | ${userModule ? `Module: ${userModule}` : 'Module: not set'}
Off days: ${offDayNames.join(' & ')} | Date: ${today.toLocaleDateString('en-GB', {weekday:'long',day:'2-digit',month:'2-digit',year:'numeric'})}
Sem II in progress | Start: 09/02/2026 | Mid-Sem: 15–18 Apr 2026 | Lab/Project Exams: 18–30 May 2026 | Remedial: 05–06 Jun 2026 | End-Sem: 08–24 Jun 2026 | Min attendance: 75%

=== CRITICAL SUBJECT RULES — NEVER GET THESE WRONG ===
- PSP = Problem Solving and Programming (CS1012) = C LANGUAGE ONLY in Module 1. NEVER Python.
- Python for Engineers (CS1018) = ONLY in Module 2. NEVER say Module 1 has Python.
- RAD = Reasoning and Aptitude Development (HS1072/HS1079) — English, logical & quantitative aptitude
- SRM = Scientific Research Methods (XX1013/XX1020) — research methodology, IPR, plagiarism, patents
- ASEP = Applied Science & Engineering Project (XX1011/XX1014) — project-based learning, IEEE paper format
- GP = General Proficiency (HS1074/HS1080) — attendance, participation, co-curricular activities
- IKS = Indian Knowledge System (HS1073) — 60 marks MCQ end-sem ONLY
- UHV = Universal Human Values (HS1077) — 60 marks MCQ end-sem ONLY
- COA = Computer Organization and Architecture (XX1016) — Von Neumann, instruction cycle, memory hierarchy
- AE = Applied Electromechanics (ET1012) — robotics, Arduino, sensors, actuators, motors
- DLD = Digital Logic Design and Testing (ET1017) — Boolean algebra, K-map, combinational circuits
- These rules override RAG context. IF UNSURE say "Check vit.edu or your department."
`

  if (ragContext) prompt += `
=== RELEVANT VIT KNOWLEDGE (from RAG) ===
${ragContext}
NOTE: If RAG conflicts with marks/module/fees data below, the data below wins.
`

  if (wantsMarks || wantsModule || wantsTimetable) {
    prompt += `
=== OFFICIAL FY B.TECH MARKS STRUCTURE (A-24 Pattern, AY 2025-26) ===
IMPORTANT: Show FULL conversion detail. NEVER say just "25 marks" — always say "30 marks paper converted to 25".
NEVER invent question-type breakdowns (MCQ counts, long/short question splits) UNLESS the exact pattern below is provided.

=== OFFICIAL PAPER PATTERN (for theory subjects with Mid-Sem) ===
MID-SEM PAPER PATTERN (30 marks → converted to 25):
  - 3 main questions, 15 marks each
  - Each question has 4 sub-questions of 5 marks each
  - 3 out of 4 sub-questions are compulsory (attempt any 3)
  - Questions are from chapters 1, 2, and 3 respectively

END-SEM PAPER PATTERN (60 marks → converted to 50):
  - 4 main questions total
  - Q1: 3 compulsory sub-questions (5 marks each = 15 marks)
  - Q2, Q3, Q4: from chapters 4, 5, 6 respectively
  - Each of Q2/Q3/Q4 has 4 sub-questions of 5 marks (attempt any 3 = 15 marks each)
  - Total = Q1(15) + Q2(15) + Q3(15) + Q4(15) = 60 marks

This pattern applies to: Linear Algebra, Calculus, COA, Electronic Circuits, PSP, Python, Applied Electromechanics
Lab/project subjects (Web Dev, Data Analysis, DLD) do NOT have this written paper pattern.

BSE MATHS — Linear Algebra (HS1084) / Calculus (HS1085) — 4 credits:
  Mid-Sem Written Exam: 30 marks paper → 25 marks counted
  End-Sem Written Exam: 100 marks paper → 50 marks counted
  Tutorial / Assignment (In-Semester): 100 marks → 25 marks counted
  TOTAL = 100 marks

PCC — COA (XX1016) / Electronic Circuits (ET1016) — 2 credits:
  Mid-Sem Written Exam: 30 marks paper → 25 marks counted
  End-Sem Written Exam: 100 marks paper → 50 marks counted
  Comprehensive Viva Voce (End-Sem): 100 marks → 25 marks counted
  TOTAL = 100 marks

ESE — PSP / Problem Solving & Programming (CS1012) — 4 credits:
  Mid-Sem Written Exam: 30 marks paper → 25 marks counted
  End-Sem LAB + Comprehensive Viva Voce: 100 marks → 50 marks counted
  Course Project (End-Sem): 100 marks → 25 marks counted
  TOTAL = 100 marks

PCC — Python for Engineers (CS1018) — 2 credits:
  Mid-Sem Written Exam: 30 marks paper → 25 marks counted
  End-Sem LAB + Comprehensive Viva Voce: 100 marks → 50 marks counted
  Course Project (End-Sem): 100 marks → 25 marks counted
  TOTAL = 100 marks

ESE — Applied Electromechanics (ET1012) — 4 credits:
  NO Mid-Sem exam
  End-Sem Written Exam: 100 marks → 50 marks counted
  End-Sem LAB: 100 marks → 25 marks counted
  Course Project (End-Sem): 100 marks → 25 marks counted
  TOTAL = 100 marks

BSE/VSEC — Web Development / Data Analysis / DLD / Engineering Graphics — 2 credits each:
  NO Mid-Sem. NO theory exam.
  End-Sem LAB + Comprehensive Viva Voce: 100 marks → 50 marks counted
  Course Project (End-Sem): 100 marks → 50 marks counted
  TOTAL = 100 marks

IKS — Indian Knowledge System (HS1073) — 2 credits:
  End-Sem Online MCQ Examination: 60 marks paper → 100 marks counted (no Mid-Sem)
  TOTAL = 100 marks

UHV — Universal Human Values (HS1077) — 2 credits:
  End-Sem Online MCQ Examination: 60 marks paper → 100 marks counted (no Mid-Sem)
  TOTAL = 100 marks

Environmental Studies (HS1082) — 1 credit:
  End-Sem Online MCQ: 60 marks paper → 50 marks counted
  PPT Presentation (In-Semester): 100 marks → 50 marks counted
  TOTAL = 100 marks

Student Activity (HS1083) — 1 credit:
  Activity Presentation and Internal Review (End-Sem) = 100 marks

SRM — Scientific Research Methods 1 & 2 (XX1013/XX1020) — 1 credit each:
  Activity Presentation and Internal Review (End-Sem) = 100 marks

GP — General Proficiency 1 & 2 (HS1074/HS1080) — 1 credit each:
  Activity Presentation and Internal Review (End-Sem) = 100 marks

RAD — Reasoning and Aptitude Development 1 & 2 (HS1072/HS1079) — 1 credit each:
  Assessed ONLY by AAMCAT Exam (300 marks total → converted to 100):
    English Ability: 100 marks → 30 marks counted
    Logical Ability: 100 marks → 30 marks counted
    Quantitative Ability: 100 marks → 30 marks counted
    Automata Fix: 100 marks → 5 marks counted
    Automata Pro: 100 marks → 5 marks counted
  TOTAL RAD = 100 marks (via AAMCAT only — NOT internal review or attendance)

ASEP — Applied Science & Engineering Project 1 & 2 (XX1011/XX1014) — 2 credits each:
  Mid-Sem Review: 50 marks → 30 marks counted
  End-Sem External Review: 100 marks → 70 marks counted
  TOTAL = 100 marks

GRADES: O/A+(10), A(9), B+(8), B(7), C+(6), C(5), D(4), F(0)
CGPA = sum(grade_points × credits) ÷ total_credits (NOT average of SGPAs)
`
  }

  if (wantsModule) {
    if (isCS || !profile?.major) {
      prompt += `
=== CS/IT/AI BRANCH MODULE SUBJECTS ===
Module 1 subjects (if student has Module 1):
  Linear Algebra, PSP (C language - NOT Python), COA, Web Development, IKS, Student Activity
Module 2 subjects (if student has Module 2):
  Calculus, Applied Electromechanics, Python for Engineers, Data Analysis, UHV, Environmental Studies
Common to ALL (both modules, both sems):
  ASEP-1/ASEP-2, RAD-1/RAD-2, GP-1/GP-2, SRM-1/SRM-2
NOTE: CS/IT/AI branches do NOT have Engineering Graphics
`
    }
    if (isENTC) {
      prompt += `
=== ENTC/INSTRUMENTATION MODULE SUBJECTS ===
Module 1: Linear Algebra(LA), PSP (C language), Electronic Circuits, IKS(Indian Knowledge System),SA (Student Activity)
Module 2: Calculus, Applied Electromechanics, DLD, UHV(Universal Human Values), Environmental Studies
Common: Engineering Graphics, ASEP-1/2, RAD-1/2, GP-1/2, SRM-1/2
`
    }
    prompt += `
=== SUBJECT CREDITS (FY B.TECH) ===
Linear Algebra(LA) / Calculus: 4 credits | PSP(Problem Solving and Programming) (C language): 4 credits | AE: 4 credits
COA / EC / Python / DLD / Web Dev / DA / Engg Graphics / IKS / UHV: 2 credits each
ASEP-1 / ASEP-2 (Applied Sciences and Engineering Project): 2 credits each | SRM(Scientific Research Methods) / RAD(Reasoning and Aptitude Development) / GP(General Proficiency) / Student Activity(SA): 1 credit each
Env Studies: 1 credit |
Semester 1 Total: 20 credits | Semester 2 Total: 20 credits
`
  }

  if (wantsFees) {
    prompt += `
=== VIT PUNE FEES STRUCTURE 2025-26 (FY B.Tech) ===

CAP / ACAP Round (MHT-CET / JEE):
  OPEN: Rs 2,12,165 | OPEN OMS (Outside Maharashtra): Rs 2,12,665
  OBC / EBC / EWS / SEBC: Rs 1,22,600 each
  NT / SBC / OBC-GIRLS / EBC-GIRLS / EWS-GIRLS / SEBC-GIRLS / PH/PWD/ORPHAN / TFWS: Rs 33,035 each
  SC / ST: Rs 6,165 each
  J&K PMSSS: Rs 6,665 | Over and Above: Rs 30,665

Management / Institute Level (IL) Seats:
  Computer Engineering, IT, CS-AI, AI&DS (AIDS), CS-AIML: Rs 6,24,165
  CS-IOT/BCT, CS-DS (Data Science), CS-SE (Software Engg), ENTC, Mechanical: Rs 4,18,165
  Civil Engineering, Instrumentation & Control Engineering: Rs 2,12,165

NRI Seats (all branches): USD $12,000/year + other fees in INR (~Rs 6,665)

CIWGC (Children of Indian Workers in Gulf Countries):
  Computer Engineering: $2,400/year
  IT, CS-AI, CS-AIML, AI&DS: $1,800/year
  CS-IOT/BCT, CS-DS, CS-SE, ENTC, Mechanical, Civil, Instrumentation: $1,200/year

PIO / OCI / Foreign National:
  Computer Engineering: $3,600/year
  IT, CS-AI, CS-AIML, AI&DS: $1,800/year
  CS-IOT/BCT, CS-DS, CS-SE, ENTC, Mechanical, Civil, Instrumentation: $1,200/year

Note: Eligibility & University fees subject to change per SPPU circulars.
`
  }

  if (wantsHoliday) {
    const allHolidays = [
      { d: new Date('2026-02-19'), label: '19/02 (Thu) — Chatrapati Shivaji Maharaj Jayanti' },
      { d: new Date('2026-03-03'), label: '03/03 (Tue) — Dhulivandan (Holi second day)' },
      { d: new Date('2026-03-19'), label: '19/03 (Thu) — Gudhi Padwa' },
      { d: new Date('2026-03-21'), label: '21/03 (Sat) — Ramzan Id' },
      { d: new Date('2026-03-26'), label: '26/03 (Thu) — Ram Navami' },
      { d: new Date('2026-03-31'), label: '31/03 (Tue) — Mahaveer Janma Kalyanak' },
      { d: new Date('2026-04-03'), label: '03/04 (Fri) — Good Friday' },
      { d: new Date('2026-04-14'), label: '14/04 (Tue) — Dr. Babasaheb Ambedkar Jayanti' },
      { d: new Date('2026-05-01'), label: '01/05 (Fri) — Maharashtra Day / Buddha Poornima / Labour Day' },
      { d: new Date('2026-05-28'), label: '28/05 (Thu) — Bakri Id' },
    ]
    const upcoming = allHolidays.filter(h => h.d >= today)
    const past = allHolidays.filter(h => h.d < today)

    const offNums = offDayNums
    const bridges: string[] = []
    for (const {d: hd} of upcoming) {
      for (const offset of [-1,1]) {
        const candidate = new Date(hd); candidate.setDate(hd.getDate()+offset)
        if (offNums.includes(candidate.getDay())) continue
        if (candidate <= today) continue
        let streak = 2
        for (const dir of [-1,1]) {
          let cur = new Date(hd)
          for (let i=0;i<3;i++) {
            cur = new Date(cur); cur.setDate(cur.getDate()+dir)
            if (offNums.includes(cur.getDay()) || allHolidays.some(u=>u.d.getTime()===cur.getTime())) streak++
            else break
          }
        }
        if (streak>=3) bridges.push(`Take ${candidate.toLocaleDateString('en-GB',{weekday:'long',day:'2-digit',month:'2-digit'})} off → ${streak}+ day break`)
      }
    }
    prompt += `
=== SEM II HOLIDAYS 2026 ===
UPCOMING: ${upcoming.map(h=>h.label).join(' | ') || 'None remaining this semester'}
PAST: ${past.map(h=>h.label).join(' | ') || 'None'}
`
    if (bridges.length) prompt += `BRIDGE DAY TIPS for ${userName} (off days: ${offDayNames.join(' & ')}): ${bridges.join(' | ')}
`

    prompt += `
Sem I Holidays (AY 2025-26, already completed):
02/10/2025 — Mahatma Gandhi Jayanti & Dasara | 20-25/10/2025 — Diwali (6 days) | 05/11/2025 — Guru Nanak Jayanti | 25/12/2025 — Christmas | 26/01/2026 — Republic Day
`
  }

  if (wantsClubs) {
    prompt += `
=== VIT PUNE TECHNICAL CLUBS (SA_T) ===
Overall Incharge: Dr. Vikas Kolekar (Asst. Prof., Computer Engineering)

Technical Clubs:
- Microsoft Learn Student Club (MLSC) — Cloud, Web Dev, AI workshops backed by Microsoft
- GedIT Coding Club — competitive programming, hackathons, coding contests
- Google Developer Student Clubs (GDSC) — Google technologies, app development
- IEEE VIT Pune — flagship international engineering society, technical talks
- CSI VIT Pune — Computer Society of India, software & IT events
- ISA VIT Pune — Instrumentation, Automation, robotics events
- TRF – The Robotics Forum — robotics projects and competitions
- Team Endurance Racing — SAE Collegiate club (since 2009), ATV/BAJA racing design
- Team Griffin India — UAV/drone design and competition team
- Team Veloce Racing — formula-style racing vehicle design team
- Team Quark — physics and science club
- Team Vishwanetrutvam — leadership and management club
- Ekasutram — entrepreneurship and startup focused club
- Game Dev+ — game development using Unity, Unreal Engine
- Reality Spectra — AR/VR, mixed reality development
- InnovSphere — innovation and ideation club
- Club Catalyst — research and development projects
- CHESA — Chemical Engineering Students Association
- Indus Connect — cultural and inter-college connects
- Personality Development Club — soft skills, personality enhancement

Co-Curricular Clubs:
- Pi Editorial — college magazine, content writing, journalism
- Antariksh — astronomy and space science
- EPEC — Electronics and PCB design projects
- RangManch — drama, theatre, stage performances
- Abhivridhhi — community development and social welfare
- Team Eklavya — sports and fitness
- Speaker's Club — public speaking, debate, MUN
- VEDC — Vishwakarma Entrepreneurship Development Cell
`
  }

  if (wantsExam) {
    prompt += `
=== EXAM INSTRUCTIONS ===
ONLINE MCQ EXAM (IKS, UHV, Environmental Studies):
  Portal: https://epvit.vierp.in/ | Laptop ONLY (no phone/tablet)
  Join Google Meet first (camera ON, mic mute) → then login to portal
  Camera MUST be on — proctor pauses exam if camera is off
  Tab switching = IMMEDIATE termination of exam
  AI-enabled proctoring + manual proctoring active
  Result shown immediately on screen after MCQ exam ends

OFFLINE EXAM:
  Arrive 30 minutes before exam time | I-CARD compulsory
  Bench No. 1 = always to student's left side
  No entry after first 30 minutes | No exit for first 30 minutes or last 10 minutes
  No mobile phones, no electronic gadgets, no calculator, no written material
  Action taken per institute policy for malpractice / copy cases
  SQAD and CCTV teams monitor continuously
`
  }

  if (wantsAdmission) {
    prompt += `
=== VIT PUNE ADMISSION INFO (FY B.TECH 2025-26) ===
Intake (Branch → Seats):
  Computer Engineering: 720 | IT: 360 | CS-AI: 180 | AI&DS: 180
  CS-AIML: 180 | CS-DS: 180 | CS-SE: 180 | CS-IOT/BCT: 180
  ENTC: 180 | Mechanical: 180 | Civil: 180 | Instrumentation: 60

Admission routes: MHT-CET (CAP), JEE (All India), Direct Second Year (DSE)
International students: visit vishwakarmainternational.com
Hostel: available on campus
`
  }

  prompt += `
=== GRADES & SGPA/CGPA ===
Grade Points: O/A+(10), A(9), B+(8), B(7), C+(6), C(5), D(4), F(0)
SGPA = (Σ grade_points × credits for that semester) ÷ total credits that semester
CGPA = (Σ all grade_points × credits across all semesters) ÷ total credits earned
CGPA ≠ average of SGPAs
`

  if (marketplaceData) prompt += `
=== LIVE MARKETPLACE LISTINGS ===
${marketplaceData}
RULE: Only list what appears above. NEVER invent items not listed.
`
  if (communityData) prompt += `
=== RECENT COMMUNITY POSTS ===
${communityData}
`
  if (timetableData) prompt += `
=== STUDENT'S PERSONAL TIMETABLE ===
${timetableData}
Use exact times shown. NEVER invent room numbers.
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
    const docContent = rawDoc
      .replace(/[^\x20-\x7E\n\r\t]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    if (!message) return NextResponse.json({ reply: 'Please type a message.' })

    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) return NextResponse.json({ reply: '❌ GROQ_API_KEY missing from .env.local' })

    const profile = userId ? await getUserProfile(userId) : null
    const ragContext = await searchRAG(message)

    const isMarketplaceQuery = /market|buy|sell|borrow|listing|available|price|item|object|thing|purchase|lend|lost|found/i.test(message)
    const isCommunityQuery = /community|post|discussion|notice|announcement|recent|latest/i.test(message)
    const isTimetableQuery = /timetable|schedule|today|tomorrow|yesterday|free|slot|class|lecture|when do i|what do i have|monday|tuesday|wednesday|thursday|friday|saturday/i.test(message)

    const [marketplaceData, communityData, timetableData] = await Promise.all([
      isMarketplaceQuery ? getMarketplaceListings() : Promise.resolve(''),
      isCommunityQuery ? getCommunityPosts() : Promise.resolve(''),
      (isTimetableQuery && userId) ? getUserTimetable(userId) : Promise.resolve(''),
    ])

    const wordCount = (docContent.match(/[a-zA-Z]{3,}/g) || []).length
    if (docContent && wordCount < 30) {
      return NextResponse.json({
        reply: `⚠️ I could not read the text from **${docName}**.\n\nThis usually happens because the PDF uses **compressed or encoded fonts**.\n\n**What you can do:**\n- 📋 **Copy-paste** text from your PDF directly into chat\n- 🔄 Convert at **smallpdf.com** or **ilovepdf.com** → paste text\n- 📝 Type your question directly — I know the VIT Pune syllabus!`
      })
    }

    const systemPrompt = docContent
      ? `You are CampusHub AI for VIT Pune. User: ${profile?.full_name || 'Student'}, Branch: ${profile?.major || 'B.Tech'}. Answer questions from the uploaded document accurately and concisely.`
      : buildSystemPrompt(profile, ragContext, marketplaceData, communityData, timetableData, message)

    const MAX_DOC_CHARS = 4000
    const truncated = docContent && docContent.length > MAX_DOC_CHARS
    const userMessage = docContent
      ? `I uploaded "${docName}":\n---\n${docContent.slice(0, MAX_DOC_CHARS)}${truncated ? '\n\n[...truncated...]' : ''}\n---\nQuestion: ${message}`
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
        return NextResponse.json({ reply: '⏳ Rate limit hit — wait a few seconds and try again.', rateLimitSeconds: parseInt(retryAfter) })
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