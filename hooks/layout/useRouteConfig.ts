"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { CalendarPlus, LayoutDashboard, MapPin, Shield } from "lucide-react";

import type { SidebarData } from "@/types/sidebar";

export type SidebarType = "guest" | "admin" | "hidden" | "driver" | "superadmin" ;

export interface RouteConfig {
  sidebarType: SidebarType;
  headerTitle: string | null;
  shouldShowSidebar: boolean;
  pathname: string;
  sidebarData: SidebarData | null;
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
    url: "/admin/dashboard",
    icon: Shield,
  },
  navMain: [
    {
      title: "Dashboard",
      url: "/admin/dashboard",
      icon: LayoutDashboard,
    },
  ],
  navSecondary: [],
};

const driverSidebarData: SidebarData = {
  organization: {
    name: "Shuttle Driver",
    url: "/driver/dashboard",
    icon: Shield,
  },
  navMain: [
    {
      title: "Dashboard",
      url: "/driver",
      icon: LayoutDashboard,
    },
  ],
  navSecondary: [],
};

const superAdminSidebarData: SidebarData = {
  organization: {
    name: "Shuttle Super Admin",
    url: "/super-admin",
    icon: Shield,
  },
  navMain: [
    {
      title: "Dashboard",
      url: "/super-admin",
      icon: LayoutDashboard,
    },
  ],
  navSecondary: [],
};

const routeGroups: Array<{
  sidebarType: SidebarType;
  sidebarData: SidebarData;
  headers: Record<string, string | null>;
}> = [
  {
    sidebarType: "guest",
    sidebarData: guestSidebarData,
    headers: {
      "/dashboard": "Dashboard",
      "/select-hotels": "New booking",
      "/new-booking": null,
      "/bookings": "Bookings",
    },
  },
  {
    sidebarType: "admin",
    sidebarData: adminSidebarData,
    headers: {
      "/admin": "Dashboard",
    },
  },
  {
    sidebarType: "driver",
    sidebarData: driverSidebarData,
    headers: {
      "/driver": "Dashboard",
    },
  },
  {
    sidebarType: "superadmin",
    sidebarData: superAdminSidebarData,
    headers: {
      "/super-admin": "Dashboard",
    },
  },
];

function annotateSidebarDataWithActiveState(
  sidebarData: SidebarData,
  pathname: string
): SidebarData {
  const isNavItemActive = (paths: string[], currentPath: string) =>
    paths.some((path) => currentPath.startsWith(path));

  return {
    ...sidebarData,
    navMain: sidebarData.navMain.map((item) => {
      const matchPaths = item.matchPaths?.length
        ? item.matchPaths
        : [item.url];
      return {
        ...item,
        isActive: isNavItemActive(matchPaths, pathname),
      };
    }),
    navSecondary: sidebarData.navSecondary.map((item) => {
      const matchPaths = item.matchPaths?.length
        ? item.matchPaths
        : [item.url];
      return {
        ...item,
        isActive: isNavItemActive(matchPaths, pathname),
      };
    }),
  };
}

export function useRouteConfig(): RouteConfig {
  const pathname = usePathname() ?? "/";

  return useMemo(() => {
    for (const routeGroup of routeGroups) {
      const matchedRoute = Object.keys(routeGroup.headers).find((route) =>
        pathname.startsWith(route)
      );

      if (matchedRoute) {
        return {
          sidebarType: routeGroup.sidebarType,
          headerTitle: routeGroup.headers[matchedRoute],
          shouldShowSidebar: true,
          pathname,
          sidebarData: annotateSidebarDataWithActiveState(
            routeGroup.sidebarData,
            pathname
          ),
        };
      }
    }

    return {
      sidebarType: "hidden",
      headerTitle: null,
      shouldShowSidebar: false,
      pathname,
      sidebarData: null,
    };
  }, [pathname]);
}
