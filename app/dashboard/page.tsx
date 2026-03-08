'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import MainLayout from '@/components/MainLayout'
import { supabase } from '@/lib/supabase'

export default function DashboardPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [stats, setStats] = useState({ listings: 0, lost: 0, messages: 0 })
  const [recentListings, setRecentListings] = useState<any[]>([])

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(p)
      const { count: listingCount } = await supabase.from('listings').select('*', { count: 'exact', head: true }).eq('status', 'active')
      const { count: lostCount } = await supabase.from('listings').select('*', { count: 'exact', head: true }).eq('type', 'lost').eq('status', 'active')
      const { data: recent } = await supabase.from('listings').select('*, profiles(full_name)').eq('status', 'active').order('created_at', { ascending: false }).limit(4)
      setStats({ listings: listingCount || 0, lost: lostCount || 0, messages: 0 })
      setRecentListings(recent || [])
    }
    load()
  }, [])

  const typeColor: Record<string, string> = { sell: '#10b981', buy: '#3b82f6', borrow: '#f59e0b', lost: '#ef4444', found: '#8b5cf6' }
  const typeBg: Record<string, string> = { sell: '#d1fae5', buy: '#dbeafe', borrow: '#fef3c7', lost: '#fee2e2', found: '#ede9fe' }
  const typeLabel: Record<string, string> = { sell: 'For Sale', buy: 'Wanted', borrow: 'Borrow/Lend', lost: 'Lost', found: 'Found' }

  return (
    <MainLayout>
      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%)', borderRadius: '20px', padding: '28px 32px', marginBottom: '24px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '160px', height: '160px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
        <div style={{ fontSize: '13px', color: '#e0e7ff', marginBottom: '6px' }}>Good morning, 👋</div>
        <div style={{ fontSize: '26px', fontWeight: '800', color: '#fff', marginBottom: '4px' }}>{profile?.full_name || 'Student'}</div>
        <div style={{ fontSize: '13px', color: '#c7d2fe' }}>VIT Pune · {profile?.major || 'Engineering'} · {profile?.year || '1st Year'}</div>
        <div style={{ marginTop: '18px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <Link href="/marketplace" style={{ background: '#fff', color: '#6366f1', borderRadius: '10px', padding: '8px 18px', fontWeight: '700', fontSize: '13px', textDecoration: 'none' }}>Browse Marketplace</Link>
          <Link href="/community" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '10px', padding: '8px 18px', fontWeight: '700', fontSize: '13px', textDecoration: 'none' }}>Community Hub</Link>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px', marginBottom: '24px' }}>
        {[
          { label: 'Active Listings', value: stats.listings, icon: '🛍', color: '#6366f1', bg: '#e0e7ff' },
          { label: 'Lost Items', value: stats.lost, icon: '🔍', color: '#ef4444', bg: '#fee2e2' },
          { label: 'Channels', value: 5, icon: '💬', color: '#10b981', bg: '#d1fae5' },
          { label: 'AI Assistant', value: '24/7', icon: '🤖', color: '#8b5cf6', bg: '#ede9fe' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', borderRadius: '14px', padding: '18px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', marginBottom: '12px' }}>{s.icon}</div>
            <div style={{ fontSize: '26px', fontWeight: '800', color: '#0f172a' }}>{s.value}</div>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div style={{ background: '#fff', borderRadius: '16px', padding: '20px 24px', marginBottom: '20px', border: '1px solid #f1f5f9' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: '700' }}>Quick Actions</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
          {[
            { href: '/marketplace?tab=sell', label: 'Sell Item', icon: '💰', color: '#10b981', bg: '#d1fae5' },
            { href: '/marketplace?tab=borrow', label: 'Borrow/Lend', icon: '🔄', color: '#f59e0b', bg: '#fef3c7' },
            { href: '/marketplace?tab=lost', label: 'Report Lost', icon: '🔍', color: '#ef4444', bg: '#fee2e2' },
            { href: '/community', label: 'Join Chat', icon: '💬', color: '#6366f1', bg: '#e0e7ff' },
            { href: '/chatbot', label: 'Ask AI Bot', icon: '🤖', color: '#8b5cf6', bg: '#ede9fe' },
          ].map(a => (
            <Link key={a.href} href={a.href} style={{ textDecoration: 'none' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px 10px', borderRadius: '12px', border: '1.5px solid #f1f5f9', cursor: 'pointer', transition: 'all 0.15s', background: '#fafafa' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: a.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', marginBottom: '8px' }}>{a.icon}</div>
                <span style={{ fontSize: '12px', fontWeight: '600', color: '#374151', textAlign: 'center' }}>{a.label}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Listings */}
      <div style={{ background: '#fff', borderRadius: '16px', padding: '20px 24px', border: '1px solid #f1f5f9' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700' }}>Recent Marketplace Activity</h3>
          <Link href="/marketplace" style={{ color: '#6366f1', fontWeight: '600', fontSize: '13px', textDecoration: 'none' }}>View All →</Link>
        </div>
        {recentListings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
            <div style={{ fontSize: '40px', marginBottom: '8px' }}>🛍</div>
            <div>No listings yet. Be the first to post!</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
            {recentListings.map((item: any) => (
              <div key={item.id} style={{ border: '1px solid #f1f5f9', borderRadius: '12px', padding: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ background: typeBg[item.type] || '#f1f5f9', color: typeColor[item.type] || '#64748b', borderRadius: '6px', padding: '2px 8px', fontSize: '10px', fontWeight: '700' }}>{typeLabel[item.type] || item.type}</span>
                </div>
                <div style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a', marginBottom: '4px', lineHeight: '1.4' }}>{item.title}</div>
                {item.price > 0 && <div style={{ fontSize: '14px', fontWeight: '800', color: '#6366f1' }}>₹{item.price?.toLocaleString()}</div>}
                {item.price === 0 && <div style={{ fontSize: '13px', fontWeight: '700', color: '#10b981' }}>Free</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  )
}
