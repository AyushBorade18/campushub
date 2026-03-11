'use client'
import { useState, useEffect } from 'react'
import MainLayout from '@/components/MainLayout'
import { supabase } from '@/lib/supabase'

// ── Time slots 8AM–6PM ──────────────────────────────────────────────
const ALL_SLOTS = [
  '08:00','09:00','10:00','11:00','12:00',
  '13:00','14:00','15:00','16:00','17:00','18:00'
]
const SLOT_LABEL: Record<string, string> = {
  '08:00':'8-9','09:00':'9-10','10:00':'10-11','11:00':'11-12',
  '12:00':'12-1','13:00':'1-2','14:00':'2-3','15:00':'3-4',
  '16:00':'4-5','17:00':'5-6','18:00':'6 PM'
}
const ALL_DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday']
const DAY_LABEL: Record<string,string> = {
  monday:'Mon',tuesday:'Tue',wednesday:'Wed',
  thursday:'Thu',friday:'Fri',saturday:'Sat'
}

// ── Subjects by branch/module ────────────────────────────────────────
const CS_BRANCHES = ['CS','CS-AIML','CS-AI','IT','AIDS','CSE-DS','CSE-SE','CSE-IOT & CYBERSECURITY']
const ENTC_BRANCHES = ['ENTC','INSTRUMENTATION']

function getSubjectPills(branch: string, module: string) {
  const isCS = CS_BRANCHES.includes(branch)
  const isENTC = ENTC_BRANCHES.includes(branch)
  const isMod1 = module === 'module_1'
  const isMod2 = module === 'module_2'

  const common = [
    { name: 'ASEP', type: 'lab', color: '#7c3aed' },
    { name: 'RAD', type: 'theory', color: '#0891b2' },
    { name: 'GP', type: 'lab', color: '#0891b2' },
    { name: 'SRM', type: 'theory', color: '#0891b2' },
    { name: 'Break / Lunch', type: 'break', color: '#94a3b8' },
    { name: 'Free', type: 'free', color: '#10b981' },
  ]

  if (isCS && isMod1) return [
    { name: 'PSP', type: 'theory', color: '#6366f1' },
    { name: 'PSP Lab', type: 'lab', color: '#4f46e5' },
    { name: 'Linear Algebra', type: 'theory', color: '#6366f1' },
    { name: 'Linear Algebra Tutorial', type: 'theory', color: '#6366f1' },
    { name: 'COA', type: 'theory', color: '#6366f1' },
    { name: 'Web Dev', type: 'theory', color: '#6366f1' },
    { name: 'Web Dev Lab', type: 'lab', color: '#4f46e5' },
    { name: 'IKS', type: 'theory', color: '#6366f1' },
    { name: 'Student Activity', type: 'theory', color: '#f59e0b' },
    ...common,
  ]
  if (isCS && isMod2) return [
    { name: 'AE', type: 'theory', color: '#6366f1' },
    { name: 'AE Lab', type: 'lab', color: '#4f46e5' },
    { name: 'Calculus', type: 'theory', color: '#6366f1' },
    { name: 'Calculus Tutorial', type: 'theory', color: '#6366f1' },
    { name: 'Python', type: 'theory', color: '#6366f1' },
    { name: 'Python Lab', type: 'lab', color: '#4f46e5' },
    { name: 'Data Analysis', type: 'theory', color: '#6366f1' },
    { name: 'Data Analysis Lab', type: 'lab', color: '#4f46e5' },
    { name: 'UHV', type: 'theory', color: '#6366f1' },
    { name: 'Env Studies', type: 'theory', color: '#6366f1' },
    { name: 'Student Activity', type: 'theory', color: '#f59e0b' },
    ...common,
  ]
  if (isENTC && isMod1) return [
    { name: 'PSP', type: 'theory', color: '#6366f1' },
    { name: 'PSP Lab', type: 'lab', color: '#4f46e5' },
    { name: 'Linear Algebra', type: 'theory', color: '#6366f1' },
    { name: 'Linear Algebra Tutorial', type: 'theory', color: '#6366f1' },
    { name: 'Electronic Circuits', type: 'theory', color: '#6366f1' },
    { name: 'EC Lab', type: 'lab', color: '#4f46e5' },
    { name: 'IKS', type: 'theory', color: '#6366f1' },
    { name: 'Engg Graphics', type: 'lab', color: '#4f46e5' },
    { name: 'Student Activity', type: 'theory', color: '#f59e0b' },
    ...common,
  ]
  if (isENTC && isMod2) return [
    { name: 'AE', type: 'theory', color: '#6366f1' },
    { name: 'AE Lab', type: 'lab', color: '#4f46e5' },
    { name: 'Calculus', type: 'theory', color: '#6366f1' },
    { name: 'Calculus Tutorial', type: 'theory', color: '#6366f1' },
    { name: 'DLD', type: 'theory', color: '#6366f1' },
    { name: 'DLD Lab', type: 'lab', color: '#4f46e5' },
    { name: 'UHV', type: 'theory', color: '#6366f1' },
    { name: 'Env Studies', type: 'theory', color: '#6366f1' },
    { name: 'Engg Graphics', type: 'lab', color: '#4f46e5' },
    { name: 'Student Activity', type: 'theory', color: '#f59e0b' },
    ...common,
  ]
  // Default / Mechanical / Civil
  return [
    { name: 'Theory Class', type: 'theory', color: '#6366f1' },
    { name: 'Lab', type: 'lab', color: '#4f46e5' },
    ...common,
  ]
}

