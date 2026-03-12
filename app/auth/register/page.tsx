'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

const BRANCHES = [
  'CS', 'CS-AIML', 'CS-AI', 'IT', 'AIDS', 'CSE-DS', 'CSE-SE',
  'CSE-IOT & CYBERSECURITY', 'ENTC', 'INSTRUMENTATION', 'Mechanical', 'Civil', 'Chemical', 'Other'
]

const CS_IT_AI = ['CS','CS-AIML','CS-AI','IT','AIDS','CSE-DS','CSE-SE','CSE-IOT & CYBERSECURITY']
const ENTC_INST = ['ENTC','INSTRUMENTATION']

function getModuleLabel(branch: string, mod: string) {
  if (CS_IT_AI.includes(branch)) {
    return mod === 'module_1'
      ? 'Module 1 — Linear Algebra, COA, Web Development, IKS'
      : 'Module 2 — Calculus, Python for Engineers, Data Analysis, UHV'
  }
  if (ENTC_INST.includes(branch)) {
    return mod === 'module_1'
      ? 'Module 1 — Linear Algebra, Electronic Circuits, IKS'
      : 'Module 2 — Calculus, Digital Logic Design, UHV'
  }
  return mod === 'module_1' ? 'Module 1' : 'Module 2'
}

const showsModule = (branch: string) => CS_IT_AI.includes(branch) || ENTC_INST.includes(branch)

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({ name: '', email: '', password: '', branch: 'CS', year: '1st Year', module: 'module_1' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const is1stYear = form.year === '1st Year'
  const needsModule = is1stYear && showsModule(form.branch)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!form.email.match(/\.(edu|edu\.in)$/i)) {
      setError('Only VIT Pune college emails (.edu or .edu.in) are allowed.')
      return
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (!form.name.trim()) {
      setError('Please enter your full name.')
      return
    }

    setLoading(true)
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { full_name: form.name } }
    })

    if (signUpError) { setError(signUpError.message); setLoading(false); return }

    // Save full profile — use signUpData.user directly (no extra getUser call needed)
    const uid = signUpData?.user?.id
    if (uid) {
      await supabase.from('profiles').upsert({
        id: uid,
        full_name: form.name,
        college: 'VIT Pune',
        major: form.branch,
        year: form.year,
        module: needsModule ? form.module : null,
        college_email: form.email,
      })
    }

    setLoading(false)
    setSuccess(true)
  }

  if (success) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#0f172a,#1e1b4b)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <div style={{ background: '#fff', borderRadius: '20px', padding: '40px', maxWidth: '400px', width: '100%', textAlign: 'center' }}>
          <div style={{ fontSize: '56px', marginBottom: '12px' }}>🎉</div>
          <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', margin: '0 0 8px' }}>Welcome to CampusHub!</h2>
          <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '8px' }}>
            Check your <strong>VIT Pune email</strong> for a confirmation link.
          </p>
          <p style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '24px' }}>
            (Check spam/junk folder too. Or ask your teacher to disable email confirmation in Supabase for testing.)
          </p>
          <Link href="/auth/login" style={{ display: 'inline-block', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', textDecoration: 'none', borderRadius: '10px', padding: '12px 28px', fontWeight: '700' }}>
            Go to Login →
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#0f172a,#1e1b4b)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ width: '100%', maxWidth: '440px' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ width: '56px', height: '56px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', margin: '0 auto 10px' }}>🎓</div>
          <h1 style={{ color: '#fff', fontSize: '24px', fontWeight: '800', margin: 0 }}>Join CampusHub</h1>
          <p style={{ color: '#6366f1', fontSize: '13px', margin: '4px 0 0', fontWeight: '600' }}>VIT Pune — Students Only</p>
        </div>

        <div style={{ background: '#fff', borderRadius: '20px', padding: '28px', boxShadow: '0 25px 50px rgba(0,0,0,0.3)' }}>
          {error && (
            <div style={{ background: '#fee2e2', color: '#dc2626', padding: '11px 14px', borderRadius: '10px', fontSize: '13px', marginBottom: '16px' }}>
              ⚠️ {error}
            </div>
          )}

          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '5px' }}>Full Name *</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required placeholder="e.g. Arjun Sharma"
              style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: '9px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '5px' }}>
              VIT Pune Email * <span style={{ color: '#6366f1' }}>(.edu or .edu.in)</span>
            </label>
            <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required placeholder="yourname@vit.edu.in"
              style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: '9px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '5px' }}>Branch *</label>
              <select value={form.branch} onChange={e => setForm(f => ({ ...f, branch: e.target.value, module: 'module_1' }))}
                style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: '9px', fontSize: '12px', outline: 'none', background: '#fff', boxSizing: 'border-box' }}>
                {BRANCHES.map(b => <option key={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '5px' }}>Year *</label>
              <select value={form.year} onChange={e => setForm(f => ({ ...f, year: e.target.value }))}
                style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: '9px', fontSize: '13px', outline: 'none', background: '#fff', boxSizing: 'border-box' }}>
                {['1st Year','2nd Year','3rd Year','4th Year'].map(y => <option key={y}>{y}</option>)}
              </select>
            </div>
          </div>

          {/* Module selector — only for 1st year CS/IT/AI/ENTC */}
          {needsModule && (
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '5px' }}>
                Module * <span style={{ color: '#6366f1' }}>(your subject group)</span>
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                {(['module_1','module_2'] as const).map(mod => (
                  <div key={mod} onClick={() => setForm(f => ({ ...f, module: mod }))}
                    style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', border: `2px solid ${form.module === mod ? '#6366f1' : '#e2e8f0'}`, borderRadius: '10px', padding: '10px 12px', cursor: 'pointer', background: form.module === mod ? '#f5f3ff' : '#fff', transition: 'all 0.15s' }}>
                    <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: `2px solid ${form.module === mod ? '#6366f1' : '#cbd5e1'}`, background: form.module === mod ? '#6366f1' : '#fff', flexShrink: 0, marginTop: '1px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {form.module === mod && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#fff' }} />}
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: '700', color: form.module === mod ? '#4f46e5' : '#374151' }}>
                        {mod === 'module_1' ? 'Module 1' : 'Module 2'}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '1px' }}>
                        {getModuleLabel(form.branch, mod)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '5px' }}>Password * (min 6 characters)</label>
            <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required placeholder="Choose a strong password"
              style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: '9px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
          </div>

          <div style={{ background: '#f0f4ff', borderRadius: '10px', padding: '10px 12px', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>🏫</span>
            <span style={{ fontSize: '12px', color: '#6366f1', fontWeight: '600' }}>VIT Pune — Vishwakarma Institute of Technology</span>
          </div>

          <button onClick={handleRegister} disabled={loading}
            style={{ width: '100%', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', border: 'none', borderRadius: '10px', padding: '13px', fontWeight: '700', fontSize: '15px', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Creating Account...' : '🚀 Create My Account'}
          </button>

          <p style={{ textAlign: 'center', fontSize: '13px', color: '#64748b', marginTop: '18px' }}>
            Already have an account?{' '}
            <Link href="/auth/login" style={{ color: '#6366f1', fontWeight: '700', textDecoration: 'none' }}>Sign in →</Link>
          </p>
        </div>
      </div>
    </div>
  )
}


  if (success) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#0f172a,#1e1b4b)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <div style={{ background: '#fff', borderRadius: '20px', padding: '40px', maxWidth: '400px', width: '100%', textAlign: 'center' }}>
          <div style={{ fontSize: '56px', marginBottom: '12px' }}>🎉</div>
          <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', margin: '0 0 8px' }}>Welcome to CampusHub!</h2>
          <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '8px' }}>
            Check your <strong>VIT Pune email</strong> for a confirmation link.
          </p>
          <p style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '24px' }}>
            (Check spam/junk folder too. Or ask your teacher to disable email confirmation in Supabase for testing.)
          </p>
          <Link href="/auth/login" style={{ display: 'inline-block', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', textDecoration: 'none', borderRadius: '10px', padding: '12px 28px', fontWeight: '700' }}>
            Go to Login →
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#0f172a,#1e1b4b)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ width: '100%', maxWidth: '440px' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ width: '56px', height: '56px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', margin: '0 auto 10px' }}>🎓</div>
          <h1 style={{ color: '#fff', fontSize: '24px', fontWeight: '800', margin: 0 }}>Join CampusHub</h1>
          <p style={{ color: '#6366f1', fontSize: '13px', margin: '4px 0 0', fontWeight: '600' }}>VIT Pune — Students Only</p>
        </div>

        <div style={{ background: '#fff', borderRadius: '20px', padding: '28px', boxShadow: '0 25px 50px rgba(0,0,0,0.3)' }}>
          {error && (
            <div style={{ background: '#fee2e2', color: '#dc2626', padding: '11px 14px', borderRadius: '10px', fontSize: '13px', marginBottom: '16px' }}>
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleRegister}>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '5px' }}>Full Name *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required placeholder="e.g. Arjun Sharma"
                style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: '9px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '5px' }}>
                VIT Pune Email * <span style={{ color: '#6366f1' }}>(.edu or .edu.in)</span>
              </label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required placeholder="yourname@vit.edu.in"
                style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: '9px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '5px' }}>Branch *</label>
                <select value={form.branch} onChange={e => setForm(f => ({ ...f, branch: e.target.value }))}
                  style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: '9px', fontSize: '12px', outline: 'none', background: '#fff', boxSizing: 'border-box' }}>
                  {BRANCHES.map(b => <option key={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '5px' }}>Year *</label>
                <select value={form.year} onChange={e => setForm(f => ({ ...f, year: e.target.value }))}
                  style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: '9px', fontSize: '13px', outline: 'none', background: '#fff', boxSizing: 'border-box' }}>
                  {['1st Year','2nd Year','3rd Year','4th Year'].map(y => <option key={y}>{y}</option>)}
                </select>
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '5px' }}>Password * (min 6 characters)</label>
              <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required placeholder="Choose a strong password"
                style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: '9px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
            </div>

            <div style={{ background: '#f0f4ff', borderRadius: '10px', padding: '10px 12px', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '18px' }}>🏫</span>
              <span style={{ fontSize: '12px', color: '#6366f1', fontWeight: '600' }}>VIT Pune — Vishwakarma Institute of Technology</span>
            </div>

            <button type="submit" disabled={loading}
              style={{ width: '100%', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', border: 'none', borderRadius: '10px', padding: '13px', fontWeight: '700', fontSize: '15px', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Creating Account...' : '🚀 Create My Account'}
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: '13px', color: '#64748b', marginTop: '18px' }}>
            Already have an account?{' '}
            <Link href="/auth/login" style={{ color: '#6366f1', fontWeight: '700', textDecoration: 'none' }}>Sign in →</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
