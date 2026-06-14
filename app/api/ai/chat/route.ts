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
  const wantsModule   = /module|subject|syllabus|topic|topics|important|unit|chapter|coa|psp|web.?dev|web development|calculus|python|data analysis|linear algebra|applied electro|dld|iks|uhv|asep|rad|gp|srm|environmental|student activity|bootstrap|jquery|javascript|html|css/i.test(message)
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

=== CRITICAL ANTI-HALLUCINATION RULES ===
1. Web Development syllabus at VIT Pune is: HTML5, CSS3, JavaScript (ECMA 2024 functional+OOP), jQuery 3.7, Bootstrap 4/5.
   NEVER mention React, Angular, Node.js, Express, MongoDB, MySQL, or any backend technology — these are NOT in the FY Web Dev syllabus.
2. For important topics, ONLY use the official syllabus units listed below. Do NOT add topics from general knowledge.
3. Credits: TOTAL = 20 per semester. Module subjects = 15 credits. Common (ASEP+RAD+GP+SRM) = 5 credits. 15+5=20.
4. RAD/GP/SRM/ASEP are studied in BOTH Semester 1 AND Semester 2 by ALL students regardless of module.
5. Student Activity (1 credit) is Module 1 only. Environmental Studies (1 credit) is Module 2 only.

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

BSE MATHS — Linear Algebra (HS1084) — 4 credits (Module 1):
  IMPORTANT EXAM TOPICS: Rank of matrix, Gaussian elimination, Gram-Schmidt process, Eigenvalues & Eigenvectors, Cayley-Hamilton theorem, Diagonalization, Singular Value Decomposition (SVD), Quadratic forms
  Textbooks: Elementary Linear Algebra by Howard Anton; Linear Algebra by David C. Lay
  Mid-Sem Written Exam: 30 marks paper → 25 marks counted
  End-Sem Written Exam: 100 marks paper → 50 marks counted
  Tutorial (In-Semester): 100 marks → 25 marks counted
  TOTAL = 100 marks
  LINEAR ALGEBRA SYLLABUS:
  Section I: System of Linear Equations (Rank, Row Echelon Form, Gaussian Elimination),
    Vector Spaces (subspace, spanning set, linear dependence/independence, basis & dimension,
    row/column/null space), Inner Product Spaces (norm, distance, angle, projection, orthogonal
    vectors, Gram-Schmidt process, least squares fitting)
  Section II: Linear Transformations (matrix representation, kernel & range, rank-nullity theorem,
    orthogonal transformation, geometric transformations in R2), Eigen Values & Eigen Vectors
    (algebraic & geometric multiplicity, Cayley-Hamilton theorem, diagonalization, orthogonal
    diagonalization), Quadratic Forms (nature, canonical form, Principal Axes Theorem, SVD)
  Textbooks: Howard Anton & Chris Rorres (Elementary Linear Algebra), David C. Lay, Gilbert Strang

