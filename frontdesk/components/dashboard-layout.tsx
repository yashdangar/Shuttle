"use client";

import type React from "react";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Car, Home, Plus, Settings, Users, Calendar, User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useWebSocket } from "@/context/WebSocketContext";
import { ChatSheet } from "@/components/chat-sheet";
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
  const { markUserInteraction } = useWebSocket();
  const { hotelId } = useHotelId();

  const handleSignOut = () => {
    localStorage.removeItem("frontdeskToken");
    router.push("/");
  };

  

  // Mark user interaction on component mount to enable audio
  useEffect(() => {
    markUserInteraction();
  }, [markUserInteraction]);

  return (
    <SidebarProvider>
      <div className="hidden lg:block">
        <FrontdeskSidebar />
      </div>

      <SidebarInset className="w-full overflow-x-hidden">
        {/* Top navigation */}
        <div className="sticky top-0 z-40 flex h-16 w-full items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
          <SidebarTrigger />

          <div className="flex flex-1 gap-x-4 lg:gap-x-6">
            <div className="flex flex-1" />
            <div className="flex items-center gap-x-4 lg:gap-x-6">
              {hotelId && <ChatSheet />}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src="/placeholder-user.jpg" alt="User" />
                      <AvatarFallback>JD</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="py-6">
          <div className="px-4 sm:px-6 lg:px-8">{children}</div>
        </main>
      </SidebarInset>

      
    </SidebarProvider>
  );
}
