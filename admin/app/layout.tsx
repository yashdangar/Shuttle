import type React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { WebSocketProvider } from "@/context/WebSocketContext";
import { Toaster } from "@/components/ui/sonner";
import { ConnectionStatus } from "@/components/connection-status";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Airport Shuttle Admin Dashboard",
  description: "Admin dashboard for managing airport shuttle operations",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <WebSocketProvider>
            {children}
            <ConnectionStatus />
            <Toaster />
          </WebSocketProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
