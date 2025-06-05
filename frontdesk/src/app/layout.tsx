import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { cn } from "@/lib/utils";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Hotel Shuttle Frontdesk",
  description: "Frontdesk shuttle management UI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50`}
      >
        <div className="flex min-h-screen">
          {/* Sidebar */}
          <aside className="w-64 bg-white shadow-lg flex flex-col p-6">
            <div className="mb-8 flex items-center gap-2">
              <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center font-bold text-xl text-indigo-600">
                🏨
              </div>
              <span className="font-bold text-lg tracking-wide">
                Hotel Shuttle
              </span>
            </div>
            <nav className="flex flex-col gap-2">
              <Link
                href="/dashboard"
                className={cn(
                  "px-3 py-2 rounded hover:bg-indigo-50 text-gray-700 font-medium"
                )}
              >
                Dashboard
              </Link>
              <Link
                href="/reservations/new"
                className={cn(
                  "px-3 py-2 rounded hover:bg-indigo-50 text-gray-700 font-medium"
                )}
              >
                Add Reservation
              </Link>
              <Link
                href="/shuttle/manifest"
                className={cn(
                  "px-3 py-2 rounded hover:bg-indigo-50 text-gray-700 font-medium"
                )}
              >
                Shuttle Manifest
              </Link>
              <Link
                href="/logout"
                className={cn(
                  "px-3 py-2 rounded hover:bg-red-50 text-red-600 font-medium mt-8"
                )}
              >
                Logout
              </Link>
            </nav>
            <div className="mt-auto text-xs text-gray-400 pt-8">
              &copy; {new Date().getFullYear()} Hotel Frontdesk
            </div>
          </aside>
          {/* Main content */}
          <main className="flex-1 p-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
