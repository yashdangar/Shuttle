"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/sidebar"
import { DriverTopbar } from "@/components/driver-topbar"
import { MobileNavigation } from "@/components/mobile-navigation"
import { BottomNavigation } from "@/components/bottom-navigation"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const loggedIn = localStorage.getItem("driverLoggedIn")
    if (!loggedIn) {
      router.push("/login")
    } else {
      setIsAuthenticated(true)
    }
  }, [router])

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
