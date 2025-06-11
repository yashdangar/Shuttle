import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'shuttle guest App',
  description: 'shuttle app for guest',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
