import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Extract key words from a title for matching
function extractKeywords(text: string): string[] {
  const stopWords = new Set(['a','an','the','near','at','in','on','my','i','is','was','lost','found','item'])
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w))
}

// Score how well two listings match (0–100)
function matchScore(newTitle: string, newDesc: string, existingTitle: string, existingDesc: string): number {
  const newWords = new Set([...extractKeywords(newTitle), ...extractKeywords(newDesc)])
  const existingWords = new Set([...extractKeywords(existingTitle), ...extractKeywords(existingDesc)])

  let score = 0
  for (const word of newWords) {
    if (existingWords.has(word)) score += 20
  }
  return Math.min(score, 100)
}

export async function POST(req: NextRequest) {
  try {
    const { listingId, type, title, description, userId } = await req.json()

    if (!['lost', 'found'].includes(type)) {
      return NextResponse.json({ matched: false })
    }

    // Look for opposite type posted in last 7 days
    const oppositeType = type === 'lost' ? 'found' : 'lost'
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

    const { data: candidates } = await supabaseAdmin
      .from('listings')
      .select('id, title, description, user_id, profiles(full_name)')
      .eq('type', oppositeType)
      .eq('status', 'active')
      .gte('created_at', sevenDaysAgo)
      .neq('user_id', userId) // Don't match with own listings

    if (!candidates?.length) return NextResponse.json({ matched: false, matches: 0 })

    // Score each candidate
    const matches = candidates
      .map(c => ({
        ...c,
        score: matchScore(title, description || '', c.title, c.description || '')
      }))
      .filter(c => c.score >= 40) // Only notify if reasonably confident
      .sort((a, b) => b.score - a.score)

    if (!matches.length) return NextResponse.json({ matched: false, matches: 0 })

    // Send DM notification to each matched user
    const SYSTEM_USER_ID = userId // DM sent from the person who just posted

    const notifications = matches.map(match => {
      const isNewLost = type === 'lost'
      const msg = isNewLost
        ? `🔍 Lost & Found Match! Someone just reported a lost item "${title}" that might match your found item "${match.title}". Could you check if it's the same? (${match.score}% match)`
        : `✅ Lost & Found Match! Someone just reported a found item "${title}" that might be your lost item "${match.title}". Could it be yours? (${match.score}% match)`

      return {
        sender_id: SYSTEM_USER_ID,
        receiver_id: match.user_id,
        listing_id: listingId,
        content: msg,
      }
    })

    await supabaseAdmin.from('direct_messages').insert(notifications)

    return NextResponse.json({
      matched: true,
      matches: matches.length,
      topMatch: matches[0]?.title,
      score: matches[0]?.score
    })

  } catch (err) {
    console.error('Lost & Found match error:', err)
    return NextResponse.json({ matched: false, error: 'Match failed' })
  }
}
