'use client'
import { useState, useEffect, useRef } from 'react'
import MainLayout from '@/components/MainLayout'
import { supabase } from '@/lib/supabase'

const CATEGORIES = [
  { id: 'all',        label: 'All Posts',   icon: '📋' },
  { id: 'hostel',     label: 'Hostel',       icon: '🏠' },
  { id: 'mess',       label: 'Mess & Food',  icon: '🍱' },
  { id: 'laundry',    label: 'Laundry',      icon: '👕' },
  { id: 'academic',   label: 'Academic',     icon: '📚' },
  { id: 'lost_found', label: 'Lost & Found', icon: '🔍' },
  { id: 'events',     label: 'Events',       icon: '🎉' },
  { id: 'general',    label: 'General',      icon: '💬' },
]

function timeAgo(d: string) {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s/60)}m ago`
  if (s < 86400) return `${Math.floor(s/3600)}h ago`
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

const avatarColor = (name: string) => {
  const colors = ['#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6','#3b82f6','#06b6d4']
  return colors[(name?.charCodeAt(0) || 65) % colors.length]
}
const initials = (name: string) => (name || 'ST').split(' ').map((n:string) => n[0]).join('').slice(0,2).toUpperCase()

const TAG: any = {
  hostel:     ['#dbeafe','#1d4ed8'],
  mess:       ['#fef3c7','#92400e'],
  laundry:    ['#e0f2fe','#0369a1'],
  academic:   ['#ede9fe','#5b21b6'],
  lost_found: ['#fee2e2','#b91c1c'],
  events:     ['#dcfce7','#15803d'],
  general:    ['#f1f5f9','#475569'],
}

export default function CommunityPage() {
  const [posts, setPosts] = useState<any[]>([])
  const [filter, setFilter] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState('general')
  const [address, setAddress] = useState('')
  const [mediaFile, setMediaFile] = useState<File|null>(null)
  const [mediaPreview, setMediaPreview] = useState('')
  const [mediaType, setMediaType] = useState('')
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState('')
  const [msgPost, setMsgPost] = useState<any>(null)
  const mediaRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setCurrentUserId(session.user.id)
    })
    loadPosts()
  }, [])

  async function loadPosts() {
    setLoading(true)
    const { data, error } = await supabase
      .from('community_posts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
    if (data) {
      // Fetch profile names separately
      const userIds = Array.from(new Set(data.map((p:any) => p.user_id)))
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, major')
        .in('id', userIds)
      const profileMap: any = {}
      profiles?.forEach((p:any) => { profileMap[p.id] = p })
      setPosts(data.map((p:any) => ({ ...p, profiles: profileMap[p.user_id] || null })))
    }
    if (error) setError('Load error: ' + error.message)
    setLoading(false)
  }

  async function submitPost() {
    setError('')
    if (!title.trim() || !content.trim()) { setError('Title and details are required!'); return }
    setPosting(true)

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setError('Not logged in!'); setPosting(false); return }

    // upload media first to get URL
    let mediaUrl = null
    let finalMediaType = mediaType || null
    if (mediaFile) {
      const ext = mediaFile.name.split('.').pop()
      const path = `community/${session.user.id}/${Date.now()}.${ext}`
      const { data: uploadData } = await supabase.storage.from('posts').upload(path, mediaFile, { upsert: true })
      if (uploadData) {
        const { data: { publicUrl } } = supabase.storage.from('posts').getPublicUrl(path)
        mediaUrl = publicUrl
      }
    }

    const { error: err } = await supabase.from('community_posts').insert({
      user_id: session.user.id,
      title: title.trim(),
      content: content.trim(),
      category,
      address: address.trim() || null,
      media_url: mediaUrl,
      media_type: finalMediaType,
    })

    if (err) { setError('Failed: ' + err.message); setPosting(false); return }

    setTitle(''); setContent(''); setCategory('general'); setAddress('')
    setMediaFile(null); setMediaPreview(''); setMediaType('')
    setShowModal(false)
    setPosting(false)
    loadPosts()
  }

  async function deletePost(id: string) {
    if (!confirm('Delete this post?')) return
    const { error } = await supabase.from('community_posts').delete().eq('id', id)
    if (error) { alert('Could not delete: ' + error.message); return }
    setPosts(prev => prev.filter(p => p.id !== id))
  }

  const filtered = filter === 'all' ? posts : posts.filter(p => p.category === filter)

  return (
    <MainLayout>
      <div className='community-header' style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px', flexWrap:'wrap', gap:'10px' }}>
        <div>
          <h2 style={{ margin:0, fontSize:'22px', fontWeight:'800', color:'#0f172a' }}>Community Board</h2>
          <p style={{ margin:'3px 0 0', color:'#64748b', fontSize:'13px' }}>VIT Pune · Share hostel, mess, events & campus updates</p>
        </div>
        <button onClick={() => { setError(''); setShowModal(true) }}
          style={{ background:'linear-gradient(135deg,#6366f1,#8b5cf6)', border:'none', borderRadius:'12px', padding:'11px 20px', color:'#fff', fontWeight:'700', fontSize:'14px', cursor:'pointer' }}>
          ✏️ New Post
        </button>
      </div>

      {/* Filters */}
      <div className='community-filters' style={{ display:'flex', gap:'8px', marginBottom:'18px', overflowX:'auto', paddingBottom:'4px', flexWrap:'wrap' }}>
        {CATEGORIES.map(c => (
          <button key={c.id} onClick={() => setFilter(c.id)}
            style={{ background:filter===c.id?'#6366f1':'#fff', color:filter===c.id?'#fff':'#64748b', border:`1.5px solid ${filter===c.id?'#6366f1':'#e2e8f0'}`, borderRadius:'20px', padding:'7px 16px', cursor:'pointer', fontSize:'13px', fontWeight:'600', whiteSpace:'nowrap' }}>
            {c.icon} {c.label}
          </button>
        ))}
      </div>

      {/* Posts */}
      {loading ? (
        <div style={{ textAlign:'center', padding:'60px', color:'#94a3b8' }}>⌛ Loading...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign:'center', padding:'60px', background:'#fff', borderRadius:'16px', border:'1px solid #f1f5f9' }}>
          <div style={{ fontSize:'48px', marginBottom:'12px' }}>📋</div>
          <div style={{ fontSize:'16px', fontWeight:'700', color:'#0f172a', marginBottom:'6px' }}>No posts yet</div>
          <div style={{ color:'#94a3b8', fontSize:'13px', marginBottom:'20px' }}>Be the first to post!</div>
          <button onClick={() => setShowModal(true)}
            style={{ background:'linear-gradient(135deg,#6366f1,#8b5cf6)', border:'none', borderRadius:'10px', padding:'10px 22px', color:'#fff', fontWeight:'700', cursor:'pointer' }}>
            ✏️ Create Post
          </button>
        </div>
      ) : (
        <div style={{ display:'grid', gap:'12px' }}>
          {filtered.map(post => {
            const name = post.profiles?.full_name || 'VIT Student'
            const [bg, fg] = TAG[post.category] || TAG.general
            return (
              <div key={post.id} style={{ background:'#fff', borderRadius:'14px', border:'1px solid #f1f5f9', padding:'18px 20px', boxShadow:'0 2px 8px rgba(0,0,0,0.04)' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'12px', flexWrap:'wrap' }}>
                  <div style={{ display:'flex', gap:'12px', alignItems:'center', flex:1 }}>
                    <div style={{ width:'40px', height:'40px', borderRadius:'12px', background:avatarColor(name), display:'flex', alignItems:'center', justifyContent:'center', fontSize:'14px', fontWeight:'800', color:'#fff', flexShrink:0 }}>
                      {initials(name)}
                    </div>
                    <div>
                      <div style={{ fontWeight:'700', fontSize:'15px', color:'#0f172a' }}>{post.title}</div>
                      <div style={{ display:'flex', gap:'8px', alignItems:'center', marginTop:'3px', flexWrap:'wrap' }}>
                        <span style={{ fontSize:'12px', color:'#64748b', fontWeight:'600' }}>{name}</span>
                        <span style={{ fontSize:'11px', color:'#94a3b8' }}>{timeAgo(post.created_at)}</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:'8px', alignItems:'center', flexShrink:0 }}>
                    <span style={{ background:bg, color:fg, borderRadius:'8px', padding:'4px 12px', fontSize:'12px', fontWeight:'700', whiteSpace:'nowrap' }}>
                      {CATEGORIES.find(c => c.id===post.category)?.icon} {CATEGORIES.find(c => c.id===post.category)?.label}
                    </span>
                    {currentUserId && currentUserId !== post.user_id && (
                      <button onClick={() => setMsgPost(post)}
                        style={{ background:'#ede9fe', border:'none', borderRadius:'8px', padding:'4px 12px', cursor:'pointer', color:'#6366f1', fontSize:'12px', fontWeight:'700', whiteSpace:'nowrap' }}>
                        💬 Message
                      </button>
                    )}
                    {currentUserId === post.user_id && (
                      <button onClick={() => deletePost(post.id)}
                        title="Delete post"
                        style={{ background:'#fee2e2', border:'none', borderRadius:'8px', padding:'4px 10px', cursor:'pointer', color:'#ef4444', fontSize:'13px', fontWeight:'700' }}>
                        🗑
                      </button>
                    )}
                  </div>
                </div>
                {post.content && (
                  <div style={{ marginTop:'12px', fontSize:'13.5px', color:'#374151', lineHeight:'1.7', background:'#fafafa', borderRadius:'10px', padding:'12px 14px' }}>
                    {post.content}
                  </div>
                )}
                {post.address && (
                  <div style={{ marginTop:'8px', display:'flex', alignItems:'center', gap:'6px', fontSize:'12.5px', color:'#6366f1', fontWeight:'600', background:'#f5f3ff', borderRadius:'8px', padding:'7px 12px', width:'fit-content' }}>
                    <span>📍</span> {post.address}
                  </div>
                )}
                {post.media_url && post.media_type === 'image' && (
                  <img src={post.media_url} style={{ marginTop:'12px', width:'100%', maxHeight:'400px', objectFit:'cover', borderRadius:'10px' }} />
                )}
                {post.media_url && post.media_type === 'video' && (
                  <video src={post.media_url} controls style={{ marginTop:'12px', width:'100%', maxHeight:'400px', borderRadius:'10px' }} />
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:'20px' }}>
          <div className='community-modal' style={{ background:'#fff', borderRadius:'20px', padding:'28px', width:'100%', maxWidth:'520px', boxShadow:'0 25px 60px rgba(0,0,0,0.2)', maxHeight:'90vh', overflowY:'auto' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px' }}>
              <h3 style={{ margin:0, fontSize:'18px', fontWeight:'800' }}>✏️ Create Post</h3>
              <button onClick={() => setShowModal(false)} style={{ background:'#f1f5f9', border:'none', borderRadius:'8px', width:'32px', height:'32px', cursor:'pointer', fontSize:'16px' }}>✕</button>
            </div>

            {error && (
              <div style={{ background:'#fee2e2', border:'1px solid #fca5a5', borderRadius:'10px', padding:'10px 14px', marginBottom:'14px', fontSize:'13px', color:'#b91c1c', fontWeight:'600' }}>
                ⚠️ {error}
              </div>
            )}

            {/* Category */}
            <label style={{ fontSize:'12px', fontWeight:'700', color:'#374151', display:'block', marginBottom:'8px' }}>Category</label>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'6px', marginBottom:'14px' }}>
              {CATEGORIES.filter(c => c.id !== 'all').map(c => (
                <button key={c.id} onClick={() => setCategory(c.id)}
                  style={{ padding:'8px 4px', borderRadius:'9px', border:`1.5px solid ${category===c.id?'#6366f1':'#e2e8f0'}`, background:category===c.id?'#ede9fe':'#fafafa', cursor:'pointer', fontSize:'11px', fontWeight:'600', color:category===c.id?'#4f46e5':'#64748b' }}>
                  {c.icon}<br/>{c.label}
                </button>
              ))}
            </div>

            {/* Title */}
            <label style={{ fontSize:'12px', fontWeight:'700', color:'#374151', display:'block', marginBottom:'5px' }}>Title *</label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Hot water not working in H2"
              style={{ width:'100%', padding:'10px 14px', border:'1.5px solid #e2e8f0', borderRadius:'10px', fontSize:'13.5px', outline:'none', boxSizing:'border-box', marginBottom:'12px' }} />

            {/* Content */}
            <label style={{ fontSize:'12px', fontWeight:'700', color:'#374151', display:'block', marginBottom:'5px' }}>Details *</label>
            <textarea value={content} onChange={e => setContent(e.target.value)}
              placeholder="Add more details..." rows={3}
              style={{ width:'100%', padding:'10px 14px', border:'1.5px solid #e2e8f0', borderRadius:'10px', fontSize:'13.5px', outline:'none', resize:'vertical', fontFamily:'inherit', boxSizing:'border-box', marginBottom:'14px' }} />

            {/* Address - show only for relevant categories */}
            {['hostel','mess','laundry','lost_found','events'].includes(category) && (
              <>
                <label style={{ fontSize:'12px', fontWeight:'700', color:'#374151', display:'block', marginBottom:'5px' }}>📍 Location / Address (optional)</label>
                <input value={address} onChange={e => setAddress(e.target.value)}
                  placeholder={
                    category === 'hostel' ? 'e.g. Hostel H2, Room 304' :
                    category === 'mess' ? 'e.g. Main Mess, Ground Floor' :
                    category === 'laundry' ? 'e.g. Laundry Block B' :
                    category === 'lost_found' ? 'e.g. Found near Library Gate' :
                    'e.g. Seminar Hall, Block A'
                  }
                  style={{ width:'100%', padding:'10px 14px', border:'1.5px solid #e2e8f0', borderRadius:'10px', fontSize:'13.5px', outline:'none', boxSizing:'border-box', marginBottom:'14px' }} />
              </>
            )}

            {/* Media */}
            <label style={{ fontSize:'12px', fontWeight:'700', color:'#374151', display:'block', marginBottom:'8px' }}>📷 Photo / 🎥 Video (optional)</label>
            <input ref={mediaRef} type="file" accept="image/*,video/*" style={{ display:'none' }}
              onChange={e => {
                const f = e.target.files?.[0]
                if (!f) return
                setMediaFile(f)
                setMediaType(f.type.startsWith('video/') ? 'video' : 'image')
                setMediaPreview(URL.createObjectURL(f))
              }} />
            {!mediaPreview ? (
              <button onClick={() => mediaRef.current?.click()}
                style={{ width:'100%', padding:'14px', border:'2px dashed #c7d2fe', borderRadius:'12px', background:'#fafafa', cursor:'pointer', fontSize:'13px', color:'#6366f1', fontWeight:'600', marginBottom:'16px' }}>
                📎 Attach Photo or Video
              </button>
            ) : (
              <div style={{ position:'relative', borderRadius:'12px', overflow:'hidden', border:'2px solid #c7d2fe', marginBottom:'16px' }}>
                {mediaType==='image' ? <img src={mediaPreview} style={{ width:'100%', maxHeight:'200px', objectFit:'cover', display:'block' }} /> : <video src={mediaPreview} controls style={{ width:'100%', maxHeight:'200px', display:'block' }} />}
                <button onClick={() => { setMediaFile(null); setMediaPreview(''); setMediaType(''); if(mediaRef.current) mediaRef.current.value='' }}
                  style={{ position:'absolute', top:'8px', right:'8px', background:'rgba(0,0,0,0.6)', border:'none', borderRadius:'50%', width:'28px', height:'28px', cursor:'pointer', color:'#fff', fontSize:'14px' }}>✕</button>
              </div>
            )}

            <div style={{ display:'flex', gap:'10px' }}>
              <button onClick={() => setShowModal(false)}
                style={{ flex:1, background:'#f1f5f9', border:'none', borderRadius:'10px', padding:'12px', fontWeight:'700', cursor:'pointer', color:'#64748b' }}>
                Cancel
              </button>
              <button onClick={submitPost} disabled={posting}
                style={{ flex:2, background:!posting?'linear-gradient(135deg,#6366f1,#8b5cf6)':'#e2e8f0', border:'none', borderRadius:'10px', padding:'12px', fontWeight:'700', cursor:posting?'default':'pointer', color:'#fff', fontSize:'14px' }}>
                {posting ? '⌛ Posting...' : '📢 Post Now'}
              </button>
            </div>
          </div>
        </div>
      )}
      {msgPost && <CommunityMsgModal post={msgPost} onClose={() => setMsgPost(null)} />}
          <style>{`
        }
      `}</style>
          <style>{`
        @media (max-width: 768px) {
          .community-header { flex-direction: column !important; align-items: flex-start !important; gap: 10px !important; }
          .community-header button { width: 100% !important; }
          .community-filters { flex-wrap: wrap !important; gap: 6px !important; }
          .community-modal { max-width: 95vw !important; width: 95vw !important; padding: 16px !important; margin: 10px !important; }
          .community-modal-overlay { padding: 10px !important; align-items: flex-start !important; padding-top: 20px !important; }
          .post-card { padding: 14px !important; }
          .post-header { flex-direction: column !important; gap: 8px !important; }
        }
      `}</style>
    </MainLayout>
  )
}

function CommunityMsgModal({ post, onClose }: any) {
  const name = post.profiles?.full_name || 'this student'
  const [msg, setMsg] = useState(`Hi ${name}! I saw your post "${post.title}" and wanted to ask you more about it.`)
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)

  const send = async () => {
    if (!msg.trim()) return
    setSending(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSending(false); return }
    await supabase.from('direct_messages').insert({
      sender_id: user.id,
      receiver_id: post.user_id,
      content: msg,
    })
    setSending(false)
    setSent(true)
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:1001, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }} onClick={onClose}>
      <div style={{ background:'#fff', borderRadius:'20px', maxWidth:'440px', width:'100%', padding:'28px' }} onClick={e => e.stopPropagation()}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'20px' }}>
          <h3 style={{ margin:0, fontSize:'18px', fontWeight:'800' }}>💬 Message {name}</h3>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:'20px', cursor:'pointer', color:'#94a3b8' }}>✕</button>
        </div>
        {sent ? (
          <div style={{ textAlign:'center', padding:'20px' }}>
            <div style={{ fontSize:'48px', marginBottom:'8px' }}>✅</div>
            <div style={{ fontWeight:'700', color:'#10b981', fontSize:'16px' }}>Message Sent!</div>
            <div style={{ color:'#64748b', fontSize:'13px', marginTop:'4px', marginBottom:'16px' }}>{name} will be notified</div>
            <button onClick={onClose} style={{ background:'#6366f1', color:'#fff', border:'none', borderRadius:'10px', padding:'10px 24px', fontWeight:'700', cursor:'pointer' }}>Done</button>
          </div>
        ) : (
          <>
            <div style={{ background:'#f8fafc', borderRadius:'12px', padding:'12px 14px', marginBottom:'14px' }}>
              <div style={{ fontSize:'11px', color:'#94a3b8', marginBottom:'3px' }}>About post</div>
              <div style={{ fontWeight:'700', color:'#0f172a', fontSize:'14px' }}>{post.title}</div>
              {post.content && <div style={{ color:'#64748b', fontSize:'12px', marginTop:'3px' }}>{post.content.slice(0, 80)}{post.content.length > 80 ? '…' : ''}</div>}
            </div>
            <textarea value={msg} onChange={e => setMsg(e.target.value)} rows={4}
              style={{ width:'100%', padding:'11px 14px', border:'1.5px solid #e2e8f0', borderRadius:'12px', fontSize:'13px', resize:'vertical', outline:'none', boxSizing:'border-box', fontFamily:'inherit', marginBottom:'12px' }} />
            <div style={{ display:'flex', gap:'10px' }}>
              <button onClick={onClose} style={{ flex:1, background:'#f1f5f9', border:'none', borderRadius:'10px', padding:'12px', fontWeight:'600', cursor:'pointer', color:'#64748b' }}>Cancel</button>
              <button onClick={send} disabled={sending} style={{ flex:2, background:'linear-gradient(135deg,#6366f1,#8b5cf6)', border:'none', borderRadius:'10px', padding:'12px', fontWeight:'700', cursor:'pointer', color:'#fff', opacity:sending?0.7:1 }}>
                {sending ? 'Sending…' : 'Send Message'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
