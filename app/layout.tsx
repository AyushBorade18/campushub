import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'CampusHub — Buy, Sell, Borrow, Find',
  description: 'Your all-in-one campus platform for marketplace, community chat, and AI assistance.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "'DM Sans', sans-serif", background: '#f8fafc', margin: 0 }}>
        {children}
      </body>
    </html>
  )
}
