"use client";
import type React from "react";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { WebSocketProvider } from "@/context/WebSocketContext";
import { Toaster } from "@/components/ui/sonner";
import { ChatProvider } from "@/context/ChatContext";

const inter = Inter({ subsets: ["latin"] });

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
            <ChatProvider>
              {children}
              <Toaster />
            </ChatProvider>
          </WebSocketProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
