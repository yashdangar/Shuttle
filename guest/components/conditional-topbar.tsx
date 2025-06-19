"use client";

import { usePathname } from "next/navigation";
import { GuestTopbar } from "./guest-topbar";

export function ConditionalTopbar() {
  const pathname = usePathname();
  
  // Pages where we don't want to show the topbar
  const excludedPaths = [
    "/login",
    "/auth",
    "/auth/callback",
  ];
  
  // Check if current path should show topbar
  const shouldShowTopbar = !excludedPaths.some(path => pathname.startsWith(path));
  
  if (!shouldShowTopbar) {
    return null;
  }
  
  return <GuestTopbar />;
} 