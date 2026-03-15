# CampusHub — Complete Architecture & Code Explanation
### For Hackathon Defense | Written for Ayush Borade

---

## 🧠 THE BIG PICTURE FIRST

Think of CampusHub like a building:
- **Next.js** = the building itself (walls, floors, structure)
- **React** = the furniture inside each room (UI components)
- **Supabase** = the basement (database, login system, file storage)
- **Groq AI** = a smart robot assistant hired to work in the building
- **HuggingFace** = a specialized translator the robot uses to understand questions
- **Tailwind / inline styles** = the paint and decoration

---

## 🗂️ PROJECT FOLDER STRUCTURE

```
campushub/
├── app/                    ← All pages and API routes
│   ├── api/                ← Backend (server-side code)
│   │   ├── ai/chat/        ← Main AI chatbot brain
│   │   ├── lost-found-match/ ← AI matching for lost & found
│   │   └── notes/autotag/  ← AI tag generator for notes
│   ├── auth/               ← Login and Register pages
│   ├── dashboard/          ← Home page after login
│   ├── marketplace/        ← Buy/Sell/Lost/Found
│   ├── community/          ← Social posts
│   ├── messages/           ← Direct messaging
│   ├── chatbot/            ← AI assistant page
│   ├── timetable/          ← Schedule builder
│   ├── notes/              ← Notes marketplace
│   └── profile/            ← User profile
├── components/             ← Reusable UI pieces
│   ├── MainLayout.tsx      ← The shell every page uses
│   ├── Sidebar.tsx         ← Left navigation
│   └── NotificationBell.tsx ← 🔔 Bell icon in top bar
├── lib/                    ← Shared utilities
│   ├── supabase.ts         ← Database connection
│   └── rag.ts              ← RAG search helper
└── scripts/
    └── ingest-rag.ts       ← One-time script to load AI knowledge
```

---

## ⚙️ TECH STACK — WHAT EACH TOOL DOES

### Next.js 15
The main framework. Two types of code run in it:
- **Client-side** (`'use client'` at top) = runs in the user's browser. Can use useState, useEffect, DOM.
- **Server-side** (API routes in `app/api/`) = runs on the server. User never sees this code. This is where you put secret API keys.

### React 19
The UI library. Everything you see on screen is a React "component" — a function that returns HTML-like code called JSX.

### TypeScript
JavaScript with types. `const name: string = "Ayush"` — the `: string` part is TypeScript. It catches bugs before runtime.

### Supabase
Your entire backend-as-a-service:
- **PostgreSQL database** — stores users, listings, messages, notifications, notes, timetable
- **Auth** — handles login, signup, sessions, JWT tokens
- **Realtime** — pushes live updates (new message → instantly appears)
- **Storage** — stores uploaded images, PDFs, videos
- **RLS (Row Level Security)** — database rules like "user can only see their own profile"

### Groq API
Runs the Llama 3.1 AI model at very high speed. You send it a prompt (system instructions + user question), it returns a text reply. Cost: free tier with rate limits.

### HuggingFace
Hosts the `all-MiniLM-L6-v2` model which converts text into numbers (called embeddings / vectors). Used for RAG search.

---

## 📁 FILE-BY-FILE EXPLANATION

---

### `lib/supabase.ts` — The Database Connection

```typescript
export const supabase = createClient(supabaseUrl, supabaseKey)
```

This creates ONE connection to your Supabase database. You import `supabase` in every file that needs data.

It also defines TypeScript **types** like `Profile`, `Listing`, `DirectMessage` — these are just blueprints that say "a Profile object has these fields with these data types." Helps you avoid typos like `profile.naem` instead of `profile.name`.

**The two clients:**
- `supabase` (anon key) = used in browser. Respects RLS policies. Limited access.
- `supabaseAdmin` (service role key) = used in API routes only. Bypasses RLS. Can read/write anything. **NEVER expose this in browser code.**

---

### `lib/rag.ts` — RAG Search Helper

RAG = Retrieval Augmented Generation. It's how the AI "knows" VIT Pune facts.

This file has two functions:
1. `generateEmbedding(text)` — sends text to HuggingFace, gets back 384 numbers (a vector)
2. `searchRelevantChunks(query)` — converts user's question to a vector, then searches the database for stored chunks with similar vectors

Think of vectors like GPS coordinates for meaning. "Linear Algebra" and "eigenvalues" are close in vector space. "Linear Algebra" and "cricket" are far apart.

---

### `scripts/ingest-rag.ts` — The Knowledge Loader

