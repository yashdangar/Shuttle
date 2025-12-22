"use client";

import {
  IconDotsVertical,
  IconLogout,
  IconMoon,
  IconNotification,
  IconSun,
  IconUser,
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
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

export function NavUser() {
  const { isMobile } = useSidebar();
  const { theme, setTheme } = useTheme();
  const { user: sessionUser } = useAuthSession();
  const router = useRouter();
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

  const profileArgs = sessionUser?.id
    ? ({ userId: sessionUser.id as Id<"users"> } as const)
    : "skip";
  const profile = useQuery(api.users.index.getUserProfile, profileArgs);
  const profilePictureUrl = useQuery(
    api.files.index.getProfilePictureUrl,
    profile?.profilePictureId
      ? ({ fileId: profile.profilePictureId } as const)
      : "skip"
  );

  const fallbackUser: SidebarUser = {
    name: "Guest User",
    email: "guest@example.com",
    avatar: "/placeholder-user.jpg",
  };

  const avatarUrl =
    profilePictureUrl || sessionUser?.image || fallbackUser.avatar;
  const avatarUrlWithCacheBust =
    avatarUrl && avatarUrl !== fallbackUser.avatar && profile?.profilePictureId
      ? `${avatarUrl}${avatarUrl.includes("?") ? "&" : "?"}v=${profile.profilePictureId}`
      : avatarUrl;

  const user = profile
    ? {
        name: profile.name || fallbackUser.name,
        email: profile.email || fallbackUser.email,
        avatar: avatarUrlWithCacheBust,
      }
    : sessionUser
      ? {
          name: sessionUser.name || fallbackUser.name,
          email: sessionUser.email || fallbackUser.email,
          avatar: avatarUrlWithCacheBust,
        }
      : fallbackUser;

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
              <Avatar
                key={profile?.profilePictureId || user.avatar}
                className="h-8 w-8 rounded-lg"
              >
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
                <Avatar
                  key={profile?.profilePictureId || user.avatar}
                  className="h-8 w-8 rounded-lg"
                >
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
              <DropdownMenuItem
                onClick={() => router.push("/profile")}
                className="cursor-pointer"
              >
                <IconUser className="mr-2 size-4" />
                Profile
              </DropdownMenuItem>
              {/* <DropdownMenuItem onClick={() => setTheme(themeToggleTarget)}>
                {themeIcon}
                <div className="flex flex-col">
                  <span>{themeLabel}</span>
                  <span className="text-xs text-muted-foreground">
                    {themeDescription}
                  </span>
                </div>
              </DropdownMenuItem> */}
              <DropdownMenuItem
                onClick={() => router.push("/notifications")}
                className="cursor-pointer"
              >
                <IconNotification className="mr-2 size-4" />
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
