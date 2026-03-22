'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function Home() {
  const router = useRouter()
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.push('/dashboard')
      else router.push('/auth/login')
    })
  }, [router])
  return (
  <div style={{ minHeight: '100vh', background: '#F9FAFB', display: 'flex', flexDirection: 'column' }}>
    <div style={{ height: '64px', background: '#fff', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', padding: '0 20px', gap: '12px' }}>
      <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#E5E7EB', animation: 'pulse 1.5s ease-in-out infinite' }} />
      <div style={{ width: '120px', height: '14px', borderRadius: '6px', background: '#E5E7EB', animation: 'pulse 1.5s ease-in-out infinite' }} />
    </div>
    <div style={{ flex: 1, padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ height: '120px', borderRadius: '12px', background: '#E5E7EB', animation: 'pulse 1.5s ease-in-out infinite' }} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        {[1,2,3,4].map(i => (
          <div key={i} style={{ height: '80px', borderRadius: '12px', background: '#E5E7EB', animation: `pulse 1.5s ease-in-out ${i * 0.15}s infinite` }} />
        ))}
      </div>
    </div>
    <style>{"@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }"}</style>
  </div>
)
}