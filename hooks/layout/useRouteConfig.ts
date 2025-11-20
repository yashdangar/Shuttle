"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { useAuthSession } from "@/hooks/use-auth-session";
import {
  CalendarPlus,
  LayoutDashboard,
  MapPin,
  Shield,
  Users,
} from "lucide-react";
import type { SidebarData } from "@/types/sidebar";

export type SidebarType =
  | "guest"
  | "admin"
  | "hidden"
  | "driver"
  | "superadmin";

export interface RouteConfig {
  sidebarType: SidebarType;
  headerTitle: string | null;
  shouldShowSidebar: boolean;
  pathname: string;
  sidebarData: SidebarData | null;
  hiddenRoutes: string[];
}

const guestSidebarData: SidebarData = {
  organization: {
    name: "Shuttle OPS",
    url: "/dashboard",
    icon: LayoutDashboard,
  },
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      title: "New booking",
      url: "/select-hotels",
      icon: CalendarPlus,
      matchPaths: ["/select-hotels", "/new-booking"],
    },
    {
      title: "Bookings",
      url: "/bookings",
      icon: CalendarPlus,
    },
  ],
  navSecondary: [],
};

const adminSidebarData: SidebarData = {
  organization: {
    name: "Shuttle Admin",
    url: "/admin",
    icon: Shield,
  },
  navMain: [
    { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
    { title: "Drivers", url: "/admin/drivers", icon: MapPin },
    { title: "Frontdesk", url: "/admin/frontdesk", icon: CalendarPlus },
    { title: "Shuttles", url: "/admin/shuttle", icon: MapPin },
  ],
  navSecondary: [],
};

const driverSidebarData: SidebarData = {
  organization: {
    name: "Shuttle Driver",
    url: "/driver/dashboard",
    icon: Shield,
  },
  navMain: [{ title: "Dashboard", url: "/driver", icon: LayoutDashboard }],
  navSecondary: [],
};

const superAdminSidebarData: SidebarData = {
  organization: {
    name: "Shuttle Super Admin",
    url: "/super-admin",
    icon: Shield,
  },
  navMain: [
    { title: "Dashboard", url: "/super-admin", icon: LayoutDashboard },
    { title: "Admin", url: "/super-admin/admin", icon: Users },
    { title: "Locations", url: "/super-admin/locations", icon: MapPin },
  ],
  navSecondary: [],
};

const roleSidebarMap: Record<string, SidebarData> = {
  guest: guestSidebarData,
  admin: adminSidebarData,
  driver: driverSidebarData,
  superadmin: superAdminSidebarData,
  frontdesk: guestSidebarData,
};

const hiddenRoutes: string[] = ["/", "/sign-in", "/sign-up"];

function annotateSidebarDataWithActiveState(
  sidebarData: SidebarData,
  pathname: string
): SidebarData {
  const isNavItemActive = (paths: string[], currentPath: string) =>
    paths.some((path) => currentPath === path);

  return {
    ...sidebarData,
    navMain: sidebarData.navMain.map((item) => {
      const matchPaths = item.matchPaths?.length ? item.matchPaths : [item.url];
      return {
        ...item,
        isActive: isNavItemActive(matchPaths, pathname),
      };
    }),
    navSecondary: sidebarData.navSecondary.map((item) => {
      const matchPaths = item.matchPaths?.length ? item.matchPaths : [item.url];
      return {
        ...item,
        isActive: isNavItemActive(matchPaths, pathname),
      };
    }),
  };
}

export function useRouteConfig(): RouteConfig {
  const pathname = usePathname() ?? "/";
  const { user } = useAuthSession();

  return useMemo(() => {
    if (hiddenRoutes.includes(pathname)) {
      return {
        sidebarType: "hidden",
        headerTitle: null,
        shouldShowSidebar: false,
        pathname,
        sidebarData: null,
        hiddenRoutes,
      };
    }

    const role = user?.role ?? "guest";
    const sidebarData = roleSidebarMap[role] ?? guestSidebarData;

    return {
      sidebarType: role as SidebarType,
      headerTitle: sidebarData.organization.name,
      shouldShowSidebar: true,
      pathname,
      sidebarData: annotateSidebarDataWithActiveState(sidebarData, pathname),
      hiddenRoutes,
    };
  }, [pathname, user?.role]);
}
