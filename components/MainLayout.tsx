'use client'
import { useState, useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Sidebar from './Sidebar'

export default function MainLayout({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const [userName, setUserName] = useState('')
  const [userYear, setUserYear] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if user is logged in
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.push('/auth/login')
        return
      }
      // Fetch profile info for sidebar
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

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} userName={userName} userYear={userYear} />
      <main style={{ marginLeft: `${sidebarW}px`, flex: 1, padding: '24px 28px', transition: 'margin-left 0.25s cubic-bezier(0.4,0,0.2,1)', background: '#f8fafc', minHeight: '100vh' }}>
        {/* Top bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div style={{ fontSize: '13px', color: '#94a3b8' }}>
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: '#fff', border: '1px solid #f1f5f9', borderRadius: '10px', padding: '7px 14px', fontSize: '13px', fontWeight: '600', color: '#0f172a', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
              👋 {userName || 'Student'}
            </div>
          </div>
        </div>
        {children}
      </main>
    </div>
  )
}
