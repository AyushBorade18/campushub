# 🎓 CampusHub — All-in-One Campus Super App for VIT Pune

> Built by **Ayush Borade** | VIT Pune | [Live Demo](https://campushub-ukst.onrender.com)

CampusHub is a full-stack web application built specifically for VIT Pune students. It unifies a smart marketplace, community posts, direct messaging, AI-powered chatbot, timetable builder, and notes marketplace — all in one platform.

---

## ✨ Features

### 🛍 Marketplace
- Buy, sell, borrow items with other students
- Report lost & found items
- AI keyword matching auto-connects lost items with found posts
- Real-time feed — new listings appear instantly

### 💬 Community Hub
- Category-wise social posts (Hostel, Mess, Laundry, Academic, Events)
- Photo & video uploads
- Like posts, real-time updates

### 📩 Direct Messaging
- Secure 1-to-1 messaging
- File, photo & video sharing
- Delete for everyone / Delete for me
- Real-time delivery with Supabase WebSockets

### 🗓 Smart Timetable
- Build your personal weekly schedule
- Lab slot support (2-hour blocks)
- Today's classes at a glance
- Bridge day suggestions based on your off-day preference

### 📚 Notes Marketplace
- Upload and share PDF study notes
- AI auto-tagging by subject and topic (Groq)
- Free or paid notes with DM-based paywall
- Download counter

### 🤖 AI Campus Assistant
- Powered by Groq (Llama 3.3 70B)
- Personalized to your branch, module, and timetable
- RAG pipeline — knows VIT Pune syllabus, fees, holidays, exam dates
- Upload PDFs and ask questions from them
- Persistent chat history per user

### 🔔 Notification System
- Real-time bell notifications for messages, listings, posts, notes
- Powered by PostgreSQL triggers + Supabase Realtime
- Mark read / clear all

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 + React 19 |
| Language | TypeScript |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (JWT) |
| Realtime | Supabase Realtime (WebSockets) |
| Storage | Supabase Storage |
| AI Model | Groq — Llama 3.3 70B |
| Embeddings | HuggingFace all-MiniLM-L6-v2 |
| Vector Search | pgvector (PostgreSQL extension) |
| Deployment | Render.com |
| PWA | Web App Manifest + Service Worker |

---

## 🏗 Architecture

```
Browser (Next.js + React)
        ↓
Next.js API Routes (Server)
        ↓
Supabase PostgreSQL + pgvector
        ↓
Groq AI (Llama 3.3 70B) + HuggingFace Embeddings
```

### AI Pipeline (RAG)
```
User question
     ↓
HuggingFace → convert to 384-dim vector
     ↓
pgvector → semantic search on rag_documents
     ↓
Top 4 relevant VIT Pune knowledge chunks retrieved
     ↓
Injected into system prompt with user's timetable + branch + module
     ↓
Groq Llama 3.3 → personalized answer
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- A Supabase project
- Groq API key (free at console.groq.com)
- HuggingFace API key (free at huggingface.co)

### Database Setup

Run these SQL migrations in your Supabase SQL editor in order:

1. `scripts/migrations/profiles.sql`
2. `scripts/migrations/listings.sql`
3. `scripts/migrations/messages.sql`
4. `scripts/migrations/community.sql`
5. `scripts/migrations/notes_migration.sql`
6. `scripts/migrations/notifications_migration.sql`
7. `scripts/migrations/timetable_migration.sql`

### Supabase Storage Buckets

Create these two public buckets in Supabase Storage:
- `notes` — for PDF notes uploads
- `message-files` — for file sharing in messages

### Ingest RAG Knowledge Base

```bash
npx ts-node scripts/ingest-rag.ts
```

This loads VIT Pune academic knowledge (syllabus, fees, holidays, exam patterns) into the vector database.

### Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 📁 Project Structure

```
campushub/
├── app/
│   ├── api/
│   │   ├── ai/chat/route.ts          # Main AI chatbot API
│   │   ├── lost-found-match/route.ts # Lost & Found AI matching
│   │   └── notes/autotag/route.ts    # AI auto-tagging for notes
│   ├── auth/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── chatbot/page.tsx
│   ├── community/page.tsx
│   ├── dashboard/page.tsx
│   ├── marketplace/page.tsx
│   ├── messages/page.tsx
│   ├── notes/page.tsx
│   ├── profile/page.tsx
│   └── timetable/page.tsx
├── components/
│   ├── MainLayout.tsx                # App shell with sidebar
│   ├── NotificationBell.tsx          # Real-time notification bell
│   └── Sidebar.tsx                   # Navigation sidebar
├── lib/
│   ├── supabase.ts                   # Supabase client + TypeScript types
│   └── rag.ts                        # RAG search helper
├── scripts/
│   └── ingest-rag.ts                 # One-time RAG knowledge ingestion
└── public/
    ├── manifest.json                 # PWA manifest
    ├── icon-192.png
    └── icon-512.png
```

---

## 🔐 Security

- **Row Level Security (RLS)** — all tables have PostgreSQL RLS policies. Users can only access their own data, enforced at the database level
- **JWT Authentication** — every Supabase request includes a signed JWT token. Tokens are verified by Supabase before any data is returned
- **Service Role Key** — only used server-side in API routes, never exposed to the browser
- **Email Validation** — only `.edu` and `.edu.in` email addresses can register

---

## 📱 PWA Support

CampusHub is installable as a Progressive Web App on Android:

1. Open Chrome on Android
2. Visit [campushub-ukst.onrender.com](https://campushub-ukst.onrender.com)
3. Tap ⋮ → Add to Home Screen
4. App icon appears on home screen and opens fullscreen

---

## 👨‍💻 Author

**Ayush Borade**  
VIT Pune — Computer Science (AI)  
GitHub: [@AyushBorade18](https://github.com/AyushBorade18)

---

## 📄 License

MIT License — feel free to use this project as a reference or build on top of it.