// ── Subject colour lookup ────────────────────────────────────────────
const SUBJECT_COLORS: Record<string, string> = {
  theory: '#6366f1', lab: '#7c3aed', break: '#94a3b8', free: '#10b981'
}

function getSlotColor(type: string) {
  return SUBJECT_COLORS[type] || '#6366f1'
}

function getSlotBg(type: string) {
  if (type === 'break') return '#f1f5f9'
  if (type === 'free')  return '#d1fae5'
  if (type === 'lab')   return '#ede9fe'
  return '#eef2ff'
}

// ── Slot picker popup ─────────────────────────────────────────────────
function SlotPicker({ pills, onPick, onClear, onClose, hasValue }: any) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:2000, display:'flex', alignItems:'center', justifyContent:'center', padding:'16px' }} onClick={onClose}>
      <div style={{ background:'#fff', borderRadius:'18px', padding:'22px', maxWidth:'400px', width:'100%', boxShadow:'0 24px 60px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'14px' }}>
          <div style={{ fontWeight:'800', fontSize:'15px', color:'#0f172a' }}>Choose Subject</div>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:'18px', cursor:'pointer', color:'#94a3b8' }}>✕</button>
        </div>
        <div style={{ display:'flex', flexWrap:'wrap', gap:'8px' }}>
          {pills.map((p: any) => (
            <button key={p.name} onClick={() => onPick(p)}
              style={{ background: getSlotBg(p.type), color: getSlotColor(p.type), border:`1.5px solid ${getSlotColor(p.type)}30`, borderRadius:'10px', padding:'7px 13px', cursor:'pointer', fontSize:'12.5px', fontWeight:'700' }}>
              {p.type === 'lab' ? '🔬 ' : p.type === 'break' ? '☕ ' : p.type === 'free' ? '✅ ' : '📖 '}{p.name}
              {p.type === 'lab' && <span style={{ fontSize:'10px', opacity:0.7, marginLeft:'4px' }}>(2hr)</span>}
            </button>
          ))}
        </div>
        {hasValue && (
          <button onClick={onClear} style={{ marginTop:'14px', width:'100%', background:'#fee2e2', border:'none', borderRadius:'10px', padding:'9px', cursor:'pointer', color:'#ef4444', fontWeight:'700', fontSize:'13px' }}>
            🗑 Clear this slot
          </button>
        )}
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────
export default function TimetablePage() {
  const [profile, setProfile] = useState<any>(null)
  const [offDays, setOffDays] = useState('sat_sun')
  const [slots, setSlots] = useState<any[]>([])
  const [picker, setPicker] = useState<{ day: string; start: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [dbError, setDbError] = useState(false)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'build' | 'preview'>('preview')

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(p)
      setOffDays(p?.off_days || 'sat_sun')
      const { data: ts } = await supabase.from('timetable_slots').select('*').eq('user_id', user.id)
      setSlots(ts || [])
      setLoading(false)
    }
    load()
  }, [])

  // Active days based on off_days setting
  const activeDays = ALL_DAYS.filter(d => {
    if (offDays === 'sat_sun') return d !== 'saturday'
    if (offDays === 'sun_mon') return d !== 'monday'
    return true // sun_only — all weekdays + sat (Sunday handled separately)
  })

  const pills = getSubjectPills(profile?.major || '', profile?.module || '')

  // Get slot for a day+time
  function getSlot(day: string, start: string) {
    return slots.find(s => s.day === day && s.slot_start === start)
  }

  // Check if a slot is covered by a 2hr lab starting earlier
  function isCoveredByLab(day: string, start: string) {
    const prev = ALL_SLOTS[ALL_SLOTS.indexOf(start) - 1]
    if (!prev) return false
    const prevSlot = getSlot(day, prev)
    return prevSlot?.slot_type === 'lab'
  }

  function openPicker(day: string, start: string) {
    if (isCoveredByLab(day, start)) return
    setPicker({ day, start })
  }

  async function pickSubject(pill: any) {
    if (!picker) return
    const { day, start } = picker
    const startIdx = ALL_SLOTS.indexOf(start)
    const end = pill.type === 'lab' ? ALL_SLOTS[startIdx + 2] || '18:00' : ALL_SLOTS[startIdx + 1] || '18:00'

    // Remove existing slot(s) for this time
    const toRemove = slots.filter(s => s.day === day && (s.slot_start === start || (pill.type === 'lab' && s.slot_start === ALL_SLOTS[startIdx + 1])))
    if (toRemove.length) {
      await supabase.from('timetable_slots').delete().in('id', toRemove.map(s => s.id))
    }

    // Insert new slot
    const { data: { user } } = await supabase.auth.getUser()
    const { data: newSlot, error } = await supabase.from('timetable_slots').insert({
      user_id: user!.id, day, slot_start: start, slot_end: end,
      subject_name: pill.name, slot_type: pill.type
    }).select().single()

    if (error || !newSlot) {
      setDbError(true)
      setPicker(null)
      return
    }
    setDbError(false)
    setSlots(prev => [...prev.filter(s => !toRemove.find(r => r.id === s.id)), newSlot])
    setSaved(true); setTimeout(() => setSaved(false), 2000)
    setPicker(null)
  }

  async function clearSlot() {
    if (!picker) return
    const { day, start } = picker
    const toRemove = slots.filter(s => s.day === day && s.slot_start === start)
    if (toRemove.length) {
      await supabase.from('timetable_slots').delete().in('id', toRemove.map(s => s.id))
      setSlots(prev => prev.filter(s => !toRemove.find(r => r.id === s.id)))
    }
    setPicker(null)
  }

  async function saveOffDays(val: string) {
    setOffDays(val)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) await supabase.from('profiles').update({ off_days: val }).eq('id', user.id)
  }

  async function copyDayToDay(fromDay: string, toDays: string[]) {
    const fromSlots = slots.filter(s => s.day === fromDay)
    if (!fromSlots.length) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    // Remove existing slots for target days
    const toRemove = slots.filter(s => toDays.includes(s.day))
    if (toRemove.length) await supabase.from('timetable_slots').delete().in('id', toRemove.map(s => s.id))
    // Insert copies
    const newSlots = toDays.flatMap(day =>
      fromSlots.map(s => ({ user_id: user.id, day, slot_start: s.slot_start, slot_end: s.slot_end, subject_name: s.subject_name, slot_type: s.slot_type }))
    )
    const { data: inserted } = await supabase.from('timetable_slots').insert(newSlots).select()
    setSlots(prev => [...prev.filter(s => !toRemove.find(r => r.id === s.id)), ...(inserted || [])])
    setSaved(true); setTimeout(() => setSaved(false), 2000)
  }

  if (loading) return <MainLayout><div style={{ textAlign:'center', padding:'60px', color:'#94a3b8' }}>Loading timetable…</div></MainLayout>

  const pickerSlot = picker ? getSlot(picker.day, picker.start) : null

  return (
    <MainLayout>
      <div style={{ maxWidth:'960px', margin:'0 auto' }}>

        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px', flexWrap:'wrap', gap:'12px' }}>
          <div>
            <h2 style={{ margin:0, fontSize:'22px', fontWeight:'900', color:'#0f172a' }}>📅 My Timetable</h2>
            <p style={{ margin:'4px 0 0', color:'#64748b', fontSize:'13px' }}>Click any slot to assign a subject · Labs auto-span 2 hours</p>
          </div>
          <div style={{ display:'flex', gap:'8px' }}>
            {view === 'build' && (
              <button onClick={() => { setView('preview'); setSaved(true); setTimeout(() => setSaved(false), 2500) }}
                style={{ background:'linear-gradient(135deg,#6366f1,#8b5cf6)', color:'#fff', border:'none', borderRadius:'10px', padding:'9px 18px', fontWeight:'700', cursor:'pointer', fontSize:'13px' }}>
                💾 Save
              </button>
            )}
            <button onClick={() => setView(v => v === 'build' ? 'preview' : 'build')}
              style={{ background: view==='preview' ? '#f1f5f9' : '#f1f5f9', color:'#374151', border:'none', borderRadius:'10px', padding:'9px 16px', fontWeight:'700', cursor:'pointer', fontSize:'13px' }}>
              {view === 'build' ? '👁 Preview' : '✏️ Edit'}
            </button>
          </div>
        </div>

        {/* Toast notification — disappears after 2.5s */}
        {saved && (
          <div style={{ position:'fixed', top:'20px', right:'20px', background:'#0f172a', color:'#fff', padding:'12px 20px', borderRadius:'12px', fontWeight:'600', fontSize:'13px', zIndex:9999, boxShadow:'0 8px 24px rgba(0,0,0,0.2)', display:'flex', alignItems:'center', gap:'8px' }}>
            ✅ Timetable saved!
          </div>
        )}

        {dbError && (
          <div style={{ background:'#fee2e2', color:'#ef4444', padding:'14px 18px', borderRadius:'12px', marginBottom:'14px', fontWeight:'600', fontSize:'13px', lineHeight:'1.6' }}>
            ⚠️ <strong>Database table missing!</strong> Go to <strong>Supabase → SQL Editor</strong> → run <code>timetable_migration.sql</code>
          </div>
        )}

        {/* Off Days Selector */}
        <div style={{ background:'#fff', borderRadius:'14px', padding:'16px 20px', marginBottom:'16px', border:'1px solid #f1f5f9', display:'flex', alignItems:'center', gap:'16px', flexWrap:'wrap' }}>
          <span style={{ fontSize:'13px', fontWeight:'700', color:'#374151' }}>📅 Weekly off:</span>
          {[
            { val:'sat_sun', label:'Sat + Sun off' },
            { val:'sun_mon', label:'Sun + Mon off' },
            { val:'sun_only', label:'Only Sun off' },
          ].map(o => (
            <button key={o.val} onClick={() => saveOffDays(o.val)}
              style={{ background: offDays===o.val ? '#6366f1' : '#f1f5f9', color: offDays===o.val ? '#fff' : '#374151', border:'none', borderRadius:'8px', padding:'7px 14px', fontWeight:'700', cursor:'pointer', fontSize:'12.5px' }}>
              {o.label}
            </button>
          ))}
        </div>

        {/* Subject Pills Legend */}
        {view === 'build' && (
          <div style={{ background:'#fff', borderRadius:'14px', padding:'14px 18px', marginBottom:'16px', border:'1px solid #f1f5f9' }}>
            <div style={{ fontSize:'11px', fontWeight:'800', color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'10px' }}>Your Subjects — tap a slot then pick from here</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:'7px' }}>
              {pills.map(p => (
                <span key={p.name} style={{ background: getSlotBg(p.type), color: getSlotColor(p.type), border:`1.5px solid ${getSlotColor(p.type)}40`, borderRadius:'8px', padding:'5px 11px', fontSize:'12px', fontWeight:'700' }}>
                  {p.type==='lab' ? '🔬' : p.type==='break' ? '☕' : p.type==='free' ? '✅' : '📖'} {p.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Timetable Grid */}
        <div style={{ background:'#fff', borderRadius:'16px', border:'1px solid #f1f5f9', overflow:'hidden', boxShadow:'0 2px 12px rgba(0,0,0,0.05)' }}>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', minWidth:'600px' }}>
              <thead>
                <tr style={{ background:'linear-gradient(135deg,#4f46e5,#7c3aed)' }}>
                  <th style={{ padding:'12px 14px', textAlign:'left', fontSize:'12px', fontWeight:'800', color:'rgba(255,255,255,0.8)', width:'72px' }}>Time</th>
                  {activeDays.map(day => (
                    <th key={day} style={{ padding:'12px 8px', textAlign:'center', fontSize:'12.5px', fontWeight:'800', color:'#fff' }}>{DAY_LABEL[day]}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ALL_SLOTS.slice(0,-1).map((start, i) => (
                  <tr key={start} style={{ borderBottom:'1px solid #f1f5f9' }}>
                    <td style={{ padding:'8px 14px', fontSize:'11.5px', fontWeight:'700', color:'#94a3b8', whiteSpace:'nowrap', background:'#fafbff', borderRight:'1px solid #f1f5f9' }}>
                      {SLOT_LABEL[start]}
                    </td>
                    {activeDays.map(day => {
                      const slot = getSlot(day, start)
                      const covered = isCoveredByLab(day, start)
                      if (covered) return null // Spanned by previous lab
                      const isLab = slot?.slot_type === 'lab'
                      return (
                        <td key={day} rowSpan={isLab ? 2 : 1}
                          onClick={() => view === 'build' && openPicker(day, start)}
                          style={{
                            padding:'6px 5px', textAlign:'center', verticalAlign:'middle',
                            cursor: view==='build' ? 'pointer' : 'default',
                            background: slot ? getSlotBg(slot.slot_type) : 'transparent',
                            transition:'all 0.15s',
                            position:'relative',
                          }}
                          onMouseEnter={e => { if (view==='build') (e.currentTarget as HTMLElement).style.background = slot ? getSlotBg(slot.slot_type) : '#f5f3ff' }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = slot ? getSlotBg(slot.slot_type) : 'transparent' }}>
                          {slot ? (
                            <div style={{ padding:'4px 2px' }}>
                              <div style={{ fontSize:'11.5px', fontWeight:'800', color: getSlotColor(slot.slot_type), lineHeight:1.3 }}>{slot.subject_name}</div>
                              {slot.slot_type === 'lab' && <div style={{ fontSize:'9.5px', color:'#a78bfa', fontWeight:'600', marginTop:'2px' }}>Lab · 2hr</div>}
                            </div>
                          ) : view === 'build' ? (
                            <span style={{ fontSize:'18px', color:'#e2e8f0', lineHeight:1 }}>+</span>
                          ) : null}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Copy Day Shortcuts */}
        {view === 'build' && (
          <div style={{ background:'#fff', borderRadius:'14px', padding:'16px 20px', marginTop:'16px', border:'1px solid #f1f5f9' }}>
            <div style={{ fontSize:'12px', fontWeight:'800', color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'12px' }}>⚡ Quick Copy — Paste one day's schedule to others</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:'8px' }}>
              {activeDays.map(fromDay => (
                <div key={fromDay} style={{ display:'flex', alignItems:'center', gap:'6px', background:'#f8fafc', borderRadius:'10px', padding:'8px 12px' }}>
                  <span style={{ fontSize:'12px', fontWeight:'700', color:'#374151' }}>Copy {DAY_LABEL[fromDay]} →</span>
                  {activeDays.filter(d => d !== fromDay).map(toDay => (
                    <button key={toDay} onClick={() => copyDayToDay(fromDay, [toDay])}
                      style={{ background:'#ede9fe', color:'#6366f1', border:'none', borderRadius:'6px', padding:'4px 9px', cursor:'pointer', fontSize:'11.5px', fontWeight:'700' }}>
                      {DAY_LABEL[toDay]}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Today's Schedule Summary */}
        <TodaySummary slots={slots} offDays={offDays} />

      </div>

      {/* Slot Picker Modal */}
      {picker && (
        <SlotPicker
          pills={pills}
          hasValue={!!pickerSlot}
          onPick={pickSubject}
          onClear={clearSlot}
          onClose={() => setPicker(null)}
        />
      )}

      <style>{`
        @media (max-width: 768px) {
          table { font-size: 11px !important; }
          th, td { padding: 5px 3px !important; }
        }
      `}</style>
    </MainLayout>
  )
}

// ── Today's Schedule ──────────────────────────────────────────────────
function TodaySummary({ slots, offDays }: any) {
  const days = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday']
  const todayName = days[new Date().getDay()]

  // Public holidays from VIT calendar (add more as needed)
  const publicHolidays: Record<string, string> = {
    '2026-04-14': 'Dr. Ambedkar Jayanti',
    '2026-04-15': 'Ram Navami',
    '2026-05-01': 'Maharashtra Day',
    '2026-06-17': 'Bakri Eid',
  }
  const todayDate = new Date().toISOString().split('T')[0]
  const holiday = publicHolidays[todayDate]

  const isOffDay =
    (offDays === 'sat_sun' && (todayName === 'saturday' || todayName === 'sunday')) ||
    (offDays === 'sun_mon' && (todayName === 'sunday' || todayName === 'monday')) ||
    (offDays === 'sun_only' && todayName === 'sunday')

  const todaySlots = slots
    .filter((s: any) => s.day === todayName)
    .sort((a: any, b: any) => a.slot_start.localeCompare(b.slot_start))

  const freeSlots = ALL_SLOTS.slice(0,-1).filter(t =>
    !slots.find((s: any) => s.day === todayName && s.slot_start === t) &&
    !slots.find((s: any) => s.day === todayName && s.slot_type === 'lab' && ALL_SLOTS[ALL_SLOTS.indexOf(s.slot_start)+1] === t)
  )

  return (
    <div style={{ background:'linear-gradient(135deg,#4f46e5,#7c3aed)', borderRadius:'16px', padding:'20px 24px', marginTop:'16px', color:'#fff' }}>
      <div style={{ fontSize:'14px', fontWeight:'800', marginBottom:'12px', opacity:0.9 }}>
        📌 Today — {todayName.charAt(0).toUpperCase() + todayName.slice(1)} {todayDate}
      </div>
      {holiday && (
        <div style={{ background:'rgba(255,255,255,0.2)', borderRadius:'10px', padding:'8px 14px', marginBottom:'12px', fontSize:'13px', fontWeight:'700' }}>
          🎉 Public Holiday: {holiday}
        </div>
      )}
      {isOffDay && !holiday ? (
        <div style={{ fontSize:'14px', opacity:0.85 }}>🏖️ It's your day off — rest up!</div>
      ) : todaySlots.length === 0 ? (
        <div style={{ fontSize:'13px', opacity:0.8 }}>No classes added yet — go to Edit to build your timetable!</div>
      ) : (
        <>
          <div style={{ display:'flex', flexWrap:'wrap', gap:'8px', marginBottom:'12px' }}>
            {todaySlots.map((s: any) => {
              // Extract hours directly from HH:MM strings — e.g. "10:00"→10, "12:00"→12
              const startHour = parseInt(s.slot_start.split(':')[0])
              const endHour = s.slot_type === 'lab' && s.slot_end
                ? parseInt(s.slot_end.split(':')[0])
                : startHour + 1
              const timeLabel = `${startHour}-${endHour}`
              return (
                <div key={s.id} style={{ background:'rgba(255,255,255,0.15)', borderRadius:'10px', padding:'7px 13px', fontSize:'12.5px', fontWeight:'700' }}>
                  {timeLabel} · {s.subject_name}
                </div>
              )
            })}
          </div>
          {freeSlots.length > 0 && (
            <div style={{ fontSize:'12px', opacity:0.8, borderTop:'1px solid rgba(255,255,255,0.2)', paddingTop:'10px' }}>
              ✅ {freeSlots.length} free slot{freeSlots.length > 1 ? 's' : ''} today ({freeSlots.map(t => SLOT_LABEL[t]).join(', ')}) — great time to study!
            </div>
          )}
        </>
      )}
    </div>
  )
}
