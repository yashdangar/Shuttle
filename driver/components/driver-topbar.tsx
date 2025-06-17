"use client";

import { Bell, Search, User, PanelLeft, Link } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { NotificationDropdown } from "./notification-dropdown";
import { useState } from "react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

export function DriverTopbar({
  onToggleSidebar,
}: {
  onToggleSidebar?: () => void;
}) {
  const handleSignOut = () => {
    localStorage.removeItem("token");
    router.push("/login");
  };

  const router = useRouter();
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);

  return (
    <>
      <header className="bg-background border-b border-border px-6 py-4">
        <div className="flex flex-1 items-center justify-between">
          <div className="flex items-center space-x-4">
            {onToggleSidebar && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={onToggleSidebar}
                className="hover:bg-blue-50 dark:hover:bg-blue-950"
              >
                <PanelLeft className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </Button>
            )}
          </div>

          <div className="flex items-center space-x-4">
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                className="relative hover:bg-blue-50 dark:hover:bg-blue-950"
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  toast.success(
                    showNotifications
                      ? "Closing notifications"
                      : "Opening notifications",
                    {
                      description: "You can view your notifications here",
                    }
                  );
                }}
              >
                <Bell className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                {notificationCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center bg-blue-600 dark:bg-blue-500 text-white text-xs">
                    {notificationCount}
                  </Badge>
                )}
              </Button>
              {showNotifications && (
                <NotificationDropdown
                  onClose={() => setShowNotifications(false)}
                />
              )}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="flex items-center space-x-2 hover:bg-blue-50 dark:hover:bg-blue-950"
                >
                  <div className="w-8 h-8 bg-blue-600 dark:bg-blue-500 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-foreground">Admin User</p>
                    <p className="text-xs text-foreground/70">admin@shuttle.com</p>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-background border-border">
                <DropdownMenuLabel className="text-foreground">My Account</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-border" />
                <DropdownMenuItem 
                  onClick={() => router.push("/dashboard/profile")}
                  className="text-foreground hover:bg-blue-50 dark:hover:bg-blue-950 focus:bg-blue-50 dark:focus:bg-blue-950"
                >
                  Profile Settings
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="text-foreground hover:bg-blue-50 dark:hover:bg-blue-950 focus:bg-blue-50 dark:focus:bg-blue-950"
                >
                  Notifications
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-border" />
                <DropdownMenuItem 
                  onClick={handleSignOut}
                  className="text-foreground hover:bg-blue-50 dark:hover:bg-blue-950 focus:bg-blue-50 dark:focus:bg-blue-950"
                >
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
      <Toaster />
    </>
  );
}
