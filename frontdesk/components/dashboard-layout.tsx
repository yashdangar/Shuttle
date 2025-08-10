"use client";

import type React from "react";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Car, Home, Plus, Settings, Users, Calendar, User, LogOut, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useWebSocket } from "@/context/WebSocketContext";
import { ChatSheet } from "@/components/chat-sheet";
import NotificationDropdownRenderer from "@/components/notification-dropdown";
import { useHotelId } from "@/hooks/use-hotel-id";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { FrontdeskSidebar } from "@/components/frontdesk-sidebar";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: Home },
  { name: "Shuttles", href: "/dashboard/shuttles", icon: Car },
  { name: "Drivers", href: "/dashboard/drivers", icon: Users },
  { name: "Schedules", href: "/dashboard/schedules", icon: Calendar },
  { name: "New Booking", href: "/dashboard/new-booking", icon: Plus },
  { name: "Bookings", href: "/dashboard/bookings", icon: Calendar },
  { name: "Profile", href: "/dashboard/profile", icon: User },
];

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { markUserInteraction, isConnected } = useWebSocket();
  const { hotelId } = useHotelId();

  const handleSignOut = () => {
    localStorage.removeItem("frontdeskToken");
    router.push("/");
  };

  

  // Mark user interaction on component mount to enable audio
  useEffect(() => {
    markUserInteraction();
  }, [markUserInteraction]);

  const pageTitle = useMemo(() => {
    if (!pathname) return "Dashboard";
    if (pathname === "/dashboard") return "Dashboard";
    if (pathname.startsWith("/dashboard/new-booking")) return "New Booking";
    if (pathname.startsWith("/dashboard/bookings/")) return "Booking Details";
    if (pathname.startsWith("/dashboard/bookings")) return "Bookings";
    if (pathname.startsWith("/dashboard/shuttles")) return "Shuttles";
    if (pathname.startsWith("/dashboard/drivers")) return "Drivers";
    if (pathname.startsWith("/dashboard/schedules")) return "Schedules";
    if (pathname.startsWith("/dashboard/profile")) return "Profile";
    return "Dashboard";
  }, [pathname]);

  return (
    <SidebarProvider>
      <div className="lg:grid lg:grid-cols-[auto,1fr] h-screen overflow-hidden">
        <div className="hidden lg:block sticky top-0 h-[100dvh]">
          <FrontdeskSidebar />
        </div>

        <SidebarInset className="w-full overflow-x-hidden">
          {/* Top navigation */}
          <div className="sticky top-0 z-40 w-full">
            <div className="relative">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-300/50 to-transparent" />
              <div className="flex h-16 items-center gap-x-3 sm:gap-x-4 border-b border-slate-200/60 bg-white/80 supports-[backdrop-filter]:bg-white/60 backdrop-blur px-3 sm:px-6 lg:px-8 shadow-sm">
                <SidebarTrigger className="data-[state=open]:bg-slate-100 rounded-md" />

                {/* Title and status */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="hidden sm:block h-8 w-px bg-slate-200/80" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="truncate text-base sm:text-lg font-semibold tracking-tight text-slate-900">{pageTitle}</h2>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${
                        isConnected
                          ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                          : "bg-rose-50 text-rose-700 ring-rose-200"
                      }`}>
                        {isConnected ? (
                          <Wifi className="h-3.5 w-3.5" />
                        ) : (
                          <WifiOff className="h-3.5 w-3.5" />
                        )}
                        {isConnected ? "Live" : "Offline"}
                      </span>
                    </div>
                    <p className="hidden sm:block text-xs text-slate-500">Frontdesk • Real-time updates</p>
                  </div>
                </div>

                <div className="flex-1" />

                {/* Quick actions */}
                <div className="flex items-center gap-x-2 sm:gap-x-3">
                  <Link href="/dashboard/new-booking" className="hidden md:inline-flex">
                    <Button className="group gap-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white shadow-sm hover:from-blue-700 hover:via-indigo-700 hover:to-violet-700">
                      <Plus className="h-4 w-4 transition-transform group-hover:scale-110" />
                      <span>New Booking</span>
                    </Button>
                  </Link>

                  <NotificationDropdownRenderer />
                  {hotelId && <ChatSheet />}

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="relative h-9 w-9 rounded-full hover:bg-slate-100">
                        <Avatar className="h-9 w-9 ring-1 ring-slate-200">
                          <AvatarImage src="/placeholder-user.jpg" alt="User" />
                          <AvatarFallback>FD</AvatarFallback>
                        </Avatar>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-72 p-0 overflow-hidden rounded-xl shadow-lg ring-1 ring-black/5">
                      <div className="relative">
                        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-300/60 to-transparent" />
                        <div className="flex items-center gap-3 px-4 py-3 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
                          <Avatar className="h-9 w-9 ring-1 ring-slate-200">
                            <AvatarImage src="/placeholder-user.jpg" alt="User" />
                            <AvatarFallback>FD</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-900 truncate">Frontdesk</p>
                            <p className="text-xs text-slate-500 truncate">Hotel #{hotelId ?? "—"}</p>
                          </div>
                        </div>
                      </div>

                      <DropdownMenuSeparator />

                      <DropdownMenuLabel className="px-4 py-2 text-xs uppercase tracking-wide text-slate-500">Account</DropdownMenuLabel>
                      <DropdownMenuItem className="px-4">
                        <User className="mr-2 h-4 w-4" />
                        Profile
                      </DropdownMenuItem>
                      <DropdownMenuItem className="px-4">
                        <Settings className="mr-2 h-4 w-4" />
                        Settings
                      </DropdownMenuItem>

                      <DropdownMenuSeparator />

                      <DropdownMenuItem onClick={handleSignOut} className="px-4 text-red-600 focus:bg-red-50 focus:text-red-700">
                        <LogOut className="mr-2 h-4 w-4" />
                        Sign out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          </div>

          {/* Page content */}
          <main className="flex-1 overflow-y-auto py-6">
            <div className="px-4 sm:px-6 lg:px-8">{children}</div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
