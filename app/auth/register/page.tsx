'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

const BRANCHES = ['CS','CS-AIML','CS-AI','IT','AIDS','CSE-DS','CSE-SE','CSE-IOT & CYBERSECURITY','ENTC','MECHANICAL','CIVIL','INSTRUMENTATION']

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({ name: '', email: '', password: '', branch: 'Computer Science (AI)', year: '1st Year' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

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
    const { error: signUpError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { full_name: form.name } }
    })

    if (signUpError) { setError(signUpError.message); setLoading(false); return }

    // Update profile with branch and year
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('profiles').update({
        full_name: form.name,
        college: 'VIT Pune',
        major: form.branch,
        year: form.year,
      }).eq('id', user.id)
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
