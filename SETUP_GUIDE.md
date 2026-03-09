# 🎓 CampusHub — Complete Setup Guide
### For First Year Students — Step by Step, No Experience Needed

---

## 📋 WHAT YOU'RE BUILDING

CampusHub is a full-stack web application with:
- ✅ Student login with `.edu` email validation
- 🛍 Marketplace (Buy/Sell, Borrow/Lend, Lost & Found)
- 💬 Real-time Community Chat (5 channels + CampusBot)
- 🤖 AI Assistant (Gemini AI + PDF upload Q&A)
- ✉️ Direct Messages between students
- 👤 Student profiles with listing history

---

## 🖥️ PART 1 — INSTALL TOOLS ON YOUR COMPUTER

### Step 1: Install Node.js
Node.js lets you run JavaScript on your computer.

1. Go to: **https://nodejs.org**
2. Click the big green **"LTS"** button (stands for Long Term Support)
3. Download and install it (click Next → Next → Install, just like any software)
4. To verify it worked, open **Command Prompt** (Windows) or **Terminal** (Mac):
   ```
   node --version
   ```
   You should see something like `v20.x.x`

### Step 2: Install VS Code (Code Editor)
1. Go to: **https://code.visualstudio.com**
2. Download and install it
3. This is where you'll write and edit code

### Step 3: Install Git (optional but good to have)
1. Go to: **https://git-scm.com**
2. Download and install

---

## ☁️ PART 2 — SET UP SUPABASE (Your Database & Auth)

Supabase is a free service that gives you a database, user authentication, and file storage.

### Step 1: Create a Supabase Account
1. Go to: **https://supabase.com**
2. Click **"Start your project"**
3. Sign up with GitHub or email (GitHub is easier)

### Step 2: Create a New Project
1. Click **"New Project"**
2. Fill in:
   - **Name**: `campushub` (or any name you like)
   - **Database Password**: Choose a strong password (SAVE THIS SOMEWHERE!)
   - **Region**: Choose the one closest to India (Singapore or Mumbai)
3. Click **"Create new project"**
4. ⏳ Wait about 2 minutes for it to set up

### Step 3: Run the Database Schema
This creates all your tables (like Excel sheets in your database).

1. In your Supabase project, look at the left sidebar
2. Click **"SQL Editor"** (it looks like a code icon `</>`)
3. Click **"New query"** (top right button)
4. Open the file called `supabase_schema.sql` from the project files
5. **Select ALL the text** (Ctrl+A) and **Copy** (Ctrl+C)
6. **Paste** (Ctrl+V) in the Supabase SQL editor
7. Click the green **"Run"** button
8. You should see **"Success. No rows returned"** ✅
9. If you see errors, try running it again

### Step 4: Set Up File Storage (for listing images)
1. In Supabase left sidebar, click **"Storage"**
2. Click **"New bucket"**
3. Name it exactly: `images`
4. Check **"Public bucket"** ✅
5. Click **"Create bucket"**

### Step 5: Get Your API Keys
1. In Supabase left sidebar, click **"Settings"** (gear icon ⚙️)
2. Click **"API"**
3. You'll see two things you need — copy them and save them somewhere:
   - **Project URL**: Looks like `https://abcdefgh.supabase.co`
   - **anon public key**: A long string starting with `eyJ...`

---

## 🤖 PART 3 — GET GOOGLE GEMINI AI KEY (Free!)

### Step 1: Get Your API Key
1. Go to: **https://aistudio.google.com/app/apikey**
2. Sign in with your Google account
3. Click **"Create API key"**
4. Click **"Create API key in new project"**
5. Copy the key that appears (starts with `AIza...`)
6. Save it somewhere safe

> ⚠️ **Important**: Don't share this key publicly!
> The free tier gives you 60 requests/minute — more than enough for a project!

---

## 💻 PART 4 — SET UP THE PROJECT ON YOUR COMPUTER

### Step 1: Get the Project Files
You already have all the files. Create a new folder on your computer called `campushub` and place all the project files inside it. The structure should look like this:
```
campushub/
├── app/
│   ├── auth/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── dashboard/page.tsx
│   ├── marketplace/page.tsx
│   ├── community/page.tsx
│   ├── chatbot/page.tsx
│   ├── messages/page.tsx
│   ├── profile/page.tsx
│   ├── api/ai/generate/route.ts
│   ├── api/ai/chat/route.ts
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   ├── Sidebar.tsx
│   └── MainLayout.tsx
├── lib/
│   ├── supabase.ts
│   └── campus-kb.ts
├── package.json
├── next.config.js
├── tailwind.config.js
├── postcss.config.js
└── tsconfig.json
```

