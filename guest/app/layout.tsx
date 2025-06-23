import type { Metadata } from "next";
import "./globals.css";
import { ConditionalTopbar } from "@/components/conditional-topbar";
import { ThemeProvider } from "@/components/theme-provider";
import { WebSocketProvider } from "@/context/WebSocketContext";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "shuttle guest App",
  description: "shuttle app for guest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <WebSocketProvider>
            <ConditionalTopbar />
            {children}
            <Toaster />
          </WebSocketProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
