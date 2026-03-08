// lib/supabase.ts
// This connects your app to the Supabase database

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// The main Supabase client — import this anywhere you need the database
export const supabase = createClient(supabaseUrl, supabaseKey)

// ---------------------------------------------------------------
// TypeScript types — these match exactly what's in the database
// ---------------------------------------------------------------

export type Profile = {
  id: string
  full_name: string
  college_email: string
  college: string
  major: string
  year: string
  avatar_url?: string
  role: 'student' | 'admin'
  created_at: string
}

export type Listing = {
  id: string
  user_id: string
  type: 'sell' | 'buy' | 'borrow' | 'lost' | 'found'
  title: string
  description: string
  price?: number
  category: string
  condition?: string
  image_url?: string
  tags: string[]
  status: string
  location_last_seen?: string
  created_at: string
  profiles?: Profile
}

export type Channel = {
  id: string
  name: string
  description: string
  icon: string
  is_readonly: boolean
}

export type Message = {
  id: string
  channel_id: string
  user_id?: string
  is_bot: boolean
  content: string
  created_at: string
  profiles?: Profile
}

export type DirectMessage = {
  id: string
  sender_id: string
  receiver_id: string
  listing_id?: string
  content: string
  is_read: boolean
  created_at: string
  sender?: Profile
  receiver?: Profile
  listing?: Listing
}
