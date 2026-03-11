'use client'
import { useState, useEffect, useRef } from 'react'
import MainLayout from '@/components/MainLayout'
import { supabase } from '@/lib/supabase'

const SUBJECTS_CS_M1 = ['Linear Algebra','PSP','COA','Web Development','IKS','Student Activity','ASEP','RAD','GP','SRM']
const SUBJECTS_CS_M2 = ['Calculus','Applied Electromechanics','Python','Data Analysis','UHV','Environmental Studies','ASEP','RAD','GP','SRM']
const SUBJECTS_ENTC_M1 = ['Linear Algebra','PSP','Electronic Circuits','IKS','Engineering Graphics','ASEP','RAD','GP','SRM']
const SUBJECTS_ENTC_M2 = ['Calculus','Applied Electromechanics','DLD','UHV','Environmental Studies','Engineering Graphics','ASEP','RAD','GP','SRM']
const ALL_SUBJECTS = [...new Set([...SUBJECTS_CS_M1,...SUBJECTS_CS_M2,...SUBJECTS_ENTC_M1,...SUBJECTS_ENTC_M2,'Other'])]

const TAG_COLORS = ['#ede9fe','#dbeafe','#d1fae5','#fef3c7','#fee2e2','#f0fdf4','#e0f2fe']
const TAG_TEXT = ['#5b21b6','#1d4ed8','#047857','#92400e','#991b1b','#166534','#0369a1']

function tagStyle(i: number) {
  return { background: TAG_COLORS[i % TAG_COLORS.length], color: TAG_TEXT[i % TAG_TEXT.length], borderRadius: '6px', padding: '3px 9px', fontSize: '11px', fontWeight: '700' }
}

function formatSize(bytes: number) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024*1024) return (bytes/1024).toFixed(1) + ' KB'
  return (bytes/(1024*1024)).toFixed(1) + ' MB'
}

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime()
  const d = Math.floor(diff/86400000)
  if (d === 0) return 'Today'
  if (d === 1) return 'Yesterday'
  if (d < 7) return `${d}d ago`
  return new Date(ts).toLocaleDateString('en-IN',{day:'numeric',month:'short'})
}

