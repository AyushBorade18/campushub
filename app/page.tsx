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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600">
      <div className="text-white text-center">
        <div className="text-5xl mb-4">🎓</div>
        <div className="text-xl font-bold">Loading CampusHub...</div>
      </div>
    </div>
  )
}
