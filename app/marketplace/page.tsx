'use client'
import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import MainLayout from '@/components/MainLayout'
import { supabase, Listing } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const TYPE_COLOR: Record<string, string> = { sell: '#10b981', buy: '#3b82f6', borrow: '#f59e0b', lost: '#ef4444', found: '#004182' }
const TYPE_BG: Record<string, string> = { sell: '#d1fae5', buy: '#dbeafe', borrow: '#fef3c7', lost: '#fee2e2', found: '#e8f0fe' }
const TYPE_LABEL: Record<string, string> = { sell: 'For Sale', buy: 'Wanted', borrow: 'Borrow/Lend', lost: 'Lost', found: 'Found' }
const CATEGORIES = ['All', 'Books', 'Electronics', 'Lab Equipment', 'Clothing', 'Accessories', 'Documents', 'Furniture', 'Stationery', 'Other']
const TABS = [
  { id: 'all',    label: 'All Items',     icon: '🗂' },
  { id: 'sell',   label: 'Buy & Sell',    icon: '🛍' },
  { id: 'borrow', label: 'Borrow & Lend', icon: '🔄' },
  { id: 'lost',   label: 'Lost',          icon: '🔍' },
  { id: 'found',  label: 'Found',         icon: '✅' },
]

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  const now = new Date()
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`
  return `${Math.floor(diff/86400)}d ago`
}

export default function MarketplacePage() {
  return (
    <Suspense fallback={<div style={{padding:'40px',textAlign:'center',color:'#94a3b8'}}>Loading marketplace...</div>}>
      <MarketplaceContent />
    </Suspense>
  )
}

function MarketplaceContent() {
  const searchParams = useSearchParams()
  const [tab, setTab] = useState(searchParams.get('tab') || 'all')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [selectedItem, setSelectedItem] = useState<Listing | null>(null)
  const [msgItem, setMsgItem] = useState<Listing | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id || null))
    loadListings()
    // Real-time updates
    const sub = supabase.channel('listings-realtime').on('postgres_changes', { event: '*', schema: 'public', table: 'listings' }, () => loadListings()).subscribe()
    return () => { supabase.removeChannel(sub) }
  }, [])

  const loadListings = async () => {
    setLoading(true)
    const { data } = await supabase.from('listings').select('*, profiles(full_name, year)').eq('status', 'active').order('created_at', { ascending: false })
    setListings(data as Listing[] || [])
    setLoading(false)
  }

  const filtered = listings.filter(l => {
    const matchTab = tab === 'all' || l.type === tab
    const matchSearch = l.title.toLowerCase().includes(search.toLowerCase()) || (l.description || '').toLowerCase().includes(search.toLowerCase())
    const matchCat = category === 'All' || l.category === category
    return matchTab && matchSearch && matchCat
  })

  const deleteListing = async (id: string) => {
    if (!confirm('Delete this listing?')) return
    await supabase.from('listings').delete().eq('id', id)
    loadListings()
    setSelectedItem(null)
  }

  return (
    <MainLayout>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '22px', fontWeight: '800', color: '#0f172a' }}>Marketplace</h2>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '13px' }}>Buy, sell, borrow & report lost/found items on campus</p>
        </div>
        <button onClick={() => setShowModal(true)} style={{ background: '#0a66c2', color: '#fff', border: 'none', borderRadius: '12px', padding: '10px 20px', fontWeight: '700', cursor: 'pointer', fontSize: '13px' }}>
          + List Item
        </button>
      </div>

      {/* Search + Filter */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '14px', flexWrap: 'wrap' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍  Search listings..." style={{ flex: 1, minWidth: '200px', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '13px', outline: 'none' }} />
        <select value={category} onChange={e => setCategory(e.target.value)} style={{ padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '13px', background: '#fff', outline: 'none' }}>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: '8px 16px', borderRadius: '20px', border: '1.5px solid', cursor: 'pointer', fontSize: '13px', fontWeight: '600', borderColor: tab === t.id ? '#0a66c2' : '#e2e8f0', background: tab === t.id ? '#0a66c2' : '#fff', color: tab === t.id ? '#fff' : '#64748b' }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>Loading listings...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>🔍</div>
          <div style={{ fontSize: '16px', fontWeight: '600' }}>No listings found</div>
          <div style={{ fontSize: '13px' }}>Try adjusting filters or be the first to post!</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
          {filtered.map(item => (
            <ListingCard key={item.id} item={item} currentUserId={currentUserId} onView={setSelectedItem} onMessage={setMsgItem} onDelete={deleteListing} />
          ))}
        </div>
      )}

      {showModal && <ListItemModal onClose={() => setShowModal(false)} onSuccess={loadListings} />}
      {selectedItem && <ItemDetailModal item={selectedItem} currentUserId={currentUserId} onClose={() => setSelectedItem(null)} onMessage={setMsgItem} onDelete={deleteListing} />}
      {msgItem && <DirectMsgModal item={msgItem} onClose={() => setMsgItem(null)} />}
    </MainLayout>
  )
}

// ---------------------------------------------------------------
// LISTING CARD
// ---------------------------------------------------------------
function ListingCard({ item, currentUserId, onView, onMessage, onDelete }: any) {
  const catIcon: Record<string, string> = { Books: '📚', Electronics: '💻', 'Lab Equipment': '🧪', Clothing: '👔', Documents: '📄', Furniture: '🪑', Stationery: '✏️' }
  return (
    <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #f1f5f9', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', transition: 'transform 0.15s, box-shadow 0.15s', cursor: 'pointer' }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'none'; (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)' }}>

      {/* Image / Icon Area */}
      <div style={{ height: '130px', background: `linear-gradient(135deg, ${TYPE_BG[item.type] || '#f1f5f9'}, #f3f6fb)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '52px', position: 'relative' }}>
        {item.image_url ? <img src={item.image_url} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (catIcon[item.category] || '📦')}
      </div>

      <div style={{ padding: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
          <span style={{ background: TYPE_BG[item.type], color: TYPE_COLOR[item.type], borderRadius: '6px', padding: '2px 9px', fontSize: '10px', fontWeight: '700' }}>{TYPE_LABEL[item.type]}</span>
          <span style={{ fontSize: '10px', color: '#94a3b8' }}>{formatDate(item.created_at)}</span>
        </div>
        <h4 style={{ margin: '0 0 6px', fontSize: '14px', fontWeight: '700', color: '#0f172a', lineHeight: '1.4' }}>{item.title}</h4>
        <p style={{ margin: '0 0 10px', fontSize: '12px', color: '#64748b', lineHeight: '1.5', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' } as any}>{item.description}</p>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
            {item.price > 0 ? <span style={{ fontSize: '17px', fontWeight: '800', color: '#0a66c2' }}>₹{item.price?.toLocaleString()}</span>
              : item.price === 0 ? <span style={{ fontSize: '14px', fontWeight: '700', color: '#10b981' }}>Free</span>
              : <span style={{ fontSize: '12px', color: '#94a3b8' }}>—</span>}
            {item.type === 'borrow' && item.rent_duration && (
              <span style={{ fontSize: '11px', color: '#f59e0b', fontWeight: '700' }}>
                /{item.rent_duration === 'per_hour' ? 'hr' : 'day'}
              </span>
            )}
          </div>
          {item.condition && <span style={{ fontSize: '10px', color: '#94a3b8', background: '#f3f6fb', padding: '2px 7px', borderRadius: '4px' }}>{item.condition}</span>}
        </div>

        <div style={{ display: 'flex', gap: '6px' }}>
          <button onClick={() => onView(item)} style={{ flex: 1, background: '#f3f6fb', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '7px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', color: '#475569' }}>View</button>
          {currentUserId !== item.user_id && (
            <button onClick={() => onMessage(item)} style={{ flex: 1, background: '#0a66c2', border: 'none', borderRadius: '8px', padding: '7px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', color: '#fff' }}>Message</button>
          )}
          {currentUserId === item.user_id && (
            <button onClick={() => onDelete(item.id)} style={{ flex: 1, background: '#fee2e2', border: 'none', borderRadius: '8px', padding: '7px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', color: '#ef4444' }}>Delete</button>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #f3f6fb' }}>
          <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#0a66c2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '700', color: '#fff' }}>
            {(item.profiles?.full_name || 'U')[0]}
          </div>
          <span style={{ fontSize: '12px', color: '#64748b' }}>{item.profiles?.full_name || 'Student'}</span>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------
// ITEM DETAIL MODAL
// ---------------------------------------------------------------
function ItemDetailModal({ item, currentUserId, onClose, onMessage, onDelete }: any) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: '20px', maxWidth: '520px', width: '100%', maxHeight: '90vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ height: '200px', background: `linear-gradient(135deg, ${TYPE_BG[item.type]}, #f3f6fb)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '80px', borderRadius: '20px 20px 0 0' }}>
          {item.image_url ? <img src={item.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '20px 20px 0 0' }} /> : '📦'}
        </div>
        <div style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <span style={{ background: TYPE_BG[item.type], color: TYPE_COLOR[item.type], borderRadius: '8px', padding: '4px 12px', fontSize: '12px', fontWeight: '700' }}>{TYPE_LABEL[item.type]}</span>
            <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#94a3b8' }}>✕</button>
          </div>
          <h2 style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>{item.title}</h2>
          <p style={{ color: '#475569', lineHeight: '1.7', marginBottom: '16px' }}>{item.description || 'No description provided.'}</p>
          {item.price > 0 && <div style={{ fontSize: '28px', fontWeight: '800', color: '#0a66c2', marginBottom: '12px' }}>₹{item.price?.toLocaleString()}</div>}
          {item.location_last_seen && <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '8px' }}>📍 Last seen: {item.location_last_seen}</p>}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
            {item.category && <span style={{ background: '#e0e7ff', color: '#0a66c2', borderRadius: '6px', padding: '3px 10px', fontSize: '11px', fontWeight: '600' }}>{item.category}</span>}
            {item.condition && <span style={{ background: '#fef3c7', color: '#f59e0b', borderRadius: '6px', padding: '3px 10px', fontSize: '11px', fontWeight: '600' }}>{item.condition}</span>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px', background: '#f3f6fb', borderRadius: '12px', marginBottom: '16px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#0a66c2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: '700', color: '#fff' }}>
              {(item.profiles?.full_name || 'U')[0]}
            </div>
            <div>
              <div style={{ fontWeight: '700', color: '#0f172a' }}>{item.profiles?.full_name || 'Student'}</div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>Posted {formatDate(item.created_at)}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            {currentUserId !== item.user_id && (
              <button onClick={() => { onClose(); onMessage(item) }} style={{ flex: 1, background: '#0a66c2', color: '#fff', border: 'none', borderRadius: '12px', padding: '13px', fontWeight: '700', cursor: 'pointer', fontSize: '14px' }}>
                💬 Send Message
              </button>
            )}
            {currentUserId === item.user_id && (
              <button onClick={() => onDelete(item.id)} style={{ flex: 1, background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '12px', padding: '13px', fontWeight: '700', cursor: 'pointer', fontSize: '14px' }}>
                🗑 Delete Listing
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------
// LIST ITEM MODAL
// ---------------------------------------------------------------
function ListItemModal({ onClose, onSuccess }: any) {
  const [form, setForm] = useState({ type: 'sell', title: '', description: '', price: '', category: 'Books', condition: 'Good', location_last_seen: '', rent_duration: 'per_day' })
  const [aiLoading, setAiLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)

  const handleImage = (file: File) => {
    setImageFile(file)
    const reader = new FileReader()
    reader.onload = e => setImagePreview(e.target?.result as string)
    reader.readAsDataURL(file)
  }

  const enhanceWithAI = async () => {
    if (!form.title.trim()) { alert('Please enter a title first!'); return }
    setAiLoading(true)
    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: form.title, type: form.type, category: form.category, condition: form.condition, price: form.price }),
      })
      const data = await res.json()
      if (data.description) setForm(f => ({ ...f, description: data.description }))
    } catch { alert('AI generation failed. Please write manually.') }
    setAiLoading(false)
  }

  const submit = async () => {
    if (!form.title.trim()) { alert('Title is required!'); return }
    if (form.type === 'sell' || form.type === 'borrow') {
      if (form.price === '') { alert('Please enter a price! (Enter 0 for free)'); return }
      const p = parseFloat(form.price)
      if (isNaN(p) || p < 0) { alert('Price must be 0 or greater! Negative prices are not allowed.'); return }
    }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    let imageUrl = null
    if (imageFile) {
      const ext = imageFile.name.split('.').pop()
      const path = `listings/${user.id}/${Date.now()}.${ext}`
      const { data: uploadData } = await supabase.storage.from('images').upload(path, imageFile)
      if (uploadData) {
        const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(path)
        imageUrl = publicUrl
      }
    }

    const { data: newListing } = await supabase.from('listings').insert({
      user_id: user.id, type: form.type, title: form.title,
      description: form.description, price: form.price ? parseFloat(form.price) : null,
      category: form.category, condition: form.condition, image_url: imageUrl,
      location_last_seen: form.location_last_seen || null,
      rent_duration: form.type === 'borrow' ? form.rent_duration : null,
    }).select().single()

    // 🔍 Auto-match lost/found listings
    if ((form.type === 'lost' || form.type === 'found') && newListing) {
      fetch('/api/lost-found-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingId: newListing.id,
          type: form.type,
          title: form.title,
          description: form.description,
          userId: user.id,
        })
      }).then(r => r.json()).then(result => {
        if (result.matched) {
          alert(`🎉 We found ${result.matches} possible match${result.matches > 1 ? 'es' : ''}! We've sent them a message. Check your Messages tab too.`)
        }
      }).catch(() => {}) // Silent fail — don't block UX
    }
    setSaving(false)
    setDone(true)
    onSuccess()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: '20px', maxWidth: '520px', width: '100%', padding: '28px', maxHeight: '95vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '22px' }}>
          <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '800' }}>List an Item</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#94a3b8' }}>✕</button>
        </div>

        {done ? (
          <div style={{ textAlign: 'center', padding: '30px' }}>
            <div style={{ fontSize: '56px', marginBottom: '12px' }}>🎉</div>
            <div style={{ fontWeight: '800', fontSize: '18px', color: '#10b981' }}>Listed Successfully!</div>
            <div style={{ color: '#64748b', marginTop: '6px', marginBottom: '20px' }}>Your item is now live on the marketplace</div>
            <button onClick={onClose} style={{ background: '#0a66c2', color: '#fff', border: 'none', borderRadius: '12px', padding: '12px 28px', fontWeight: '700', cursor: 'pointer' }}>Done</button>
          </div>
        ) : (
          <>
            {/* Type Selector */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '6px', display: 'block' }}>Listing Type</label>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {[['sell','🛍 Sell'],['buy','🛒 Buy'],['borrow','🔄 Borrow/Lend'],['lost','🔍 Lost'],['found','✅ Found']].map(([v,l]) => (
                  <button key={v} onClick={() => setForm(f => ({ ...f, type: v }))} style={{ padding: '6px 12px', borderRadius: '8px', border: '1.5px solid', cursor: 'pointer', fontSize: '12px', fontWeight: '600', borderColor: form.type === v ? TYPE_COLOR[v] : '#e2e8f0', background: form.type === v ? TYPE_BG[v] : '#fff', color: form.type === v ? TYPE_COLOR[v] : '#64748b' }}>{l}</button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '5px', display: 'block' }}>Title *</label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Engineering Mathematics Book"
                style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
            </div>

            {/* Description + AI */}
            <div style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151' }}>Description</label>
                <button onClick={enhanceWithAI} disabled={aiLoading || !form.title.trim()} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '8px', border: '1.5px solid #004182', background: aiLoading ? '#f3f4f6' : '#0a66c2', color: aiLoading ? '#94a3b8' : '#fff', fontWeight: '700', cursor: 'pointer', fontSize: '11px' }}>
                  {aiLoading ? '⏳ Generating...' : '✨ AI Enhance'}
                </button>
              </div>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} placeholder="Describe your item..."
                style={{ width: '100%', padding: '10px 12px', border: `1.5px solid ${form.description.includes('✅') ? '#004182' : '#e2e8f0'}`, borderRadius: '10px', fontSize: '13px', resize: 'vertical', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
            </div>

            {/* Category + Condition */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '5px', display: 'block' }}>Category</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '13px', outline: 'none', background: '#fff', boxSizing: 'border-box' }}>
                  {CATEGORIES.slice(1).map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              {(form.type === 'sell' || form.type === 'borrow') && (
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '5px', display: 'block' }}>Condition</label>
                  <select value={form.condition} onChange={e => setForm(f => ({ ...f, condition: e.target.value }))} style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '13px', outline: 'none', background: '#fff', boxSizing: 'border-box' }}>
                    {['Excellent','Good','Fair','Poor'].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              )}
            </div>

            {/* Price */}
            {(form.type === 'sell' || form.type === 'borrow') && (
              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '5px', display: 'block' }}>Price (₹) — enter 0 for free (no negative values)</label>
                <input type="number" value={form.price}
                  min={0}
                  onChange={e => {
                    const val = e.target.value
                    if (val === '' || parseFloat(val) >= 0) setForm(f => ({ ...f, price: val }))
                  }}
                  onKeyDown={e => {
                    if (e.key === '-' || e.key === '+' || e.key === 'e' || e.key === 'E') e.preventDefault()
                  }}
                  onBlur={e => {
                    const val = parseFloat(e.target.value)
                    if (!isNaN(val) && val < 0) setForm(f => ({ ...f, price: '0' }))
                  }}
                  placeholder="Enter price (min ₹0)"
                  style={{ width: '100%', padding: '10px 12px', border: `1.5px solid ${form.price !== '' && parseFloat(form.price) < 0 ? '#ef4444' : '#e2e8f0'}`, borderRadius: '10px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
              </div>
            )}

            {/* Rent Duration — only for borrow */}
            {form.type === 'borrow' && (
              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '5px', display: 'block' }}>Rent Duration</label>
                <select value={form.rent_duration} onChange={e => setForm(f => ({ ...f, rent_duration: e.target.value }))}
                  style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '13px', outline: 'none', background: '#fff', boxSizing: 'border-box' }}>
                  <option value="per_hour">⏱ Per Hour</option>
                  <option value="per_day">📅 Per Day</option>
                </select>
                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                  {form.rent_duration === 'per_hour' ? `Price will show as ₹${form.price || '0'}/hour` : `Price will show as ₹${form.price || '0'}/day`}
                </div>
              </div>
            )}

            {/* Location for lost/found */}
            {(form.type === 'lost' || form.type === 'found') && (
              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '5px', display: 'block' }}>Location Last Seen / Found</label>
                <input value={form.location_last_seen} onChange={e => setForm(f => ({ ...f, location_last_seen: e.target.value }))} placeholder="e.g. Near Library Block B"
                  style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
              </div>
            )}

            {/* Image Upload */}
            <div style={{ marginBottom: '18px' }}>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '5px', display: 'block' }}>Photo (optional)</label>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && handleImage(e.target.files[0])} />
              <input ref={cameraRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && handleImage(e.target.files[0])} />
              {imagePreview ? (
                <div style={{ position: 'relative', borderRadius: '10px', overflow: 'hidden', border: '1.5px solid #e2e8f0' }}>
                  <img src={imagePreview} alt="preview" style={{ width: '100%', height: '140px', objectFit: 'cover', display: 'block' }} />
                  <button onClick={() => { setImageFile(null); setImagePreview(null) }} style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '50%', width: '26px', height: '26px', cursor: 'pointer', fontSize: '14px' }}>✕</button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => fileRef.current?.click()} style={{ flex: 1, border: '2px dashed #e2e8f0', borderRadius: '10px', padding: '14px', cursor: 'pointer', background: 'none', color: '#64748b', fontSize: '12px', fontWeight: '600' }}>📁 Upload File</button>
                  <button onClick={() => cameraRef.current?.click()} style={{ flex: 1, border: '2px dashed #e2e8f0', borderRadius: '10px', padding: '14px', cursor: 'pointer', background: 'none', color: '#64748b', fontSize: '12px', fontWeight: '600' }}>📷 Take Photo</button>
                </div>
              )}
            </div>

            <button onClick={submit} disabled={saving} style={{ width: '100%', background: '#0a66c2', color: '#fff', border: 'none', borderRadius: '12px', padding: '13px', fontWeight: '700', cursor: saving ? 'not-allowed' : 'pointer', fontSize: '15px', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Posting...' : '🚀 Publish Listing'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------
// DIRECT MESSAGE MODAL
// ---------------------------------------------------------------
function DirectMsgModal({ item, onClose }: any) {
  const [msg, setMsg] = useState(`Hi! I'm interested in your listing: "${item.title}". Is it still available?`)
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)

  const send = async () => {
    setSending(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSending(false); return }
    await supabase.from('direct_messages').insert({ sender_id: user.id, receiver_id: item.user_id, listing_id: item.id, content: msg })
    setSending(false)
    setSent(true)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1001, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: '20px', maxWidth: '440px', width: '100%', padding: '28px' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>Message Seller</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#94a3b8' }}>✕</button>
        </div>
        {sent ? (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <div style={{ fontSize: '48px', marginBottom: '8px' }}>✅</div>
            <div style={{ fontWeight: '700', color: '#10b981', fontSize: '16px' }}>Message Sent!</div>
            <div style={{ color: '#64748b', fontSize: '13px', marginTop: '4px', marginBottom: '16px' }}>The seller will be notified</div>
            <button onClick={onClose} style={{ background: '#0a66c2', color: '#fff', border: 'none', borderRadius: '10px', padding: '10px 24px', fontWeight: '700', cursor: 'pointer' }}>Done</button>
          </div>
        ) : (
          <>
            <div style={{ background: '#f3f6fb', borderRadius: '12px', padding: '12px 14px', marginBottom: '14px' }}>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '3px' }}>About listing</div>
              <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '14px' }}>{item.title}</div>
              {item.price > 0 && <div style={{ color: '#0a66c2', fontWeight: '700', fontSize: '14px' }}>₹{item.price}</div>}
            </div>
            <textarea value={msg} onChange={e => setMsg(e.target.value)} rows={4}
              style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #e2e8f0', borderRadius: '12px', fontSize: '13px', resize: 'vertical', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', marginBottom: '12px' }} />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={onClose} style={{ flex: 1, background: '#f1f5f9', border: 'none', borderRadius: '10px', padding: '12px', fontWeight: '600', cursor: 'pointer', color: '#64748b' }}>Cancel</button>
              <button onClick={send} disabled={sending} style={{ flex: 2, background: '#0a66c2', border: 'none', borderRadius: '10px', padding: '12px', fontWeight: '700', cursor: 'pointer', color: '#fff', opacity: sending ? 0.7 : 1 }}>
                {sending ? 'Sending...' : 'Send Message'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