export default function NotesPage() {
  const [notes, setNotes] = useState<any[]>([])
  const [profile, setProfile] = useState<any>(null)
  const [currentUserId, setCurrentUserId] = useState<string|null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterSubject, setFilterSubject] = useState('All')
  const [filterPrice, setFilterPrice] = useState('All') // 'All' | 'Free' | 'Paid'
  const [showUpload, setShowUpload] = useState(false)
  const [activeNote, setActiveNote] = useState<any>(null)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUserId(user?.id || null)
      if (user) {
        const { data: p } = await supabase.from('profiles').select('full_name,major,module').eq('id', user.id).single()
        setProfile(p)
      }
      loadNotes()
    }
    init()
  }, [])

  async function loadNotes() {
    setLoading(true)
    const { data } = await supabase.from('notes').select('*, profiles(full_name)').eq('status','active').order('created_at',{ascending:false})
    setNotes(data || [])
    setLoading(false)
  }

  const filtered = notes.filter(n => {
    const q = search.toLowerCase()
    const matchSearch = !q || n.title.toLowerCase().includes(q) || n.subject.toLowerCase().includes(q) || (n.tags||[]).some((t:string)=>t.toLowerCase().includes(q))
    const matchSubject = filterSubject === 'All' || n.subject === filterSubject
    const matchPrice = filterPrice === 'All' || (filterPrice === 'Free' ? n.price === 0 : n.price > 0)
    return matchSearch && matchSubject && matchPrice
  })

  async function handleDownload(note: any) {
    if (!currentUserId) return
    // Record download
    await supabase.from('note_downloads').upsert({ note_id: note.id, user_id: currentUserId })
    await supabase.from('notes').update({ downloads: (note.downloads||0)+1 }).eq('id',note.id)
    // Open PDF
    window.open(note.file_url, '_blank')
    setNotes(prev => prev.map(n => n.id === note.id ? {...n, downloads:(n.downloads||0)+1} : n))
  }

  async function deleteNote(id: string) {
    if (!confirm('Delete this note?')) return
    await supabase.from('notes').update({status:'removed'}).eq('id',id)
    setNotes(prev => prev.filter(n => n.id !== id))
  }

  return (
    <MainLayout>
      <div style={{maxWidth:'1000px',margin:'0 auto'}}>
        {/* Header */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'20px',flexWrap:'wrap',gap:'12px'}}>
          <div>
            <h2 style={{margin:0,fontSize:'22px',fontWeight:'900',color:'#0f172a'}}>📚 Notes Marketplace</h2>
            <p style={{margin:'4px 0 0',color:'#64748b',fontSize:'13px'}}>Share & discover handwritten/typed notes · AI auto-tagged by topic</p>
          </div>
          <button onClick={()=>setShowUpload(true)} style={{background:'linear-gradient(135deg,#4f46e5,#7c3aed)',color:'#fff',border:'none',borderRadius:'12px',padding:'10px 20px',fontWeight:'700',cursor:'pointer',fontSize:'13px',boxShadow:'0 4px 14px rgba(79,70,229,0.35)'}}>
            + Upload Notes
          </button>
        </div>

        {/* Filters */}
        <div style={{display:'flex',gap:'10px',marginBottom:'18px',flexWrap:'wrap'}}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍  Search notes, subjects, tags..." style={{flex:1,minWidth:'200px',padding:'10px 14px',borderRadius:'10px',border:'1.5px solid #e2e8f0',fontSize:'13px',outline:'none'}}/>
          <select value={filterSubject} onChange={e=>setFilterSubject(e.target.value)} style={{padding:'10px 14px',borderRadius:'10px',border:'1.5px solid #e2e8f0',fontSize:'13px',background:'#fff',cursor:'pointer'}}>
            <option value="All">All Subjects</option>
            {ALL_SUBJECTS.map(s=><option key={s} value={s}>{s}</option>)}
          </select>
          {(['All','Free','Paid'] as const).map(p=>(
            <button key={p} onClick={()=>setFilterPrice(p)} style={{background:filterPrice===p?'#6366f1':'#f1f5f9',color:filterPrice===p?'#fff':'#374151',border:'none',borderRadius:'10px',padding:'10px 16px',fontWeight:'700',cursor:'pointer',fontSize:'13px'}}>
              {p === 'Free' ? '🆓 Free' : p === 'Paid' ? '💰 Paid' : 'All'}
            </button>
          ))}
        </div>

        {/* Stats bar */}
        <div style={{display:'flex',gap:'16px',marginBottom:'18px',flexWrap:'wrap'}}>
          {[
            {label:`${notes.length} Notes`, color:'#6366f1'},
            {label:`${notes.filter(n=>n.price===0).length} Free`, color:'#10b981'},
            {label:`${[...new Set(notes.map(n=>n.subject))].length} Subjects`, color:'#f59e0b'},
          ].map(s=>(
            <div key={s.label} style={{background:'#fff',borderRadius:'10px',padding:'8px 16px',border:'1px solid #f1f5f9',fontSize:'13px',fontWeight:'700',color:s.color}}>{s.label}</div>
          ))}
        </div>

        {/* Notes Grid */}
        {loading ? (
          <div style={{textAlign:'center',padding:'60px',color:'#94a3b8'}}>Loading notes…</div>
        ) : filtered.length === 0 ? (
          <div style={{textAlign:'center',padding:'60px',color:'#94a3b8'}}>
            <div style={{fontSize:'48px',marginBottom:'12px'}}>📭</div>
            <div style={{fontWeight:'700',fontSize:'16px'}}>No notes found</div>
            <div style={{fontSize:'13px',marginTop:'6px'}}>Be the first to upload!</div>
          </div>
        ) : (
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:'16px'}}>
            {filtered.map(note=>(
              <div key={note.id} style={{background:'#fff',borderRadius:'16px',border:'1px solid #f1f5f9',overflow:'hidden',boxShadow:'0 2px 8px rgba(0,0,0,0.05)',transition:'transform 0.15s,box-shadow 0.15s',cursor:'pointer'}}
                onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.transform='translateY(-2px)';(e.currentTarget as HTMLElement).style.boxShadow='0 8px 24px rgba(0,0,0,0.1)'}}
                onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.transform='';(e.currentTarget as HTMLElement).style.boxShadow='0 2px 8px rgba(0,0,0,0.05)'}}>

                {/* PDF Preview Banner */}
                <div style={{height:'90px',background:'linear-gradient(135deg,#4f46e5,#7c3aed)',display:'flex',alignItems:'center',justifyContent:'center',position:'relative'}}>
                  <div style={{fontSize:'40px'}}>📄</div>
                  <div style={{position:'absolute',top:'10px',right:'10px',background:note.price===0?'#10b981':'#f59e0b',color:'#fff',borderRadius:'8px',padding:'3px 10px',fontSize:'11px',fontWeight:'800'}}>
                    {note.price===0 ? 'FREE' : `₹${note.price}`}
                  </div>
                  {note.user_id === currentUserId && (
                    <button onClick={e=>{e.stopPropagation();deleteNote(note.id)}} style={{position:'absolute',top:'8px',left:'8px',background:'rgba(255,255,255,0.2)',border:'none',borderRadius:'6px',padding:'4px 8px',cursor:'pointer',color:'#fff',fontSize:'12px'}}>🗑</button>
                  )}
                </div>

                <div style={{padding:'14px 16px'}} onClick={()=>setActiveNote(note)}>
                  <div style={{fontSize:'14px',fontWeight:'800',color:'#0f172a',marginBottom:'4px',lineHeight:1.3}}>{note.title}</div>
                  <div style={{fontSize:'12px',color:'#6366f1',fontWeight:'600',marginBottom:'6px'}}>📚 {note.subject} {note.branch !== 'All Branches' ? `· ${note.branch}` : ''}</div>
                  {note.description && <div style={{fontSize:'12px',color:'#64748b',marginBottom:'8px',lineHeight:1.5,display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',overflow:'hidden'} as any}>{note.description}</div>}

                  {/* AI Tags */}
                  {note.tags?.length > 0 && (
                    <div style={{display:'flex',flexWrap:'wrap',gap:'5px',marginBottom:'10px'}}>
                      {note.tags.slice(0,4).map((tag:string,i:number)=>(
                        <span key={tag} style={tagStyle(i)}>#{tag}</span>
                      ))}
                    </div>
                  )}

                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',borderTop:'1px solid #f1f5f9',paddingTop:'10px',marginTop:'4px'}}>
                    <div style={{fontSize:'11px',color:'#94a3b8'}}>by {note.profiles?.full_name || 'Student'} · {timeAgo(note.created_at)}</div>
                    <div style={{fontSize:'11px',color:'#94a3b8'}}>⬇ {note.downloads||0}</div>
                  </div>
                </div>

                <div style={{padding:'0 16px 14px'}}>
                  <button onClick={()=>handleDownload(note)} style={{width:'100%',background:'linear-gradient(135deg,#4f46e5,#7c3aed)',color:'#fff',border:'none',borderRadius:'10px',padding:'9px',fontWeight:'700',cursor:'pointer',fontSize:'13px'}}>
                    {note.price===0 ? '⬇ Download Free' : `⬇ Buy ₹${note.price}`}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Note Detail Modal */}
      {activeNote && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:'20px'}} onClick={()=>setActiveNote(null)}>
          <div style={{background:'#fff',borderRadius:'20px',maxWidth:'500px',width:'100%',padding:'28px',maxHeight:'90vh',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:'20px'}}>
              <h3 style={{margin:0,fontSize:'18px',fontWeight:'800'}}>{activeNote.title}</h3>
              <button onClick={()=>setActiveNote(null)} style={{background:'none',border:'none',fontSize:'20px',cursor:'pointer',color:'#94a3b8'}}>✕</button>
            </div>
            <div style={{background:'#f5f3ff',borderRadius:'12px',padding:'16px',marginBottom:'16px',textAlign:'center'}}>
              <div style={{fontSize:'48px',marginBottom:'8px'}}>📄</div>
              <div style={{fontSize:'13px',color:'#6366f1',fontWeight:'700'}}>{activeNote.file_name}</div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginBottom:'16px'}}>
              {[
                {label:'Subject',val:activeNote.subject},
                {label:'Price',val:activeNote.price===0?'Free':'₹'+activeNote.price},
                {label:'Branch',val:activeNote.branch},
                {label:'Downloads',val:activeNote.downloads||0},
                {label:'Uploaded by',val:activeNote.profiles?.full_name||'Student'},
                {label:'Date',val:timeAgo(activeNote.created_at)},
              ].map(({label,val})=>(
                <div key={label} style={{background:'#f8fafc',borderRadius:'10px',padding:'10px 14px'}}>
                  <div style={{fontSize:'11px',color:'#94a3b8',fontWeight:'600'}}>{label}</div>
                  <div style={{fontSize:'13px',fontWeight:'700',color:'#0f172a'}}>{val}</div>
                </div>
              ))}
            </div>
            {activeNote.description && <p style={{color:'#64748b',fontSize:'13px',lineHeight:1.6,marginBottom:'16px'}}>{activeNote.description}</p>}
            {activeNote.tags?.length > 0 && (
              <div style={{display:'flex',flexWrap:'wrap',gap:'6px',marginBottom:'20px'}}>
                {activeNote.tags.map((t:string,i:number)=><span key={t} style={tagStyle(i)}>#{t}</span>)}
              </div>
            )}
            <button onClick={()=>{handleDownload(activeNote);setActiveNote(null)}} style={{width:'100%',background:'linear-gradient(135deg,#4f46e5,#7c3aed)',color:'#fff',border:'none',borderRadius:'12px',padding:'13px',fontWeight:'800',cursor:'pointer',fontSize:'14px'}}>
              {activeNote.price===0 ? '⬇ Download for Free' : `⬇ Buy for ₹${activeNote.price}`}
            </button>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUpload && <UploadModal profile={profile} userId={currentUserId} onClose={()=>setShowUpload(false)} onSuccess={()=>{setShowUpload(false);loadNotes()}}/>}
    </MainLayout>
  )
}