BSE MATHS — Calculus (HS1085) — 4 credits (Module 2):
  IMPORTANT EXAM TOPICS: Tests of Convergence (Comparison & Ratio test), Taylor's & Maclaurin's Series, Euler's theorem on homogeneous functions, Lagrange's method, Jacobian, Gradient/Divergence/Curl, Double integration, Change of order of integration, Bernoulli's differential equation, Linear DE of higher order
  Textbooks: Higher Engineering Mathematics by B.S. Grewal
  Mid-Sem Written Exam: 30 marks paper → 25 marks counted
  End-Sem Written Exam: 100 marks paper → 50 marks counted
  Tutorial (In-Semester): 100 marks → 25 marks counted
  TOTAL = 100 marks
  CALCULUS SYLLABUS:
  Section I: Infinite Series & Expansion (convergence tests, power series, Taylor's & Maclaurin's),
    Partial Differentiation (partial derivatives, Euler's theorem, composite functions, total
    derivative, implicit differentiation), Applications (maxima/minima of two variables, Lagrange
    multipliers, errors & approximations, Jacobian)
  Section II: Vector Differentiation (Del operator, Gradient, Directional Derivative, Divergence,
    Curl, Scalar Potential), Multiple Integration (double/triple integration, polar coordinates,
    change of order, area using double integration), Linear Differential Equations (reducible to
    linear form, Bernoulli's, higher order, variation of parameters, applications)
  Textbooks: B.S. Grewal (Higher Engineering Mathematics), Erwin Kreyszig

PCC — COA / Computer Organization and Architecture (XX1016) — 2 credits (CS/IT/AI Module 1):
  Mid-Sem Written Exam: 30 marks paper → 25 marks counted
  End-Sem Written Exam: 100 marks paper → 50 marks counted
  Comprehensive Viva Voce (End-Sem): 100 marks → 25 marks counted
  TOTAL = 100 marks
  COA SYLLABUS:
  Section I: Von Neumann Architecture, Instruction Cycle, Instruction Pipeline, RAM Model,
    Evolution of Intel (4-bit to 64-bit), Integer Representation, 2's Complement Arithmetic,
    Booth's Algorithm (multiplication), Restoring Division Algorithm, IEEE Floating Point Standards,
    RISC vs CISC features, Superscalar & Super Pipelined Processors, Single Bus CPU Organization,
    Register Transfers, Hardwired & Micro-programmed Control, Microinstructions
  Section II: I/O System (I/O modules, Programmed I/O, Interrupt-driven I/O, DMA),
    Memory Organization (RAM — SRAM & DRAM, ROM types, Cache Memory, address mapping,
    virtual memory), Parallel Processing (PRAM model, Flynn's Classification, Multicore
    Architecture, Case Study: Core2Duo)
  Textbooks: William Stallings (Computer Org & Architecture), C. Hamacher (Computer Organization)

PCC — Electronic Circuits (XX1016/ET1016) — 2 credits (ENTC/Instrumentation Module 1):
  Mid-Sem Written Exam: 30 marks paper → 25 marks counted
  End-Sem Written Exam: 100 marks paper → 50 marks counted
  Comprehensive Viva Voce (End-Sem): 100 marks → 25 marks counted
  TOTAL = 100 marks
  ELECTRONIC CIRCUITS SYLLABUS:
  Section I: Components (Resistor, Capacitor, Inductor — series/parallel combinations, star-delta),
    Independent/Dependent Sources, KCL & KVL, Network Theorems (Superposition, Norton's,
    Thevenin's, Maximum Power Transfer), Two Port Networks (Z, Y, H, ABCD parameters)
  Section II: Semiconductor Diodes (characteristics, rectifier, RC filter, clipper, clamper), BJT
    (construction, biasing, Q point, CE/CB/CC configurations, frequency response),
    Transistor small signal amplifier (CE configuration, h-parameter model)

ESE — PSP / Problem Solving & Programming (CS1012) — 4 credits (ALL branches, Module 1):
  Mid-Sem Written Exam: 30 marks paper → 25 marks counted
  End-Sem LAB + Comprehensive Viva Voce: 100 marks → 50 marks counted
  Course Project (End-Sem): 100 marks → 25 marks counted
  TOTAL = 100 marks
  PSP SYLLABUS (C Language):
  Section I: Problem solving life cycle, TOP-DOWN approach, Logic (positive/negative),
    Algorithms (properties: finiteness, definiteness, input, output, effectiveness), Flowcharts,
    Structure of C program, Header files, Compiler/Interpreter/Assembler/Linker,
    Tokens (identifiers, keywords, constants, strings, operators), Data types (primary/secondary/
    user-defined), Operators (arithmetic, relational, logical, bitwise, conditional/ternary,
    assignment, special), Operator precedence, Control Structures (if, if-else, nested if-else,
    else-if ladder, switch-case, goto, continue, break), Loops (for, while, do-while, nested)
  Section II: Functions (declaration, definition, call, user-defined & library, call by value/
    reference, array as parameter, returning array), Recursion (factorial, Fibonacci),
    Structures & Union (declaration, variable declaration, memory representation, array of
    structures, nested structure, difference between structure and union), Pointers (declaration,
    pointer arithmetic, pointer to array, pointer to function, dynamic memory allocation:
    malloc/calloc/realloc/free), File Handling (FILE pointer, fopen, read/write/append, fscanf/fprintf)
  Lab: Programs on operators, control structures, arrays, functions, recursion, structures, pointers, files
  Textbooks: Yashwant Kanetkar (Let us C), E. Balaguruswamy (Programming in ANSI C)

PCC — Python for Engineers (CS1018) — 2 credits (ALL branches, Module 2):
  Mid-Sem Written Exam: 30 marks paper → 25 marks counted
  End-Sem LAB + Comprehensive Viva Voce: 100 marks → 50 marks counted
  Course Project (End-Sem): 100 marks → 25 marks counted
  TOTAL = 100 marks
  PYTHON SYLLABUS:
  Section I: Features of Python, Identifiers, Keywords, Variables, Comments, Indentation,
    Input/Output, Operators (arithmetic, relational, logical, bitwise), Mathematical &
    Trigonometric Functions, Strings (subscript, indexing, slicing, string methods),
    Flow Control (if, if-else, if-elif-else, nested if), Loops (while, for, range(), continue,
    break, pass, else with loops)
  Section II: In-built Data Structures (List, Tuple, Set, Dictionary — mutable/immutable,
    type conversion, built-in methods, comprehensions), Functions (definition, arguments,
    lambda/anonymous functions, recursion, multiple return values, default & keyword parameters),
    File Handling (open, modes, read/write, file methods), NumPy (arrays, indexing, array math,
    broadcasting), Matplotlib (plot, subplots, images — line/bar/pie/scatter/histogram charts)
  Textbooks: Ashok Kamthane (Programming And Problem Solving With Python), John Paul Mueller

ESE — Applied Electromechanics (ET1012) — 4 credits (ALL branches, Module 2):
  NO Mid-Sem exam
  End-Sem Written Exam: 100 marks → 50 marks counted
  End-Sem LAB: 100 marks → 25 marks counted
  Course Project (End-Sem): 100 marks → 25 marks counted
  TOTAL = 100 marks
  APPLIED ELECTROMECHANICS SYLLABUS:
  Section I: Electromechanical systems (block diagram, classification, robot terminology, accuracy/
    precision/resolution/repeatability, forward & inverse kinematics, transformation matrix),
    Actuators (Pneumatic, Hydraulic, Electrical — Solenoid, Relay, DC/BLDC/Stepper/Servo motors,
    merits/demerits, selection criteria), End Effectors & Robot Controls (mechanical/magnetic/vacuum/
    adhesive grippers, gripper force analysis, open/closed loop control)
  Section II: Electronic devices (Diodes, Zener, LED, BJT, FET, MOSFET, IGBT, Op-amp),
    Digital Electronics (Logic gates, Flip-flop, Counters, Register, ADC, DAC),
    Microcontroller ATmega328P (architecture, ports, registers, memory, timer/counter, PWM,
    interrupts, Serial I/O, I2C, SPI), Sensors (Proximity, Tactile, Light/IR/Photodiode,
    Opto-isolators, Opto-encoders, Gyroscope, Hall-effect, Temperature, Ultrasonic — interfacing)
  Lab: Arduino UNO — LED blinking, traffic signals, push button, LDR, ultrasonic sensor, IR array,
    temperature sensor, LCD, PMDC motor, servo motor
  Textbooks: R.K. Mittal & I.J. Nagrath (Robotics and Control)

BSE/VSEC — Web Development (XX1015) — 2 credits:
  NO Mid-Sem. NO written theory exam.
  End-Sem LAB + Comprehensive Viva Voce: 100 marks → 50 marks counted
  Course Project (End-Sem): 100 marks → 50 marks counted
  TOTAL = 100 marks

  WEB DEVELOPMENT SYLLABUS (Official VIT Pune, A-24 Pattern):
  Section I:
    Unit 1 — HTML5: document structure, elements (Root, Metadata, Sections, Text-Level Semantic,
      Embedded Content like images/iframe/multimedia, Tabular Data, Grouping Tags, Edit Elements)
    Unit 2 — CSS3: Syntax, Selectors, Color/Background/Cursor, Text/Fonts, Lists/Tables,
      Box Model, Display/Positioning, Floats and Clear Properties
    Unit 3 — JavaScript (Functional) ECMA 2024: Variables, Data Types, Operators, Strings,
      Conditional Statements (if-else, switch), Loops (for, while), Arrays, Objects, Functions,
      Math Objects, String Objects, Try/Catch error handling
  Section II:
    Unit 4 — JavaScript (OOP) ECMA 2024: Classes, Constructors, Inheritance, Destructuring,
      Spread/Rest Operators, Modules, DOM Manipulation, Selectors, JSON
    Unit 5 — jQuery 3.7.x: Loading jQuery, selecting elements, changing styles, creating/appending/
      removing elements, handling events
    Unit 6 — Bootstrap 4 & 5: Responsive Web Design, Mobile-first approach, Containers (Fixed/Fluid),
      Grid System, Typography, Colors, Tables, Images, Alerts

  Lab Practicals: 6 progressive assignments building a website for VIT clubs using HTML → CSS →
    JavaScript → OOP JS → jQuery → Bootstrap (each extends the previous)
  Project Areas: Government department web apps (Sports, Cultural, Agriculture, Finance, GST Billing)

  IMPORTANT EXAM TOPICS FOR WEB DEVELOPMENT:
    High priority: CSS Box Model, JavaScript DOM manipulation, JSON, Bootstrap Grid System, jQuery event handling
    Section I focus: HTML semantic elements, CSS selectors & positioning, JS functions & arrays, error handling (try/catch)
    Section II focus: JS Classes & inheritance, DOM manipulation, jQuery library methods, Bootstrap responsive design
    Project: Must use HTML+CSS+JS+jQuery+Bootstrap together (all 6 practicals are one progressive project)
  NOTE: WD has NO written theory exam, NO Mid-Sem paper. Assessment is 100% lab + project + viva.
  NEVER suggest studying React, Angular, Node.js, backend tech — NOT in this course.

BSE/VSEC — Data Analysis (XX1017) — 2 credits:
  NO Mid-Sem. NO written theory exam.
  End-Sem LAB + Comprehensive Viva Voce: 100 marks → 50 marks counted
  Course Project (End-Sem): 100 marks → 50 marks counted
  TOTAL = 100 marks

  DATA ANALYSIS SYLLABUS:
  Section I: Excel basics (workbooks, formulas, functions, cell references, sorting, querying, VLOOKUP),
    PivotTables, Charts (Chart Wizard, formatting, multiple variables)
  Section II: Statistics (Mean, Median, Mode, Skewness, Normal Distribution, Standard Deviation,
    Variance, ANOVA, Probability, Hypothesis Testing, Derivatives, Vectors, Matrices),
    Regression & Correlation (Simple Linear Regression, Correlation Matrix, Outlier analysis,
    Box & whisker plots, Scatter plots), Power BI (ETL, data visualization, analytics)

BSE/VSEC — DLD — Digital Logic Design and Testing (ET1017) — 2 credits:
  (ENTC/Instrumentation branches only)
  NO Mid-Sem. NO written theory exam.
  End-Sem LAB + Comprehensive Viva Voce: 100 marks → 50 marks counted
  Course Project (End-Sem): 100 marks → 50 marks counted
  TOTAL = 100 marks

  DLD SYLLABUS:
  Section I: Number Systems, Binary Arithmetic, Binary Codes, Logic Gates, Boolean Algebra,
    Logic Simplification, Basic Combinational Logic Circuit Design
  Section II: Arithmetic Circuits, Multiplexers/Demultiplexers, Encoders/Decoders,
    Fault types (stuck-at-0, stuck-at-1, stuck open, stuck short), Functionality testing

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
=== CS/IT/AI BRANCH MODULE SUBJECTS & CREDITS ===

Module 1 subjects (4 subjects + Student Activity):
  Linear Algebra — 4 credits
  PSP (C language - NOT Python) — 4 credits
  COA — 2 credits
  Web Development — 2 credits
  IKS — 2 credits
  Student Activity — 1 credit
  Module 1 subtotal = 15 credits

Module 2 subjects (4 subjects + Env Studies):
  Calculus — 4 credits
  Applied Electromechanics — 4 credits
  Python for Engineers — 2 credits
  Data Analysis — 2 credits
  UHV — 2 credits
  Environmental Studies — 1 credit
  Module 2 subtotal = 15 credits

Common to ALL students (added each semester, same for Module 1 and 2):
  ASEP (Applied Science & Engineering Project) — 2 credits
  RAD (Reasoning and Aptitude Development) — 1 credit
  GP (General Proficiency) — 1 credit
  SRM (Scientific Research Methods) — 1 credit
  Common subtotal = 5 credits

TOTAL PER SEMESTER = 15 (module) + 5 (common) = 20 credits
NOTE: CS/IT/AI branches do NOT have Engineering Graphics
CRITICAL CREDITS RULES:
  - Student Activity (1 cr) = Module 1 ONLY (Sem 1 for some, Sem 2 for others depending on when they have Module 1)
  - Environmental Studies (1 cr) = Module 2 ONLY
  - RAD (1 cr) + GP (1 cr) + SRM (1 cr) + ASEP (2 cr) = 5 credits = COMMON to ALL students EVERY semester
  - TOTAL each semester = 15 (module) + 5 (common) = 20 credits
  - Over 2 semesters FY = 40 total credits (20 per sem)
  - When student says "in my module" they mean CURRENTLY — answer for what they said (Module 1 or 2)
  - NEVER say common subjects "will be studied" — they ARE being studied RIGHT NOW in this semester
`
    }
    if (isENTC) {
      prompt += `
=== ENTC/INSTRUMENTATION MODULE SUBJECTS & CREDITS ===

Module 1 subjects:
  Linear Algebra — 4 credits
  PSP (C language) — 4 credits
  Electronic Circuits — 2 credits
  IKS — 2 credits
  Student Activity — 1 credit
  Module 1 subtotal = 13 credits

Module 2 subjects:
  Calculus — 4 credits
  Applied Electromechanics — 4 credits
  DLD (Digital Logic Design & Testing) — 2 credits
  UHV — 2 credits
  Environmental Studies — 1 credit
  Module 2 subtotal = 13 credits

Common to ALL students:
  Engineering Graphics — 2 credits
  ASEP — 2 credits
  RAD — 1 credit
  GP — 1 credit
  SRM — 1 credit
  Common subtotal = 7 credits

TOTAL PER SEMESTER = 13 (module) + 7 (common) = 20 credits
`
    }
    prompt += `
=== SUBJECT CREDITS (FY B.TECH) ===
4 credits: Linear Algebra, Calculus, PSP (C language), Applied Electromechanics
2 credits: COA, Electronic Circuits, Python for Engineers, DLD, Web Dev, Data Analysis, Engineering Graphics, IKS, UHV, ASEP
1 credit: SRM, RAD, GP, Student Activity, Environmental Studies
Semester 1 Total: 20 credits | Semester 2 Total: 20 credits
EVERY student has exactly 20 credits per semester regardless of module.
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