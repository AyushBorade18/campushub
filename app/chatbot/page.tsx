'use client'
import { useState, useRef, useEffect } from 'react'
import MainLayout from '@/components/MainLayout'
import { supabase } from '@/lib/supabase'

type Msg = { role: 'user' | 'assistant' | 'system'; text: string }
type ChatSession = { id: string; title: string; msgs: Msg[]; createdAt: number }

const CS_BRANCHES = ['CS','CS-AIML','CS-AI','IT','AIDS','CSE-DS','CSE-SE','CSE-IOT & CYBERSECURITY']
const ENTC_BRANCHES = ['ENTC','INSTRUMENTATION']

const getModuleOptions = (branch: string) => {
  if (CS_BRANCHES.includes(branch)) return [
    { value: 'module_1', label: 'Module 1 — Linear Algebra, COA, Web Dev, IKS' },
    { value: 'module_2', label: 'Module 2 — Calculus, Python, Data Analysis, UHV' },
  ]
  if (ENTC_BRANCHES.includes(branch)) return [
    { value: 'module_1', label: 'Module 1 — Linear Algebra, Electronic Circuits, IKS' },
    { value: 'module_2', label: 'Module 2 — Calculus, Digital Logic Design, UHV' },
  ]
  return []
}

function getQuickAsks(branch: string, module: string) {
  const isCS = CS_BRANCHES.includes(branch)
  const isENTC = ENTC_BRANCHES.includes(branch)
  const isMod1 = module === 'module_1'
  const isMod2 = module === 'module_2'

  // Common for ALL branches
  const common = [
    { icon: '📅', label: 'Exam Dates',   q: 'What are all exam dates and important deadlines this semester?' },
    { icon: '🗓️', label: 'Study Plan',  q: 'Make a 2-week study plan for all my subjects before end-sem exams' },
    { icon: '🎉', label: 'Holidays',     q: 'What are the upcoming holidays this semester?' },
    { icon: '📊', label: 'Marks Scheme', q: 'Explain the marks and assessment scheme for all my subjects' },
    { icon: '📅', label: "Today's Classes", q: "What is my timetable for today?" },
    { icon: '🛍️', label: 'Marketplace', q: 'What items are currently available on the marketplace?' },
  ]

  // CS/IT/AI — Module 1
  if (isCS && isMod1) return [
    { icon: '💻', label: 'PSP / C',        q: 'Explain the complete PSP C language syllabus with all units' },
    { icon: '📐', label: 'Linear Algebra', q: 'Explain eigenvalues and eigenvectors in simple terms with examples' },
    { icon: '🖥️', label: 'COA',           q: 'Give me the full COA syllabus and important exam topics' },
    { icon: '🌐', label: 'Web Dev',        q: 'What is the Web Development exam pattern and important topics?' },
    { icon: '📅', label: "Today's Classes", q: "What is my timetable for today?" },
    { icon: '🛍️', label: 'Marketplace',   q: 'What items are currently available on the marketplace?' },
    ...common.slice(0, 4),
  ]

  // CS/IT/AI — Module 2
  if (isCS && isMod2) return [
    { icon: '⚙️', label: 'Applied Electro', q: 'What are the key topics in Applied Electromechanics?' },
    { icon: '📐', label: 'Calculus',         q: 'Explain key Calculus topics — series, partial derivatives, integrals' },
    { icon: '🐍', label: 'Python',           q: 'Give me the complete Python for Engineers syllabus and exam topics' },
    { icon: '📊', label: 'Data Analysis',    q: 'What are the important topics in Data Analysis exam?' },
    { icon: '📅', label: "Today's Classes",  q: "What is my timetable for today?" },
    { icon: '🛍️', label: 'Marketplace',     q: 'What items are currently available on the marketplace?' },
    ...common.slice(0, 4),
  ]

  // ENTC/Instrumentation — Module 1
  if (isENTC && isMod1) return [
    { icon: '💻', label: 'PSP / C',            q: 'Explain the complete PSP C language syllabus with all units' },
    { icon: '📐', label: 'Linear Algebra',      q: 'Explain eigenvalues and eigenvectors in simple terms with examples' },
    { icon: '⚡', label: 'Electronic Circuits', q: 'What are the important topics in Electronic Circuits exam?' },
    { icon: '📅', label: "Today's Classes",     q: "What is my timetable for today?" },
    { icon: '🛍️', label: 'Marketplace',        q: 'What items are currently available on the marketplace?' },
    { icon: '🎭', label: 'Student Activity',    q: 'What is Student Activity and how is it assessed?' },
    ...common.slice(0, 4),
  ]

  // ENTC/Instrumentation — Module 2
  if (isENTC && isMod2) return [
    { icon: '⚙️', label: 'Applied Electro', q: 'What are the key topics in Applied Electromechanics?' },
    { icon: '📐', label: 'Calculus',        q: 'Explain key Calculus topics — series, partial derivatives, integrals' },
    { icon: '🔢', label: 'DLD',             q: 'What are the important topics in Digital Logic Design?' },
    { icon: '📅', label: "Today's Classes", q: "What is my timetable for today?" },
    { icon: '🛍️', label: 'Marketplace',    q: 'What items are currently available on the marketplace?' },
    { icon: '🌿', label: 'Env Studies',     q: 'What are the important topics in Environmental Studies exam?' },
    ...common.slice(0, 4),
  ]

  // Default — no branch/module set, or Mechanical/Civil
  return [
    { icon: '📅', label: 'Exam Dates',    q: 'What are all exam dates and important deadlines this semester?' },
    { icon: '💻', label: 'PSP / C',       q: 'Explain the complete PSP C language syllabus with all units' },
    { icon: '📅', label: "Today's Classes", q: "What is my timetable for today?" },
    { icon: '🛍️', label: 'Marketplace',  q: 'What items are currently available on the marketplace?' },
    { icon: '📊', label: 'Marks Scheme',  q: 'Explain the marks and assessment scheme for all my subjects' },
    { icon: '🏛️', label: 'About VIT',    q: 'Tell me about VIT Pune — history, rankings, facilities' },
    { icon: '💰', label: 'Fee Structure', q: 'What is the fee structure of VIT Pune?' },
    { icon: '🎓', label: 'Clubs',         q: 'What are the technical and co-curricular clubs at VIT Pune?' },
  ]
}

