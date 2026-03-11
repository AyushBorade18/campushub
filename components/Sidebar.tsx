'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useState, useEffect } from 'react'

const NAV = [
  { href: '/dashboard',   icon: '⊞',  label: 'Dashboard'      },
  { href: '/timetable',   icon: '📅',  label: 'Timetable'      },
  { href: '/marketplace', icon: '🛍',  label: 'Marketplace'    },
  { href: '/notes',       icon: '📚',  label: 'Notes'          },
  { href: '/community',   icon: '💬',  label: 'Community'      },
  { href: '/chatbot',     icon: '🤖',  label: 'AI Assistant'   },
  { href: '/messages',    icon: '✉️',  label: 'Messages'       },
  { href: '/profile',     icon: '👤',  label: 'Profile'        },
]

type Props = { collapsed: boolean; setCollapsed: (v: boolean) => void; userName: string; userYear: string; mobileOpen: boolean; setMobileOpen: (v: boolean) => void }

export default function Sidebar({ collapsed, setCollapsed, userName, userYear, mobileOpen, setMobileOpen }: Props) {
  const path = usePathname()
  const router = useRouter()
  const [unreadMessages, setUnreadMessages] = useState(0)

  useEffect(() => {
    const loadUnread = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('type', 'message')
        .eq('read', false)
      setUnreadMessages(count || 0)
    }
    loadUnread()

    // Realtime — update badge instantly
    const setup = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const channel = supabase
        .channel('sidebar-unread-' + user.id)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
          () => loadUnread()
        ).subscribe()
      return () => supabase.removeChannel(channel)
    }
    setup()
  }, [path]) // re-check when navigating (clears when user visits /messages)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const initials = userName ? userName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() : 'ST'

  const sidebarContent = (isMobile: boolean) => (
    <>
      {/* Logo */}
      <div style={{ padding: '20px 14px 16px', display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid rgba(255,255,255,0.08)', minHeight: '64px' }}>
        <Link href="/dashboard" onClick={() => isMobile && setMobileOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', flex: 1 }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>🎓</div>
          {(!collapsed || isMobile) && <span style={{ color: '#fff', fontWeight: '800', fontSize: '17px', whiteSpace: 'nowrap' }}>CampusHub</span>}
        </Link>
        {isMobile && (
          <button onClick={() => setMobileOpen(false)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#94a3b8', fontSize: '20px', cursor: 'pointer' }}>✕</button>
        )}
      </div>

      {/* Nav Items */}
      <nav style={{ flex: 1, padding: '12px 8px' }}>
        {NAV.map(item => {
          const active = path === item.href
          return (
            <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }} onClick={() => isMobile && setMobileOpen(false)}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '10px 10px', borderRadius: '10px',
                marginBottom: '4px',
                background: active ? 'linear-gradient(90deg, #6366f1, #8b5cf6)' : 'transparent',
                color: active ? '#fff' : '#94a3b8',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}>
                <span style={{ fontSize: '18px', flexShrink: 0, width: '24px', textAlign: 'center' }}>{item.icon}</span>
                {(!collapsed || isMobile) && (
                  <span style={{ fontSize: '13.5px', fontWeight: '600', whiteSpace: 'nowrap', flex: 1 }}>{item.label}</span>
                )}
                {/* Unread badge on Messages */}
                {item.href === '/messages' && unreadMessages > 0 && (!collapsed || isMobile) && (
                  <span style={{
                    background: active ? 'rgba(255,255,255,0.3)' : '#ef4444',
                    color: '#fff', borderRadius: '999px',
                    fontSize: '10px', fontWeight: '800',
                    minWidth: '18px', height: '18px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '0 5px', lineHeight: 1,
                  }}>
                    {unreadMessages > 99 ? '99+' : unreadMessages}
                  </span>
                )}
                {/* Collapsed badge */}
                {item.href === '/messages' && unreadMessages > 0 && collapsed && !isMobile && (
                  <span style={{
                    position: 'absolute', top: '2px', right: '2px',
                    background: '#ef4444', color: '#fff', borderRadius: '50%',
                    fontSize: '9px', fontWeight: '800', width: '14px', height: '14px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {unreadMessages > 9 ? '9+' : unreadMessages}
                  </span>
                )}
              </div>
            </Link>
          )
        })}
      </nav>

      {/* User info + collapse toggle */}
      <div style={{ padding: '12px 8px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        {(!collapsed || isMobile) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', marginBottom: '8px' }}>
            <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', color: '#fff', flexShrink: 0 }}>
              {initials}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ color: '#fff', fontSize: '12.5px', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{userName || 'Student'}</div>
              <div style={{ color: '#6366f1', fontSize: '11px' }}>VIT Pune · {userYear || '1st Year'}</div>
            </div>
          </div>
        )}

        {!isMobile && (
          <button onClick={() => setCollapsed(!collapsed)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start', gap: '8px', padding: '8px 10px', borderRadius: '10px', border: 'none', cursor: 'pointer', background: 'transparent', color: '#64748b', fontSize: '13px', marginBottom: '4px' }}>
            <span style={{ fontSize: '16px' }}>{collapsed ? '→' : '←'}</span>
            {!collapsed && <span>Collapse</span>}
          </button>
        )}

        <button onClick={handleLogout} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: (collapsed && !isMobile) ? 'center' : 'flex-start', gap: '8px', padding: '8px 10px', borderRadius: '10px', border: 'none', cursor: 'pointer', background: 'transparent', color: '#ef4444', fontSize: '13px' }}>
          <span style={{ fontSize: '16px' }}>🚪</span>
          {(!collapsed || isMobile) && <span>Logout</span>}
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="desktop-sidebar" style={{
        width: collapsed ? '60px' : '220px',
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #0f172a 0%, #1e1b4b 100%)',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        top: 0, left: 0,
        zIndex: 100,
        transition: 'width 0.25s cubic-bezier(0.4,0,0.2,1)',
        overflow: 'hidden',
        boxShadow: '4px 0 24px rgba(0,0,0,0.2)',
      }}>
        {sidebarContent(false)}
      </aside>

      {/* Mobile sidebar */}
      <aside className="mobile-sidebar" style={{
        width: '240px',
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #0f172a 0%, #1e1b4b 100%)',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        top: 0, left: mobileOpen ? 0 : '-240px',
        zIndex: 101,
        transition: 'left 0.25s cubic-bezier(0.4,0,0.2,1)',
        overflow: 'hidden',
        boxShadow: '4px 0 24px rgba(0,0,0,0.3)',
      }}>
        {sidebarContent(true)}
      </aside>

      <style>{`
        @media (max-width: 768px) {
          .desktop-sidebar { display: none !important; }
        }
        @media (min-width: 769px) {
          .mobile-sidebar { display: none !important; }
        }
      `}</style>
    </>
  )
}
