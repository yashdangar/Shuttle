"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/sidebar"
import { DriverTopbar } from "@/components/driver-topbar"
import { MobileNavigation } from "@/components/mobile-navigation"
import { BottomNavigation } from "@/components/bottom-navigation"

function isTokenExpired(token: string | null): boolean {
  if (!token) return true;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (!payload.exp) return true;
    const now = Math.floor(Date.now() / 1000);
    console.log("not expirred")
    return payload.exp < now;
  } catch {
    console.log("expired")
    return true;
  }
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const loggedIn = localStorage.getItem("driverLoggedIn");
    const token = localStorage.getItem("driverToken");

    if (!loggedIn || !token || isTokenExpired(token)) {
      localStorage.removeItem("driverLoggedIn");
      localStorage.removeItem("driverToken");
      router.push("/login");
      setLoading(false);
      return;
    }

    // Token is present and not expired, now check with backend
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/driver/profile`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })
      .then(res => {
        if (!res.ok) {
          throw new Error("Invalid token");
        }
        setIsAuthenticated(true);
      })
      .catch(() => {
        localStorage.removeItem("driverLoggedIn");
        localStorage.removeItem("driverToken");
        router.push("/login");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [router]);

  if (loading) {
    // Optionally, return a spinner here
    return null
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <MobileNavigation />
        <DriverTopbar />  
        <div className="p-4 lg:p-6 pb-20 lg:pb-6">{children}</div>
        <BottomNavigation />
      </main>
    </div>
  )
}
