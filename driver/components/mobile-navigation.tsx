"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Home,
  Car,
  Bell,
  User,
  LogOut,
  Menu,
  X,
  MapPin,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationDropdown } from "./notification-dropdown";
import { useDriverProfile } from "@/context/DriverProfileContext";
import { useNotifications } from "@/hooks/use-notifications";
import { ChatSheet } from "@/components/chat-sheet";
import { useHotelId } from "@/hooks/use-hotel-id";

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
];

export function MobileNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const [driverName, setDriverName] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const { profile, loading } = useDriverProfile();
  const { getUnreadCount } = useNotifications();
  const notificationCount = getUnreadCount();
  const { hotelId } = useHotelId();

  useEffect(() => {
    const name = localStorage.getItem("driverName") || "Driver";
    setDriverName(name);
  }, []);

  const handleSignOut = () => {
    localStorage.removeItem("driverToken");
    localStorage.removeItem("driverLoggedIn");
    localStorage.removeItem("driverName");
    router.push("/login");
  };

  const handleToggleNotifications = () => {
    setShowNotifications(!showNotifications);
  };

  const handleCloseNotifications = () => {
    setShowNotifications(false);
  };

  const handleNavigation = (href: string) => {
    router.push(href);
    setIsSheetOpen(false);
  };

  return (
    <>
      {/* Mobile Top Bar */}
      <header className="bg-background border-b border-border px-4 py-3 lg:hidden">
        <div className="flex items-center justify-between">
          {/* Left side - Logo and Menu */}
          <div className="flex items-center gap-3">
            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="hover:bg-blue-50 dark:hover:bg-blue-950"
                >
                  <Menu className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[280px] p-0">
                <SheetHeader className="p-4 border-b border-border">
                  <SheetTitle className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-600 dark:bg-blue-500 rounded-lg flex items-center justify-center">
                      <span className="text-white font-semibold">S</span>
                    </div>
                    <span className="font-semibold text-lg text-foreground">Shuttle</span>
                  </SheetTitle>
                </SheetHeader>
                
                {/* Navigation Items */}
                <div className="p-4 space-y-2">
                  {navItems.map((item) => (
                    <Button
                      key={item.href}
                      variant="ghost"
                      className={cn(
                        "w-full justify-start gap-3 hover:bg-blue-50 dark:hover:bg-blue-950 h-12",
                        pathname === item.href && "bg-blue-100 dark:bg-blue-900"
                      )}
                      onClick={() => handleNavigation(item.href)}
                    >
                      <item.icon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      <span className="text-foreground font-medium">{item.title}</span>
                    </Button>
                  ))}
                </div>

                {/* User Info */}
                <div className="mt-auto p-4 border-t border-border">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-blue-600 dark:bg-blue-500 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      {loading ? (
                        <>
                          <p className="text-sm font-medium text-foreground truncate">
                            Loading...
                          </p>
                          <p className="text-xs text-foreground/70">
                            Please wait
                          </p>
                        </>
                      ) : profile ? (
                        <>
                          <p className="text-sm font-medium text-foreground truncate">
                            {profile.name}
                          </p>
                          <p className="text-xs text-foreground/70 truncate">
                            {profile.email}
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-sm font-medium text-foreground truncate">
                            {driverName}
                          </p>
                          <p className="text-xs text-foreground/70">
                            Driver
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-3 hover:bg-red-50 dark:hover:bg-red-950 hover:text-red-600 dark:hover:text-red-400"
                    onClick={handleSignOut}
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Sign Out</span>
                  </Button>
                </div>
              </SheetContent>
            </Sheet>

            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 dark:bg-blue-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-semibold">S</span>
              </div>
              <span className="font-semibold text-lg text-foreground">Shuttle</span>
            </div>
          </div>

          {/* Right side - Notifications and Profile */}
          <div className="flex items-center gap-2">
            {/* Chat Button */}
            {hotelId && <ChatSheet hotelId={hotelId} />}

            {/* Notifications */}
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

            {/* Profile Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="hover:bg-blue-50 dark:hover:bg-blue-950"
                >
                  <div className="w-8 h-8 bg-blue-600 dark:bg-blue-500 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
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