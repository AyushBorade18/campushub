'use client'
import { useState, useEffect, useRef } from 'react'
import MainLayout from '@/components/MainLayout'
import { supabase } from '@/lib/supabase'

function formatTime(dateStr: string) {
  const d = new Date(dateStr)
  const now = new Date()
  const diff = Math.floor((now.getTime() - d.getTime()) / 86400000)
  if (diff === 0) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  if (diff === 1) return 'Yesterday'
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

export default function MessagesPage() {
  const [conversations, setConversations] = useState<any[]>([])
  const [activeConv, setActiveConv] = useState<any>(null)
  const [convMessages, setConvMessages] = useState<any[]>([])
  const [input, setInput] = useState('')
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [hoveredMsg, setHoveredMsg] = useState<string | null>(null)
  const [unsentMsgIds, setUnsentMsgIds] = useState<Set<string>>(new Set())
  const [hiddenConvIds, setHiddenConvIds] = useState<Set<string>>(new Set())
  const [showDeleteChatConfirm, setShowDeleteChatConfirm] = useState(false)
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list')
  const bottomRef = useRef<HTMLDivElement>(null)

  // LocalStorage keys per user
  const unsentKey = (uid: string) => `campushub_unsent_${uid}`
  const hiddenKey = (uid: string) => `campushub_hidden_convs_${uid}`

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUser(user)
      if (user) {
        // Load per-user deleted data from localStorage
        const unsent = JSON.parse(localStorage.getItem(unsentKey(user.id)) || '[]')
        const hidden = JSON.parse(localStorage.getItem(hiddenKey(user.id)) || '[]')
        setUnsentMsgIds(new Set(unsent))
        setHiddenConvIds(new Set(hidden))
        loadConversations(user.id, new Set(hidden))
      }
    }
    init()
  }, [])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [convMessages])

  useEffect(() => {
    if (!activeConv || !currentUser) return
    loadMessages(activeConv)
    const otherId = activeConv.other_user_id
    const sub = supabase.channel(`dm-${currentUser.id}-${otherId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'direct_messages' }, async (payload: any) => {
        const isRelevant = (payload.new.sender_id === currentUser.id && payload.new.receiver_id === otherId) || (payload.new.sender_id === otherId && payload.new.receiver_id === currentUser.id)
        if (isRelevant) {
          const { data } = await supabase.from('direct_messages').select('*, sender:profiles!direct_messages_sender_id_fkey(full_name), listing:listings(title,price)').eq('id', payload.new.id).single()
          if (data) setConvMessages(prev => [...prev, data])
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(sub) }
  }, [activeConv, currentUser])

  const loadConversations = async (userId: string, hiddenIds?: Set<string>) => {
    setLoading(true)
    const hidden = hiddenIds || hiddenConvIds
    const { data: sent } = await supabase.from('direct_messages').select('*, receiver:profiles!direct_messages_receiver_id_fkey(id, full_name), listing:listings(title)').eq('sender_id', userId).order('created_at', { ascending: false })
    const { data: received } = await supabase.from('direct_messages').select('*, sender:profiles!direct_messages_sender_id_fkey(id, full_name), listing:listings(title)').eq('receiver_id', userId).order('created_at', { ascending: false })

    const convMap = new Map()
    ;[...(sent || []), ...(received || [])].forEach((msg: any) => {
      const otherId = msg.sender_id === userId ? msg.receiver_id : msg.sender_id
      const otherName = msg.sender_id === userId ? msg.receiver?.full_name : msg.sender?.full_name
      if (!convMap.has(otherId) || new Date(msg.created_at) > new Date(convMap.get(otherId).last_time)) {
        convMap.set(otherId, { other_user_id: otherId, other_name: otherName || 'Student', last_msg: msg.content, last_time: msg.created_at, listing: msg.listing })
      }
    })
    // Filter out conversations hidden by this user
    const all = Array.from(convMap.values()).sort((a, b) => new Date(b.last_time).getTime() - new Date(a.last_time).getTime())
    setConversations(all.filter(c => !hidden.has(c.other_user_id)))
    setLoading(false)
  }

  const loadMessages = async (conv: any) => {
    const { data } = await supabase.from('direct_messages')
      .select('*, sender:profiles!direct_messages_sender_id_fkey(full_name), listing:listings(title,price)')
      .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${conv.other_user_id}),and(sender_id.eq.${conv.other_user_id},receiver_id.eq.${currentUser.id})`)
      .order('created_at', { ascending: true })
    setConvMessages(data || [])
    await supabase.from('direct_messages').update({ is_read: true }).eq('receiver_id', currentUser.id).eq('sender_id', conv.other_user_id)
  }

  const sendMessage = async () => {
    if (!input.trim() || !activeConv || !currentUser) return
    const text = input.trim()
    setInput('')
    await supabase.from('direct_messages').insert({ sender_id: currentUser.id, receiver_id: activeConv.other_user_id, content: text })
    loadConversations(currentUser.id)
  }

  // Unsend a message — hides it only for current user using localStorage
  const unsendMessage = (msgId: string) => {
    if (!currentUser) return
    if (!confirm('Unsend this message? It will be removed from your view only.')) return
    const updated = new Set(unsentMsgIds)
    updated.add(msgId)
    setUnsentMsgIds(updated)
    localStorage.setItem(unsentKey(currentUser.id), JSON.stringify(Array.from(updated)))
    setHoveredMsg(null)
  }

  // Delete full chat — hides conversation only for current user
  const deleteChat = () => {
    if (!currentUser || !activeConv) return
    const updated = new Set(hiddenConvIds)
    updated.add(activeConv.other_user_id)
    setHiddenConvIds(updated)
    localStorage.setItem(hiddenKey(currentUser.id), JSON.stringify(Array.from(updated)))
    setConversations(prev => prev.filter(c => c.other_user_id !== activeConv.other_user_id))
    setActiveConv(null)
    setConvMessages([])
    setShowDeleteChatConfirm(false)
  }

  const initials = (name: string) => name ? name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'ST'
  const avatarColor = (name: string) => { const c = ['#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6']; return c[(name?.charCodeAt(0) || 0) % c.length] }

  // Filter out unsent messages from view
  const visibleMessages = convMessages.filter(m => !unsentMsgIds.has(m.id))

  return (
    <MainLayout>
      <div style={{ marginBottom: '16px' }}>
        <h2 style={{ margin: 0, fontSize: '22px', fontWeight: '800', color: '#0f172a' }}>Messages</h2>
        <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '13px' }}>Direct messages from marketplace & community</p>
      </div>

      <div className="messages-container" style={{ display: 'grid', gridTemplateColumns: '300px 1fr', background: '#fff', borderRadius: '16px', border: '1px solid #f1f5f9', overflow: 'hidden', height: 'calc(100vh - 155px)', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
        {/* Conversation List */}
        <div className="conv-list" style={{ borderRight: '1px solid #f1f5f9', overflowY: 'auto', background: '#f8fafc' }}>
          <div style={{ padding: '16px', borderBottom: '1px solid #f1f5f9' }}>
            <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>Conversations</div>
          </div>
          {loading ? (
            <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>Loading...</div>
          ) : conversations.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: '#94a3b8' }}>
              <div style={{ fontSize: '36px', marginBottom: '8px' }}>✉️</div>
              <div style={{ fontWeight: '600', marginBottom: '4px' }}>No messages yet</div>
              <div style={{ fontSize: '12px' }}>Message a seller from the Marketplace!</div>
            </div>
          ) : (
            conversations.map(conv => (
              <button key={conv.other_user_id} onClick={() => { setActiveConv(conv); loadMessages(conv); setMobileView('chat') }}
                style={{ width: '100%', display: 'flex', gap: '12px', padding: '14px 16px', border: 'none', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', background: activeConv?.other_user_id === conv.other_user_id ? '#e0e7ff' : '#fff', textAlign: 'left', alignItems: 'flex-start', transition: 'background 0.1s' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: avatarColor(conv.other_name), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', fontWeight: '700', color: '#fff', flexShrink: 0 }}>{initials(conv.other_name)}</div>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                    <span style={{ fontWeight: '700', fontSize: '14px', color: '#0f172a' }}>{conv.other_name}</span>
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>{formatTime(conv.last_time)}</span>
                  </div>
                  {conv.listing && <div style={{ fontSize: '11px', color: '#6366f1', fontWeight: '600', marginBottom: '2px' }}>Re: {conv.listing.title}</div>}
                  <div style={{ fontSize: '12px', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{conv.last_msg}</div>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Chat Window */}
        {!activeConv ? (
          <div className="chat-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', gap: '12px' }}>
            <div style={{ fontSize: '56px' }}>💬</div>
            <div style={{ fontWeight: '700', fontSize: '18px', color: '#475569' }}>Select a conversation</div>
            <div style={{ fontSize: '13px' }}>Or message someone from the Marketplace</div>
          </div>
        ) : (
          <div className="chat-panel" style={{ display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button className="back-btn" onClick={() => setMobileView('list')} style={{ display: 'none', background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: '#6366f1', padding: '0', marginRight: '4px' }}>←</button>
              <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: avatarColor(activeConv.other_name), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '700', color: '#fff' }}>{initials(activeConv.other_name)}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '700', color: '#0f172a' }}>{activeConv.other_name}</div>
                {activeConv.listing && <div style={{ fontSize: '12px', color: '#6366f1', fontWeight: '600' }}>Re: {activeConv.listing.title}</div>}
              </div>
              {/* Delete Chat Button */}
              <button onClick={() => setShowDeleteChatConfirm(true)}
                title="Delete this chat for you only"
                style={{ background: '#fff0f0', border: '1px solid #fecaca', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '4px' }}>
                🗑 Delete Chat
              </button>
            </div>

            {/* Delete Chat Confirm Modal */}
            {showDeleteChatConfirm && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                <div style={{ background: '#fff', borderRadius: '16px', padding: '28px', maxWidth: '360px', width: '100%', textAlign: 'center' }}>
                  <div style={{ fontSize: '40px', marginBottom: '12px' }}>🗑️</div>
                  <div style={{ fontWeight: '800', fontSize: '17px', color: '#0f172a', marginBottom: '8px' }}>Delete this chat?</div>
                  <div style={{ color: '#64748b', fontSize: '13px', marginBottom: '20px', lineHeight: '1.6' }}>
                    This will remove the conversation from <strong>your view only</strong>.<br />
                    The other person will still see their messages.
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => setShowDeleteChatConfirm(false)} style={{ flex: 1, background: '#f1f5f9', border: 'none', borderRadius: '10px', padding: '11px', fontWeight: '600', cursor: 'pointer', color: '#64748b' }}>Cancel</button>
                    <button onClick={deleteChat} style={{ flex: 1, background: '#ef4444', border: 'none', borderRadius: '10px', padding: '11px', fontWeight: '700', cursor: 'pointer', color: '#fff' }}>Delete for Me</button>
                  </div>
                </div>
              </div>
            )}

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px', background: '#fafbff' }}>
              {visibleMessages.map((msg: any) => {
                const isMe = msg.sender_id === currentUser?.id
                const isHovered = hoveredMsg === msg.id
                return (
                  <div key={msg.id}
                    style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', alignItems: 'flex-end', gap: '8px' }}
                    onMouseEnter={() => setHoveredMsg(msg.id)}
                    onMouseLeave={() => setHoveredMsg(null)}>
                    {!isMe && <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: avatarColor(activeConv.other_name), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700', color: '#fff', flexShrink: 0 }}>{initials(activeConv.other_name)}</div>}

                    <div style={{ maxWidth: '65%', display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexDirection: isMe ? 'row' : 'row-reverse' }}>
                        {/* Unsend button — only for your own messages, shows on hover */}
                        {isMe && isHovered && (
                          <button onClick={() => unsendMessage(msg.id)}
                            title="Unsend for me only"
                            style={{ background: '#fee2e2', border: 'none', borderRadius: '6px', padding: '3px 7px', cursor: 'pointer', fontSize: '11px', fontWeight: '600', color: '#ef4444', whiteSpace: 'nowrap', flexShrink: 0 }}>
                            🗑 Unsend
                          </button>
                        )}
                        <div style={{ padding: '10px 14px', borderRadius: isMe ? '16px 4px 16px 16px' : '4px 16px 16px 16px', background: isMe ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : '#fff', color: isMe ? '#fff' : '#374151', fontSize: '13.5px', boxShadow: '0 2px 4px rgba(0,0,0,0.06)', border: !isMe ? '1px solid #f1f5f9' : 'none' }}>{msg.content}</div>
                      </div>
                      <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '3px', textAlign: isMe ? 'right' : 'left' }}>{formatTime(msg.created_at)}</div>
                    </div>

                    {isMe && <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700', color: '#fff', flexShrink: 0 }}>ME</div>}
                  </div>
                )
              })}
              {visibleMessages.length === 0 && (
                <div style={{ textAlign: 'center', color: '#94a3b8', padding: '40px 0', fontSize: '13px' }}>No messages in this conversation</div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div style={{ padding: '12px 16px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '8px' }}>
              <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} placeholder="Type a message..."
                style={{ flex: 1, padding: '10px 14px', borderRadius: '12px', border: '1.5px solid #e2e8f0', fontSize: '13px', outline: 'none' }} />
              <button onClick={sendMessage} disabled={!input.trim()} style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: 'none', borderRadius: '12px', padding: '10px 16px', cursor: 'pointer', color: '#fff', fontSize: '18px', opacity: !input.trim() ? 0.5 : 1 }}>➤</button>
            </div>
          </div>
        )}
      </div>
          <style>{`
        @media (max-width: 768px) {
          .messages-container { grid-template-columns: 1fr !important; height: auto !important; }
          .conv-list { display: ${"{mobileView === 'list' ? 'block' : 'none'}"} !important; }
          .chat-panel { display: ${"{mobileView === 'chat' ? 'flex' : 'none'}"} !important; min-height: calc(100vh - 180px); }
          .back-btn { display: flex !important; }
        }
        @media (min-width: 769px) {
          .conv-list { display: block !important; }
          .chat-panel { display: flex !important; }
          .back-btn { display: none !important; }
        }
      `}</style>
    </MainLayout>
  )
}
