"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { CalendarPlus, LayoutDashboard, MapPin } from "lucide-react";

import type { SidebarData } from "@/types/sidebar";

export type SidebarType = "guest" | "hidden";

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
  user: {
    name: "Guest Access",
    email: "guest@shuttleops.com",
    avatar: "/avatars/shadcn.jpg",
  },
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      title: "Select hotels",
      url: "/select-hotels",
      icon: MapPin,
    },
    {
      title: "New booking",
      url: "/new-booking",
      icon: CalendarPlus,
    },
  ],
  navSecondary: [],
};

const guestRouteConfig: Record<
  string,
  {
    headerTitle: string | null;
    sidebarData: SidebarData;
  }
> = {
  "/dashboard": { headerTitle: "Dashboard", sidebarData: guestSidebarData },
  "/select-hotels": {
    headerTitle: "Select hotels",
    sidebarData: guestSidebarData,
  },
  "/new-booking": { headerTitle: null, sidebarData: guestSidebarData },
};

function annotateSidebarDataWithActiveState(
  sidebarData: SidebarData,
  pathname: string
): SidebarData {
  return {
    ...sidebarData,
    navMain: sidebarData.navMain.map((item) => ({
      ...item,
      isActive: pathname.startsWith(item.url),
    })),
    navSecondary: sidebarData.navSecondary.map((item) => ({
      ...item,
      isActive: pathname.startsWith(item.url),
    })),
  };
}

export function useRouteConfig(): RouteConfig {
  const pathname = usePathname() ?? "/";

  return useMemo(() => {
    const matchedGuestRoute = Object.keys(guestRouteConfig).find((guestRoute) =>
      pathname.startsWith(guestRoute)
    );

    if (matchedGuestRoute) {
      const route = guestRouteConfig[matchedGuestRoute];

      return {
        sidebarType: "guest",
        headerTitle: route.headerTitle,
        shouldShowSidebar: true,
        pathname,
        sidebarData: annotateSidebarDataWithActiveState(
          route.sidebarData,
          pathname
        ),
      };
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