const getStorageKey = (userId: string) => `campushub_chats_${userId}`

function renderMd(text: string) {
  // Step 1: Extract code blocks before escaping
  const codeBlocks: string[] = []
  const inlineCodes: string[] = []

  // Temporarily replace code blocks with placeholders
  let t = text.replace(/```(\w*)\n?([\s\S]*?)```/g, (_: string, _lang: string, code: string) => {
    const html = `<pre style="background:#0f172a;color:#e2e8f0;padding:14px 16px;border-radius:10px;overflow-x:auto;font-size:12.5px;line-height:1.65;margin:10px 0;white-space:pre-wrap"><code>${code.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</code></pre>`
    codeBlocks.push(html)
    return `%%CODEBLOCK_${codeBlocks.length - 1}%%`
  })

  // Temporarily replace inline code with placeholders
  t = t.replace(/`([^`\n]+)`/g, (_: string, code: string) => {
    const html = `<code style="background:#ede9fe;color:#5b21b6;padding:2px 7px;border-radius:5px;font-size:12.5px;font-family:monospace">${code.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</code>`
    inlineCodes.push(html)
    return `%%INLINECODE_${inlineCodes.length - 1}%%`
  })

  // Step 2: Escape ALL remaining HTML so tags like <html>, <body> show as text
  t = t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  // Step 3: Apply markdown formatting on escaped text
  t = t
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/^#{1,3} (.+)$/gm, '<div style="font-size:15px;font-weight:800;color:#0f172a;margin:14px 0 6px;padding-bottom:5px;border-bottom:2px solid #ede9fe">$1</div>')
    .replace(/^[-*] (.+)$/gm, '<div style="display:flex;gap:8px;margin:4px 0"><span style="color:#6366f1;font-weight:700;flex-shrink:0">•</span><span>$1</span></div>')
    .replace(/^\d+\. (.+)$/gm, '<div style="display:flex;gap:8px;margin:4px 0"><span style="color:#6366f1;font-weight:700;flex-shrink:0">›</span><span>$1</span></div>')
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>')

  // Step 4: Restore code blocks and inline code
  t = t.replace(/%%CODEBLOCK_(\d+)%%/g, (_: string, i: string) => codeBlocks[parseInt(i)])
  t = t.replace(/%%INLINECODE_(\d+)%%/g, (_: string, i: string) => inlineCodes[parseInt(i)])

  return t
}

function timeAgo(ts: number) {
  const diff = Date.now() - ts
  const m = Math.floor(diff / 60000)
  const h = Math.floor(diff / 3600000)
  const d = Math.floor(diff / 86400000)
  if (m < 1) return 'Just now'
  if (m < 60) return `${m}m ago`
  if (h < 24) return `${h}h ago`
  if (d < 7) return `${d}d ago`
  return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

export default function AIPage() {
  const [userId, setUserId] = useState<string>('')
  const [profile, setProfile] = useState<any>(null)
  const [todaySlots, setTodaySlots] = useState<any[]>([])
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [docName, setDocName] = useState('')
  const [docText, setDocText] = useState('')
  const [uploading, setUploading] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const fileRef = useRef<HTMLInputElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const endRef = useRef<HTMLDivElement>(null)

  // Load user chats + listen for account switches
  useEffect(() => {
    async function loadChatsForUser(uid: string) {
      setUserId(uid)
      setSessions([])
      setMsgs([])
      setActiveId(null)
      try {
        const saved = localStorage.getItem(getStorageKey(uid))
        if (saved) setSessions(JSON.parse(saved))
      } catch {}
      // Fetch profile for personalization
      if (uid && uid !== 'guest') {
        const { data: p } = await supabase.from('profiles').select('full_name, major, module, year').eq('id', uid).single()
        setProfile(p || null)
        // Fetch today's timetable slots
        const days = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday']
        const todayName = days[new Date().getDay()]
        const { data: ts } = await supabase.from('timetable_slots').select('subject_name, slot_start, slot_type').eq('user_id', uid).eq('day', todayName).order('slot_start')
        setTodaySlots(ts || [])
      } else {
        setProfile(null)
        setTodaySlots([])
      }
    }

    // Load on mount
    supabase.auth.getUser().then(({ data: { user } }) => {
      loadChatsForUser(user?.id || 'guest')
    })

    // Listen for login/logout/account switch
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      loadChatsForUser(session?.user?.id || 'guest')
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs, busy])

  function saveSessions(updated: ChatSession[]) {
    setSessions(updated)
    try { localStorage.setItem(getStorageKey(userId || 'guest'), JSON.stringify(updated)) } catch {}
  }

  function newChat() {
    setActiveId(null)
    setMsgs([])
    setDocName('')
    setDocText('')
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  function loadSession(id: string) {
    const s = sessions.find(x => x.id === id)
    if (!s) return
    setActiveId(id)
    setMsgs(s.msgs)
    setDocName('')
    setDocText('')
  }

  function deleteSession(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    const updated = sessions.filter(s => s.id !== id)
    saveSessions(updated)
    if (activeId === id) newChat()
  }

  async function extractPdfText(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer()
    const uint8 = new Uint8Array(arrayBuffer)
    const pdfjsLib = (window as any).pdfjsLib
    if (!pdfjsLib) return new TextDecoder().decode(uint8)
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
    const pdf = await pdfjsLib.getDocument({ data: uint8 }).promise
    let fullText = ''
    for (let i = 1; i <= Math.min(pdf.numPages, 30); i++) {
      const page = await pdf.getPage(i)
      const content = await page.getTextContent()
      fullText += `\n[Page ${i}]\n` + content.items.map((item: any) => item.str).join(' ')
    }
    return fullText
  }

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setUploading(true)
    try {
      let text = ''
      if (f.name.toLowerCase().endsWith('.pdf')) {
        if (!(window as any).pdfjsLib) {
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement('script')
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
            script.onload = () => resolve()
            script.onerror = () => reject(new Error('PDF.js load failed'))
            document.head.appendChild(script)
          })
        }
        text = await extractPdfText(f)
      } else {
        text = await f.text()
      }
      if (!text.trim()) { alert('Could not extract text. Try a .txt file.'); setUploading(false); return }
      setDocName(f.name)
      setDocText(text.slice(0, 15000))
      setMsgs(p => [...p, { role: 'system', text: `📎 **${f.name}** is ready (${(text.length/1000).toFixed(1)} KB)\n\nNow ask me anything from this document!` }])
    } catch { alert('Could not read file. Make sure the PDF is not password-protected.') }
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function send(override?: string) {
    const text = (override ?? input).trim()
    if (!text || busy) return
    setInput('')
    setBusy(true)

    const newMsgs: Msg[] = [...msgs, { role: 'user', text }]
    setMsgs(newMsgs)

    try {
      const r = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: msgs.filter(m => m.role !== 'system').slice(-10),
          docContent: docText || undefined,
          docName: docName || undefined,
          userId: userId || undefined,
        })
      })
      const data = await r.json()
      const reply = data.reply || 'No response received.'
      const finalMsgs: Msg[] = [...newMsgs, { role: 'assistant', text: reply }]
      setMsgs(finalMsgs)

      const title = text.slice(0, 45) + (text.length > 45 ? '…' : '')
      if (activeId) {
        const updated = sessions.map(s => s.id === activeId ? { ...s, msgs: finalMsgs } : s)
        saveSessions(updated)
      } else {
        const newSession: ChatSession = { id: Date.now().toString(), title, msgs: finalMsgs, createdAt: Date.now() }
        setActiveId(newSession.id)
        saveSessions([newSession, ...sessions])
      }
    } catch {
      setMsgs(p => [...p, { role: 'assistant', text: '❌ Could not connect. Make sure the server is running.' }])
    }
    setBusy(false)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const empty = msgs.length === 0
  const activeSession = sessions.find(s => s.id === activeId)

  return (
    <MainLayout>
      <div className="chatbot-container" style={{ display: 'flex', height: 'calc(100vh - 80px)', gap: '14px' }}>

        {/* Chat History Sidebar */}
        {sidebarOpen && (
          <div className="chatbot-sidebar" style={{ width: '230px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button onClick={newChat}
              style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', border: 'none', borderRadius: '12px', padding: '11px 14px', cursor: 'pointer', color: '#fff', fontSize: '13px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 14px rgba(79,70,229,0.3)' }}>
              <span style={{ fontSize: '18px' }}>✏️</span> New Chat
            </button>

            <div style={{ background: '#fff', borderRadius: '14px', border: '1px solid #e8eaf0', flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '12px 14px 8px', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: '11px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>💬 Chat History</span>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '6px' }}>
                {sessions.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px 12px', color: '#94a3b8', fontSize: '12px', lineHeight: 1.6 }}>
                    <div style={{ fontSize: '28px', marginBottom: '8px' }}>💬</div>
                    No chats yet.<br/>Start asking!
                  </div>
                ) : (
                  sessions.map(s => (
                    <div key={s.id} onClick={() => loadSession(s.id)}
                      style={{ borderRadius: '10px', padding: '9px 10px', cursor: 'pointer', marginBottom: '3px', background: activeId === s.id ? '#ede9fe' : 'transparent', border: activeId === s.id ? '1.5px solid #c4b5fd' : '1.5px solid transparent', transition: 'all 0.15s', position: 'relative' }}
                      onMouseEnter={e => { if (activeId !== s.id) (e.currentTarget as HTMLElement).style.background = '#f8fafc' }}
                      onMouseLeave={e => { if (activeId !== s.id) (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
                      <div style={{ fontSize: '12.5px', fontWeight: '600', color: activeId === s.id ? '#4f46e5' : '#1e293b', lineHeight: 1.4, marginBottom: '4px', paddingRight: '20px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' } as any}>
                        {s.title}
                      </div>
                      <div style={{ fontSize: '10.5px', color: '#94a3b8' }}>{timeAgo(s.createdAt)}</div>
                      <button onClick={(e) => deleteSession(s.id, e)} title="Delete"
                        style={{ position: 'absolute', top: '8px', right: '6px', background: 'none', border: 'none', cursor: 'pointer', color: '#cbd5e1', fontSize: '15px', padding: '2px 4px', borderRadius: '5px' }}
                        onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                        onMouseLeave={e => (e.currentTarget.style.color = '#cbd5e1')}>
                        ×
                      </button>
                    </div>
                  ))
                )}
              </div>
              {sessions.length > 0 && (
                <div style={{ padding: '8px', borderTop: '1px solid #f1f5f9' }}>
                  <button onClick={() => { saveSessions([]); newChat() }}
                    style={{ width: '100%', background: 'none', border: '1px solid #fee2e2', borderRadius: '8px', padding: '6px', cursor: 'pointer', color: '#ef4444', fontSize: '11.5px', fontWeight: '600' }}>
                    🗑 Clear all history
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Main Chat */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button onClick={() => setSidebarOpen(o => !o)} title="Toggle history"
                style={{ width: '36px', height: '36px', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: sidebarOpen ? '#ede9fe' : '#f8fafc', cursor: 'pointer', fontSize: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1' }}>
                {sidebarOpen ? '◀' : '▶'}
              </button>
              <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>🤖</div>
              <div>
                <div style={{ fontSize: '17px', fontWeight: '900', color: '#0f172a' }}>
                  {activeSession ? activeSession.title.slice(0,38) + (activeSession.title.length > 38 ? '…' : '') : 'AI Campus Assistant'}
                </div>
                <div style={{ fontSize: '11.5px', color: '#64748b' }}>VIT Pune · Full syllabus & schedule · Groq AI</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {docName && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px', background: '#f5f3ff', border: '1.5px solid #ddd6fe', borderRadius: '10px', padding: '5px 12px' }}>
                  <span>📄</span>
                  <span style={{ fontSize: '12px', color: '#5b21b6', fontWeight: '700', maxWidth: '130px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{docName}</span>
                  <button onClick={() => { setDocName(''); setDocText('') }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#a78bfa', fontSize: '16px', padding: 0 }}>×</button>
                </div>
              )}
              {!empty && (
                <button onClick={newChat} style={{ background: '#f1f5f9', border: 'none', borderRadius: '8px', padding: '7px 14px', fontSize: '12px', color: '#64748b', fontWeight: '600', cursor: 'pointer' }}>
                  ✏️ New Chat
                </button>
              )}
            </div>
          </div>

          {/* Chat Box */}
          <div style={{ background: '#fff', borderRadius: '18px', border: '1px solid #e8eaf0', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px', background: '#fafbff', display: 'flex', flexDirection: 'column', gap: '14px' }}>

              {empty && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '20px' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '48px', marginBottom: '10px' }}>🤖</div>
                    <div style={{ fontSize: '20px', fontWeight: '900', color: '#0f172a', marginBottom: '6px' }}>AI Campus Assistant</div>
                    <div style={{ fontSize: '13px', color: '#64748b', maxWidth: '380px', lineHeight: '1.7' }}>
                      {profile?.full_name ? (
                        <>Hey <strong>{profile.full_name.split(' ')[0]}</strong>! I know your <strong>{profile.major || 'VIT Pune'} {profile.module ? `(${profile.module === 'module_1' ? 'Module 1' : 'Module 2'})` : ''}</strong> full semester — subjects, exam dates, marks scheme &amp; more.</>
                      ) : (
                        <>I know your <strong>complete VIT Pune semester</strong> — all subjects, exam dates, deadlines, and campus info.</>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', width: '100%', maxWidth: '500px' }}>
                    {getQuickAsks(profile?.major || '', profile?.module || '').map(s => (
                      <button key={s.q} onClick={() => send(s.q)}
                        style={{ background: '#fff', border: '1.5px solid #e8eaf0', borderRadius: '12px', padding: '11px 13px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}
                        onMouseEnter={e => { (e.currentTarget).style.borderColor = '#6366f1'; (e.currentTarget).style.background = '#f5f3ff' }}
                        onMouseLeave={e => { (e.currentTarget).style.borderColor = '#e8eaf0'; (e.currentTarget).style.background = '#fff' }}>
                        <div style={{ fontSize: '16px', marginBottom: '3px' }}>{s.icon}</div>
                        <div style={{ fontSize: '12px', fontWeight: '700', color: '#0f172a' }}>{s.label}</div>
                        <div style={{ fontSize: '10.5px', color: '#94a3b8', marginTop: '2px', lineHeight: 1.4 }}>{s.q.slice(0,38)}…</div>
                      </button>
                    ))}
                  </div>
                  <button onClick={() => fileRef.current?.click()}
                    style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#fff', border: '2px dashed #c7d2fe', borderRadius: '14px', padding: '13px 20px', cursor: 'pointer', width: '100%', maxWidth: '500px' }}>
                    <span style={{ fontSize: '24px' }}>📎</span>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: '#4f46e5' }}>Upload PDF or TXT — Ask from your notes</div>
                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>Syllabus PDFs, question papers, textbooks</div>
                    </div>
                  </button>
                </div>
              )}

              {msgs.map((m, i) => (
                <div key={i} style={{ display: 'flex', gap: '10px', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', alignItems: 'flex-start' }}>
                  {m.role !== 'user' && (
                    <div style={{ width: '32px', height: '32px', borderRadius: '10px', flexShrink: 0, background: m.role === 'system' ? '#fef3c7' : 'linear-gradient(135deg,#4f46e5,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', marginTop: '2px' }}>
                      {m.role === 'system' ? '📎' : '🤖'}
                    </div>
                  )}
                  <div style={{ maxWidth: '82%', padding: '12px 16px', borderRadius: m.role === 'user' ? '18px 4px 18px 18px' : '4px 18px 18px 18px', background: m.role === 'user' ? 'linear-gradient(135deg,#4f46e5,#7c3aed)' : m.role === 'system' ? '#fffbeb' : '#fff', color: m.role === 'user' ? '#fff' : '#1e293b', fontSize: '13.5px', lineHeight: '1.75', border: m.role === 'assistant' ? '1px solid #e8eaf0' : 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
                    dangerouslySetInnerHTML={{ __html: m.role === 'user' ? m.text.replace(/\n/g,'<br/>') : renderMd(m.text) }} />
                  {m.role === 'user' && (
                    <div style={{ width: '32px', height: '32px', borderRadius: '10px', flexShrink: 0, background: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '800', color: '#fff', marginTop: '2px' }}>YOU</div>
                  )}
                </div>
              ))}

              {busy && (
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>🤖</div>
                  <div style={{ background: '#fff', border: '1px solid #e8eaf0', borderRadius: '4px 18px 18px 18px', padding: '12px 18px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {[0,1,2].map(j => (
                      <div key={j} style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#6366f1', animation: `bounce 1.2s ease-in-out ${j*0.2}s infinite` }} />
                    ))}
                    <span style={{ marginLeft: '8px', fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>Thinking...</span>
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>

            {/* Input */}
            <div style={{ padding: '12px 16px', borderTop: '1px solid #f1f5f9', background: '#fff' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input ref={fileRef} type="file" accept=".txt,.pdf,.md" style={{ display: 'none' }} onChange={upload} />
                <button onClick={() => fileRef.current?.click()} title="Upload document"
                  style={{ width: '42px', height: '42px', borderRadius: '11px', border: `1.5px solid ${docName ? '#7c3aed' : '#e2e8f0'}`, background: docName ? '#f5f3ff' : '#f8fafc', cursor: 'pointer', fontSize: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {uploading ? '⌛' : '📎'}
                </button>
                <input ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), send())}
                  placeholder={docName ? `Ask about "${docName}"…` : 'Ask anything — exams, code, concepts, study help…'}
                  style={{ flex: 1, padding: '11px 16px', borderRadius: '12px', border: '1.5px solid #e2e8f0', fontSize: '13.5px', outline: 'none', fontFamily: 'inherit', background: '#fafafa' }} />
                <button onClick={() => send()} disabled={busy || !input.trim()}
                  style={{ width: '42px', height: '42px', borderRadius: '12px', background: input.trim() && !busy ? 'linear-gradient(135deg,#4f46e5,#7c3aed)' : '#e2e8f0', border: 'none', cursor: input.trim() && !busy ? 'pointer' : 'default', color: '#fff', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  ➤
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0) }
          40% { transform: translateY(-8px) }
        }
      `}</style>
          <style>{`
        @media (max-width: 768px) {
          .chatbot-container { height: auto !important; flex-direction: column !important; }
          .chatbot-sidebar { width: 100% !important; flex-direction: row !important; flex-wrap: wrap; }
          .chatbot-sidebar > div { flex: 1; min-width: 200px; max-height: 200px; }
        }
      `}</style>
    </MainLayout>
  )
}
