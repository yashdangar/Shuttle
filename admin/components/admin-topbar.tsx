"use client";

import { Bell, Search, User, PanelLeft } from "lucide-react";
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
import { useAdminProfile } from "@/hooks/use-admin-profile";
import { useNotifications } from "@/hooks/use-notifications";
import { Skeleton } from "@/components/ui/skeleton";

export function AdminTopbar({
  onToggleSidebar,
}: {
  onToggleSidebar?: () => void;
}) {
  const router = useRouter();
  const { profile, loading } = useAdminProfile();
  const { unreadCount } = useNotifications();

  const handleSignOut = () => {
    localStorage.removeItem("adminToken");
    router.push("/login");
  };

  return (
    <header className="bg-white border-b border-slate-200 px-6 py-4">
      <div className="flex flex-1 items-center justify-between">
        <div className="flex items-center space-x-4">
          {onToggleSidebar && (
            <Button variant="ghost" size="icon" onClick={onToggleSidebar}>
              <PanelLeft className="w-5 h-5" />
            </Button>
          )}
        </div>

        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <Badge className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center bg-red-500 text-white text-xs">
                {unreadCount > 99 ? '99+' : unreadCount}
              </Badge>
            )}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <div className="text-left">
                  {loading ? (
                    <>
                      <Skeleton className="h-4 w-20 mb-1" />
                      <Skeleton className="h-3 w-32" />
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-medium">{profile.name}</p>
                      <p className="text-xs text-slate-500">{profile.email}</p>
                    </>
                  )}
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                {loading ? <Skeleton className="h-4 w-24" /> : profile.name}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push("/profile")}>
                Profile Settings
              </DropdownMenuItem>
              <DropdownMenuItem>Notifications</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>Sign Out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
