import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'CampusHub — Buy, Sell, Borrow, Find',
  description: 'Your all-in-one campus platform for VIT Pune students',
  manifest: '/manifest.json',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#6366f1" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="CampusHub" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </head>
      <body style={{ fontFamily: "'DM Sans', sans-serif", background: '#f8fafc', margin: 0 }}>
        {children}
      </body>
    </html>
  )
}