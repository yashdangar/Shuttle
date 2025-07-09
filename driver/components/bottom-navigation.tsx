"use client";

import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Home, Car, User, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/hooks/use-notifications";
import { Badge } from "@/components/ui/badge";

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
    title: "Profile",
    icon: User,
    href: "/dashboard/profile",
  },
];

export function BottomNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const { getUnreadCount } = useNotifications();
  const notificationCount = getUnreadCount();

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-background border-t border-border z-50">
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map((item) => (
          <Button
            key={item.href}
            variant="ghost"
            size="sm"
            className={cn(
              "flex flex-col items-center gap-1 h-16 w-full rounded-none hover:bg-blue-50 dark:hover:bg-blue-950",
              pathname === item.href && "bg-blue-100 dark:bg-blue-900"
            )}
            onClick={() => router.push(item.href)}
          >
            <div className="relative">
              <item.icon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              {item.title === "Profile" && notificationCount > 0 && (
                <Badge className="absolute -top-1 -right-1 w-4 h-4 p-0 flex items-center justify-center bg-red-500 text-white text-xs">
                  {notificationCount > 9 ? "9+" : notificationCount}
                </Badge>
              )}
            </div>
            <span className="text-xs font-medium text-foreground">{item.title}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}
