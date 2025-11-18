"use client";

import { PropsWithChildren, type CSSProperties } from "react";
import { AppSidebar } from "@/components/sidebar/app-sidebar";
import { SiteHeader } from "@/components/sidebar/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { useRouteConfig } from "@/hooks/layout/useRouteConfig";

export default function SuperAdminLayout({ children }: PropsWithChildren) {
  const routeConfig = useRouteConfig();

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
        <SiteHeader title={routeConfig.headerTitle ?? undefined} />
        <div className="flex flex-1 flex-col overflow-y-auto px-6 py-6">
          {routeConfig.headerTitle ? (
            <header className="mb-6 border-b border-border pb-4">
              <div className="text-xs uppercase tracking-[0.4em] text-muted-foreground">
                Super Admin area
              </div>
              <h1 className="mt-1 text-2xl font-semibold text-foreground">
                {routeConfig.headerTitle}
              </h1>
            </header>
          ) : null}
          <div className="flex-1">{children}</div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
