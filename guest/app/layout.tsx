import type { Metadata } from 'next'
import './globals.css'
import { GuestTopbar } from "@/components/guest-topbar";
import { ConditionalTopbar } from "@/components/conditional-topbar";

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
      <body>
        <ConditionalTopbar />
        {children}
      </body>
    </html>
  )
}
