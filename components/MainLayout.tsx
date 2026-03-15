'use client'
import { useState, useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Sidebar from './Sidebar'
import NotificationBell from './NotificationBell'

export default function MainLayout({ children, noPadding }: { children: ReactNode, noPadding?: boolean }) {
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userName, setUserName] = useState('')
  const [userYear, setUserYear] = useState('')
  const [userId, setUserId] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.push('/auth/login')
        return
      }
      setUserId(data.session.user.id)
      supabase.from('profiles').select('full_name, year').eq('id', data.session.user.id).single()
        .then(({ data: profile }) => {
          if (profile) {
            setUserName(profile.full_name)
            setUserYear(profile.year)
          }
          setLoading(false)
        })
    })
  }, [router])

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
        <div style={{ textAlign: 'center', color: '#fff' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎓</div>
          <div style={{ fontSize: '18px', fontWeight: '700' }}>Loading CampusHub...</div>
        </div>
      </div>
    )
  }

  const sidebarW = collapsed ? 60 : 220
  const topBarH = 64

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {mobileOpen && (
        <div onClick={() => setMobileOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99 }} />
      )}

      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} userName={userName} userYear={userYear} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      <div style={{ marginLeft: `${sidebarW}px`, flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', transition: 'margin-left 0.25s cubic-bezier(0.4,0,0.2,1)', background: '#f8fafc' }} className="main-content">
        {/* Top bar */}
        <div style={{ height: `${topBarH}px`, flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 16px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button onClick={() => setMobileOpen(true)} className="hamburger-btn" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '24px', padding: '4px', display: 'none', color: '#0f172a' }}>☰</button>
            <div className="topbar-date" style={{ fontSize: '13px', color: '#94a3b8' }}>
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </div>
          <div className="topbar-right" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {userId && <NotificationBell userId={userId} />}
            <div className="topbar-greeting" style={{ background: '#fff', border: '1px solid #f1f5f9', borderRadius: '10px', padding: '7px 14px', fontSize: '13px', fontWeight: '600', color: '#0f172a', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
              👋 {userName || 'Student'}
            </div>
          </div>
        </div>

        {/* Page content */}
        <main style={{ flex: 1, overflow: noPadding ? 'hidden' : 'auto', padding: noPadding ? '0' : '24px 28px' }}>
          {children}
        </main>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .main-content { margin-left: 0 !important; }
          .hamburger-btn { display: flex !important; }
          .topbar-date { display: none !important; }
          .topbar-greeting { font-size: 12px !important; padding: 5px 10px !important; }
          .topbar-right { gap: 6px !important; }
          main { padding: 12px 14px !important; }
        }
      `}</style>
    </div>
  )
}
