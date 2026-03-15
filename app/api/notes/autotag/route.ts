import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { title, description, subject, content } = await req.json()
    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) return NextResponse.json({ tags: [] })

    const prompt = `You are tagging study notes for VIT Pune students.
Given this note:
Title: "${title}"
Subject: "${subject}"
Description: "${description}"
${content ? `Content preview: "${content.slice(0, 500)}"` : ''}

Generate 5-8 short, relevant tags. Tags should cover:
- Topics covered (e.g. "eigenvalues", "recursion", "Kirchhoff's law")
- Exam relevance (e.g. "mid-sem", "end-sem", "important")
- Content type (e.g. "handwritten", "solved examples", "theory", "formulas")

Respond with ONLY a JSON array of strings. Example: ["eigenvalues","linear transformations","mid-sem","solved examples","theory"]
No explanation, no markdown, just the JSON array.`

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 150,
        temperature: 0.3
      })
    })

    const data = await res.json()
    const raw = data.choices?.[0]?.message?.content?.trim() || '[]'
    // Safely parse JSON array
    const match = raw.match(/\[[\s\S]*\]/)
    const tags: string[] = match ? JSON.parse(match[0]) : []
    return NextResponse.json({ tags: tags.slice(0, 8) })
  } catch (err) {
    console.error('Auto-tag error:', err)
    return NextResponse.json({ tags: [] })
  }
}
