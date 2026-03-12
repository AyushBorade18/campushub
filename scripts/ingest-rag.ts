/**
 * RAG Data Ingestion Script
 * Run: npx ts-node scripts/ingest-rag.ts
 * 
 * This chunks all VIT Pune knowledge and stores it as vectors in Supabase.
 * Only needs to run ONCE (or when you update knowledge).
 */

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // need service role for ingestion
)

const HF_MODEL = 'sentence-transformers/all-MiniLM-L6-v2'

async function embed(text: string): Promise<number[]> {
  const res = await fetch(
    `https://api-inference.huggingface.co/pipeline/feature-extraction/${HF_MODEL}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ inputs: text, options: { wait_for_model: true } })
    }
  )
  const data = await res.json()
  return Array.isArray(data[0]) ? data[0] : data
}

// ===== ALL VIT PUNE KNOWLEDGE =====
const VIT_DOCUMENTS = [
  {
    title: 'Academic Calendar 2025-26',
    content: `VIT Pune Academic Calendar AY 2025-26:
Semester I: Started 15 September 2025. Mid-Sem: 17-22 November 2025. Lab/Project Exams: 26 Dec 2025 - 8 Jan 2026. End-Sem: 12-28 January 2026.
Semester II (CURRENT): Started 9 February 2026. Mid-Sem Exam: 15-18 April 2026. Lab/Project Exams: 18-30 May 2026. End-Sem: 8-24 June 2026. Next Semester starts: 6 July 2026.
Today is March 2026. We are in Semester II. Next exam is Mid-Sem on 15 April 2026 — about 5-6 weeks away.`
  },
  {
    title: 'Semester II Holidays',
    content: `Semester II 2026 Holidays:
- Shivaji Jayanti: 19 February 2026
- Holi/Dhulivandan: 3 March 2026 (already passed)
- Gudhi Padwa: 19 March 2026 (upcoming)
- Ramzan Id: 21 March 2026
- Ram Navami: 26 March 2026
- Mahaveer Kalyanak: 31 March 2026
- Good Friday: 3 April 2026
- Ambedkar Jayanti: 14 April 2026
- Maharashtra Day / Labour Day / Buddha Poornima: 1 May 2026
- Bakri Id: 28 May 2026`
  },
  {
    title: 'Semester I Subjects - Core',
    content: `Semester I Core Subjects (ALL students):
1. Linear Algebra (HS1084) - 4 credits. Topics: Equation systems, Vector spaces, Inner product spaces, Linear transforms, Eigenvalues, SVD.
2. PSP / C Language (CS1012) - 4 credits. Topics: Algorithms, C basics, data types, loops, functions, recursion, pointers, file handling.
3. Engineering Graphics (ME1017) - 2 credits. Topics: Projections, orthographic views, isometric drawing, AutoCAD basics.
4. Environmental Studies (HS1082) - 1 credit. Topics: SDGs, pollution, biodiversity, Indian environmental laws.
5. Scientific Research Methods 1 (XX1013) - 1 credit. Topics: Research methodology, IPR, plagiarism.
6. ASEP 1 (XX1011) - 2 credits. Project-based learning, prototype building, IEEE paper writing.
7. RAD 1 (HS1072) - 1 credit. English, logical and quantitative aptitude.
8. General Proficiency 1 (HS1074) - 1 credit. Communication, public speaking.
9. Induction Training (HS1027) - Audit course.`
  },
  {
    title: 'Semester I Module 1 Subjects',
    content: `Semester I Module 1 elective subjects (for students assigned Module 1):
1. COA - Computer Organization and Architecture (XX1016) - 2 credits. Topics: Von Neumann architecture, instruction cycle, CPU arithmetic, RISC vs CISC, memory hierarchy, I/O interfaces, DMA.
2. Electronic Circuits (XX1016) - 2 credits. Topics: KCL/KVL, network theorems, diodes, BJT configurations.
3. Web Development (XX1015) - 2 credits. Topics: HTML5, CSS3, JavaScript ES2024, DOM manipulation, jQuery, Bootstrap.
4. Indian Knowledge System IKS (HS1073) - 2 credits. Topics: Vedas, ancient Indian universities, Indian mathematics, engineering heritage.`
  },
  {
    title: 'Semester I Module 2 Subjects',
    content: `Semester I Module 2 elective subjects (for students assigned Module 2):
1. Python for Engineers (CS1018) - 2 credits. Topics: Python basics, data structures, functions, NumPy, Matplotlib.
2. Data Analysis (XX1017) - 2 credits. Topics: Excel, PivotTables, statistics, regression analysis, Power BI.
3. Digital Logic Design and Testing (ET1017) - 2 credits. Topics: Number systems, Boolean algebra, K-map, combinational circuits, fault testing.
4. Universal Human Values UHV (HS1077) - 2 credits. Topics: Value education, harmony in self, family, and society.`
  },
  {
    title: 'Semester II Subjects - Core',
    content: `Semester II Core Subjects (ALL students, currently running):
1. Calculus (HS1085) - 4 credits. Topics: Series, partial differentiation, vector differentiation, multiple integrals, linear differential equations.
2. Applied Electromechanics (ET1012) - 4 credits. Topics: Robotics, actuators, motors, Arduino, sensors, digital electronics.
3. Engineering Graphics - continued from Sem I.
4. Environmental Studies - continued.
5. Scientific Research Methods 2 (XX1015) - 1 credit. Journals, patents, entrepreneurship.
6. ASEP 2 (XX1014) - 2 credits. Continuation of ASEP 1, publication and patent filing.
7. RAD 2 (HS1079) - 1 credit. Advanced English, logical and quantitative aptitude.
8. General Proficiency 2 (HS1080) - 1 credit. Group discussion, interview prep, team building.`
  },
  {
    title: 'Semester II Module 1 Subjects',
    content: `Semester II Module 1 subjects (currently running for Module 1 students):
1. COA - Computer Organization and Architecture - 2 credits.
2. Electronic Circuits - 2 credits.
3. Web Development - 2 credits.
4. Indian Knowledge System IKS - 2 credits.`
  },
  {
    title: 'Semester II Module 2 Subjects',
    content: `Semester II Module 2 subjects (currently running for Module 2 students):
1. Python for Engineers - 2 credits.
2. Data Analysis - 2 credits.
3. Digital Logic Design and Testing - 2 credits.
4. Universal Human Values UHV - 2 credits.`
  },
  {
    title: 'Exam Pattern and Marks Distribution',
    content: `VIT Pune Official Exam Pattern (A-24 Pattern):
All subjects are out of 100 marks total.

BSE Maths — Linear Algebra (HS1084) / Calculus (HS1085) — 4 credits:
Mid-Sem Written Exam: 30 marks paper converted to 25 marks
End-Sem Written Exam: 100 marks paper converted to 50 marks
Assignment/Tutorial (In-Semester): 100 marks converted to 25 marks
TOTAL = 100 marks

PCC — COA / Electronic Circuits — 2 credits:
Mid-Sem Written Exam: 30 marks converted to 25 marks
End-Sem Written Exam: 100 marks converted to 50 marks
Comprehensive Viva Voce (End-Sem): 100 marks converted to 25 marks
TOTAL = 100 marks

ESE — PSP / Problem Solving & Programming:
Mid-Sem Written Exam: 30 marks converted to 25 marks
End-Sem LAB + Comprehensive Viva Voce: 100 marks converted to 50 marks
Course Project (End-Sem): 100 marks converted to 25 marks
TOTAL = 100 marks

ESE — Applied Electromechanics (ET1012):
NO Mid-Sem exam
End-Sem Written Exam: 100 marks converted to 50 marks
End-Sem LAB: 100 marks converted to 25 marks
Course Project (End-Sem): 100 marks converted to 25 marks
TOTAL = 100 marks

BSE/VSEC — Web Development / Data Analysis / Digital Logic Design:
NO Mid-Sem exam. NO theory exam.
End-Sem LAB + Comprehensive Viva Voce: 100 marks converted to 50 marks
Course Project (End-Sem): 100 marks converted to 50 marks
TOTAL = 100 marks

IKS — Indian Knowledge System: End-Sem MCQ Exam = 100 marks. No Mid-Sem.
UHV — Universal Human Values: End-Sem MCQ Exam = 100 marks. No Mid-Sem.
Environmental Studies: End-Sem MCQ 100 marks converted to 50 + PPT 50 marks = 100 total.

Mid-Sem duration: 1 hour. End-Sem duration: 2.5 hours.`
  },
  {
    title: 'Campus Facilities',
    content: `VIT Pune Campus Facilities:
Mess timings: Breakfast 7-9 AM, Lunch 12:30-2:30 PM, Snacks 5-6 PM, Dinner 7:30-9:30 PM.
Library: Monday to Saturday 8 AM - 10 PM, Sunday 10 AM - 6 PM. Fine: Rs 2 per book per day.
Hostel curfew: 10 PM on weekdays, 11 PM on weekends.
WiFi: Network name VIT_STUDENT, password printed on your ID card.
Minimum attendance required: 75% for End-Semester exam. Below 75% means debarred.`
  },
  {
    title: 'Module System at VIT Pune',
    content: `VIT Pune Module System:
Students are divided into Module 1 and Module 2 groups. Different branches and divisions are assigned different modules each semester.

Module 1 subjects: COA (Computer Organization and Architecture), Electronic Circuits, Web Development, Indian Knowledge System (IKS).

Module 2 subjects: Python for Engineers, Data Analysis, Digital Logic Design and Testing, Universal Human Values (UHV).

When a student says "I have Module 1" it means they are studying COA, Electronic Circuits, Web Development, and IKS right now.
When a student says "I have Module 2" it means they are studying Python, Data Analysis, Digital Logic, and UHV right now.

Common subjects for ALL students regardless of module: Linear Algebra + PSP in Sem 1, Calculus + Applied Electromechanics in Sem 2, Engineering Graphics, Environmental Studies, Sci Research Methods, ASEP, RAD, General Proficiency.`
  },
  {
    title: 'VIT Pune About and Overview',
    content: `Vishwakarma Institute of Technology (VIT) Pune:
VIT Pune is an autonomous engineering college in Pune, Maharashtra, India.
Affiliated to Savitribai Phule Pune University (SPPU).
Established in 1983 by the Vishwakarma Educational Society.
Located at 666, Upper Indiranagar, Bibwewadi, Pune - 411037.
NAAC A+ accredited. NBA accredited programs.
Known for strong placements in CS, IT, ENTC, and Mechanical branches.
Popular departments: Computer Engineering, IT, AI/ML, ENTC, Mechanical, Civil.
FY B.Tech follows the A-24 curriculum pattern.
The college has a strong technical fest called Vishwakarma.`
  },
  {
    title: 'CampusHub Features Guide',
    content: `CampusHub is a student platform for VIT Pune students.
Features:
- Dashboard: Overview of your activity and quick links.
- Marketplace: Buy, sell, borrow books, electronics, stationery. Post listings with images.
- Community: Share posts, notes, questions. Upload images. Like and comment.
- Messages: Direct messaging between students.
- AI Chatbot: Smart AI assistant that knows about VIT Pune academics, exams, and campus life.
- Profile: Update your name, branch, and year.
How to use marketplace: Click New Listing, fill title, description, price, category, upload image, post.
How to use community: Click New Post, write your message, optionally add image, share with everyone.`
  }
]

// Chunk text into smaller pieces with overlap
function chunkText(text: string, chunkSize = 500, overlap = 100): string[] {
  const chunks: string[] = []
  let start = 0
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length)
    chunks.push(text.slice(start, end))
    start += chunkSize - overlap
    if (start >= text.length) break
  }
  return chunks
}

async function ingest() {
  console.log('🚀 Starting RAG ingestion...')
  console.log(`📚 ${VIT_DOCUMENTS.length} documents to process`)

  // Clear existing documents
  await supabase.from('rag_documents').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  console.log('🗑️ Cleared existing documents')

  let totalChunks = 0

  for (const doc of VIT_DOCUMENTS) {
    console.log(`\n📄 Processing: ${doc.title}`)
    const chunks = chunkText(doc.content)
    console.log(`   ${chunks.length} chunks`)

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      const embedding = await embed(chunk)

      await supabase.from('rag_documents').insert({
        title: doc.title,
        content: chunk,
        embedding,
        metadata: { source: 'vit-pune-kb', chunk: i }
      })

      totalChunks++
      process.stdout.write('.')
      // Small delay to avoid rate limits
      await new Promise(r => setTimeout(r, 200))
    }
    console.log(' ✅')
  }

  console.log(`\n\n✅ Done! Ingested ${totalChunks} chunks from ${VIT_DOCUMENTS.length} documents.`)
}

ingest().catch(console.error)
