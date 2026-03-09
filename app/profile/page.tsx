'use client'
import { useState, useEffect } from 'react'
import MainLayout from '@/components/MainLayout'
import { supabase } from '@/lib/supabase'

const TYPE_COLOR: Record<string, string> = { sell: '#10b981', buy: '#3b82f6', borrow: '#f59e0b', lost: '#ef4444', found: '#8b5cf6' }
const TYPE_BG: Record<string, string> = { sell: '#d1fae5', buy: '#dbeafe', borrow: '#fef3c7', lost: '#fee2e2', found: '#ede9fe' }
const TYPE_LABEL: Record<string, string> = { sell: 'For Sale', buy: 'Wanted', borrow: 'Borrow/Lend', lost: 'Lost', found: 'Found' }

export default function ProfilePage() {
  const [profile, setProfile] = useState<any>(null)
  const [myListings, setMyListings] = useState<any[]>([])
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<any>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(p)
      setForm(p || {})
      const { data: listings } = await supabase.from('listings').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
      setMyListings(listings || [])
    }
    load()
  }, [])

  const saveProfile = async () => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('profiles').update({ full_name: form.full_name, major: form.major, year: form.year }).eq('id', user.id)
    setProfile(form)
    setSaving(false)
    setEditing(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const deleteListing = async (id: string) => {
    if (!confirm('Delete this listing?')) return
    await supabase.from('listings').delete().eq('id', id)
    setMyListings(prev => prev.filter(l => l.id !== id))
  }

  const initials = profile?.full_name ? profile.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() : 'ST'

  return (
    <MainLayout>
      <div style={{ maxWidth: '720px', margin: '0 auto' }}>
        {/* Profile Hero */}
        <div className='profile-hero' style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', borderRadius: '20px', padding: '28px 28px 0', marginBottom: '20px', overflow: 'hidden', position: 'relative' }}>
          <div style={{ position: 'absolute', top: '-30px', right: '-30px', width: '140px', height: '140px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
          <div className='profile-hero-inner' style={{ display: 'flex', gap: '20px', alignItems: 'flex-end' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', border: '3px solid rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: '800', color: '#fff', flexShrink: 0 }}>{initials}</div>
            <div style={{ flex: 1, paddingBottom: '24px' }}>
              <h2 style={{ margin: 0, color: '#fff', fontSize: '22px', fontWeight: '800' }}>{profile?.full_name || 'Student'}</h2>
              <div style={{ color: '#c7d2fe', fontSize: '13px', marginTop: '3px' }}>{profile?.college_email}</div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                {['VIT Pune', profile?.major, profile?.year].filter(Boolean).map(v => (
                  <span key={v} style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', borderRadius: '6px', padding: '3px 10px', fontSize: '12px', fontWeight: '600' }}>{v}</span>
                ))}
              </div>
            </div>
            <div style={{ paddingBottom: '24px' }}>
              <button onClick={() => editing ? saveProfile() : setEditing(true)} disabled={saving}
                style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '10px', padding: '8px 16px', color: '#fff', fontWeight: '700', cursor: 'pointer', fontSize: '13px' }}>
                {saving ? 'Saving...' : editing ? '💾 Save' : '✏️ Edit Profile'}
              </button>
            </div>
          </div>
        </div>

        {saved && (
          <div style={{ background: '#d1fae5', color: '#10b981', padding: '12px 16px', borderRadius: '12px', marginBottom: '16px', fontWeight: '600', fontSize: '13px' }}>✅ Profile saved successfully!</div>
        )}

        {/* Edit Form */}
        {editing && (
          <div style={{ background: '#fff', borderRadius: '16px', padding: '24px', marginBottom: '20px', border: '1px solid #f1f5f9', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: '700' }}>Edit Your Profile</h3>
            <div className='form-grid' style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {[['Full Name', 'full_name'], ['Branch / Major', 'major']].map(([label, key]) => (
                <div key={key}>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '4px', display: 'block' }}>{label}</label>
                  <input value={form[key] || ''} onChange={e => setForm((f: any) => ({ ...f, [key]: e.target.value }))}
                    style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: '9px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
                </div>
              ))}
              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '4px', display: 'block' }}>Year</label>
                <select value={form.year || '1st Year'} onChange={e => setForm((f: any) => ({ ...f, year: e.target.value }))}
                  style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: '9px', fontSize: '13px', outline: 'none', background: '#fff', boxSizing: 'border-box' }}>
                  {['1st Year','2nd Year','3rd Year','4th Year'].map(y => <option key={y}>{y}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
              <button onClick={() => setEditing(false)} style={{ flex: 1, background: '#f1f5f9', border: 'none', borderRadius: '10px', padding: '10px', fontWeight: '600', cursor: 'pointer', color: '#64748b' }}>Cancel</button>
              <button onClick={saveProfile} disabled={saving} style={{ flex: 2, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: 'none', borderRadius: '10px', padding: '10px', fontWeight: '700', cursor: 'pointer', color: '#fff' }}>
                {saving ? 'Saving...' : '💾 Save Changes'}
              </button>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className='stats-grid' style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
          {[['Listings', myListings.filter(l => l.status === 'active').length, '#6366f1'], ['Total Posted', myListings.length, '#10b981'], ['Sold/Closed', myListings.filter(l => l.status !== 'active').length, '#f59e0b'], ['Year', profile?.year?.split(' ')[0] || '—', '#8b5cf6']].map(([l, v, c]: any) => (
            <div key={l} style={{ background: '#fff', borderRadius: '14px', padding: '16px', textAlign: 'center', border: '1px solid #f1f5f9' }}>
              <div style={{ fontSize: '24px', fontWeight: '800', color: c }}>{v}</div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>{l}</div>
            </div>
          ))}
        </div>

        {/* My Listings */}
        <div style={{ background: '#fff', borderRadius: '16px', padding: '20px 24px', border: '1px solid #f1f5f9' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>My Listings</h3>
          {myListings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
              <div style={{ fontSize: '40px', marginBottom: '8px' }}>📦</div>
              <div>You haven't posted anything yet.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {myListings.map(item => (
                <div key={item.id} className='listing-item' style={{ display: 'flex', gap: '14px', padding: '14px', border: '1px solid #f1f5f9', borderRadius: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: TYPE_BG[item.type] || '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
                    {item.category === 'Books' ? '📚' : item.category === 'Electronics' ? '💻' : item.category === 'Documents' ? '📄' : '📦'}
                  </div>
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{new Date(item.created_at).toLocaleDateString('en-IN')}</div>
                  </div>
                  <span style={{ background: TYPE_BG[item.type], color: TYPE_COLOR[item.type], borderRadius: '6px', padding: '3px 9px', fontSize: '11px', fontWeight: '700', whiteSpace: 'nowrap' }}>{TYPE_LABEL[item.type]}</span>
                  {item.price > 0 && <span style={{ fontWeight: '800', color: '#6366f1', whiteSpace: 'nowrap' }}>₹{item.price}</span>}
                  <span style={{ background: item.status === 'active' ? '#d1fae5' : '#f1f5f9', color: item.status === 'active' ? '#10b981' : '#94a3b8', borderRadius: '6px', padding: '3px 9px', fontSize: '11px', fontWeight: '700' }}>{item.status}</span>
                  <button onClick={() => deleteListing(item.id)} style={{ background: '#fee2e2', border: 'none', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer', color: '#ef4444', fontWeight: '600', fontSize: '12px' }}>Delete</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
          <style>{`
        @media (max-width: 768px) {
          .stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .form-grid { grid-template-columns: 1fr !important; }
          .profile-hero { padding: 20px 16px 0 !important; }
          .profile-hero-inner { flex-direction: column !important; align-items: flex-start !important; gap: 12px !important; }
          .listing-item { flex-wrap: wrap !important; gap: 8px !important; }
          .listing-item .listing-title { font-size: 13px !important; }
          .profile-edit-btn { margin-top: 0 !important; }
        }
      `}</style>
    </MainLayout>
  )
}
