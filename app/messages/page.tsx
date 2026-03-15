'use client'
export const dynamic = 'force-dynamic'
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
  const [unsentMsgIds, setUnsentMsgIds] = useState<Set<string>>(new Set())
  const [hiddenConvIds, setHiddenConvIds] = useState<Set<string>>(new Set())
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [mobileShowChat, setMobileShowChat] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const unsentKey = (uid: string) => `campushub_unsent_${uid}`
  const hiddenKey = (uid: string) => `campushub_hidden_convs_${uid}`

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUser(user)
      if (user) {
        const unsent = JSON.parse(localStorage.getItem(unsentKey(user.id)) || '[]')
        const hidden = JSON.parse(localStorage.getItem(hiddenKey(user.id)) || '[]')
        setUnsentMsgIds(new Set(unsent))
        setHiddenConvIds(new Set(hidden))
        loadConversations(user.id, new Set(hidden))
        supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('type', 'message').eq('read', false)
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
        const isRelevant =
          (payload.new.sender_id === currentUser.id && payload.new.receiver_id === otherId) ||
          (payload.new.sender_id === otherId && payload.new.receiver_id === currentUser.id)
        if (isRelevant) {
          const { data } = await supabase.from('direct_messages')
            .select('*, sender:profiles!direct_messages_sender_id_fkey(full_name), listing:listings(title,price)')
            .eq('id', payload.new.id).single()
          if (data) setConvMessages(prev => [...prev, data])
        }
      }).subscribe()
    return () => { supabase.removeChannel(sub) }
  }, [activeConv, currentUser])

  const loadConversations = async (userId: string, hiddenIds?: Set<string>) => {
    setLoading(true)
    const hidden = hiddenIds || hiddenConvIds
    const { data: sent } = await supabase.from('direct_messages')
      .select('*, receiver:profiles!direct_messages_receiver_id_fkey(id, full_name), listing:listings(title)')
      .eq('sender_id', userId).order('created_at', { ascending: false })
    const { data: received } = await supabase.from('direct_messages')
      .select('*, sender:profiles!direct_messages_sender_id_fkey(id, full_name), listing:listings(title)')
      .eq('receiver_id', userId).order('created_at', { ascending: false })
    const convMap = new Map()
    ;[...(sent || []), ...(received || [])].forEach((msg: any) => {
      const otherId = msg.sender_id === userId ? msg.receiver_id : msg.sender_id
      const otherName = msg.sender_id === userId ? msg.receiver?.full_name : msg.sender?.full_name
      if (!convMap.has(otherId) || new Date(msg.created_at) > new Date(convMap.get(otherId).last_time)) {
        convMap.set(otherId, { other_user_id: otherId, other_name: otherName || 'Student', last_msg: msg.content, last_time: msg.created_at, listing: msg.listing })
      }
    })
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

  const openConv = (conv: any) => {
    setActiveConv(conv)
    loadMessages(conv)
    if (isMobile) setMobileShowChat(true)
  }

  const goBack = () => { setMobileShowChat(false); setActiveConv(null) }

  const sendMessage = async () => {
    if (!input.trim() || !activeConv || !currentUser) return
    const text = input.trim()
    setInput('')
    await supabase.from('direct_messages').insert({ sender_id: currentUser.id, receiver_id: activeConv.other_user_id, content: text })
    loadConversations(currentUser.id)
  }

  const sendFile = async (file: File) => {
    if (!activeConv || !currentUser) return
    setUploading(true)
    const path = `messages/${currentUser.id}/${Date.now()}_${file.name}`
    const { data: uploadData, error } = await supabase.storage.from('message-files').upload(path, file)
    if (error || !uploadData) { alert('Upload failed'); setUploading(false); return }
    const { data: { publicUrl } } = supabase.storage.from('message-files').getPublicUrl(path)
    const icon = file.type.startsWith('image/') ? '🖼' : file.type.startsWith('video/') ? '🎥' : '📎'
    const content = `${icon}__FILE__${publicUrl}__NAME__${file.name}__TYPE__${file.type}`
    await supabase.from('direct_messages').insert({ sender_id: currentUser.id, receiver_id: activeConv.other_user_id, content })
    loadConversations(currentUser.id)
    setUploading(false)
  }

  const deleteForEveryone = async (msgId: string) => {
    if (!currentUser || !confirm('Delete for everyone? This cannot be undone.')) return
    await supabase.from('direct_messages').delete().eq('id', msgId).eq('sender_id', currentUser.id)
    setConvMessages(prev => prev.filter(m => m.id !== msgId))
    loadConversations(currentUser.id)
  }

  const deleteForMe = (msgId: string) => {
    if (!currentUser) return
    const updated = new Set(unsentMsgIds)
    updated.add(msgId)
    setUnsentMsgIds(updated)
    localStorage.setItem(unsentKey(currentUser.id), JSON.stringify(Array.from(updated)))
  }

  const [msgMenuId, setMsgMenuId] = useState<string | null>(null)

  const deleteChat = () => {
    if (!currentUser || !activeConv) return
    const updated = new Set(hiddenConvIds)
    updated.add(activeConv.other_user_id)
    setHiddenConvIds(updated)
    localStorage.setItem(hiddenKey(currentUser.id), JSON.stringify(Array.from(updated)))
    setConversations(prev => prev.filter(c => c.other_user_id !== activeConv.other_user_id))
    setActiveConv(null); setConvMessages([]); setShowDeleteConfirm(false)
    if (isMobile) setMobileShowChat(false)
  }

  const initials = (name: string) => name ? name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() : 'ST'
  const avatarColor = (name: string) => { const c = ['#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6']; return c[(name?.charCodeAt(0) || 0) % c.length] }
  const visibleMessages = convMessages.filter(m => !unsentMsgIds.has(m.id))
  const showList = !isMobile || !mobileShowChat
  const showChat = !isMobile || mobileShowChat

  return (
    <MainLayout>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        {(!isMobile || !mobileShowChat) && (
          <div style={{ marginBottom: '12px', flexShrink: 0 }}>
            <h2 style={{ margin: 0, fontSize: isMobile ? '20px' : '22px', fontWeight: '800', color: '#0f172a' }}>Messages</h2>
            <p style={{ margin: '2px 0 0', color: '#64748b', fontSize: '12px' }}>Direct messages from marketplace & community</p>
          </div>
        )}
        <div style={{ display: 'flex', flex: 1, minHeight: 0, borderRadius: '16px', border: '1px solid #f1f5f9', overflow: 'hidden', background: '#fff', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>

          {/* Conversation List */}
          {showList && (
            <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0, display: 'flex', flexDirection: 'column', borderRight: isMobile ? 'none' : '1px solid #f1f5f9', background: '#f8fafc', overflow: 'hidden' }}>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid #f1f5f9', flexShrink: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>💬 Conversations ({conversations.length})</div>
              </div>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {loading ? (
                  <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>Loading...</div>
                ) : conversations.length === 0 ? (
                  <div style={{ padding: '40px 20px', textAlign: 'center', color: '#94a3b8' }}>
                    <div style={{ fontSize: '36px', marginBottom: '8px' }}>✉️</div>
                    <div style={{ fontWeight: '600', marginBottom: '4px' }}>No messages yet</div>
                    <div style={{ fontSize: '12px' }}>Message a seller from the Marketplace!</div>
                  </div>
                ) : conversations.map(conv => (
                  <button key={conv.other_user_id} onClick={() => openConv(conv)}
                    style={{ width: '100%', display: 'flex', gap: '12px', padding: '14px 16px', border: 'none', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', background: activeConv?.other_user_id === conv.other_user_id && !isMobile ? '#e0e7ff' : '#fff', textAlign: 'left', alignItems: 'center' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: avatarColor(conv.other_name), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', fontWeight: '700', color: '#fff', flexShrink: 0 }}>{initials(conv.other_name)}</div>
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                        <span style={{ fontWeight: '700', fontSize: '14px', color: '#0f172a' }}>{conv.other_name}</span>
                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>{formatTime(conv.last_time)}</span>
                      </div>
                      {conv.listing && <div style={{ fontSize: '11px', color: '#6366f1', fontWeight: '600', marginBottom: '2px' }}>Re: {conv.listing.title}</div>}
                      <div style={{ fontSize: '12px', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {conv.last_msg?.includes('__FILE__') ? '📎 Attachment' : conv.last_msg}
                      </div>
                    </div>
                    {isMobile && <div style={{ color: '#94a3b8', fontSize: '20px' }}>›</div>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Chat Panel */}
          {showChat && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
              {!activeConv ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', gap: '12px' }}>
                  <div style={{ fontSize: '56px' }}>💬</div>
                  <div style={{ fontWeight: '700', fontSize: '18px', color: '#475569' }}>Select a conversation</div>
                  <div style={{ fontSize: '13px' }}>Or message someone from the Marketplace</div>
                </div>
              ) : (
                <>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0, background: '#fff' }}>
                    {isMobile && (
                      <button onClick={goBack} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '22px', color: '#6366f1', padding: '0 6px 0 0' }}>←</button>
                    )}
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: avatarColor(activeConv.other_name), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700', color: '#fff', flexShrink: 0 }}>{initials(activeConv.other_name)}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '14px' }}>{activeConv.other_name}</div>
                      {activeConv.listing && <div style={{ fontSize: '11px', color: '#6366f1', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Re: {activeConv.listing.title}</div>}
                    </div>
                    <button onClick={() => setShowDeleteConfirm(true)} style={{ background: '#fff0f0', border: '1px solid #fecaca', borderRadius: '8px', padding: isMobile ? '6px 8px' : '6px 12px', cursor: 'pointer', fontSize: isMobile ? '16px' : '12px', fontWeight: '600', color: '#ef4444', flexShrink: 0 }}>
                      {isMobile ? '🗑' : '🗑 Delete'}
                    </button>
                  </div>

                  {showDeleteConfirm && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                      <div style={{ background: '#fff', borderRadius: '16px', padding: '28px', maxWidth: '360px', width: '100%', textAlign: 'center' }}>
                        <div style={{ fontSize: '40px', marginBottom: '12px' }}>🗑️</div>
                        <div style={{ fontWeight: '800', fontSize: '17px', color: '#0f172a', marginBottom: '8px' }}>Delete this chat?</div>
                        <div style={{ color: '#64748b', fontSize: '13px', marginBottom: '20px', lineHeight: '1.6' }}>Removes the conversation from <strong>your view only</strong>.</div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <button onClick={() => setShowDeleteConfirm(false)} style={{ flex: 1, background: '#f1f5f9', border: 'none', borderRadius: '10px', padding: '11px', fontWeight: '600', cursor: 'pointer', color: '#64748b' }}>Cancel</button>
                          <button onClick={deleteChat} style={{ flex: 1, background: '#ef4444', border: 'none', borderRadius: '10px', padding: '11px', fontWeight: '700', cursor: 'pointer', color: '#fff' }}>Delete for Me</button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '10px', background: '#fafbff' }} onClick={() => setMsgMenuId(null)}>
                    {visibleMessages.map((msg: any) => {
                      const isMe = msg.sender_id === currentUser?.id
                      return (
                        <div key={msg.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', alignItems: 'flex-end', gap: '6px' }}>
                          {!isMe && <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: avatarColor(activeConv.other_name), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '700', color: '#fff', flexShrink: 0 }}>{initials(activeConv.other_name)}</div>}
                          <div style={{ maxWidth: isMobile ? '78%' : '65%', display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                            <div style={{ padding: msg.content.includes('__FILE__') ? '6px' : '9px 13px', borderRadius: isMe ? '16px 4px 16px 16px' : '4px 16px 16px 16px', background: isMe ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : '#fff', color: isMe ? '#fff' : '#374151', fontSize: '13px', boxShadow: '0 2px 4px rgba(0,0,0,0.06)', border: !isMe ? '1px solid #f1f5f9' : 'none' }}>
                              {msg.content.includes('__FILE__') ? (() => {
                                const url = msg.content.split('__FILE__')[1]?.split('__NAME__')[0]
                                const name = msg.content.split('__NAME__')[1]?.split('__TYPE__')[0]
                                const type = msg.content.split('__TYPE__')[1] || ''
                                if (type.startsWith('image/')) return (
                                  <a href={url} target="_blank" rel="noopener noreferrer">
                                    <img src={url} alt={name} style={{ maxWidth: isMobile ? '180px' : '220px', maxHeight: '200px', borderRadius: '10px', display: 'block' }} />
                                    <div style={{ fontSize: '11px', marginTop: '4px', opacity: 0.8 }}>{name}</div>
                                  </a>
                                )
                                if (type.startsWith('video/')) return (
                                  <div>
                                    <video src={url} controls style={{ maxWidth: isMobile ? '180px' : '220px', maxHeight: '180px', borderRadius: '10px', display: 'block' }} />
                                    <div style={{ fontSize: '11px', marginTop: '4px', opacity: 0.8 }}>{name}</div>
                                  </div>
                                )
                                return (
                                  <a href={url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', color: 'inherit', padding: '4px' }}>
                                    <span style={{ fontSize: '22px' }}>📎</span>
                                    <div><div style={{ fontSize: '12px', fontWeight: '700' }}>{name}</div><div style={{ fontSize: '11px', opacity: 0.7 }}>Tap to open</div></div>
                                  </a>
                                )
                              })() : msg.content}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px', position: 'relative' }}>
                              <div style={{ fontSize: '10px', color: '#94a3b8' }}>{formatTime(msg.created_at)}</div>
                              {isMe && (
                                <div style={{ position: 'relative' }}>
                                  <button onClick={(e) => { e.stopPropagation(); setMsgMenuId(msgMenuId === msg.id ? null : msg.id) }}
                                    style={{ background: '#f1f5f9', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', color: '#64748b', padding: '2px 7px', fontWeight: '700' }}>⋯</button>
                                  {msgMenuId === msg.id && (
                                    <div style={{ position: 'absolute', bottom: '20px', right: 0, background: '#fff', borderRadius: '10px', boxShadow: '0 4px 16px rgba(0,0,0,0.15)', border: '1px solid #f1f5f9', zIndex: 100, minWidth: '160px', overflow: 'hidden' }}>
                                      <button onClick={(e) => { e.stopPropagation(); deleteForEveryone(msg.id); setMsgMenuId(null) }}
                                        style={{ width: '100%', padding: '10px 14px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: '#ef4444', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        🗑 Delete for everyone
                                      </button>
                                      <div style={{ height: '1px', background: '#f1f5f9' }} />
                                      <button onClick={(e) => { e.stopPropagation(); deleteForMe(msg.id); setMsgMenuId(null) }}
                                        style={{ width: '100%', padding: '10px 14px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: '#64748b', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        🙈 Delete for me
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          {isMe && <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: '700', color: '#fff', flexShrink: 0 }}>ME</div>}
                        </div>
                      )
                    })}
                    {visibleMessages.length === 0 && (
                      <div style={{ textAlign: 'center', color: '#94a3b8', padding: '40px 0', fontSize: '13px' }}>No messages yet — say hello! 👋</div>
                    )}
                    <div ref={bottomRef} />
                  </div>

                  <div style={{ padding: '10px 12px', borderTop: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: '8px', background: '#fff', flexShrink: 0 }}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {[
                        { label: isMobile ? '🖼' : '🖼 Photo', accept: 'image/*' },
                        { label: isMobile ? '🎥' : '🎥 Video', accept: 'video/*' },
                        { label: isMobile ? '📎' : '📎 Doc', accept: '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.zip' },
                      ].map(({ label, accept }) => (
                        <button key={label} disabled={uploading} onClick={() => {
                          const inp = document.createElement('input')
                          inp.type = 'file'; inp.accept = accept
                          inp.onchange = (e: any) => { const f = e.target.files?.[0]; if (f) sendFile(f) }
                          inp.click()
                        }} style={{ background: '#f1f5f9', border: '1.5px solid #e2e8f0', borderRadius: '8px', padding: isMobile ? '7px 14px' : '5px 10px', cursor: 'pointer', fontSize: isMobile ? '16px' : '12px', fontWeight: '600', color: '#374151', opacity: uploading ? 0.5 : 1 }}>
                          {uploading ? '⏳' : label}
                        </button>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()} placeholder="Type a message..."
                        style={{ flex: 1, padding: '10px 14px', borderRadius: '12px', border: '1.5px solid #e2e8f0', fontSize: '14px', outline: 'none', minWidth: 0 }} />
                      <button onClick={sendMessage} disabled={!input.trim()} style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: 'none', borderRadius: '12px', padding: '10px 16px', cursor: 'pointer', color: '#fff', fontSize: '18px', opacity: !input.trim() ? 0.5 : 1, flexShrink: 0 }}>➤</button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  )
}