This runs ONCE (`npx ts-node scripts/ingest-rag.ts`). It:
1. Defines ~30 text documents about VIT Pune (syllabus, fees, clubs, exam patterns, holidays)
2. Splits each document into ~500-character chunks (overlap of 100 chars so context isn't lost)
3. Converts each chunk to a vector using HuggingFace
4. Stores chunk + vector in `rag_documents` table in Supabase

After running this, the AI can "look up" relevant VIT info before answering.

---

### `app/layout.tsx` — The Root HTML Shell

Every page in the app is wrapped by this. It sets the HTML `<html>` and `<body>` tags, font, background color, and the browser tab title. You only write this once.

---

### `app/page.tsx` — The Landing Page (/)

The first page a visitor sees before logging in. Just redirects to `/auth/login` or `/dashboard` depending on whether they're already logged in.

---

### `components/MainLayout.tsx` — The Shell Every Page Uses

Every logged-in page wraps itself in `<MainLayout>`. This component:
1. Checks if user is logged in → if not, redirects to `/auth/login`
2. Fetches the user's name and year from `profiles` table
3. Renders the **Sidebar** on the left
4. Renders the **top bar** (date, 🔔 bell, 👋 greeting)
5. Renders `{children}` — which is whatever page you're currently on

The `noPadding` prop is a special flag for the Chatbot page which needs full height with no padding.

**Key CSS trick used:**
```
height: 100vh → full screen height
overflow: hidden → no page scroll (inner sections scroll instead)
flex: 1 → take remaining space
```

---

### `components/Sidebar.tsx` — Left Navigation

Renders the nav links (Dashboard, Timetable, Marketplace, etc.)

**Smart features:**
- Highlights the active page using `usePathname()` — compares current URL to each nav item's `href`
- Collapses to icon-only mode (60px wide) vs full labels (220px)
- Shows a **red unread badge** on Messages by querying `notifications` table for unread message-type notifications
- Subscribes to Supabase Realtime so badge updates live without refresh

---

### `components/NotificationBell.tsx` — 🔔 Bell in Top Bar

**State it manages:**
- `notifs` — array of all notifications from DB
- `open` — is the dropdown visible?
- `unread` — count of unread notifications (computed from `notifs`)

**How Realtime works here:**
```typescript
supabase.channel('notifications-' + userId)
  .on('postgres_changes', { event: 'INSERT', table: 'notifications', filter: `user_id=eq.${userId}` },
    (payload) => setNotifs(prev => [payload.new, ...prev])
  )
  .subscribe()
```
Translation: "Watch the notifications table. When a new row is added for MY user ID, instantly add it to my list." — No polling, no refresh needed.

**Actions:**
- Mark all read → updates `read=true` in DB, clears red badges
- Clear all → deletes all notification rows for this user
- Click a notification → marks it read + navigates to the linked page

---

### `app/auth/register/page.tsx` — Signup Page

**Flow:**
1. User fills form: name, email, branch, year, module (if 1st year)
2. Validates: email must end in `.edu` or `.edu.in`
3. Calls `supabase.auth.signUp()` — creates a user in Supabase Auth
4. Uses `signUpData.user.id` (from the response, not a separate `getUser()` call — avoids timing bug)
5. Calls `supabase.from('profiles').upsert({...})` — saves name, branch, year, module to profiles table

**Why `upsert` not `update`?**
`update` only works if the row already exists. `upsert` = "insert if not exists, update if exists." Safer.

**Module selector logic:**
- Only appears when year = "1st Year" AND branch is CS/IT/AI or ENTC/Instrumentation
- Shows subject preview based on branch (CS Module 1 = COA/Web Dev; ENTC Module 1 = Electronic Circuits)
- Styled as custom radio buttons (not the ugly default HTML radio)

---

### `app/auth/login/page.tsx` — Login Page

Calls `supabase.auth.signInWithPassword({ email, password })`. Supabase handles the JWT token, stores it in a browser cookie automatically. After login, redirects to `/dashboard`.

---

### `app/dashboard/page.tsx` — Home After Login

**What it fetches:**
- User profile (name, branch, year)
- Count of active marketplace listings
- Count of active lost items
- Last 4 marketplace listings (for "Recent Listings" section)

**Key concept — `useEffect`:**
```typescript
useEffect(() => {
  // runs after component appears on screen
  load() // fetch data
}, []) // empty array = run only ONCE when page loads
```

---

### `app/marketplace/page.tsx` — Buy/Sell/Lost/Found

**The most complex page. Features:**
- 5 tabs: All, Buy & Sell, Borrow & Lend, Lost, Found
- Filter by category, search by text
- Post modal: image upload → Supabase Storage → get public URL → save with listing
- Contact seller → sends a DM (`direct_messages` insert)
- Delete own listing → sets `status = 'removed'` (soft delete, not actual DELETE)

**Realtime:**
```typescript
supabase.channel('listings-realtime')
  .on('postgres_changes', { event: '*', table: 'listings' }, () => loadListings())
  .subscribe()
```
Translation: Any change to listings table (insert/update/delete) → re-fetch all listings.

**Lost & Found AI Matching:**
After posting a lost/found item, calls `/api/lost-found-match`. Server checks recent opposite-type listings, scores keyword overlap, sends DM if match found.

---

### `app/api/lost-found-match/route.ts` — Lost/Found Matching API

**Algorithm:**
1. Extract keywords from title+description (remove stop words like "the", "a", "in")
2. For each candidate listing of opposite type (lost vs found), count matching keywords
3. Each matching keyword = +20 score
4. If score ≥ 40 (2 matching words) → send DM to that user
5. Return match count to frontend

**Uses `supabaseAdmin`** (service role) because it needs to read other users' listings and insert DMs server-side.

---

### `app/community/page.tsx` — Social Posts

**Features:**
- Post with text + optional image/video
- Categories (Hostel, Mess, Academic, Events, etc.)
- Like posts (toggle like in `post_likes` table)
- Delete own posts
- Media upload to Supabase Storage → saved as `media_url` in post

**Realtime subscription** re-fetches posts on any change, so if someone else posts, you see it without refreshing.

---

### `app/messages/page.tsx` — Direct Messages

**How conversations work:**
The `direct_messages` table has `sender_id` and `receiver_id`. A "conversation" is just all messages between two users — there's no separate conversations table. The app groups messages by the other user's ID.

**File sharing:**
- User picks a photo/video/document
- Uploads to `message-files` Supabase Storage bucket
- Message content stored as a special string: `🖼__FILE__<url>__NAME__<filename>__TYPE__<mimetype>`
- When rendering, the app splits this string to get the URL and type, then shows image/video/link accordingly

**Unsend:**
Messages aren't deleted from DB — just hidden using localStorage (`campushub_unsent_<userId>`). Only disappears for you, not the other person.

---

### `app/timetable/page.tsx` — Timetable Builder

**How the grid works:**
- Rows = time slots (8AM to 6PM, hourly)
- Columns = days (Mon to Sat)
- Each cell is a clickable slot
- Clicking opens a subject pill selector
- Selecting a subject → calls `supabase.from('timetable_slots').upsert()`

**Lab spanning:**
Labs are 2 hours. When slot_type = 'lab', the grid cell `rowSpan = 2`. The next hour is automatically "covered" and skipped.

**Today's Summary:**
At the bottom, filters `timetable_slots` for today's day name, sorts by time, and shows what's on for today. Time displayed as `parseInt("10:00") = 10` → `10-12` for labs.

**Off-days system:**
User picks "Sat+Sun off", "Sun+Mon off", or "Sun only". Stored in `profiles.off_days`. Used by bridge day calculator in AI chat route.

---

### `app/notes/page.tsx` — Notes Marketplace

**Upload flow:**
1. User picks PDF
2. `file.text()` extracts raw text content
3. AI auto-tags it via `/api/notes/autotag`
4. File uploaded to `notes` Supabase Storage bucket
5. Row inserted into `notes` table with file URL + tags

**Paywall system:**
- Free notes: anyone can click → `window.open(file_url)`
- Paid notes for non-owners: `🔒 Buy ₹X` button → Buy Modal → sends DM to uploader saying "I want to buy your notes" → uploader shares PDF manually after payment
- The PDF URL is never opened for non-owners → paywall enforced in frontend

**AI auto-tagging:**
Calls `/api/notes/autotag` which sends the title+subject to Groq and asks it to return a JSON array of relevant tags like `["eigenvalues", "mid-sem", "solved-examples"]`.

---

### `app/api/notes/autotag/route.ts` — Auto-tag API

Sends a carefully crafted prompt to Groq asking for ONLY a JSON array (no markdown, no explanation). Then uses regex `raw.match(/\[.*\]/s)` to safely extract the JSON even if the model adds extra text.

---

### `app/chatbot/page.tsx` — AI Chat Interface

**Sessions:**
Chats are saved in `localStorage` with key `campushub_chats_<userId>`. Stored as array of `{id, title, msgs, createdAt}`. No DB needed for chat history — it's browser-local.

**Markdown rendering:**
The `renderMd()` function converts AI responses from markdown to HTML:
- `**bold**` → `<strong>bold</strong>`
- `` `code` `` → styled code span
- ` ```code block``` ` → styled pre block
- `## Heading` → styled heading div
- `- bullet` → styled bullet div

HTML injection is prevented by escaping `<`, `>`, `&` before applying markdown rules.

**Document upload:**
User uploads PDF/TXT → `file.text()` extracts text → stored in state as `docText`. When user asks a question, docText is included in the API request. The system prompt is replaced with a slim version to stay within Groq's 6000 token limit.

**Quick asks:**
Dynamic based on branch+module from profile. CS Module 1 student gets COA/Web Dev buttons. ENTC Module 2 student gets DLD/Applied Electro buttons.

---

### `app/api/ai/chat/route.ts` — The AI Brain (Most Important File)

This is the heart of CampusHub. Here's the complete flow for every message:

```
User sends message
        ↓
1. Extract userId, message, history, docContent from request body
        ↓
2. Fetch user profile (name, branch, year, module, off_days) → supabaseAdmin
        ↓
3. Fetch user's timetable slots for today and tomorrow → supabaseAdmin
        ↓
4. If message is about marketplace → fetch recent listings
   If message is about community → fetch recent posts
        ↓
5. Search RAG database for relevant VIT Pune knowledge chunks
        ↓
6. Build SYSTEM PROMPT — this is the instruction manual for the AI
        ↓
7. If PDF attached → use slim system prompt (save tokens)
        ↓
8. Send [system prompt + last 5 messages + new message] to Groq
        ↓
9. Return AI reply to frontend
```

**The System Prompt** is a giant string that tells the AI:
- Who it is (CampusHub AI for VIT Pune)
- Who it's talking to (your name, branch, module, off days)
- Bridge day analysis (pre-computed for your off days + upcoming holidays)
- RAG knowledge retrieved for this specific question
- PRIORITY RULE: system prompt marks > RAG data
- Marks structure for every subject (hardcoded, correct)
- Module structure (who has which subjects)
- Timetable for today/tomorrow
- Live marketplace + community data
- Holidays (pre-filtered: upcoming vs past, computed at request time)
- Fees structure
- Rules: never invent info, use emojis, be personalized

**Why `supabaseAdmin` for server reads?**
Regular `supabase` (anon key) respects RLS policies. On the server, there's no logged-in user session, so RLS blocks reads. `supabaseAdmin` (service role key) bypasses RLS — it can read any user's data. **This is only safe because it's server-side code — the key is never sent to the browser.**

---

### Notification System (DB Triggers + Realtime)

**The SQL triggers in `notifications_migration.sql`:**
These are PostgreSQL functions that auto-run when data changes:

```sql
-- When someone inserts a row in direct_messages...
CREATE TRIGGER on_new_message
  AFTER INSERT ON direct_messages
  FOR EACH ROW EXECUTE FUNCTION notify_on_message();
```

`notify_on_message()` inserts a row into the `notifications` table for the receiver. This happens at the DATABASE level — no API call needed. The moment a message is sent, the notification exists.

Then Supabase Realtime detects the new notification row and pushes it to the bell component's subscription → red badge appears instantly.

**4 triggers total:**
1. New DM → notify receiver
2. New marketplace listing → notify ALL other users
3. New note uploaded → notify ALL other users
4. New community post → notify ALL other users

---

## 🔐 SECURITY CONCEPTS USED

**RLS (Row Level Security):**
```sql
CREATE POLICY "Users see own notifications" ON notifications 
FOR SELECT USING (auth.uid() = user_id);
```
This means: "You can only SELECT rows where your user ID matches the `user_id` column." Even if a hacker calls the API directly, they can't see other people's data.

**JWT Tokens:**
When you log in, Supabase gives you a JWT (JSON Web Token) — a signed string containing your user ID. Every request to Supabase includes this token in the header. Supabase verifies it and knows who you are.

**Environment Variables:**
Secret keys are stored in `.env.local` (never committed to GitHub). `NEXT_PUBLIC_` prefix = safe to expose in browser. Without `NEXT_PUBLIC_` = server-only.

---

## 📚 CONCEPTS TO LEARN (In Order of Priority)

### For the Hackathon (learn now, will be asked):

**1. What is a REST API?**
An API is a way for two programs to talk. REST uses HTTP methods: GET (read), POST (create), PUT (update), DELETE (remove). Your `/api/ai/chat/route.ts` is a POST endpoint.

**2. What is a Database?**
Organized storage. Supabase uses PostgreSQL — tables (like Excel sheets), rows (records), columns (fields). SQL is the language to query it: `SELECT * FROM profiles WHERE id = '123'`

**3. What is Authentication?**
Proving who you are. You send email+password → server checks → gives you a token → you include token in every future request.

**4. What is an LLM?**
Large Language Model. Trained on billions of text documents. Given a prompt, predicts the most likely next tokens. Groq runs Llama 3.1, which is Meta's open-source LLM.

**5. What are Vector Embeddings?**
Converting text to numbers (a list of 384 floats). Similar meanings = similar numbers = similar vectors. Used for semantic search (find meaning, not exact words).

**6. What is RAG?**
Retrieval Augmented Generation. Instead of relying only on what the AI memorized in training, you fetch relevant facts from your own database and add them to the prompt. Like giving the AI an open-book exam.

**7. What is Realtime?**
Traditional web: browser asks server for data (polling). Realtime: server pushes data to browser the moment it changes (WebSocket connection). Supabase Realtime uses PostgreSQL's LISTEN/NOTIFY system.

### To become a better developer (learn over time):

**8. React Hooks** — useState, useEffect, useRef, useCallback, useMemo. How React re-renders work.

**9. TypeScript** — interfaces, types, generics, type narrowing. Why types prevent bugs.

**10. SQL** — SELECT, INSERT, UPDATE, DELETE, JOIN, WHERE, ORDER BY, LIMIT. Indexes.

**11. HTTP and Networking** — status codes (200, 401, 404, 500), headers, CORS, fetch API.

**12. Git properly** — branching, merging, pull requests, resolving conflicts.

**13. System Design** — how to design scalable systems: load balancers, caching, CDNs, microservices.

**14. Data Structures & Algorithms** — arrays, linked lists, trees, sorting, searching, Big-O notation.

**15. Operating Systems basics** — processes, threads, memory management.

---

## 🎤 HACKATHON DEFENSE — KEY TALKING POINTS

**"What problem does CampusHub solve?"**
VIT Pune students use 5+ different WhatsApp groups for lost items, buying/selling, study help, and timetable queries. CampusHub unifies all of this in one platform with AI that knows your specific subjects, timetable, and schedule.

**"What's the AI doing exactly?"**
The AI has 3 layers: (1) A hardcoded system prompt with all VIT Pune academic data, (2) RAG search that retrieves relevant knowledge chunks from a vector database, (3) Live user data — your timetable, your marketplace, your community posts. Together these make it genuinely personalized, not a generic chatbot.

**"How does Realtime work?"**
Supabase uses PostgreSQL triggers and WebSockets. When a message is inserted in the DB, a trigger fires, Supabase pushes the event through an open WebSocket connection to the browser, and React state updates immediately — all without refreshing the page.

**"What would you add next?"**
Mess menu crowdsourcing, mobile app (React Native), AI attendance predictor, end-sem rank predictor based on mid-sem marks.

**"What was the hardest problem you solved?"**
Token limit management. Groq's free tier allows 6000 tokens/minute. The full system prompt is ~4000 tokens. When a PDF is uploaded, I detect that and swap to a 60-token slim prompt, reduce chat history to 2 messages, and cap document content at 2000 characters — keeping total under 6000 while still giving useful answers.

---

## 🏗️ HOW DATA FLOWS — ONE COMPLETE EXAMPLE

**"What classes do I have today?"**

```
1. User types in chatbot → send() function called
2. POST request to /api/ai/chat with { message, userId, history }
3. Server: getUserProfile(userId) → fetches name, branch, module, off_days
4. Server: getUserTimetable(userId, 'thursday') → fetches today's slots
5. Server: searchRAG("today's classes timetable") → finds VIT calendar chunk
6. Server: buildSystemPrompt() → constructs the 4000-token instruction string
   - "You are CampusHub AI for VIT Pune"
   - "User: Yashasvi, CS, Module 1"
   - "Today's timetable: 10-12 Web Dev Lab, 12-1 RAD..."
   - "Today is Thursday 12 March 2026"
   - [RAG chunks about academic calendar]
7. Server: POST to Groq API with system prompt + user message
8. Groq returns: "Hey Yashasvi! Here's your schedule for today..."
9. Server returns reply to frontend
10. Frontend renders markdown reply in chat bubble
```

---

*This document covers every file, every concept, and every design decision in CampusHub. Study this, understand the flow, and you'll be able to answer any question a judge throws at you.*
