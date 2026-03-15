'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const TYPE_ICON: Record<string, string> = {
  message: '💬',
  marketplace: '🛍',
  notes: '📚',
  community: '🗣',
}

function timeAgo(ts: string) {
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export default function NotificationBell({ userId }: { userId: string }) {
  const [notifs, setNotifs] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const unread = notifs.filter(n => !n.read).length

  useEffect(() => {
    if (!userId) return
    loadNotifs()

    // Realtime subscription — new notifications pop instantly
    const channel = supabase
      .channel('notifications-' + userId)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        setNotifs(prev => [payload.new, ...prev].slice(0, 50))
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId])

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  async function loadNotifs() {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)
    setNotifs(data || [])
  }

  async function markAllRead() {
    await supabase.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false)
    setNotifs(prev => prev.map(n => ({ ...n, read: true })))
  }

  async function markRead(id: string) {
    await supabase.from('notifications').update({ read: true }).eq('id', id)
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }

  async function clearAll() {
    await supabase.from('notifications').delete().eq('user_id', userId)
    setNotifs([])
  }

  async function handleClick(notif: any) {
    await markRead(notif.id)
    setOpen(false)
    router.push(notif.link || '/')
  }

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      {/* Bell Button */}
      <button
        onClick={() => { setOpen(o => !o); if (!open && unread > 0) {} }}
        style={{
          position: 'relative', background: open ? '#ede9fe' : '#fff',
          border: '1px solid #f1f5f9', borderRadius: '10px',
          padding: '7px 10px', cursor: 'pointer', fontSize: '18px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.05)', transition: 'all 0.15s',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
        title="Notifications"
      >
        🔔
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: '-5px', right: '-5px',
            background: '#ef4444', color: '#fff', borderRadius: '999px',
            fontSize: '10px', fontWeight: '800', minWidth: '18px', height: '18px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 4px', border: '2px solid #f8fafc', lineHeight: 1,
          }}>
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="notif-dropdown" style={{
          position: 'fixed', top: '70px', right: '10px',
          background: '#fff', borderRadius: '16px', width: 'min(340px, calc(100vw - 20px))',
          boxShadow: '0 8px 32px rgba(0,0,0,0.14)', border: '1px solid #f1f5f9',
          zIndex: 1000, overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: '800', fontSize: '15px', color: '#0f172a' }}>
              🔔 Notifications {unread > 0 && <span style={{ background: '#ef4444', color: '#fff', borderRadius: '8px', padding: '1px 7px', fontSize: '11px', marginLeft: '6px' }}>{unread} new</span>}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {unread > 0 && (
                <button onClick={markAllRead} style={{ background: '#ede9fe', color: '#6366f1', border: 'none', borderRadius: '7px', padding: '4px 10px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>
                  Mark all read
                </button>
              )}
              {notifs.length > 0 && (
                <button onClick={clearAll} style={{ background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '7px', padding: '4px 10px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>
                  Clear all
                </button>
              )}
            </div>
          </div>

          {/* Notification list */}
          <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
            {notifs.length === 0 ? (
              <div style={{ padding: '40px 16px', textAlign: 'center', color: '#94a3b8' }}>
                <div style={{ fontSize: '36px', marginBottom: '8px' }}>🔕</div>
                <div style={{ fontSize: '13px', fontWeight: '600' }}>No notifications yet</div>
              </div>
            ) : notifs.map(n => (
              <div
                key={n.id}
                onClick={() => handleClick(n)}
                style={{
                  display: 'flex', gap: '12px', padding: '12px 16px', cursor: 'pointer',
                  background: n.read ? '#fff' : '#f5f3ff',
                  borderBottom: '1px solid #f8fafc',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#f1f5f9')}
                onMouseLeave={e => (e.currentTarget.style.background = n.read ? '#fff' : '#f5f3ff')}
              >
                {/* Icon */}
                <div style={{
                  width: '38px', height: '38px', borderRadius: '10px', flexShrink: 0,
                  background: n.type === 'message' ? '#ede9fe' : n.type === 'marketplace' ? '#fef3c7' : n.type === 'notes' ? '#dbeafe' : '#d1fae5',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px',
                }}>
                  {TYPE_ICON[n.type] || '🔔'}
                </div>
                {/* Text */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: n.read ? '600' : '800', color: '#0f172a', marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.title}</div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '3px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } as any}>{n.body}</div>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>{timeAgo(n.created_at)}</div>
                </div>
                {/* Unread dot */}
                {!n.read && (
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#6366f1', flexShrink: 0, marginTop: '5px' }} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
