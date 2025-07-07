"use client";

import { Bell, User, PanelLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { useDriverProfile } from "@/hooks/use-driver-profile";
import { useNotifications } from "@/hooks/use-notifications";
import { ChatSheet } from "@/components/chat-sheet";
import { useHotelId } from "@/hooks/use-hotel-id";

export function DriverTopbar({
  onToggleSidebar,
}: {
  onToggleSidebar?: () => void;
}) {
  const router = useRouter();
  const [showNotifications, setShowNotifications] = useState(false);
  const { profile, loading } = useDriverProfile();
  const { getUnreadCount } = useNotifications();
  const notificationCount = getUnreadCount();
  const { hotelId } = useHotelId();

  const handleSignOut = () => {
    localStorage.removeItem("driverToken");
    localStorage.removeItem("driverLoggedIn");
    localStorage.removeItem("driverName");
    router.push("/login");
  };

  const handleToggleNotifications = useCallback(() => {
    const newState = !showNotifications;
    setShowNotifications(newState);

    // Use setTimeout to avoid state updates during render
    setTimeout(() => {
      if (newState) {
        toast.success("Opening notifications", {
          description: "You can view your notifications here",
        });
      }
    }, 0);
  }, [showNotifications]);

  const handleCloseNotifications = useCallback(() => {
    setShowNotifications(false);

    // Use setTimeout to avoid state updates during render
    setTimeout(() => {
      toast.success("Closing notifications");
    }, 0);
  }, []);

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
            {/* Chat Button */}
            {hotelId && <ChatSheet hotelId={hotelId} />}

            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                className="relative hover:bg-blue-50 dark:hover:bg-blue-950"
                onClick={handleToggleNotifications}
              >
                <Bell className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                {notificationCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center bg-blue-600 dark:bg-blue-500 text-white text-xs">
                    {notificationCount}
                  </Badge>
                )}
              </Button>
              {showNotifications && (
                <NotificationDropdown onClose={handleCloseNotifications} />
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
                    {loading ? (
                      <>
                        <p className="text-sm font-medium text-foreground">
                          Loading...
                        </p>
                        <p className="text-xs text-foreground/70">
                          Please wait
                        </p>
                      </>
                    ) : profile ? (
                      <>
                        <p className="text-sm font-medium text-foreground">
                          {profile.name}
                        </p>
                        <p className="text-xs text-foreground/70">
                          {profile.email}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-medium text-foreground">
                          Driver
                        </p>
                        <p className="text-xs text-foreground/70">
                          Not available
                        </p>
                      </>
                    )}
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-56 bg-background border-border"
              >
                <DropdownMenuLabel className="text-foreground">
                  My Account
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-border" />
                <DropdownMenuItem
                  onClick={() => router.push("/dashboard/profile")}
                  className="text-foreground hover:bg-blue-50 dark:hover:bg-blue-950 focus:bg-blue-50 dark:focus:bg-blue-950"
                >
                  Profile Settings
                </DropdownMenuItem>
                <DropdownMenuItem className="text-foreground hover:bg-blue-50 dark:hover:bg-blue-950 focus:bg-blue-50 dark:focus:bg-blue-950">
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
    </>
  );
}
