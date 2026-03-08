import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { title, type, category, condition, price } = await request.json()
    if (!title) return NextResponse.json({ error: 'Title required' }, { status: 400 })

    const typeMap: Record<string, string> = {
      sell: 'selling',
      buy: 'wanted to buy',
      borrow: 'lending/borrowing',
      lost: 'lost item',
      found: 'found item'
    }

    const prompt = `You are writing a marketplace listing for VIT Pune CampusHub — a student app used by college students in Pune, India.

Write a compelling, natural-sounding product description for this listing:
- Item: "${title}"
- Listing type: ${typeMap[type] || type}
- Category: ${category}
${condition ? `- Condition: ${condition}` : ''}
${price ? `- Price: ₹${price}` : ''}

Guidelines:
- Write 4-5 sentences that sound like a real student wrote it
- Be specific and helpful — mention what makes this item useful for a VIT Pune student
- If selling/borrowing: mention condition, why it's useful, and a fair price suggestion
- If lost/found: describe clearly and mention where to contact or where it was lost/found
- Use 1-2 relevant emojis naturally in the text (not at every sentence)
- Mention "VIT Pune" or "campus" to make it feel local
- End with a clear call to action like "DM me to grab it!" or "Contact ASAP!"
- Do NOT use bullet points or markdown — write in plain flowing sentences only

Return ONLY the description text, nothing else.`

    const groqKey = process.env.GROQ_API_KEY
    if (!groqKey) {
      // Fallback descriptions
      const fallbacks: Record<string, string> = {
        sell: `Selling my ${title} — perfect condition and ideal for VIT Pune students. This ${category.toLowerCase()} has been well maintained and barely used. Great value for money compared to buying new, especially for first and second year students. Pickup can be arranged anywhere on campus. DM me to grab it fast! 📦`,
        buy: `Looking to buy a ${title} on VIT Pune campus. Need it urgently for my coursework — if you have one you're not using anymore, please reach out! Happy to pay a fair price and arrange a quick pickup on campus. Drop me a message! 🙏`,
        borrow: `Offering my ${title} for borrowing to VIT Pune students. Available for short-term use — just take care of it and return it in the same condition. Perfect if you need it for a project or assignment. Contact me to arrange pickup and return on campus. 🔄`,
        lost: `Lost my ${title} somewhere on VIT Pune campus. It means a lot to me — if anyone finds it, please contact me immediately! I'll be really grateful and will collect it from wherever you are on campus. Please check common areas like the library, canteen or lecture halls. 🙏`,
        found: `Found a ${title} on VIT Pune campus. If this belongs to you, please contact me with a description to verify ownership and I'll return it right away. Let's keep our campus honest! ✅`,
      }
      return NextResponse.json({ description: fallbacks[type] || fallbacks.sell })
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        max_tokens: 300,
        messages: [
          { role: 'user', content: prompt }
        ],
      }),
    })

    const data = await response.json()
    const description = data.choices?.[0]?.message?.content?.trim()

    if (!description) throw new Error('No description generated')

    return NextResponse.json({ description })
  } catch (error: any) {
    console.error('AI generate error:', error)
    return NextResponse.json({
      description: `Great ${request.url.includes('sell') ? 'item' : 'listing'} available on VIT Pune CampusHub! Contact me for more details and to arrange pickup on campus.`
    })
  }
}