### Step 2: Open the Project in VS Code
1. Open VS Code
2. Click **"File"** → **"Open Folder"**
3. Select your `campushub` folder
4. Click **"Select Folder"**

### Step 3: Create Your Environment Variables File
This file holds your secret API keys. NEVER share this file!

1. In VS Code, look at the file list on the left
2. Right-click in the file explorer area
3. Click **"New File"**
4. Name it exactly: `.env.local`
5. Copy and paste this inside:

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY_HERE
GEMINI_API_KEY=YOUR_GEMINI_KEY_HERE
```

6. Replace the three values with your actual keys from Steps 2.5 and 3.1
7. Save the file (Ctrl+S)

**Example of what it should look like:**
```
NEXT_PUBLIC_SUPABASE_URL=https://xyzabcdef.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
GEMINI_API_KEY=AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Step 4: Install Project Dependencies
1. In VS Code, press **Ctrl+` (backtick)** to open the Terminal
   - Or go to **Terminal** → **New Terminal**
2. Make sure you're in the campushub folder (you'll see it in the terminal path)
3. Type this command and press Enter:
   ```bash
   npm install
   ```
4. Wait for it to finish (might take 1-3 minutes)
5. You'll see lots of text, and then it stops. That's normal!

---

## 🚀 PART 5 — RUN THE PROJECT

### Start the Development Server
In the VS Code terminal, type:
```bash
npm run dev
```

You'll see something like:
```
▲ Next.js 14.2.0
- Local: http://localhost:3000
```

### Open in Browser
1. Open your web browser (Chrome, Firefox, etc.)
2. Go to: **http://localhost:3000**
3. You should see CampusHub loading! 🎉

---

## 👤 PART 6 — TEST THE APP

### Create Your First Account
1. You'll be redirected to the login page
2. Click **"Create one →"** to go to register
3. Fill in your details:
   - **Name**: Your name
   - **Email**: Use a `.edu` or `.edu.in` email
     - (If you don't have one, you can temporarily modify the registration validation in `app/auth/register/page.tsx` for testing)
   - **Password**: At least 6 characters
4. Click **"Create My Account"**
5. Check your email for a confirmation link
6. Click the link in the email
7. Go back to http://localhost:3000 and log in

### Test Each Feature
After logging in, explore:
- **Dashboard**: Overview of stats and quick actions
- **Marketplace**: Post a listing, try AI Enhance button
- **Community**: Send a message, try typing "mess menu" or "library"
- **AI Assistant**: Ask any question, try uploading a PDF
- **Messages**: Messages from marketplace appear here
- **Profile**: Edit your details, see your listings

---

## 🌐 PART 7 — DEPLOY TO THE INTERNET (Show it to the world!)

### Deploy on Vercel (Free, easiest option)

1. **Push code to GitHub:**
   - Create account at **https://github.com**
   - Create a new repository called `campushub`
   - In your VS Code terminal:
     ```bash
     git init
     git add .
     git commit -m "CampusHub initial commit"
     git branch -M main
     git remote add origin https://github.com/YOURUSERNAME/campushub.git
     git push -u origin main
     ```

2. **Deploy on Vercel:**
   - Go to **https://vercel.com**
   - Sign up with your GitHub account
   - Click **"New Project"**
   - Find and click on your `campushub` repository
   - Click **"Deploy"** (Vercel auto-detects Next.js!)
   - ⏳ Wait 2-3 minutes

3. **Add Environment Variables to Vercel:**
   - In your Vercel project, click **"Settings"**
   - Click **"Environment Variables"**
   - Add all three variables from your `.env.local` file:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `GEMINI_API_KEY`
   - Click **"Save"**
   - Go to **"Deployments"** and click **"Redeploy"**

4. **Your app is live!** 🎉 Vercel gives you a URL like `https://campushub-yourname.vercel.app`

---

## 🛠️ PART 8 — CUSTOMIZING FOR YOUR COLLEGE

### Update CampusBot Knowledge Base
Open `lib/campus-kb.ts` and update the information with your actual college details:
- Mess menu and timings
- Library hours
- Hostel rules and warden contacts
- Fee payment deadlines
- Exam schedules
- WiFi network name

### Update Your College Name
When you register, you can enter your college name.

---

## ❓ COMMON PROBLEMS & SOLUTIONS

### Problem: "Cannot find module" error
**Solution**: Run `npm install` again in the terminal

### Problem: "Invalid API key" error
**Solution**: Check your `.env.local` file has the correct keys with no spaces

### Problem: Page shows blank white screen
**Solution**: 
1. Open browser developer tools (F12)
2. Look at the "Console" tab for error messages
3. Most common: Environment variables not set correctly

