import type { Metadata } from 'next'
import './globals.css'
import { GuestTopbar } from "@/components/guest-topbar";
import { ConditionalTopbar } from "@/components/conditional-topbar";
import { ThemeProvider } from "@/components/theme-provider";

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
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
          <ConditionalTopbar />
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
