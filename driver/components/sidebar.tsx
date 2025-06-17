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
  Moon,
  Sun,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { useToast } from "@/hooks/use-toast";

const navItems = [
  {
    href: "/dashboard",
    icon: Home,
    label: "Dashboard",
    badge: null,
  },
  {
    href: "/dashboard/current-trip",
    icon: Car,
    label: "Current Trip",
    badge: "6",
  },
  {
    href: "/dashboard/next-trip",
    icon: Clock,
    label: "Next Trip",
    badge: null,
  },
  {
    href: "/dashboard/notifications",
    icon: Bell,
    label: "Notifications",
    badge: "3",
  },
  {
    href: "/dashboard/profile",
    icon: User,
    label: "Profile",
    badge: null,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const [driverName, setDriverName] = useState("");
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const name = localStorage.getItem("driverName") || "Driver";
    setDriverName(name);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("driverLoggedIn");
    localStorage.removeItem("driverName");
    toast({
      title: "Logged out successfully",
      description: "See you next time!",
    });
    router.push("/login");
  };

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    toast({
      title: "Theme changed",
      description: `Switched to ${newTheme} mode`,
    });
  };

  return (
    <div
      className={cn(
        "flex flex-col h-screen bg-card border-r transition-all duration-300",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary rounded-xl">
                <Shuttle className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h2 className="font-bold text-lg">Shuttle Pro</h2>
                <p className="text-xs text-muted-foreground">
                  Driver Dashboard
                </p>
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="h-8 w-8"
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Driver Info */}
      {!isCollapsed && (
        <div className="p-4 border-b">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-muted rounded-full flex items-center justify-center">
              <User className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold">{driverName}</p>
              <p className="text-xs text-muted-foreground font-medium">
                ● Online
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
              onClick={() => {
                toast({
                  title: item.label,
                  description: "Navigating to page...",
                });
              }}
            >
              <Icon
                className={cn(
                  "h-5 w-5 transition-transform group-hover:scale-110"
                )}
              />
              {!isCollapsed && (
                <>
                  <span className="font-medium">{item.label}</span>
                  {item.badge && (
                    <Badge
                      className={cn(
                        "ml-auto text-xs",
                        isActive
                          ? "bg-primary-foreground/20 text-primary-foreground"
                          : ""
                      )}
                    >
                      {item.badge}
                    </Badge>
                  )}
                </>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t space-y-2">
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start gap-3",
            isCollapsed && "justify-center"
          )}
          onClick={toggleTheme}
        >
          {theme === "dark" ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
          {!isCollapsed && <span>Toggle Theme</span>}
        </Button>

        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10",
            isCollapsed && "justify-center"
          )}
          onClick={handleLogout}
        >
          <LogOut className="h-5 w-5" />
          {!isCollapsed && <span>Logout</span>}
        </Button>
      </div>
    </div>
  );
}
