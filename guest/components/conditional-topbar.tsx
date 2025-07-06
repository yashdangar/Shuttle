"use client";

import { usePathname } from "next/navigation";
import { GuestTopbar } from "./guest-topbar";

export function ConditionalTopbar() {
  const pathname = usePathname();

  // Pages where we don't want to show the topbar
  const excludedPaths = ["/login", "/auth", "/auth/callback", "/hotel"];

  // Check if current path should show topbar
  const shouldShowTopbar =
    !excludedPaths.some((path) => pathname.startsWith(path)) &&
    pathname !== "/";

  if (!shouldShowTopbar) {
    return null;
  }

  return <GuestTopbar />;
}
