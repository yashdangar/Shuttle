"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";

export type SidebarType = "guest" | "hidden";

export interface RouteConfig {
  sidebarType: SidebarType;
  headerTitle: string | null;
  shouldShowSidebar: boolean;
  pathname: string;
}

const guestRouteConfig: Record<
  string,
  {
    headerTitle: string | null;
  }
> = {
  "/dashboard": { headerTitle: "Dashboard" },
  "/select-hotels": { headerTitle: "Select hotels" },
  "/new-booking": { headerTitle: null },
};

export function useRouteConfig(): RouteConfig {
  const pathname = usePathname() ?? "/";

  return useMemo(() => {
    const matchedGuestRoute = Object.keys(guestRouteConfig).find((guestRoute) =>
      pathname.startsWith(guestRoute)
    );

    if (matchedGuestRoute) {
      return {
        sidebarType: "guest",
        headerTitle: guestRouteConfig[matchedGuestRoute].headerTitle,
        shouldShowSidebar: true,
        pathname,
      };
    }

    return {
      sidebarType: "hidden",
      headerTitle: null,
      shouldShowSidebar: false,
      pathname,
    };
  }, [pathname]);
}
