"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { Home, Car, Clock, Bell, User } from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  {
    href: "/dashboard",
    icon: Home,
    label: "Home",
  },
  {
    href: "/dashboard/current-trip",
    icon: Car,
    label: "Current Trip",
  },
  {
    href: "/dashboard/next-trip",
    icon: Clock,
    label: "Next Trip",
  },
  {
    href: "/dashboard/notifications",
    icon: Bell,
    label: "Notifications",
  },
  {
    href: "/dashboard/profile",
    icon: User,
    label: "Profile",
  },
]

export function BottomNavigation() {
  const pathname = usePathname()

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border">
      <nav className="flex items-center justify-around py-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-0",
                isActive
                  ? "text-blue-600 bg-blue-50 dark:bg-blue-950 dark:text-blue-400"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs font-medium truncate">{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
