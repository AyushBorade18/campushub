'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const NAV = [
  { href: '/dashboard',   icon: '⊞',  label: 'Dashboard'      },
  { href: '/marketplace', icon: '🛍',  label: 'Marketplace'    },
  { href: '/community',   icon: '💬',  label: 'Community'      },
  { href: '/chatbot',     icon: '🤖',  label: 'AI Assistant'   },
  { href: '/messages',    icon: '✉️',  label: 'Messages'       },
  { href: '/profile',     icon: '👤',  label: 'Profile'        },
]

type Props = { collapsed: boolean; setCollapsed: (v: boolean) => void; userName: string; userYear: string }

export default function Sidebar({ collapsed, setCollapsed, userName, userYear }: Props) {
  const path = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const initials = userName ? userName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() : 'ST'

  return (
    <aside style={{
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

      {/* Logo */}
      <div style={{ padding: '20px 14px 16px', display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid rgba(255,255,255,0.08)', minHeight: '64px' }}>
        <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>🎓</div>
        {!collapsed && <span style={{ color: '#fff', fontWeight: '800', fontSize: '17px', whiteSpace: 'nowrap' }}>CampusHub</span>}
      </div>

      {/* Nav Items */}
      <nav style={{ flex: 1, padding: '12px 8px' }}>
        {NAV.map(item => {
          const active = path === item.href
          return (
            <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
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
                {!collapsed && <span style={{ fontSize: '13.5px', fontWeight: '600', whiteSpace: 'nowrap' }}>{item.label}</span>}
              </div>
            </Link>
          )
        })}
      </nav>

      {/* User info + collapse toggle */}
      <div style={{ padding: '12px 8px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        {!collapsed && (
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

        <button onClick={() => setCollapsed(!collapsed)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start', gap: '8px', padding: '8px 10px', borderRadius: '10px', border: 'none', cursor: 'pointer', background: 'transparent', color: '#64748b', fontSize: '13px', marginBottom: '4px' }}>
          <span style={{ fontSize: '16px' }}>{collapsed ? '→' : '←'}</span>
          {!collapsed && <span>Collapse</span>}
        </button>

        <button onClick={handleLogout} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start', gap: '8px', padding: '8px 10px', borderRadius: '10px', border: 'none', cursor: 'pointer', background: 'transparent', color: '#ef4444', fontSize: '13px' }}>
          <span style={{ fontSize: '16px' }}>🚪</span>
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  )
}
