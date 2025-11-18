"use client";

import { PropsWithChildren } from "react";
import { GuestSidebar } from "@/components/layout/guest/guest-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { useRouteConfig } from "@/hooks/layout/useRouteConfig";

export default function GuestLayout({ children }: PropsWithChildren) {
  const routeConfig = useRouteConfig();

  return (
    <SidebarProvider className="bg-background text-foreground">
      <div className="flex min-h-screen w-full flex-col md:flex-row">
        {routeConfig.shouldShowSidebar &&
        routeConfig.sidebarType === "guest" ? (
          <GuestSidebar />
        ) : null}
        <SidebarInset className="flex flex-1 flex-col overflow-hidden">
          <div className="flex flex-1 flex-col overflow-y-auto px-6 py-6">
            {routeConfig.headerTitle ? (
              <header className="mb-6 border-b border-border pb-4">
                <div className="text-xs uppercase tracking-[0.4em] text-muted-foreground">
                  Guest area
                </div>
                <h1 className="mt-1 text-2xl font-semibold text-foreground">
                  {routeConfig.headerTitle}
                </h1>
              </header>
            ) : null}
            <div className="flex-1">{children}</div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
