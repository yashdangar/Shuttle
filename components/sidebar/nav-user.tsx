"use client";

import {
  IconDotsVertical,
  IconLogout,
  IconMoon,
  IconNotification,
  IconSun,
} from "@tabler/icons-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useTheme } from "next-themes";
import { useAuthSession } from "@/hooks/use-auth-session";
import type { SidebarUser } from "@/types/sidebar";
import { signOut } from "next-auth/react";

export function NavUser({ fallbackUser }: { fallbackUser?: SidebarUser }) {
  const { isMobile } = useSidebar();
  const { theme, setTheme } = useTheme();
  const { user: sessionUser } = useAuthSession();
  const resolvedTheme = theme ?? "system";
  const isLightTheme = resolvedTheme === "light";
  const themeToggleTarget = isLightTheme ? "dark" : "light";
  const themeIcon = isLightTheme ? (
    <IconSun className="mr-2 size-4" />
  ) : (
    <IconMoon className="mr-2 size-4" />
  );
  const themeLabel =
    resolvedTheme === "system"
      ? "System theme"
      : isLightTheme
        ? "Light theme"
        : "Dark theme";
  const themeDescription =
    themeToggleTarget === "light"
      ? "Switch to light theme"
      : "Switch to dark theme";

  const user = sessionUser
    ? {
        name: sessionUser.name || fallbackUser?.name || "User",
        email: sessionUser.email || fallbackUser?.email || "user@example.com",
        avatar:
          sessionUser.image || fallbackUser?.avatar || "/placeholder-user.jpg",
      }
    : fallbackUser || {
        name: "Guest User",
        email: "guest@example.com",
        avatar: "/placeholder-user.jpg",
      };

  const initials =
    user.name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "US";
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg grayscale">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="rounded-lg">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.name}</span>
                <span className="text-muted-foreground truncate text-xs">
                  {user.email}
                </span>
              </div>
              <IconDotsVertical className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="rounded-lg">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.name}</span>
                  <span className="text-muted-foreground truncate text-xs">
                    {user.email}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => setTheme(themeToggleTarget)}>
                {themeIcon}
                <div className="flex flex-col">
                  <span>{themeLabel}</span>
                  <span className="text-xs text-muted-foreground">
                    {themeDescription}
                  </span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <IconNotification />
                Notifications
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => signOut({ callbackUrl: "/" })}
              className="cursor-pointer"
            >
              <IconLogout />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
