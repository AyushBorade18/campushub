/**
 * RAG Data Ingestion Script — Full VIT Pune Knowledge Base
 * Run: npx ts-node scripts/ingest-rag.ts
 * Only needs to run ONCE (or when you update knowledge).
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

const VIT_DOCUMENTS = [

  // ─── ACADEMIC CALENDAR ────────────────────────────────────────────
  {
    title: 'Academic Calendar 2025-26',
    content: `VIT Pune Academic Calendar AY 2025-26:
Semester I: Started 15 September 2025. Mid-Sem: 17-22 November 2025. Lab/Project Exams: 26 Dec 2025 - 8 Jan 2026. End-Sem: 12-28 January 2026.
Semester II (CURRENT): Started 9 February 2026. Mid-Sem Exam: 15-18 April 2026. Lab/Project Exams: 18-30 May 2026. End-Sem: 8-24 June 2026. Next Semester starts: 6 July 2026.
Today is March 2026. We are in Semester II. Next exam is Mid-Sem on 15 April 2026 about 5 weeks away.`
  },

  // ─── HOLIDAYS ─────────────────────────────────────────────────────
  {
    title: 'Semester II Holidays 2026',
    content: `Semester II 2026 Holidays at VIT Pune:
Shivaji Jayanti: 19 February 2026. Holi/Dhulivandan: 3 March 2026 (passed). Gudhi Padwa: 19 March 2026. Ramzan Id: 21 March 2026. Ram Navami: 26 March 2026. Mahaveer Kalyanak: 31 March 2026. Good Friday: 3 April 2026. Ambedkar Jayanti: 14 April 2026. Maharashtra Day and Labour Day and Buddha Poornima: 1 May 2026. Bakri Id: 28 May 2026.`
  },

  // ─── SUBJECTS ─────────────────────────────────────────────────────
  {
    title: 'Semester I Core Subjects',
    content: `Semester I Core Subjects for all FY B.Tech students at VIT Pune:
1. Linear Algebra (HS1084) - 4 credits. Equation systems, Vector spaces, Inner product, Eigenvalues, SVD.
2. PSP / C Language (CS1012) - 4 credits. Algorithms, C basics, loops, functions, recursion, pointers, file handling.
3. Engineering Graphics (ME1017) - 2 credits. Projections, orthographic, isometric, AutoCAD.
4. Environmental Studies (HS1082) - 1 credit. SDGs, pollution, biodiversity.
5. Scientific Research Methods 1 (XX1013) - 1 credit.
6. ASEP 1 (XX1011) - 2 credits. Project learning, IEEE paper.
7. RAD 1 (HS1072) - 1 credit. English, logical, quantitative aptitude.
8. General Proficiency 1 (HS1074) - 1 credit. Communication, public speaking.
9. Induction Training (HS1027) - Audit.`
  },
  {
    title: 'Semester I Module 1 Subjects',
    content: `Module 1 elective subjects Semester I VIT Pune:
COA - Computer Organization and Architecture - 2 credits. Von Neumann architecture, RISC CISC, memory hierarchy, DMA.
Electronic Circuits - 2 credits. KCL KVL, network theorems, diodes, BJT.
Web Development - 2 credits. HTML5, CSS3, JavaScript, DOM, jQuery, Bootstrap.
Indian Knowledge System IKS (HS1073) - 2 credits. Vedas, ancient universities, Indian mathematics.`
  },
  {
    title: 'Semester I Module 2 Subjects',
    content: `Module 2 elective subjects Semester I VIT Pune:
Python for Engineers (CS1018) - 2 credits. Python basics, data structures, NumPy, Matplotlib.
Data Analysis (XX1017) - 2 credits. Excel, PivotTables, statistics, regression, Power BI.
Digital Logic Design and Testing (ET1017) - 2 credits. Number systems, Boolean algebra, K-map, combinational circuits.
Universal Human Values UHV (HS1077) - 2 credits. Value education, harmony in self and family.`
  },
  {
    title: 'Semester II Core Subjects',
    content: `Semester II Core Subjects all FY B.Tech students VIT Pune (currently running):
1. Calculus (HS1085) - 4 credits. Series, partial differentiation, vector diff, multiple integrals, linear DEs.
2. Applied Electromechanics (ET1012) - 4 credits. Robotics, actuators, motors, Arduino, sensors, digital electronics.
3. Engineering Graphics - continued from Sem I.
4. Environmental Studies - continued.
5. Scientific Research Methods 2 (XX1015) - 1 credit. Patents, entrepreneurship.
6. ASEP 2 (XX1014) - 2 credits. Publication and patent filing.
7. RAD 2 (HS1079) - 1 credit. Advanced English, aptitude.
8. General Proficiency 2 (HS1080) - 1 credit. GD, interview prep, team building.`
  },
  {
    title: 'Semester II Module 1 Subjects',
    content: `Module 1 subjects in Semester II at VIT Pune: COA (Computer Organization and Architecture), Electronic Circuits, Web Development, Indian Knowledge System (IKS).`
  },
  {
    title: 'Semester II Module 2 Subjects',
    content: `Module 2 subjects in Semester II at VIT Pune: Python for Engineers, Data Analysis, Digital Logic Design and Testing, Universal Human Values (UHV).`
  },

  // ─── EXAM PATTERN (FY) ────────────────────────────────────────────
  {
    title: 'FY B.Tech Exam Pattern and Marks',
    content: `VIT Pune FY B.Tech Exam Pattern A-24:
All subjects total 100 marks.
4-credit theory (Linear Algebra, PSP, Calculus, Applied Electromechanics): Mid-Sem 30 converted to 25, End-Sem 60 converted to 50, Tutorial 25. Total 100.
2-credit theory (COA, Electronic Circuits, Python, Digital Logic, Engg Graphics, Env Studies, UHV): Mid-Sem 30 converted to 25, End-Sem 60 converted to 50, Course Project 25. Total 100.
Web Development lab based NO theory exam: Lab Exam 50 + Lab Assessment 10 + Viva 30 + Project 10 = 100.
Data Analysis lab based NO theory exam: Lab Exam 25 + Viva 25 + Project 25 + Lab Assessment 25 = 100.
IKS UHV Environmental Studies: End-Sem only, no Mid-Sem.
Mid-Sem duration: 1 hour. End-Sem duration: 2.5 hours.`
  },

  // ─── ASSESSMENT GUIDELINES (FROM PDF) ────────────────────────────
  {
    title: 'SY B.Tech Assessment Guidelines 2025-26',
    content: `VIT Pune SY B.Tech Assessment Guidelines AY 2025-26:
Courses with Practicals: Lab work 10 marks, Course Project 30 marks, Viva Voce 20 marks, Programming Practical 40 marks. Total 100.
Courses with Lab: Lab work 10, Course Project 30, Viva Voce 20, Written Exam ESE 40. Total 100.
Courses with Theory Lab Tutorial: Presentation/GD/Assignment (In-Sem Week 5-8: 30 marks Part A, End-Sem 70 marks Part B) converted to 20 marks. Lab Work 10, Course Project 30, Written Exam 40. Total 100.
Courses with Tutorial only: Presentation/GD 30, Viva Voce 30, Written Exam ESE 40. Total 100.
Credit Theory Course (Theory only): Class Test 1 in Week 6 based on Unit 1 and 2 = 35 marks. Class Test 2 in Week 12 based on Unit 3 and 4 = 35 marks. Comprehensive Viva End Sem = 30 marks. Total 100.
Engineering Design and Innovation Project: Mid-Sem presentation 30, End-Sem presentation and demo 70. Total 100.
RAD (Reasoning and Aptitude Development): English Ability 30, Logical Ability 30, Quantitative Ability 30, Automata Fix 5, Automata Pro 5. Total 100.`
  },

  // ─── SGPA CGPA CALCULATION (FROM PDF) ────────────────────────────
  {
    title: 'SGPA and CGPA Calculation at VIT Pune',
    content: `VIT Pune SGPA and CGPA Calculation:
SGPA (Semester Grade Point Average) = Total Grade Points of the Semester divided by Total Credits of the Semester.
Grade Points of a Course = Credits of course multiplied by Points of Grade obtained.
Grade Table: A+ (AA) = 10 points, A (AB) = 9 points, B+ (BB) = 8 points, B (BC) = 7 points, C+ (CC) = 6 points, C (CD) = 5 points, D (DD) = 4 points, F (FF) = 0 points.
CGPA (Cumulative Grade Point Average) = Total Grade Points of ALL semesters divided by Total Credits of ALL semesters. CGPA is NOT calculated as average of all SGPAs.
Example: If you get A (9 points) in a 4-credit subject, grade points = 4 x 9 = 36.
Passing grade is D (4 points). F means failed.`
  },

  // ─── MODULE SYSTEM ────────────────────────────────────────────────
  {
    title: 'Module System at VIT Pune',
    content: `VIT Pune divides FY B.Tech students into Module 1 and Module 2 groups.
Module 1 subjects: COA, Electronic Circuits, Web Development, Indian Knowledge System (IKS).
Module 2 subjects: Python for Engineers, Data Analysis, Digital Logic Design, Universal Human Values (UHV).
When student says I have Module 1 they study COA Electronic Circuits Web Dev IKS right now.
When student says I have Module 2 they study Python Data Analysis Digital Logic UHV.
Common subjects for ALL students regardless of module: Linear Algebra + PSP (Sem 1), Calculus + Applied Electromechanics (Sem 2), Engineering Graphics, Environmental Studies, ASEP, RAD, General Proficiency.`
  },

  // ─── CAMPUS FACILITIES ────────────────────────────────────────────
  {
    title: 'Campus Facilities at VIT Pune',
    content: `VIT Pune Campus Facilities:
Mess timings: Breakfast 7-9 AM, Lunch 12:30-2:30 PM, Snacks 5-6 PM, Dinner 7:30-9:30 PM.
Library: Monday to Saturday 8 AM to 10 PM, Sunday 10 AM to 6 PM. Fine Rs 2 per book per day.
Hostel curfew: 10 PM weekdays, 11 PM weekends.
WiFi: Network VIT_STUDENT, password on your ID card.
Attendance: Minimum 75% required for End-Semester exam. Below 75% means debarred.
Separate boys and girls hostels on campus. Sports facilities: cricket ground, basketball, badminton, gym. Medical centre on campus. Canteen and cafeteria available.`
  },

  // ─── TECHNICAL CLUBS (FROM WEBSITE) ──────────────────────────────
  {
    title: 'Technical Clubs at VIT Pune',
    content: `VIT Pune Technical Clubs and Student Activities:
Overall Incharge: Dr. Vikas Kolekar, Assistant Professor, Computer Engineering.
Technical Clubs at VIT Pune:
1. Microsoft Learn Student Club - Microsoft technologies and Azure.
2. GedIT Coding Club - competitive programming and coding.
3. Google Developer Student Clubs (GDSC) - Google technologies, Android, web.
4. IEEE VIT Pune - Institute of Electrical and Electronics Engineers student chapter.
5. CSI VIT Pune - Computer Society of India student chapter.
6. ISA VIT Pune - Instrumentation Society of America student chapter.
7. TRF - The Robotics Forum - robotics and automation.
8. Team Endurance Racing - formula student racing car team.
9. Team Griffin India - drone and aerial robotics.
10. Team Veloce Racing - racing team.
11. Team Vishwanetrutvam - leadership and management.
12. Team Quark - physics and science club.
13. Ekasutram - cultural and technical integration.
14. Club Catalyst - entrepreneurship and innovation.
15. Game Dev+ - game development.
16. CHESA - chess club.
17. Reality Spectra - AR/VR and emerging technology.
18. InnovSphere - innovation and startup ecosystem.
19. Personality Development Club - soft skills and personality.
20. Indus Connect - industry and student networking.
These clubs conduct workshops, hackathons, competitions, and technical events throughout the year.`
  },

  // ─── CO-CURRICULAR ACTIVITIES (FROM WEBSITE) ─────────────────────
  {
    title: 'Co-curricular Activities at VIT Pune',
    content: `VIT Pune Co-curricular Activities:
Coordinator: Dr. Kaushalya Thopate. Email: dean.studactivities@vit.edu. Mobile: +91 9960158822.
Co-curricular Clubs and Activities:
1. Pi Editorial Board - student magazine and editorial activities.
2. Antariksh Club - astronomy and space science.
3. EPEC - Electronics and Power Electronics Club.
4. SW and D - Software and Design club.
5. Light-hearted Lounge - fun and recreational activities.
6. C-Cube - creative computing club.
7. Reality Spectra - AR VR immersive tech.
8. RangManch - cultural and performing arts, drama, theatre.
9. Abhivridhhi - personal development and growth.
10. Team Eklavya - sports excellence team.
11. The Investment Forum - finance, stock market, investment learning.
12. VEDC - Vishwakarma Entrepreneurship Development Cell.
13. Speaker's Club - public speaking and communication.
VIT Pune believes education extends beyond classrooms. These activities help in holistic development of students covering arts, sports, entrepreneurship, finance, and communication.`
  },

  // ─── SPDC (FROM WEBSITE) ─────────────────────────────────────────
  {
    title: 'Skill and Personality Development Programme Centre SPDC',
    content: `VIT Pune Skill and Personality Development Programme Centre (SPDC):
SPDC focuses on preparing students for professional life through skill enhancement.
Programs offered: Communication skills, personality development, interview preparation, group discussion training, aptitude training, resume building, technical skill workshops.
SPDC works closely with the Training and Placement Office (TPO) to make students industry ready.
Regular sessions on soft skills, English communication, logical reasoning, and quantitative aptitude.
Students from all branches benefit from SPDC programs especially in their final years for campus placements.`
  },

  // ─── STUDENT CAREER COUNSELLING (FROM WEBSITE) ───────────────────
  {
    title: 'Student Career Counselling and Guidance SCCG',
    content: `VIT Pune Student Career Counselling and Guidance (SCCG):
SCCG provides career guidance and counselling to students at VIT Pune.
Services: Career path guidance, higher studies advice (GATE, GRE, CAT, UPSC), internship guidance, resume review, mock interviews, LinkedIn profile building.
Students can consult SCCG for choosing between job placements and higher studies.
SCCG also provides mental health counselling and stress management support for students.
Contact through dean.studactivities@vit.edu for appointments.`
  },

  // ─── ABOUT VIT PUNE ───────────────────────────────────────────────
  {
    title: 'About VIT Pune History and Overview',
    content: `Vishwakarma Institute of Technology VIT Pune:
Founded 1 September 1983 by Shri Rajkumarjee Agarwal with Shri V.V. Chiplunkar and Shri Sarnobat.
Named after Vishwakarma the divine engineer from Indian mythology.
Started in a small building in a busy marketplace of Pune. Moved to Bibwewadi campus in 1987.
In 2008 became first private self-financed autonomous engineering college in Maharashtra.
Address: 666, Upper Indiranagar, Bibwewadi, Pune - 411037.
Affiliated to Savitribai Phule Pune University SPPU. Autonomous since AY 2008-09 valid till 2030.
NAAC A+ accredited. NBA accredited programs. 12 UG B.Tech courses offered.
Vision: Globally acclaimed institute in Technical Education and Research.
Mission: 100% employable students, strong academics, research culture, socially responsible citizens.`
  },

  // ─── DEPARTMENTS ──────────────────────────────────────────────────
  {
    title: 'Departments at VIT Pune',
    content: `VIT Pune B.Tech Departments and Programs:
1. Computer Engineering (CE)
2. Information Technology (IT)
3. Electronics and Telecommunication Engineering (E-TC / ENTC)
4. Mechanical Engineering
5. Instrumentation Engineering
6. Engineering Science and Humanities (DESH) - handles FY common subjects for all branches
7. Artificial Intelligence and Data Science (AI and DS / AIDSC)
8. Chemical Engineering
9. Civil Engineering
10. Computer Engineering Software Engineering (CE-SE)
11. Computer Science and Engineering AI and ML (CSE AI-ML)
12. Computer Science and Engineering Data Science (CS-DS)
13. Computer Science and Engineering IoT and Cyber Security including Blockchain Technology (CSE IoT-CS-BT)
14. Computer Sciences and Engineering AI (CSE-AI)
Each department has dedicated labs, faculty, and research facilities. DESH department handles all FY B.Tech first year subjects.`
  },

  // ─── PLACEMENTS ───────────────────────────────────────────────────
  {
    title: 'Placements at VIT Pune',
    content: `VIT Pune Placement Information AY 2024-25:
Highest Salary Package: 45 LPA. Median Salary: 9.5 LPA. Placement Rate: 86.3%.
500+ companies visit every year. 1500+ students participate in placements.
Training and Placement Office (TPO) conducts seminars, guest lectures, workshops, training.
TPO Head: Prof. Karthick Subramanian Balasubramanian. Email: tpo@vit.edu. Mobile: +91 73859 91260.
Types of recruiters: IT companies, Core Engineering, Consulting, Finance, Manufacturing, Startups.
VIT Pune has robust connections with industry across India. Strong placement track record over decades.`
  },

  // ─── ADMISSIONS ───────────────────────────────────────────────────
  {
    title: 'Admissions at VIT Pune',
    content: `VIT Pune Admissions:
FY B.Tech admissions through MHT-CET and JEE Main scores.
Lateral entry DSE (Direct Second Year Engineering) also available.
International students can apply through Vishwakarma International portal vishwakarmainternational.com.
Hostel accommodation available for outstation students - boys and girls separate hostels.
Piping Engineering Course also offered as specialized program.
Enquiry: vit.edu/enquiry-form. Admission notifications: vit.edu/notification.
Previous year cutoffs available on vit.edu/undergraduate page.`
  },

  // ─── SGPA CGPA GRADES ─────────────────────────────────────────────
  {
    title: 'Grades and GPA System at VIT Pune',
    content: `VIT Pune Grading System:
Grade A+ (AA) = 10 points (Outstanding)
Grade A (AB) = 9 points (Excellent)
Grade B+ (BB) = 8 points (Very Good)
Grade B (BC) = 7 points (Good)
Grade C+ (CC) = 6 points (Above Average)
Grade C (CD) = 5 points (Average)
Grade D (DD) = 4 points (Pass)
Grade F (FF) = 0 points (Fail)
SGPA = Total Grade Points in semester divided by Total Credits in semester.
CGPA = Total Grade Points of ALL semesters divided by Total Credits of ALL semesters.
CGPA is NOT average of all SGPAs. It is recalculated using cumulative grade points and credits.
Minimum passing grade is D (4 points). F means failed and subject needs to be cleared.`
  },

  // ─── RANKINGS ─────────────────────────────────────────────────────
  {
    title: 'Rankings and Recognition of VIT Pune',
    content: `VIT Pune Rankings and Recognitions:
NAAC A+ Accredited. NBA accredited programs. NIRF ranked institute.
40+ years of educational excellence since 1983.
First private self-financed autonomous engineering college in Maharashtra (2008).
500+ recruiting companies. Top placements in CS IT ENTC Mechanical branches.`
  },


  // ─── FEES STRUCTURE ───────────────────────────────────────────────
  {
    title: 'VIT Pune Fees Structure 2025-26',
    content: `VIT Pune Fees Structure FY B.Tech 2025-26 (All amounts in Indian Rupees):

CAP / ACAP Seats (Government Quota):
Total fees: Rs 2,06,000 (Tuition Rs 1,79,130 + Development Rs 26,870) + Eligibility Rs 600 + Exam Rs 2,420 + Misc Univ Rs 2,444 + Insurance Rs 701 = Grand Total Rs 2,12,165

CAP ACAP Category-wise Fees:
OPEN category: Tuition 1,79,130 + Development 26,870 + Eligibility 600 + Exam 2,420 + Misc 2,444 + Insurance 701 = Total Rs 2,12,165
OPEN OMS (Outside Maharashtra State): Total Rs 2,12,665 (Eligibility fees Rs 1,100 instead of 600)
OBC category: Tuition 89,565 + Development 26,870 + others = Total Rs 1,22,600
NT category: Only Development 26,870 + others = Total Rs 33,035
SBC category: Total Rs 33,035
SC category: Tuition NIL + Development NIL + Eligibility 600 + Exam 2,420 + Misc 2,444 + Insurance 701 = Total Rs 6,165
ST category: Total Rs 6,165
OBC-GIRLS: Total Rs 33,035
PH/PWD/ORPHAN: Total Rs 33,035

Management Seats / Institute Level Admissions (Self-Finance):
Top Tier Branches (Computer Engineering, IT, CSE-AI, AI&DS, CSE AI-ML):
Tuition Rs 5,37,390 + Development Rs 80,610 = Total Rs 6,18,000 + Eligibility 600 + Exam 2,420 + Misc 2,444 + Insurance 701 = Grand Total Rs 6,24,165

Mid Tier Branches (CSE IoT-CS-BT, CS Data Science, CE Software Engineering, E-TC, Mechanical):
Tuition Rs 3,58,260 + Development Rs 53,740 = Total Rs 4,12,000 + others = Grand Total Rs 4,18,165

Lower Tier Branches (Civil Engineering, Instrumentation and Control Engineering):
Same as CAP fees: Total Rs 2,06,000 + others = Grand Total Rs 2,12,165

NRI Seats: USD 12,000 per year + other charges = Total approx USD 12,000 + Rs 6,665
CIWGC Fees: Computer Engineering USD 2,400. IT CSE-AI CSE-AIML AI&DS USD 1,800. Other branches USD 1,200.
PIO/OCI/Foreign National: Computer Engineering USD 3,600. IT CSE-AI CSE-AIML AI&DS USD 1,800. Other branches USD 1,200.

Note: Eligibility and University fees subject to change as per SPPU circulars. Students from outside Maharashtra pay Rs 1,100 eligibility fees instead of Rs 600. Fees can be paid by Demand Draft.`
  },


  // ─── DETAILED ASSESSMENT GUIDELINES ALL YEARS ────────────────────
  {
    title: 'SY B.Tech Detailed Assessment Guidelines 2025-26',
    content: `VIT Pune SY B.Tech Assessment Guidelines AY 2025-26 (Dean Academics: Prof. Dr. Parikshit N. Mahalle):

I. Courses with emphasis on Practicals:
Lab work (during lab turns) = 10 marks. Course Project (End Sem) = 30 marks. Comprehensive Viva Voce (End Sem) = 20 marks. Programming Practical (End Sem) = 40 marks. Total = 100 marks.

II. Courses with Lab:
Lab work = 10 marks. Course Project (End Sem) = 30 marks. Comprehensive Viva Voce (End Sem) = 20 marks. Written Exam/MCQ/ESE (End Sem, 60 marks converted to) = 40 marks. Total = 100 marks.

III. Courses with Theory, Lab and Tutorial:
Presentation/GD/Home Assignment (In-Sem Week 5,6,7,8: 30 marks Part A + End Sem 70 marks Part B = 100 marks) converted to 20 marks. Lab Work (End Sem) = 10 marks. Course Project (End Sem) = 30 marks. Written Exam/MCQ/ESE (End Sem) = 40 marks. Total = 100 marks.

IV. Courses with Tutorial only:
Presentation/GD (during tutorial turns) = 30 marks. Comprehensive Viva Voce (during tutorial) = 30 marks. Written Exam/MCQ/ESE (End Sem) = 40 marks. Total = 100 marks.

V. Credit Theory Course (Theory only):
Class Test 1 in Week 6 based on Unit 1 and 2 = 35 marks. Class Test 2 in Week 12 based on Unit 3 and 4 = 35 marks. Comprehensive Viva Voce (End Sem, all units) = 30 marks. Total = 100 marks.

VI. Engineering Design and Innovation Project (EDI):
Mid Semester presentation (50 marks converted to) = 30 marks. End Semester presentation and demonstration (100 marks converted to) = 70 marks. Total = 100 marks.

VII. Reasoning and Aptitude Development (RAD) for SY:
English Ability (Week 14) = 30 marks. Logical Ability (Week 14) = 30 marks. Quantitative Ability (Week 14) = 30 marks. Automata Fix (Week 14) = 5 marks. Automata Pro (Week 14) = 5 marks. Total = 100 marks. Final mark entered in VIERP as Continuous Assessment (CA) out of 100.

VIII. Humanities and Social Science Course:
MCQ/MSE (Mid Semester) = 50 marks. MCQ/ESE (End Semester) = 50 marks. Total = 100 marks.

IX. MDM (Multi-Disciplinary Minor):
Class Test 1 in Week 6 (Unit 1 and 2) = 35 marks. Class Test 2 in Week 12 (Unit 3 and 4) = 35 marks. Comprehensive Viva Voce (End Sem) = 30 marks. Total = 100 marks.`
  },
  {
    title: 'TY B.Tech Assessment Guidelines 2025-26',
    content: `VIT Pune TY B.Tech (Third Year) Assessment Guidelines AY 2025-26:

I. Courses with Theory, Lab and Tutorial:
Presentation/GD/Home Assignment (Week 5-8: Part A 30 marks + End Sem Part B 70 marks = 100 marks) converted to 20 marks. Lab Work (End Sem) = 10 marks. Course Project (End Sem) = 20 marks. Written Exam/MCQ (End Sem) = 30 marks. Comprehensive Viva Voce (End Sem) = 20 marks. Total = 100 marks.

II. Courses with Programming activity:
Lab work (during lab turns) = 10 marks. Course Project (End Sem) = 20 marks. Comprehensive Viva Voce (End Sem) = 20 marks. Programming Practical (End Sem) = 50 marks. Total = 100 marks.

III. Engineering Design and Innovation Project:
Mid Semester presentation = 30 marks. End Semester presentation and demo = 70 marks. Total = 100 marks.

RAD for TY - Computer IT AI&DS CSE-AIML CSE-AI branches:
English Ability = 20, Logical Ability = 20, Quantitative Ability = 20, Automata Fix = 10, Automata Pro = 10, Domain Specific Component = 10, Node.JS = 5, React.JS = 5. Total = 100 marks.

RAD for TY - E-TC Instrumentation Mechanical branches:
English Ability = 20, Logical Ability = 20, Quantitative Ability = 20, Automata Fix = 10, Automata Pro = 10, Domain Specific Component = 20. Total = 100 marks.`
  },
  {
    title: 'Final Year B.Tech Assessment Guidelines 2025-26',
    content: `VIT Pune Final Year B.Tech (FY B.Tech 4th Year) Assessment Guidelines AY 2025-26:

I. Final Year Courses:
MCQ Exam Section I / MSE (Mid Semester) = 30 marks. Home Assignment (End of Semester) = 10 marks. MCQ Exam Section II / ESE (End of Semester) = 30 marks. Comprehensive Viva Voce (End of Semester) = 30 marks. Total = 100 marks.

II. Coursera Track Certification (Semester I):
Continuous Assessment till Semester End including end of module quiz, assignment, module project, course project, track project = 100 marks. Student chooses appropriate track specialization.

III. Major Project and Semester Internship:
Mid Semester: Project/Internship presentation (50 marks converted to) = 30 marks.
End Semester: Project/Internship presentation and demonstration (100 marks converted to) = 70 marks. Total = 100 marks.

Final Year Major Project Mid Sem criteria: Problem Statement 10, Literature Review 10, Group formation 10, Objective 10, Knowledge of domain and tools 10. Total 50 marks.
Final Year Major Project End Sem criteria: Realization 10, Design Testing Analysis 30, Documentation 20, Quality 15, Q&A 15, Regular interaction with guide 10. Total 100 marks.

Semester Internship End Sem criteria: Same as Major Project but includes "Regular interaction with guide" and internship company guide involvement is encouraged.`
  },
  {
    title: 'Courses with Programming Activity Branch-wise',
    content: `VIT Pune Courses with Programming Activity (Assessment: Lab 10 + Project 20/30 + Viva 20 + Programming Practical 40/50 = 100 marks):

IT Branch: Data Structures (IT2301), Operating System (IT2305), System Programming (IT3202), Artificial Intelligence (IT3218), Cloud Computing (IT3229).

AI&DS Branch: Data Structures (AI2301), Database Management Systems (AI2303), Artificial Intelligence (AI3001), Operating System (AI3002), Machine Learning (AI3004), Complexity Algorithms (AI3011), Software Design and Methodologies (AI3012).

Computer Engineering Branch: OOP (CS2303), DBMS (CS2304), Data Structures I (CS2305), Design and Analysis of Algorithms (CS3205), Software Design and Modeling (CS3061), Artificial Intelligence (CS3202), Cryptography and Information Security (CS3334).

E-TC Branch: Data Structures (ET2301), Computer Vision (ET3221), Embedded System Design (ET3271).

Instrumentation Branch: Data Science (IC2301), OOP (IC2305), DBMS (IC2307).

CSE AI-ML Branch: Fundamentals of Data Structures (ML2301), DBMS (ML2302), OOP (ML2303), Design and Analysis of Algorithms (ML3002), Machine Learning (ML3003).

CSE-AI Branch: Fundamentals of Data Structures (CI2011), DBMS (CI2012), OOP (CI2013), Design and Analysis of Algorithms (CI3002), Artificial Neural Networks (CI3003), Cloud Computing (CI3004).

CS-DS Branch: Fundamentals of Data Structures and Algorithms (DS2003), Fundamentals of Data Science (DS2004), OOP (DS2005).

CS-SE Branch: Fundamentals of Data Structures (SE2003), DBMS (SE2004), Operating System (SE2005), OOP (SE2006).

CS-CBI (IoT Cyber Security Blockchain) Branch: Fundamentals of Data Structures (CB2003), OOP (CB2006).

Mechanical and Chemical branches: No programming activity courses.`
  },
  {
    title: 'Design Thinking Assessment at VIT Pune',
    content: `VIT Pune Design Thinking Subject:
Applicable for SY B.Tech, TY B.Tech (both semesters) and Final Year B.Tech (Semester 7 only) as 1 credit group activity.
Objective: To provide ecosystem for students for paper publication and patent filing.
Outcome: Publication of paper or filing of patent.

Grading for Design Thinking:
A+ grade: Paper published in High Impact Journals (Top 50 journal list) or Patent Granted.
A grade: Paper published in any SCI/Scopus/Web of Science journal or conference or Patent Published.
B+ grade: Paper accepted for publication in SCI/Scopus/Web of Science journal/conference or patent filed.
B grade: Paper published in UGC Listed Journal.
C+ grade: International Conference Paper Publication (Non-Scopus, Non-SCI).
C grade: National Conference Paper Publication (Non-Scopus, Non-SCI).
D grade: Paper submitted to any Journal or Conference.
F grade: No publication and no patent.`
  },
  {
    title: 'Assessment Rubrics Presentation and Group Discussion',
    content: `VIT Pune Assessment Rubrics:

Presentation Assessment (100 marks converted to 20 marks):
Partial assessment Week 5-8 for 50 marks: Survey about topic 15, Appropriateness of references 15, Technical content coverage 20. Total 50 converted to 30.
Summative End Semester 100 marks: Contents of slides 25, Understanding of concepts 25, Presentation Skills 25, Performance in Q&A 25. Total 100 converted to 70.

Group Discussion Assessment (100 marks converted to 20 marks):
Partial Week 5-8 for 50 marks: Survey about topic 15, Technical content during discussion 20, Ability to express technical views 15. Total 50 converted to 30.
Summative End Semester 100 marks: Level of Participation 25, Knowledge of Topic 15, Communication skills and Vocabulary 25, Critical Thinking 25, Overall Impression of Examiner 10. Total 100 converted to 70.

Comprehensive Viva Voce (CVV): End Semester 100 marks converted to 20 marks. It is a summative verbal assessment covering entire course contents. Questions cover analysis, synthesis, application, comparison, correlation. Students can use pen paper or whiteboard.`
  },
  {
    title: 'Online MCQ Exam Instructions VIT Pune',
    content: `VIT Pune Online MCQ Examination Instructions (for students admitted 2024-25 onwards):

Before Exam:
1. First join the Google Meet link given by subject teacher. Start your camera and keep microphone mute.
2. Then login to https://epvit.vierp.in/ to start the exam.
3. Allow camera and microphone permission in Easy Pariksha when asked - compulsory.
4. This exam is proctored - both manual and AI-enabled proctoring. Any malpractice leads to punitive action.
5. Exam is given from HOME. Ensure laptop is fully charged. Have a backup for electricity failure.
6. Must use internet-enabled LAPTOP. No other device (phone, tablet) is permitted.
7. No re-examination if you miss the exam. Give exam as per schedule.
8. Camera must be ON throughout the exam. If video is off, exam will be paused by proctor.
9. Must join Google Meet/Zoom meeting link shared by subject teacher.
10. Tab switching during exam leads to IMMEDIATE termination of exam.
11. Contact subject teacher only for any issue during exam.
12. At end of MCQ exam, result is displayed immediately on screen. Note down marks for reference.
Dummy exams will be conducted before actual exams for practice with the software. Dummy exam has general questions not from any FY subject - just for familiarization.
Exam portal URL: https://epvit.vierp.in/`
  },
  {
    title: 'Offline Exam Instructions VIT Pune',
    content: `VIT Pune Offline Examination Instructions:

Before Exam:
- Be present in Exam Hall HALF AN HOUR before exam time.
- Check room number, bench number, bench side from seating arrangement.
- Go directly to Exam Hall, do not wait anywhere.
- Mobile phones and electronic gadgets NOT allowed in Exam Hall. Switch off mobile and keep in bag OUTSIDE hall.
- I-CARD (college ID card) is compulsory to bring. Without ID card, show any government authorized photo ID proof.
- Bench Number 1 is always to student's LEFT side.
- Fill PRN number, year, class, subject code, subject name in answer sheet.
- Write PRN number on Question Paper. Do not write anything else on question paper.

During Exam:
- Students NOT allowed to enter Exam Hall after first 30 minutes.
- Students NOT allowed to leave Exam Hall for first 30 minutes.
- Students NOT allowed to leave Exam Hall for last 10 minutes.
- Sign the student attendance sheet and Junior Supervisor report.
- Take invigilator signature on answer paper, supplements, graphs, drawing sheets.
- Maintain discipline throughout the exam.

End of Exam:
- Last 10 minutes: Tie all Supplementary Sheets and fill total number of supplements on Main Sheet.
- Give answer sheet to invigilator. Do not keep on desk. Leave Exam Hall.

To avoid copy case:
- No printed or written material allowed. No writing pads, pouches, calculators, watches with writing.
- Students cannot share writing material with other students.
- Students cannot talk with other students during exam.
- SQAD and CCTV team continuously observe students in all classes.
- Action taken as per institute rules for any copy case.`
  },

  // ─── CAMPUSHUB ────────────────────────────────────────────────────
  {
    title: 'CampusHub Platform Guide',
    content: `CampusHub is a student platform for VIT Pune students.
Dashboard: Overview and quick links. Marketplace: Buy sell borrow books electronics stationery documents. Post with photos.
Community: Share posts notes questions with all students. Like and comment.
Messages: Direct private messaging between students.
AI Chatbot: Smart assistant for VIT Pune academics exams syllabus campus life. Personalized to your profile.
Profile: Update name branch year. View your listings.
Marketplace categories: Books, Electronics, Documents, Stationery, Other.`
  }

]

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

  await supabase.from('rag_documents').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  console.log('🗑️ Cleared existing documents')

  let totalChunks = 0

  for (const doc of VIT_DOCUMENTS) {
    console.log(`\n📄 Processing: ${doc.title}`)
    const chunks = chunkText(doc.content)
    console.log(`   ${chunks.length} chunks`)

    for (let i = 0; i < chunks.length; i++) {
      const embedding = await embed(chunks[i])
      await supabase.from('rag_documents').insert({
        title: doc.title,
        content: chunks[i],
        embedding,
        metadata: { source: 'vit-pune', chunk: i }
      })
      totalChunks++
      process.stdout.write('.')
      await new Promise(r => setTimeout(r, 200))
    }
    console.log(' ✅')
  }

  console.log(`\n\n✅ Done! Ingested ${totalChunks} chunks from ${VIT_DOCUMENTS.length} documents.`)
}

ingest().catch(console.error)
