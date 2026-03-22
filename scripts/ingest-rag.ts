/**
 * RAG Data Ingestion Script — Full VIT Pune Knowledge Base
 * Source: Official PDFs (Academic Calendar, Syllabus, Marking Scheme, Fees) + vit.edu
 * Run: npx ts-node scripts/ingest-rag.ts
 * Run ONCE (or whenever knowledge is updated).
 */

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
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

// ===== COMPLETE VIT PUNE KNOWLEDGE BASE =====
const VIT_DOCUMENTS = [

  // ── ACADEMIC CALENDAR ──────────────────────────────────────────────────
  {
    title: 'Academic Calendar Semester II AY 2025-26',
    content: `VIT Pune Academic Calendar — Semester II, AY 2025-26 (Currently Running):
Start of Semester II: 09/02/2026
Mid-Semester Examinations and Reviews: 15/04/2026 to 18/04/2026
Laboratory Assessments, In-Semester Reviews, Course Project Examinations: 18/05/2026 to 30/05/2026
End Semester Remedial Teaching: 05/06/2026 to 06/06/2026
End Semester Examinations: 08/06/2026 to 24/06/2026
End of Semester II: 22/06/2026
Tentative Commencement of Next Semester: 06/07/2026
Dean of Academics: Prof. (Dr.) Parikshit Mahalle

Semester II Holidays:
1. 19/02/2026 Thursday — Chatrapati Shivaji Maharaj Jayanti
2. 03/03/2026 Tuesday — Dhulivandan (Holi second day)
3. 19/03/2026 Thursday — Gudhi Padwa
4. 21/03/2026 Saturday — Ramzan Id
5. 26/03/2026 Thursday — Ram Navami
6. 31/03/2026 Tuesday — Mahaveer Janma Kalyanak
7. 03/04/2026 Friday — Good Friday
8. 14/04/2026 Tuesday — Dr. Babasaheb Ambedkar Jayanti
9. 01/05/2026 Friday — Maharashtra Day / Buddha Poornima / Labour Day
10. 28/05/2026 Thursday — Bakri Id`
  },
  {
    title: 'Academic Calendar Semester I AY 2025-26',
    content: `VIT Pune Academic Calendar — Semester I, AY 2025-26 (Completed):
Start of Semester I: 15/09/2025
Mid-Semester Examinations and Reviews: 17/11/2025 to 22/11/2025
Laboratory Assessments, In-Semester Reviews, Course Project Examinations: 26/12/2025 to 08/01/2026
End Semester Remedial Teaching: 09/01/2026 to 10/01/2026
End Semester Examinations: 12/01/2026 to 28/01/2026
End of Semester I: 28/01/2026

Semester I Holidays (all completed):
1. 02/10/2025 Thursday — Mahatma Gandhi Jayanti and Vijaya Dashami/Dasara
2. 20/10/2025 to 25/10/2025 (Monday–Saturday) — Diwali (6 days off)
3. 05/11/2025 Wednesday — Guru Nanak Jayanti
4. 25/12/2025 Thursday — Christmas
5. 26/01/2026 Monday — Republic Day`
  },

  // ── FY B.TECH SYLLABUS STRUCTURE ──────────────────────────────────────
  {
    title: 'FY B.Tech Course Structure and Module System',
    content: `VIT Pune FY B.Tech Course Structure — Pattern A-24, AY 2025-26

MODULE SYSTEM: Every student is assigned either Module 1 or Module 2. They study ONLY their module subjects plus common subjects. Modules run simultaneously each semester.

MODULE 1 subjects (for CS/IT/AI/AIDS branches):
- Linear Algebra (HS1084) — 4 credits — BSE — Theory 3hr + Tutorial 1hr per week
- Problem Solving and Programming PSP (CS1012) — 4 credits — ESE — C Language — Theory 3hr + Lab 2hr per week
- Computer Organization and Architecture COA (XX1016) — 2 credits — PCC — Theory 2hr per week
- Electronic Circuits (XX1016) — 2 credits — PCC — Theory 2hr per week (for ENTC/Instrumentation branches)
- Web Development (XX1015) — 2 credits — VSEC — Theory 1hr + Lab 2hr per week
- Indian Knowledge System IKS (HS1073) — 2 credits — HSM — Theory 2hr per week
- Student Activity (HS1083) — 1 credit — Lab 2hr per week

MODULE 2 subjects (for CS/IT/AI/AIDS branches):
- Calculus (HS1085) — 4 credits — BSE — Theory 3hr + Tutorial 1hr per week
- Applied Electromechanics AE (ET1012) — 4 credits — ESE — Theory 3hr + Lab 2hr per week
- Python for Engineers (CS1018) — 2 credits — PCC — Theory 1hr + Lab 2hr per week
- Data Analysis (XX1017) — 2 credits — VSEC — Theory 1hr + Lab 2hr per week
- Digital Logic Design and Testing DLD (ET1017) — 2 credits — VSEC — Theory 1hr + Lab 2hr per week (for ENTC)
- Universal Human Values UHV (HS1077) — 2 credits — HSM — Theory 2hr per week
- Environmental Studies (HS1082) — 1 credit — Theory 1hr per week

COMMON SUBJECTS (ALL students, regardless of module):
Semester 1:
- Scientific Research Methods 1 SRM (XX1013/ES1056) — 1 credit
- Applied Science & Engineering Project 1 ASEP (XX1011/ES1057) — 2 credits
- Reasoning and Aptitude Development 1 RAD (HS1072) — 1 credit
- General Proficiency 1 GP (HS1074) — 1 credit
- Induction Training (HS1027) — Audit (0 credits)

Semester 2:
- Scientific Research Methods 2 SRM (XX1020/XX1015) — 1 credit
- Applied Science & Engineering Project 2 ASEP (XX1014) — 2 credits
- Reasoning and Aptitude Development 2 RAD (HS1079) — 1 credit
- General Proficiency 2 GP (HS1080) — 1 credit
- Indian Democracy and Constitution IDC (HS1036) — Audit (0 credits)

BRANCH-SPECIFIC NOTES:
- CS/IT/AI/AIDS branches: Web Development (Mod 1), Data Analysis (Mod 2) — NO Engineering Graphics
- ENTC/Instrumentation: Electronic Circuits (Mod 1), Digital Logic Design (Mod 2), Engineering Graphics (common)
- Mechanical: Mechanical Systems Engineering + Mechanics of Machine Elements (Mod 1), Engineering Graphics (common)
- Civil: Engineering Mechanics + Surveying (Mod 1), Elements of Construction Engineering (Mod 2), Engg Graphics (common)

Semester total credits: 20 each semester`
  },

  // ── MARKS / ASSESSMENT STRUCTURE ──────────────────────────────────────
  {
    title: 'FY B.Tech Official Assessment and Marks Structure AY 2025-26',
    content: `VIT Pune FY B.Tech Official Assessment Details — AY 2025-26 (A-24 Pattern)
Source: Official marking scheme document

BSE MATHS — Linear Algebra (HS1084) / Calculus (HS1085) — 4 credits:
1. Written Examination (Mid-Semester): 30 marks → 25 marks counted
2. Written Examination (End-Semester): 100 marks → 50 marks counted
3. Assignment / Tutorial (In-Semester): 100 marks → 25 marks counted
TOTAL = 100 marks

PCC — Computer Organization & Architecture / Electronic Circuits — 2 credits:
1. Written Examination (Mid-Semester): 30 marks → 25 marks counted
2. Written Examination (End-Semester): 100 marks → 50 marks counted
3. Comprehensive Viva Voce (End-Semester): 100 marks → 25 marks counted
TOTAL = 100 marks

ESE — Problem Solving & Programming PSP (CS1012) — 4 credits:
1. Written Examination (Mid-Semester): 30 marks → 25 marks counted
2. LAB + Comprehensive Viva Voce (End-Semester): 100 marks → 50 marks counted
3. Course Project (End-Semester): 100 marks → 25 marks counted
TOTAL = 100 marks

PCC — Python for Engineers (CS1018) — 2 credits:
1. Written Examination (Mid-Semester): 30 marks → 25 marks counted
2. LAB + Comprehensive Viva Voce (End-Semester): 100 marks → 50 marks counted
3. Course Project (End-Semester): 100 marks → 25 marks counted
TOTAL = 100 marks

ESE — Applied Electromechanics (ET1012) — 4 credits:
NO Mid-Semester exam for this subject.
1. Written Examination (End-Semester): 100 marks → 50 marks counted
2. LAB (End-Semester): 100 marks → 25 marks counted
3. Course Project (End-Semester): 100 marks → 25 marks counted
TOTAL = 100 marks

BSE/VSEC — Web Development / Data Analysis / Digital Logic Design / Engineering Graphics — 2 credits:
NO Mid-Semester. NO theory exam.
1. LAB + Comprehensive Viva Voce (End-Semester): 100 marks → 50 marks counted
2. Course Project (End-Semester): 100 marks → 50 marks counted
TOTAL = 100 marks

IKS — Indian Knowledge System (HS1073) — 2 credits:
Multiple Choice Question (MCQ) Examination — End-Semester Assessment = 60 marks converted to 100 marks TOTAL
(No Mid-Semester exam ,full 100 marks)

UHV — Universal Human Values (HS1077) — 2 credits:
Multiple Choice Question (MCQ) Examination — End-Semester Assessment = 60 marks converted to 100 marks TOTAL
(No Mid-Semester exam,full 100 marks)

Environmental Studies (HS1082) — 1 credit:
1. MCQ Examination (End-Semester): 60 marks → 50 marks counted
2. PPT Presentation (In-Semester): 50 marks
TOTAL = 100 marks

Student Activity (HS1083) — 1 credit:
Activity Presentation and Internal Review (End-Semester): 100 marks

SRM — Scientific Research Methods (XX1013/XX1020) — 1 credit each:
Activity Presentation and Internal Review (End-Semester): 100 marks

GP — General Proficiency (HS1074/HS1080) — 1 credit each:
Activity Presentation and Internal Review (End-Semester): 100 marks

RAD — Reasoning and Aptitude Development (HS1072/HS1079) — 1 credit each:
Activity Presentation and Internal Review (End-Semester): 100 marks

ASEP — Applied Science & Engineering Project (XX1011/XX1014) — 2 credits each:
1. Activity Presentation and Internal Review (Mid-Semester): 50 marks → 30 marks counted
2. Activity Presentation and External Review (End-Semester): 100 marks → 70 marks counted
TOTAL = 100 marks

GRADE TABLE:
O / A+ = 10 | A = 9 | B+ = 8 | B = 7 | C+ = 6 | C = 5 | D = 4 | F = 0
SGPA = sum(grade × credit) ÷ total credits that semester
CGPA = sum(all grade × credit across all semesters) ÷ total credits earned`
  },

  // ── SUBJECT SYLLABI ────────────────────────────────────────────────────
  {
    title: 'Linear Algebra Syllabus HS1084',
    content: `Linear Algebra (HS1084) — 4 credits — Module 1 subject
Teaching: Theory 3 hrs/week + Tutorial 1 hr/week

Section I:
System of Linear Equations: Rank of matrix, Row Echelon Form, Gaussian elimination, Applications.
Vector Spaces: Vector spaces over reals, Subspace, Linear combination, Spanning set, Linear dependence & independence, Basis & dimension, Row/Column/Null space.
Inner Product Spaces: Euclidean inner product, Norm, Distance, Angle, Projection, Orthogonal/Orthonormal vectors, Gram-Schmidt process, Least square fitting.

Section II:
Linear Transformation: Matrix representation, Kernel and Range, Rank-Nullity Theorem, Composite & Orthogonal transformations.
Eigen Values and Eigen Vectors: Algebraic & geometric multiplicity, Cayley-Hamilton Theorem, Diagonalization, Orthogonal diagonalization.
Quadratic Forms: Nature, Canonical form, Principal Axes Theorem, Singular Value Decomposition (SVD).

Tutorials: Row Echelon Form, system of equations, subspaces, basis/dimension, orthogonality, Gram-Schmidt, linear transformations, Rank-Nullity, eigenvalues, Cayley-Hamilton, quadratic forms, SVD.
Textbooks: Howard Anton (Elementary Linear Algebra), David C. Lay (Linear Algebra and its Applications), Gilbert Strang.`
  },
  {
    title: 'Problem Solving and Programming PSP Syllabus CS1012',
    content: `Problem Solving and Programming PSP (CS1012) — 4 credits — Module 1 subject — C LANGUAGE
Teaching: Theory 3 hrs/week + Lab 2 hrs/week
IDE: Turbo C (recommended), VSCode, Codeblocks

Section I:
Problem Solving and Logic: Technical/Problem Solving/Soft Skills, Types of problems (Social, Management, Computational), Algorithms, Flowcharts, Pseudocodes.
C Language Fundamentals: Structure of C program, Header files, Compiler/Interpreter/Assembler/Loader/Linker. Tokens: Identifiers, Keywords, Constants, Operators. Data types: Primary (int, float, char, double), Secondary, User-defined. Control Structures: if-else, nested if-else, switch-case, for/while/do-while loops.

Section II:
Functions in C: Declaration, Definition, call by value/reference, Recursion (factorial, Fibonacci), Library functions (math.h, string.h).
Structures and Unions: Syntax, memory representation, array of structures, nested structures.
Pointers: Declaration, arithmetic, pointer to array/function, Dynamic memory allocation (malloc, calloc, realloc, free).
File Handling: FILE pointer, fopen(), fread/fwrite, fscanf/fprintf.

Practicals: operators, control structures, arrays (1D/2D), functions, recursion, structures, pointers, file handling.
Project areas: Science/numeric apps, 3D graphics, database apps, game development in C.`
  },
  {
    title: 'Calculus Syllabus HS1085',
    content: `Calculus (HS1085) — 4 credits — Module 2 subject
Teaching: Theory 3 hrs/week + Tutorial 1 hr/week

Section I:
Infinite Series and Expansion of Functions: Tests of Convergence (Comparison, Ratio Test), Alternating series, Power series, Taylor's and Maclaurin's Series.
Partial Differentiation: Partial derivatives, Euler's Theorem on homogeneous functions, Total derivative, Implicit differentiation.
Application of Partial Derivatives: Maxima/minima of two variables, Lagrange's undetermined multipliers, Errors/approximations, Jacobian.

Section II:
Vector Differentiation: Del Operator, Gradient, Directional Derivative, Divergence, Curl, Scalar Potential.
Multiple Integration: Double integration, polar coordinates, change of order, Triple integration, area by double integration.
Linear Differential Equations: Bernoulli's equation, higher order LDE, variation of parameters, applications.

Textbooks: B.S. Grewal (Higher Engineering Mathematics), B.V. Ramana, H.K. Dass, Erwin Kreyszig.`
  },
  {
    title: 'COA Computer Organization and Architecture Syllabus',
    content: `Computer Organization and Architecture COA (XX1016) — 2 credits — Module 1 (CS/IT/AI branches)
Teaching: Theory 2 hrs/week

Section I:
Basic Architecture: Von Neumann Architecture, Interconnection Structures, Instruction Cycle, Instruction Pipeline, RAM Model, Intel Processor Evolution (4-bit to 64-bit).
Computer Arithmetic: Integer Representation, 2's Complement, Multiplication, Booth's Algorithm, Division Restoring Algorithm, IEEE Floating Point Standards.
Processor Architectures: RISC vs CISC, Superscalar, Super Pipelined Processors.
Processor Organization: Single Bus CPU, Register Transfers, Micro-Operations, Hardwired Control, Micro-Programmed Control.

Section II:
I/O System: External devices, I/O modules, Programmed I/O, Interrupt-driven I/O, DMA.
Memory Organization: Locality of Reference, RAM (SRAM & DRAM), ROM types, Cache Memory, Cache Organization, Address Mapping, Virtual Memory.
Parallel Processing: P-RAM model, Flynn's Classification, Multicore Architecture, Core2Duo Case Study.

Textbooks: William Stallings (Computer Organization and Architecture), C. Hamacher, Kai Hwang.`
  },
  {
    title: 'Applied Electromechanics AE Syllabus ET1012',
    content: `Applied Electromechanics AE (ET1012) — 4 credits — Module 2 subject
Teaching: Theory 3 hrs/week + Lab 2 hrs/week

Section I:
Electromechanical Systems: Block diagram, classification, robot terminology, Forward/Inverse kinematics, Transformation matrix.
Actuators: Pneumatic, Hydraulic, Electrical — Solenoid, Relay, DC motor, BLDC motor, Stepper motor, Servo motor, selection criteria.
End Effectors and Robot Controls: Mechanical, magnetic, vacuum, adhesive grippers. Gripper force analysis. Open/closed loop control systems.

Section II:
Electronic Devices: Diodes, Zener Diode, LED, BJT, FET, MOSFET, IGBT, Op-amp.
Digital Electronics: Logic gates, Flip-flop, Counters, ADC/DAC.
Microcontroller: ATmega328P (Arduino UNO), architecture, ports, registers, timer/counter, PWM, interrupts, Serial I/O, I2C, SPI.
Sensors: Proximity, Tactile, Light (photodiode, IR), Gyroscope, Hall-effect, Temperature, Ultrasonic. Interfacing sensors.

Practicals: LED blinking (Arduino), traffic signals, push button, LDR, ultrasonic sensor, IR array, temperature sensor, LCD, PMDC motor, servo motor.
No Mid-Semester exam. Assessment: End-Sem Written + LAB + Course Project.`
  },
  {
    title: 'Python for Engineers Syllabus CS1018',
    content: `Python for Engineers (CS1018) — 2 credits — Module 2 subject (PCC)
Teaching: Theory 1 hr/week + Lab 2 hrs/week

Section I:
Python Fundamentals: Features, identifiers, keywords, variables, indentation, input/output. Operators: Arithmetic, Relational, Logical, Bitwise. Strings: indexing, slicing, string methods. Flow Control: if/elif/else, for/while loops, range(), break/continue/pass.

Section II:
In-built Data Structures: List, Tuple, Set, Dictionary. Mutable vs Immutable. Built-in methods and comprehensions.
Functions: Definition, calling, arguments, Lambda, recursion, default/keyword parameters.
File Handling: Opening modes, reading, writing, file methods.
NumPy and Matplotlib: Arrays, indexing, broadcasting, Array math. Plot, subplots, images.

70+ practicals including: circle area, swap, random numbers, even/odd, factorial, Fibonacci, list/tuple/set/dict operations, recursive functions, file handling, matrix operations, charts.`
  },
  {
    title: 'Web Development Syllabus XX1015',
    content: `Web Development (XX1015) — 2 credits — Module 1 subject (VSEC)
Teaching: Theory 1 hr/week + Lab 2 hrs/week

Section I:
HTML5: Document structure, semantic elements (header, section, article, nav, footer), forms, tables, multimedia. Meta tags.
CSS3: Selectors, Box Model, Display/Positioning, Flexbox, Float, Colors, Fonts, Responsive design.
JavaScript (ECMA 2024): Variables, Data Types, Operators, Conditionals, Loops, Arrays, Objects, DOM manipulation, Try-Catch, JSON.

Section II:
JavaScript OOP: Classes, Constructors, Inheritance, Destructuring, Spread/Rest operators, ES Modules, DOM Selectors.
jQuery 3.7.x: Loading, selecting elements, changing styles, event handling, DOM manipulation.
Bootstrap 4 & 5: Containers, Grid System, Typography, Components, Responsive utilities.

6 progressive practicals building a VIT clubs website using HTML → CSS → JavaScript → OOP → jQuery → Bootstrap.
Textbooks: Kevin Wilson, Mary Delamater & Zak Ruvalcaba (Murach's JS & jQuery), Ben Frain (Responsive Web Design).
No Mid-Semester exam. Assessment: LAB + Comprehensive Viva Voce + Course Project.`
  },
  {
    title: 'Data Analysis Syllabus XX1017',
    content: `Data Analysis (XX1017) — 2 credits — Module 2 subject (VSEC)
Teaching: Theory 1 hr/week + Lab 2 hrs/week

Section I:
Introduction: Data, importance, formats. Excel as storage and analysis tool. Workbooks, formulas, Cell References, sorting, querying, aggregation functions, lookup functions.
PivotTables: Creating, Manipulating, Charts with Chart Wizard.

Section II:
Statistics Basics: Mean, Median, Mode, Skewness, Normal Distribution, Standard Deviation, Variance, ANOVA, Probability, Hypothesis Testing.
Regression and Correlation: Simple Linear Regression, Excel Regression, Correlation Matrix, Outlier analysis (Box & whisker, Scatter).
Power BI: Introduction, ETL (Extract Transform Load), data visualization, analytics.

Practicals: Excel formatting, lookup functions, pivot tables, charts, regression, normal distribution, Power BI ETL, AI-based survey analysis.
Textbooks: Manisha Nigam (Data Analysis with Excel), Roxy Peck (Introduction to Statistics and Data Analysis).
No Mid-Semester exam. Assessment: LAB + Viva + Course Project.`
  },
  {
    title: 'Electronic Circuits Syllabus XX1016',
    content: `Electronic Circuits (XX1016) — 2 credits — Module 1 subject (ENTC/Instrumentation branches, PCC)
Teaching: Theory 2 hrs/week

Section I:
Electrical Fundamentals: Resistor, Capacitor, Inductor characteristics. Series/parallel combinations, Star-Delta. KCL and KVL. Independent/Dependent sources.
Network Theorems: Superposition, Norton's, Thevenin's, Maximum Power Transfer. Linear/non-linear networks.
Two Port Network: Z, Y, H, ABCD parameters. Computation of Z and H parameters.

Section II:
Semiconductor Devices: PN junction diode, rectifier circuits, RC filter, Clipper and Clamper.
BJT: Construction, biasing, CE/CB/CC configurations, Q point, frequency response, Gain vs Frequency.
Small Signal Amplifier: CE amplifier, bypass capacitor, h-parameter model.

Textbooks: M.E. Van Valkenburg (Network Analysis), W.H. Hayt (Engineering Circuit Analysis), J. Millman & Halkias (Electronic Devices and Circuits).`
  },
  {
    title: 'Digital Logic Design and Testing DLD Syllabus ET1017',
    content: `Digital Logic Design and Testing DLD (ET1017) — 2 credits — Module 2 subject (ENTC, VSEC)
Teaching: Theory 1 hr/week + Lab 2 hrs/week

Section I:
Introduction: Digital systems, Number systems (binary, octal, hex), conversion, Binary Arithmetic, Binary Codes (BCD, Gray), Logic Gates, Boolean Algebra, Simplification, K-map, Basic combinational circuits.

Section II:
Arithmetic Circuits: Half/Full adder. Multiplexers/Demultiplexers. Encoders/Decoders. Fault testing: stuck-at fault, stuck-open, stuck-short, stuck-at 0 and 1. Functionality test.

Practicals: Logic gates, Boolean simplification, K-map, combinational circuits, code converters, adders, MUX/DEMUX, encoders/decoders. Uses Digital Trainer Kit and Multisim.
No Mid-Semester exam. Assessment: LAB + Viva + Course Project.`
  },
  {
    title: 'IKS Indian Knowledge System Syllabus HS1073',
    content: `Indian Knowledge System IKS (HS1073) — 2 credits — Module 1 subject (HSM)
Teaching: Theory 2 hrs/week

Section I:
Introduction to IKS: Introduction to Vedas, four Vedas, Vedangas (Shiksha, Vyakarana, Nirukta, Chandas). Sanskrit language origins, structure, Vak and Mantra.
Ancient Indian Universities: Nalanda, Takshashila, Vallabhi, Vikramshila, Jagaddala, Nagarjuna Vidyapeeth, Kanthalloor.
Arts, Literature, Culture: 64 Kalas, Music/Dance, Nataraja, life and works of Agastya, Valmiki, Patanjali, Kautilya, Panini, Aryabhata, Bhaskaracharya, Madhavacharya.

Section II:
Engineering and Technology Heritage: Harappan civilization, metallurgy (bronze/copper/iron), Iron Pillar of Delhi, marine technology, Bet-Dwarka.
Bharatiya Civilization: Saraswati-Sindhu civilization, Mauryan age, Gupta age, Arthashastra, Vastu-shastra.
Life, Environment and Health: Panchbhutas, Ayurveda, Charaksamhita, Sushrutsamhita.

Assessment: End-Sem Online MCQ Examination = 100 marks total (no Mid-Sem, no conversion needed).`
  },
  {
    title: 'Universal Human Values UHV Syllabus HS1077',
    content: `Universal Human Values UHV (HS1077) — 2 credits — Module 2 subject (HSM)
Teaching: Theory 2 hrs/week

Section I:
Universal Human Values: Need for value education, basic systems of human society (Education, Health, Production, Justice, Exchange).
Human Aspirations: Self-Exploration, Right understanding, Physical facility vs prosperity, Correct appraisal of physical needs.
Harmony in Human Being: Co-existence of sentient 'I' and material 'Body', needs of Self and Body.

Section II:
Harmony in the Family: Trust, Respect, Affection, Care, Guidance, Reverence, Gratitude, Love.
Harmony in Nature: Interconnectedness among four orders (Physical, Bio, Animal, Human).
Harmony in Society: Individual, Family, Society, Nature levels. Professional ethics and human values correlation.

Assessment: End-Sem Online MCQ Examination = 100 marks total (no Mid-Sem, no conversion needed).`
  },
  {
    title: 'Scientific Research Methods SRM Syllabus',
    content: `Scientific Research Methods SRM 1 (XX1013) and SRM 2 (XX1020) — 1 credit each — Common subject
Teaching: Theory 1 hr/week

SRM 1 covers:
Research fundamentals: Discovery, Research, Invention, Innovation, Novelty, Creativity (differences).
Literature Review: Finding literature, research gaps, types of papers (Conference vs Journal).
Publication Platforms: Conferences (format, selection process, proceedings), Research Journals (Scopus, peer-reviewed, Elsevier, Springer, IEEE, ASME).
Research Paper: Title, Abstract, Introduction, Methodology, Results, Conclusions, References. Data processing, Charts, PPT preparation.
Journal Ratings: Impact factor, h-index calculation, journal ranking.
Intellectual Property: Patents (search, application process), Copyrights, Trademarks.
Research Ethics: Plagiarism, Authorship, confidentiality, conflicts of interest.

SRM 2 covers:
Research paper structure in detail. Top 50 journal list. Journal Quartile, Scopus/Web of Science indexing.
Plagiarism checking tools: iThenticate. Patent search: Indian Patent Journal, Google Patents, WIPO.
Patent drafting and filing procedure. Entrepreneurship: Business Plan, Opportunity Identification, Feasibility Study, New Venture Financing.

Assessment: Activity Presentation and Internal Review (End-Semester) = 100 marks.`
  },
  {
    title: 'ASEP Applied Science Engineering Project Syllabus',
    content: `Applied Science & Engineering Project ASEP 1 (XX1011) and ASEP 2 (XX1014) — 2 credits each — Common subject
Teaching: Lab 4 hrs/week — Project Centric Learning

Domain Areas: Agriculture, Defence, Healthcare, Smart City, Smart Energy, Security Systems, Automobile, Space, Green Earth, Water Management, Swachh Bharat or any socially relevant area.
Tools: Circuit Simulation (PSpice, Simulink), Networking (NS-2, Packet Tracer), Signal Processing (Code Composer Studio).
Technology: AI, Blockchain, Robotics, Cloud Computing, Energy Technology, Nanotechnology, Clean Tech.

Key Activities:
1. Group Formation (Group leader, Assistant Group leader)
2. Brainstorming on socially relevant topics
3. Project Planning — finalize domain, tools, technology
4. Synopsis drafting and online registration
5. Project Review 1 (Mid-Semester Assessment) — 50 marks
6. Prototype design and development
7. Validation and testing
8. Report writing in IEEE Research Paper format
9. End-Semester Assessment (Project Conference) — 100 marks
10. Publication in National/International Conference or journal
11. Patent filing if project has novelty

Assessment: Mid-Semester Review = 50 marks → 30 counted; End-Semester = 100 marks → 70 counted. TOTAL = 100 marks.`
  },
  {
    title: 'RAD Reasoning and Aptitude Development Syllabus',
    content: `Reasoning and Aptitude Development RAD 1 (HS1072) and RAD 2 (HS1079) — 1 credit each — Common subject
Teaching: Tutorial 1 hr/week

English Language: Vocabulary, syntax, sentence structure, synonyms/antonyms, Grammar — error identification, sentence improvement, Reading Comprehension.
Logical Ability:
  Deductive reasoning: Coding deduction, Data Sufficiency, Directional Sense, Logical word sequence, Selection tables, Puzzles.
  Inductive reasoning: Analogy, Classification, Coding, Number series pattern recognition.
  Abductive reasoning: Critical thinking, logical weak links in arguments.
  Information Gathering: Locating information, data interpretation, graphs/charts/tables.
Quantitative Ability:
  Basic numbers, decimals, fractions, HCF/LCM, prime numbers.
  Speed-time-distance, Profit-loss, percentage, age relations, mixtures.
  Exponentials, logarithms, permutations and combinations, probability.
  Spatial reasoning, Sequence and series.

Assessment: Activity Presentation and Internal Review (End-Semester) = 100 marks.
Reference books: R.S. Aggarwal (Quantitative Aptitude), Arun Sharma (CAT preparation), R.S. Aggarwal (Verbal & Non-Verbal Reasoning).`
  },
  {
    title: 'General Proficiency GP Syllabus',
    content: `General Proficiency GP 1 (HS1074) and GP 2 (HS1080) — 1 credit each — Common subject
Teaching: Lab 2 hrs/week

GP 1 topics:
1. Know Yourself: Self Introduction, Personal Information, achievements, family background.
2. Self-Evaluation: SWOT Analysis, Short term / Long term SMART goals, Career Planning.
3. Interpersonal Skills: Positive Relationships, Positive Attitudes.
4. Professional Etiquettes: Telephonic, table manners, hygiene, clothing.
5. Communication Skills: Barriers, non-verbal communication, Public speaking (gestures, product presentation).
6. Writing Skills: Application writing, email, BLOG, article writing.

GP 2 topics:
1. Listening Skills: Types, Barriers, tips for good listening.
2. Team Building: Process, significance, team spirit.
3. Body Language: Effective use in professional world.
4. Time Management tools.
5. Group Discussion: Techniques, rules, do's and don'ts.
6. Job Interviews: Preparation, demonstration.

Assessment: Activity Presentation and Internal Review (End-Semester) = 100 marks.`
  },
  {
    title: 'Student Activity Syllabus HS1083',
    content: `Student Activity (HS1083) — 1 credit — Module 1 subject — Common for CS/IT/AI
Teaching: Lab 2 hrs/week

Contents: Students plan, execute and actively participate in social activities for minimum 30 hours per semester, jointly with NGOs, Semi-Govt/Govt authorities, Social Forums.
Report submitted online on Vishwakarma Online Learning Platform.

Activity areas:
1. Cleanliness drives
2. Street Plays (social/economic awareness — drugs, corruption, women safety)
3. Tree Plantation, Renewable Energy awareness, SDGs
4. Digital Literacy (UPI, online banking, ticket booking, social media)
5. Teach for India (school students in rural areas, govt schools)
6. Rain harvesting
7. Awareness of Govt schemes (senior citizen, farmer schemes)
8. Women empowerment
9. Plastic-free environment
10. Skill India (training unemployed youth)
11. Awareness for natural/man-made disasters
12. Assistance to teachers, shopkeepers, farmers
13. Engineering projects for social cause

Assessment: Activity Presentation and Internal Review (End-Semester) = 100 marks.`
  },
  {
    title: 'Environmental Studies Syllabus HS1082',
    content: `Environmental Studies (HS1082) — 1 credit — Module 2 subject
Teaching: Theory 1 hr/week

Module 1: Introduction to Environmental Studies and Sustainability
Multidisciplinary nature, scope. Sustainable Development Goals (SDGs). ESG. Green finance. Environmental ethics. Human population and urbanization impact.

Module 2: Pollution, Waste Management & Ecosystems
Air, water, soil, noise pollution — causes, effects, control. Nuclear/industrial pollution. Solid waste management (CNG in Delhi, plastic ban, e-waste). Ecosystems, food chains, ecological succession.

Module 3: Biodiversity and Natural Resources
Levels of biodiversity. Biogeographic zones of India. Endangered species. Threats: habitat loss, poaching, invasive species. Conservation: In-situ and ex-situ. Water conflicts (Cauvery), deforestation.

Module 4: Environmental Policies, Laws, Public Engagement
Indian laws: Environment Protection Act (1986), Air Act (1981), Water Act (1974), Wildlife Protection Act (1972), Forest Conservation Act (1980).
Global protocols: Montreal Protocol, Kyoto Protocol, CBD.
Chipko Movement, Bishnoi practices. National Climate Action Plan (NCAP).

Assessment: End-Sem MCQ (100 marks → 50 counted) + PPT Presentation (50 marks) = 100 total.`
  },

  // ── FEES STRUCTURE ─────────────────────────────────────────────────────
  {
    title: 'VIT Pune Fees Structure FY B.Tech 2025-26 CAP Round',
    content: `VIT Pune Fees Structure for FY B.Tech Admissions AY 2025-26 — CAP / ACAP Round (MHT-CET / JEE)
Source: Official BRACT's VIT fees document dated 09-Jul-25

Category → Total Fees (Tuition + Development + Other fees):
OPEN: Rs 2,12,165 (Tuition 1,79,130 + Dev 26,870 + Others 6,165)
OPEN OMS (Outside Maharashtra State): Rs 2,12,665
TFWS (Tuition Fee Waiver Scheme): Rs 33,035 (Dev 26,870 + Others 6,165)
OBC (Other Backward Class): Rs 1,22,600 (Tuition 89,565 + Dev 26,870 + Others 6,165)
EBC (Economically Backward Class): Rs 1,22,600
EWS (Economically Weaker Section): Rs 1,22,600
SEBC (Socially and Educationally Backward Class — Maratha Reservation): Rs 1,22,600
NT (Nomadic Tribes): Rs 33,035
SBC (Special Backward Class): Rs 33,035
SC (Scheduled Caste): Rs 6,165
ST (Scheduled Tribe): Rs 6,165
OBC-GIRLS: Rs 33,035
EBC-GIRLS: Rs 33,035
EWS-GIRLS: Rs 33,035
SEBC-GIRLS: Rs 33,035
PH / PWD / ORPHAN: Rs 33,035
OVER and ABOVE (State merit quota): Rs 30,665
J and K PMSSS: Rs 6,665

Other fee components (included in above totals):
Exam Fees: Rs 2,420 | Misc. University Fees: Rs 2,444 | Student Insurance: Rs 701
Eligibility Fees: Rs 600 (Rs 1,100 for students from outside Maharashtra)`
  },
  {
    title: 'VIT Pune Fees Structure FY B.Tech 2025-26 Management and NRI Seats',
    content: `VIT Pune Fees Structure — Management / Institute Level (IL) Seats and International Categories, AY 2025-26

Management Seats / Institute Level (Indian Students):
Computer Engineering: Rs 6,24,165 (Tuition 5,37,390 + Dev 80,610 + Others 6,165)
Information Technology: Rs 6,24,165
Computer Science & Engineering (Artificial Intelligence) CS-AI: Rs 6,24,165
Artificial Intelligence and Data Science AI&DS: Rs 6,24,165
Computer Science & Engineering (AI & Machine Learning) CS-AIML: Rs 6,24,165
CS-IOT/BCT (Internet of Things and Cyber Security Including Block Chain): Rs 4,18,165 (Tuition 3,58,260 + Dev 53,740 + Others 6,165)
CS-DS (Data Science): Rs 4,18,165
CS-SE (Software Engineering): Rs 4,18,165
Electronics and Telecommunication Engineering ENTC: Rs 4,18,165
Mechanical Engineering: Rs 4,18,165
Civil Engineering: Rs 2,12,165 (Tuition 1,79,130 + Dev 26,870 + Others 6,165)
Instrumentation & Control Engineering: Rs 2,12,165

NRI Seats (all branches): USD $12,000/year + other fees in INR = Rs 6,665

CIWGC (Children of Indian Workers in Gulf Countries):
Computer Engineering: $2,400 + Rs 6,665 other fees
IT, CS-AI, CS-AIML, AI&DS: $1,800 + Rs 6,665
CS-IOT/BCT, CS-DS, CS-SE, ENTC, Mechanical, Civil, Instrumentation: $1,200 + Rs 6,665

PIO / OCI / Foreign National:
Computer Engineering: $3,600 + Rs 6,665
IT, CS-AI, CS-AIML, AI&DS: $1,800 + Rs 6,665
CS-IOT/BCT, CS-DS, CS-SE, ENTC, Mechanical, Civil, Instrumentation: $1,200 + Rs 6,665`
  },

  // ── VIT PUNE OVERVIEW ──────────────────────────────────────────────────
  {
    title: 'About VIT Pune Overview',
    content: `Vishwakarma Institute of Technology (VIT) Pune — Overview:
Full Name: Bansilal Ramnath Agarwal Charitable Trust's Vishwakarma Institute of Technology
Address: 666, Upper Indiranagar, Bibwewadi, Pune – 411037, Maharashtra, India
Established: 1983 by Vishwakarma Educational Society / BRACT (Bansilal Ramnath Agarwal Charitable Trust)
Affiliation: Savitribai Phule Pune University (SPPU), Pune
Type: Autonomous Institute (first autonomous college in Maharashtra)
Accreditation: NAAC A+, NBA accredited programs
Rankings: NIRF ranked, QS World University Rankings recognition

Current Dean of Academics: Prof. (Dr.) Parikshit Mahalle
FY Pattern: A-24 (NEP compliant curriculum)

B.Tech Programs and Intake (2025-26):
Computer Engineering: 720 seats
Information Technology: 360 seats
Computer Science & Engineering (Artificial Intelligence) CS-AI: 180 seats
Artificial Intelligence and Data Science AI&DS: 180 seats
Computer Science & Engineering (AI & Machine Learning) CS-AIML: 180 seats
Computer Science & Engineering (Data Science) CS-DS: 180 seats
Computer Engineering (Software Engineering) CS-SE: 180 seats
CS-IOT/BCT (IoT and Cyber Security Including Blockchain): 180 seats
Electronics and Telecommunication Engineering ENTC: 180 seats
Mechanical Engineering: 180 seats
Civil Engineering: 180 seats
Instrumentation & Control Engineering: 60 seats

Admission Process: MHT-CET (CAP rounds), JEE All India, Direct Second Year (DSE), NRI/CIWGC/PIO seats
Hostel: Available on campus (separate boys and girls hostels)
Website: vit.edu`
  },
  {
    title: 'VIT Pune Technical Clubs and Student Activities',
    content: `VIT Pune Technical Clubs and Student Activities — Life at VIT
Overall Incharge Student Activity Technical (SA_T): Dr. Vikas Kolekar, Assistant Professor, Computer Engineering

TECHNICAL CLUBS:
1. Microsoft Learn Student Club (MLSC) — Cloud Computing, Web Dev, AI workshops. Backed by Microsoft Learn. Open to all branches.
2. GedIT Coding Club — Competitive programming, hackathons, coding contests, algorithm problems.
3. Google Developer Student Clubs (GDSC) — Google technologies (Android, Firebase, Flutter, Cloud), app development.
4. IEEE VIT Pune — International electrical/electronics engineering society. Technical talks, paper competitions, industry events.
5. CSI VIT Pune — Computer Society of India. Software, IT, cybersecurity events, competitions.
6. ISA VIT Pune — International Society of Automation. Instrumentation, process control, industrial automation.
7. TRF – The Robotics Forum — Robotics design, automation projects, robotics competitions.
8. Team Endurance Racing — SAE Collegiate club (established 2009). Designs and races All-Terrain Vehicles (ATV). Participates in BAJA competitions.
9. Team Griffin India — UAV (drone) design, testing, and competition team. Unmanned aerial systems.
10. Team Veloce Racing — Formula student style racing vehicle design, simulation, and competition.
11. Team Quark — Physics and applied science club. Experiments and demonstrations.
12. Team Vishwanetrutvam — Leadership development and management club.
13. Ekasutram — Entrepreneurship, startups, ideation sessions, incubation support.
14. Game Dev+ — Game development using Unity, Unreal Engine, Godot. Game jams and projects.
15. Reality Spectra — Augmented Reality (AR), Virtual Reality (VR), Mixed Reality (MR) development.
16. InnovSphere — Innovation hub. Product development, design thinking, prototyping.
17. Club Catalyst — Research and development projects across domains.
18. CHESA — Chemical Engineering Students Association. Events for chemical engineering students.
19. Indus Connect — Cultural exchange, inter-college connections, cultural programs.
20. Personality Development Club — Soft skills, communication, personality enhancement workshops.

CO-CURRICULAR CLUBS:
Pi Editorial — College magazine, content writing, journalism.
Antariksh — Astronomy and space science.
EPEC — Electronics and PCB design.
RangManch — Drama, theatre, stage performances.
Abhivridhhi — Community development, social welfare.
Team Eklavya — Sports and fitness.
Speaker's Club — Public speaking, debate, MUN.
VEDC — Vishwakarma Entrepreneurship Development Cell.`
  },

  // ── EXAM RULES ─────────────────────────────────────────────────────────
  {
    title: 'VIT Pune Online MCQ Exam Instructions',
    content: `VIT Pune Student Instructions for Online MCQ Examinations (For Students admitted after 2024-25)
Source: Official Examination Section document

Portal: https://epvit.vierp.in/
Device: Laptop ONLY — no phone, tablet or other device permitted

Steps:
1. Join the Google Meet link given by the subject teacher FIRST — camera ON, microphone MUTE.
2. Login to https://epvit.vierp.in/ to start the exam.
3. Allow camera and microphone permission in Easy Pariksha software when asked.
4. Exam is PROCTORED — both manual and AI-enabled. Malpractice → punitive action.
5. Students give exam from home — ensure laptop is fully charged.
6. Camera MUST stay ON throughout. Proctor will PAUSE exam if camera goes off.
7. No re-examination if student misses the exam.
8. Tab switching during exam = IMMEDIATE termination.
9. Ask queries to subject teacher only during exam.
10. At end of MCQ exam, result is displayed IMMEDIATELY on screen — note down marks.

Dummy exams will be conducted beforehand — these use general questions (NOT from FY subjects). Dummy exam is just for exposure to the software.`
  },
  {
    title: 'VIT Pune Offline Examination Instructions',
    content: `VIT Pune Instructions to Students for Offline Examinations

Start of Examination:
- Be present in Exam Hall 30 minutes BEFORE exam time.
- Check room number, bench number, bench side from seating arrangement.
- Bench Number 1 is always to Student's LEFT side.
- Mobile phones and ALL electronic gadgets NOT allowed — confiscated if found.
- I-CARD is COMPULSORY. Without I-card, show government authorized photo ID.
- Fill PRN no, year, class, subject code, subject name in answer sheet.

During Examination:
- No entry after first 30 minutes.
- Cannot leave for first 30 minutes.
- Cannot leave for last 10 minutes.
- Sign on Student attendance sheet and Junior Supervisor report.
- Get invigilator signature on answer paper, supplements, graphs.

End of Examination:
- Last 10 minutes: tie supplementary sheets, fill total number of supplements.
- Give answer sheet to invigilator immediately, leave exam hall.
- Exam supervisors, SQAD team, and CCTV continuously monitor all classes.
- STRICT action for copy cases as per institute policy.

Prohibited items: Mobile phones, calculators, watches with writing, writing pads, pouches with written material, sharing writing material.`
  },

  // ── CAMPUS FACILITIES ─────────────────────────────────────────────────
  {
    title: 'VIT Pune Campus Facilities and Infrastructure',
    content: `VIT Pune Campus Facilities:


Library:
Monday to Saturday: 8:00 AM – 10:00 PM
Sunday: 10:00 AM – 6:00 PM
Fine for late return

Hostel:
Hostel curfew: 10:00 PM on weekdays, 11:00 PM on weekends
Separate hostels for boys and girls

WiFi:
Network: VIT_STUDENT

Attendance:
Minimum 75% attendance required to sit for End-Semester exams
Below 75% = debarred from End-Sem exam
Portal for attendance check: learner.vierp.in (EduPlusCampus)

Campus Location: 666, Upper Indiranagar, Bibwewadi, Pune – 411037
Near Swargate bus stand`
  },

  // ── PLACEMENTS ─────────────────────────────────────────────────────────
  {
    title: 'VIT Pune Placements Overview',
    content: `VIT Pune Placements:
Strong placement record, especially for CS, IT, ENTC, and Mechanical branches.
Training and Placement Officer (TPO) contact available on vit.edu/placement/

Notable placement statistics (based on past years):
- Highest package: 45 LPA (Lakhs Per Annum)
- Median package: approximately 9.5 LPA
- Placement rate: approximately 86.3% for eligible students

Top recruiters include: TCS, Infosys, Wipro, Capgemini, Cognizant, Persistent Systems, KPIT, Cummins, Bajaj, Bosch, and many more.

Placement preparation at VIT:
- Training through RAD (Reasoning and Aptitude Development) subject
- GP (General Proficiency) — GD, interview preparation
- SCCG (Student Career Counselling and Guidance) — career guidance, GATE/GRE prep, mental health support
- Technical clubs prepare students for technical interviews

For latest placement data, visit vit.edu/placement/`
  },
]

// ── CHUNKER ────────────────────────────────────────────────────────────
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

// ── MAIN INGEST ────────────────────────────────────────────────────────
async function ingest() {
  console.log('🚀 Starting RAG ingestion — VIT Pune Complete Knowledge Base')
  console.log(`📚 ${VIT_DOCUMENTS.length} documents to process`)

  // Clear old data
  await supabase.from('rag_documents').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  console.log('🗑️  Cleared existing RAG documents')

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
        metadata: { source: 'vit-pune-official', chunk: i }
      })

      totalChunks++
      process.stdout.write('.')
      await new Promise(r => setTimeout(r, 250))
    }
    console.log(' ✅')
  }

  console.log(`\n\n✅ Done! Ingested ${totalChunks} chunks from ${VIT_DOCUMENTS.length} documents.`)
  console.log('Knowledge covers: Calendar, Syllabus, Marks, Fees, Clubs, Exam Rules, Facilities, Placements')
}

ingest().catch(console.error)