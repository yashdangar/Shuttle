import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ConvexClientProvider } from "../lib/provider/convex-provider";
import "./globals.css";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "@/lib/provider/theme-provider";
import { HotelTimezoneProvider } from "@/lib/provider/hotel-timezone-provider";
import SidebarProviderLayout from "@/lib/provider/sidebar-provider";
import { Toaster } from "sonner";
// import { NotificationProvider } from "@/lib/provider/notification-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Shuttle",
  description: "Shuttle",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SessionProvider refetchOnWindowFocus={false}>
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem
            enableColorScheme
            disableTransitionOnChange
            forcedTheme="light"
          >
            <ConvexClientProvider>
              <HotelTimezoneProvider>
                {/* <NotificationProvider> */}
                <Toaster />
                <SidebarProviderLayout>{children}</SidebarProviderLayout>
                {/* </NotificationProvider> */}
              </HotelTimezoneProvider>
            </ConvexClientProvider>
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