### Problem: Login not working
**Solution**: 
1. Check Supabase project is running (green dot on dashboard)
2. Verify the URL and anon key in `.env.local`
3. Make sure you confirmed your email

### Problem: Messages not showing in real-time
**Solution**: Make sure you ran the schema SQL correctly, especially the last section that enables Realtime

### Problem: AI not working
**Solution**: 
1. Check your `GEMINI_API_KEY` is correct in `.env.local`
2. The app works without it — just shows fallback responses
3. Make sure you have credit/quota on your Google AI account

### Problem: Images not uploading
**Solution**: 
1. Go to Supabase → Storage → images bucket
2. Check it's set to **Public**
3. In Supabase → Storage → Policies, make sure there are insert policies

---

## 📁 FILE GUIDE — What Does Each File Do?

```
campushub/
├── app/
│   ├── page.tsx              ← Home page (redirects to login/dashboard)
│   ├── globals.css           ← Global CSS styles
│   ├── layout.tsx            ← Wraps every page (fonts, metadata)
│   │
│   ├── auth/login/           ← Login page with form
│   ├── auth/register/        ← Registration with .edu email check
│   │
│   ├── dashboard/            ← Main dashboard with stats
│   ├── marketplace/          ← Buy/Sell/Borrow/Lost/Found listings
│   ├── community/            ← Real-time chat with 5 channels
│   ├── chatbot/              ← AI assistant with PDF upload
│   ├── messages/             ← Direct messages between users
│   ├── profile/              ← User profile & listing history
│   │
│   └── api/
│       ├── ai/generate/      ← API: AI listing description (Gemini)
│       └── ai/chat/          ← API: AI chatbot responses (Gemini)
│
├── components/
│   ├── Sidebar.tsx           ← Left navigation sidebar
│   └── MainLayout.tsx        ← Auth check + sidebar wrapper
│
├── lib/
│   ├── supabase.ts           ← Database connection & TypeScript types
│   └── campus-kb.ts          ← CampusBot knowledge base (edit this!)
│
├── .env.local                ← YOUR SECRET KEYS (never share!)
├── package.json              ← Project info & dependencies list
├── next.config.js            ← Next.js configuration
├── tailwind.config.js        ← CSS framework configuration
└── supabase_schema.sql       ← Database tables & settings
```

---

## 🎯 FEATURES CHECKLIST

| Feature | Status | Notes |
|---------|--------|-------|
| ✅ Login/Register | Working | .edu email validation |
| ✅ Buy & Sell Marketplace | Working | Real DB listings |
| ✅ Borrow & Lend | Working | Type selector in form |
| ✅ Lost & Found | Working | Location field included |
| ✅ AI Description Generator | Working | Needs GEMINI_API_KEY |
| ✅ Photo Upload | Working | Camera + file upload |
| ✅ Community Chat | Working | 5 channels, real-time |
| ✅ CampusBot (KB) | Working | No API key needed |
| ✅ AI Chatbot | Working | Needs GEMINI_API_KEY |
| ✅ PDF Upload Q&A | Working | Ask from any document |
| ✅ Direct Messages | Working | Real-time messaging |
| ✅ User Profiles | Working | Edit all details |
| ✅ Delete Own Listings | Working | Owner-only action |
| ✅ Collapsible Sidebar | Working | Smooth animation |
| ✅ Row Level Security | Working | Database protection |

---

## 🏆 FOR YOUR PROJECT PRESENTATION

### What to say when presenting:

**Architecture**: "CampusHub uses a modern decoupled architecture with Next.js 14 App Router on the frontend, Supabase for PostgreSQL database with Row Level Security, real-time messaging via Supabase Realtime WebSockets, and Google Gemini AI for intelligent features."

**Database**: "We have 6 tables: profiles, listings, channels, messages, direct_messages, and saved_listings with proper foreign key relationships and RLS policies."

**AI Integration**: "The AI layer has two modes: a local knowledge base for instant campus queries (no API cost), and Gemini Pro for complex questions and PDF document Q&A."

**Real-time**: "Community chat and direct messages use Supabase's WebSocket subscriptions via PostgreSQL's LISTEN/NOTIFY system."

**Security**: "All database access is controlled by Row Level Security policies — users can only modify their own data."

---

## 📞 NEED HELP?

If you get stuck:
1. Read the error message carefully — it usually tells you what's wrong
2. Google the error message + "Next.js"
3. Check Supabase logs: Supabase Dashboard → Logs → API logs
4. For Gemini issues: Check quota at aistudio.google.com

Good luck with your project! 🚀
```

---
*CampusHub — Built with Next.js 14, Supabase, and Google Gemini AI*