// ── Upload Modal ──────────────────────────────────────────────────────
function UploadModal({profile,userId,onClose,onSuccess}:any) {
  const [form, setForm] = useState({ title:'', subject:'', branch: profile?.major||'All Branches', module: profile?.module||'', description:'', price:'0' })
  const [file, setFile] = useState<File|null>(null)
  const [tags, setTags] = useState<string[]>([])
  const [tagging, setTagging] = useState(false)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  async function autoTag() {
    if (!form.title && !form.subject) return
    setTagging(true)
    try {
      const r = await fetch('/api/notes/autotag',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:form.title,subject:form.subject,description:form.description})})
      const d = await r.json()
      setTags(d.tags||[])
    } catch {}
    setTagging(false)
  }

  async function handleSubmit() {
    if (!file) { setError('Please select a PDF file'); return }
    if (!form.title) { setError('Please enter a title'); return }
    if (!form.subject) { setError('Please select a subject'); return }
    if (!userId) { setError('Please log in first'); return }
    setSaving(true); setError('')

    // Upload PDF to Supabase Storage
    const ext = file.name.split('.').pop()
    const path = `notes/${userId}/${Date.now()}.${ext}`
    const { data: uploadData, error: uploadError } = await supabase.storage.from('notes').upload(path, file)
    if (uploadError || !uploadData) {
      setError('Upload failed — make sure "notes" storage bucket exists in Supabase'); setSaving(false); return
    }
    const { data: { publicUrl } } = supabase.storage.from('notes').getPublicUrl(path)

    // Save to DB
    const { error: dbErr } = await supabase.from('notes').insert({
      user_id: userId, title: form.title, subject: form.subject, branch: form.branch,
      module: form.module, description: form.description,
      price: parseFloat(form.price)||0, file_url: publicUrl,
      file_name: file.name, tags, status:'active'
    })
    if (dbErr) { setError('Database error: '+dbErr.message); setSaving(false); return }
    setSaving(false); setDone(true)
  }

  if (done) return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:'20px'}}>
      <div style={{background:'#fff',borderRadius:'20px',padding:'40px',maxWidth:'380px',width:'100%',textAlign:'center'}}>
        <div style={{fontSize:'56px',marginBottom:'12px'}}>🎉</div>
        <div style={{fontSize:'20px',fontWeight:'900',marginBottom:'8px'}}>Notes Uploaded!</div>
        <div style={{color:'#64748b',fontSize:'13px',marginBottom:'24px'}}>Your notes are now live with {tags.length} AI-generated tags</div>
        <div style={{display:'flex',flexWrap:'wrap',gap:'6px',justifyContent:'center',marginBottom:'20px'}}>
          {tags.map((t,i)=><span key={t} style={tagStyle(i)}>#{t}</span>)}
        </div>
        <button onClick={onSuccess} style={{width:'100%',background:'linear-gradient(135deg,#4f46e5,#7c3aed)',color:'#fff',border:'none',borderRadius:'12px',padding:'12px',fontWeight:'700',cursor:'pointer'}}>View All Notes</button>
      </div>
    </div>
  )

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:'20px'}} onClick={onClose}>
      <div style={{background:'#fff',borderRadius:'20px',maxWidth:'520px',width:'100%',padding:'28px',maxHeight:'95vh',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
        <div style={{display:'flex',justifyContent:'space-between',marginBottom:'22px'}}>
          <h3 style={{margin:0,fontSize:'20px',fontWeight:'800'}}>📤 Upload Notes</h3>
          <button onClick={onClose} style={{background:'none',border:'none',fontSize:'20px',cursor:'pointer',color:'#94a3b8'}}>✕</button>
        </div>

        {error && <div style={{background:'#fee2e2',color:'#ef4444',borderRadius:'10px',padding:'10px 14px',marginBottom:'16px',fontSize:'13px',fontWeight:'600'}}>{error}</div>}

        {/* PDF Drop Zone */}
        <div onClick={()=>fileRef.current?.click()} style={{border:`2px dashed ${file?'#6366f1':'#cbd5e1'}`,borderRadius:'14px',padding:'24px',textAlign:'center',cursor:'pointer',marginBottom:'18px',background:file?'#f5f3ff':'#f8fafc',transition:'all 0.15s'}}>
          {file ? (
            <>
              <div style={{fontSize:'36px',marginBottom:'6px'}}>📄</div>
              <div style={{fontWeight:'700',color:'#4f46e5',fontSize:'14px'}}>{file.name}</div>
              <div style={{fontSize:'12px',color:'#94a3b8',marginTop:'2px'}}>{formatSize(file.size)} · Click to change</div>
            </>
          ) : (
            <>
              <div style={{fontSize:'36px',marginBottom:'6px'}}>📎</div>
              <div style={{fontWeight:'700',color:'#0f172a',fontSize:'14px'}}>Drop PDF here or click to browse</div>
              <div style={{fontSize:'12px',color:'#94a3b8',marginTop:'2px'}}>PDF files only · Max 20MB</div>
            </>
          )}
        </div>
        <input ref={fileRef} type="file" accept=".pdf" style={{display:'none'}} onChange={e=>setFile(e.target.files?.[0]||null)}/>

        <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
          <div>
            <label style={{fontSize:'12px',fontWeight:'700',color:'#374151',display:'block',marginBottom:'5px'}}>Title *</label>
            <input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="e.g. Linear Algebra Full Notes with Solved Examples" style={{width:'100%',padding:'10px 12px',border:'1.5px solid #e2e8f0',borderRadius:'10px',fontSize:'13px',outline:'none',boxSizing:'border-box'}}/>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
            <div>
              <label style={{fontSize:'12px',fontWeight:'700',color:'#374151',display:'block',marginBottom:'5px'}}>Subject *</label>
              <select value={form.subject} onChange={e=>setForm(f=>({...f,subject:e.target.value}))} style={{width:'100%',padding:'10px 12px',border:'1.5px solid #e2e8f0',borderRadius:'10px',fontSize:'13px',background:'#fff',cursor:'pointer'}}>
                <option value="">Select Subject</option>
                {ALL_SUBJECTS.map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={{fontSize:'12px',fontWeight:'700',color:'#374151',display:'block',marginBottom:'5px'}}>Price (₹) — 0 for free</label>
              <input type="number" min="0" value={form.price} onChange={e=>setForm(f=>({...f,price:e.target.value}))} style={{width:'100%',padding:'10px 12px',border:'1.5px solid #e2e8f0',borderRadius:'10px',fontSize:'13px',outline:'none',boxSizing:'border-box'}}/>
            </div>
          </div>

          <div>
            <label style={{fontSize:'12px',fontWeight:'700',color:'#374151',display:'block',marginBottom:'5px'}}>Description</label>
            <textarea value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="What topics are covered? Unit numbers? Mid-sem or End-sem?" rows={3} style={{width:'100%',padding:'10px 12px',border:'1.5px solid #e2e8f0',borderRadius:'10px',fontSize:'13px',outline:'none',resize:'vertical',boxSizing:'border-box'}}/>
          </div>

          {/* AI Auto-tag */}
          <div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'8px'}}>
              <label style={{fontSize:'12px',fontWeight:'700',color:'#374151'}}>🤖 AI Tags</label>
              <button onClick={autoTag} disabled={tagging||(!form.title&&!form.subject)} style={{background:'#ede9fe',color:'#6366f1',border:'none',borderRadius:'8px',padding:'5px 12px',cursor:'pointer',fontWeight:'700',fontSize:'12px',opacity:(!form.title&&!form.subject)?0.5:1}}>
                {tagging ? '⏳ Tagging…' : '✨ Auto-tag'}
              </button>
            </div>
            <div style={{minHeight:'36px',background:'#f8fafc',borderRadius:'10px',padding:'8px',display:'flex',flexWrap:'wrap',gap:'5px',border:'1.5px solid #e2e8f0'}}>
              {tags.length === 0 ? <span style={{fontSize:'12px',color:'#94a3b8'}}>Fill title & subject then click Auto-tag</span> : tags.map((t,i)=>(
                <span key={t} style={{...tagStyle(i),cursor:'pointer',userSelect:'none'}} onClick={()=>setTags(tags.filter(x=>x!==t))}>#{t} ✕</span>
              ))}
            </div>
          </div>

          <button onClick={handleSubmit} disabled={saving} style={{background:'linear-gradient(135deg,#4f46e5,#7c3aed)',color:'#fff',border:'none',borderRadius:'12px',padding:'13px',fontWeight:'800',cursor:saving?'not-allowed':'pointer',fontSize:'14px',opacity:saving?0.8:1}}>
            {saving ? '⏳ Uploading…' : '📤 Upload Notes'}
          </button>
        </div>
      </div>
    </div>
  )
}
