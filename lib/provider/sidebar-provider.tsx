"use client";

import { PropsWithChildren, type CSSProperties } from "react";
import { AppSidebar } from "@/components/sidebar/app-sidebar";
import { SiteHeader } from "@/components/sidebar/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { useRouteConfig } from "@/hooks/layout/useRouteConfig";
import { useAuthSession } from "@/hooks/use-auth-session";

export default function SidebarProviderLayout({ children }: PropsWithChildren) {
  const routeConfig = useRouteConfig();
  const { user } = useAuthSession();
  return (
    <SidebarProvider
      className="bg-background text-foreground"
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as CSSProperties
      }
    >
      {routeConfig.shouldShowSidebar && routeConfig.sidebarData ? (
        <AppSidebar variant="inset" data={routeConfig.sidebarData} />
      ) : null}
      <SidebarInset className="flex min-h-screen flex-1 flex-col">
        {!routeConfig.hiddenRoutes.includes(routeConfig.pathname) ? <SiteHeader title={routeConfig.headerTitle ?? undefined} /> : null}
          <div className="flex-1">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
