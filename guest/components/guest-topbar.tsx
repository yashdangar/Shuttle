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
import { NotificationDropdown } from "@/components/notification-dropdown";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { api } from "@/lib/api";

export function GuestTopbar({
  onToggleSidebar,
}: {
  onToggleSidebar?: () => void;
}) {
  const router = useRouter();
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [guestEmail, setGuestEmail] = useState("guest@example.com");
  const [guestName, setGuestName] = useState("Guest User");
  const [hotelId, setHotelId] = useState<string | null>(null);
  const [currentBooking, setCurrentBooking] = useState<any>(null);

  // Function to create guest name from email
  const createGuestName = (email: string) => {
    if (!email || email === "guest@example.com") return "Guest User";

    // Extract the part before @ symbol
    const emailPart = email.split("@")[0];

    // Handle different email formats
    if (emailPart.includes(".")) {
      // Format: john.doe@example.com -> John Doe
      return emailPart
        .split(".")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
    } else if (emailPart.includes("_")) {
      // Format: john_doe@example.com -> John Doe
      return emailPart
        .split("_")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
    } else {
      // Format: johndoe@example.com -> Johndoe
      return emailPart.charAt(0).toUpperCase() + emailPart.slice(1);
    }
  };

  // Fetch guest profile and current booking from API
  const fetchGuestData = useCallback(async () => {
    try {
      // Get guest profile
      const profileResponse = await api.get('/guest/profile');
      if (profileResponse.guest) {
        const email = profileResponse.guest.email || "guest@example.com";
        setGuestEmail(email);
        setGuestName(createGuestName(email));
        setHotelId(profileResponse.guest.hotelId || null);
      }

      // Get current booking
      const bookingResponse = await api.get('/guest/current-booking');
      if (bookingResponse.currentBooking) {
        setCurrentBooking(bookingResponse.currentBooking);
        // Update hotelId from current booking if available
        if (bookingResponse.currentBooking.hotelId) {
          setHotelId(bookingResponse.currentBooking.hotelId);
        }
      }
    } catch (error) {
      console.error("Error fetching guest data:", error);
      // Fallback to localStorage for guest info if API fails
      const token = localStorage.getItem("guestToken");
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split(".")[1]));
          const email = payload.email || "guest@example.com";
          setGuestEmail(email);
          setGuestName(createGuestName(email));
          setHotelId(payload.hotelId || null);
        } catch (error) {
          console.error("Error decoding token:", error);
        }
      }
    }
  }, []);

  useEffect(() => {
    fetchGuestData();
  }, [fetchGuestData]);

  const handleSignOut = () => {
    localStorage.removeItem("guestToken");
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
                <NotificationDropdown
                  onClose={handleCloseNotifications}
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
                    <p className="text-sm font-medium text-foreground">
                      {guestName}
                    </p>
                    <p className="text-xs text-foreground/70">{guestEmail}</p>
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
                  onClick={() => router.push("/profile")}
                  className="text-foreground hover:bg-blue-50 dark:hover:bg-blue-950 focus:bg-blue-50 dark:focus:bg-blue-950"
                >
                  Profile Settings
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => router.push("/notifications")}
                  className="text-foreground hover:bg-blue-50 dark:hover:bg-blue-950 focus:bg-blue-50 dark:focus:bg-blue-950"
                >
                  Notifications
                </DropdownMenuItem>
                {hotelId && (
                  <DropdownMenuItem
                    onClick={() => router.push(`/hotel/${hotelId}`)}
                    className="text-foreground hover:bg-blue-50 dark:hover:bg-blue-950 focus:bg-blue-50 dark:focus:bg-blue-950"
                  >
                    Hotel
                  </DropdownMenuItem>
                )}
                {currentBooking && (
                  <DropdownMenuItem
                    onClick={() => router.push(`/hotel/${currentBooking.hotelId}`)}
                    className="text-foreground hover:bg-blue-50 dark:hover:bg-blue-950 focus:bg-blue-50 dark:focus:bg-blue-950"
                  >
                    Current Booking
                  </DropdownMenuItem>
                )}
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
