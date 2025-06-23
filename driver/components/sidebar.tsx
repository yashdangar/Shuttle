"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Home,
  Car,
  Clock,
  Bell,
  User,
  LogOut,
  ShuffleIcon as Shuttle,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";

const navItems = [
  {
    title: "Dashboard",
    icon: Home,
    href: "/dashboard",
  },
  {
    title: "Trips",
    icon: Car,
    href: "/dashboard/trips",
  },
  {
    title: "Current Trip",
    icon: MapPin,
    href: "/dashboard/current-trip",
  },
  {
    title: "Next Trip",
    icon: Clock,
    href: "/dashboard/next-trip",
  },
];

export function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [driverName, setDriverName] = useState("");
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const name = localStorage.getItem("driverName") || "Driver";
    setDriverName(name);
  }, []);

  const handleSignOut = () => {
    localStorage.removeItem("driverLoggedIn");
    localStorage.removeItem("driverName");
    toast.error("Failed to sign out");
    router.push("/login");
  };

  return (
    <div
      className={cn(
        "flex flex-col h-screen border-r border-border bg-background",
        isCollapsed ? "w-[70px]" : "w-[240px]"
      )}
    >
      <div className="flex flex-col flex-1">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 dark:bg-blue-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-semibold">S</span>
            </div>
            {!isCollapsed && (
              <span className="font-semibold text-lg text-foreground">Shuttle</span>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hover:bg-blue-50 dark:hover:bg-blue-950"
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            ) : (
              <ChevronLeft className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            )}
          </Button>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-2">
            {navItems.map((item) => (
              <Button
                key={item.href}
                variant="ghost"
                className={cn(
                  "w-full justify-start gap-2 hover:bg-blue-50 dark:hover:bg-blue-950",
                  pathname === item.href && "bg-blue-100 dark:bg-blue-900"
                )}
                onClick={() => {
                  router.push(item.href);
                  toast.success("Navigating to " + item.title);
                }}
              >
                <item.icon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                {!isCollapsed && <span className="text-foreground">{item.title}</span>}
              </Button>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
