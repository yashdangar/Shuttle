"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowRightLeft,
  CalendarPlus,
  LayoutDashboard,
  MapPin,
} from "lucide-react";

const guestNavigation = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    description: "Overview",
  },
  {
    label: "Select hotels",
    href: "/select-hotels",
    icon: MapPin,
    description: "Browse & filter",
  },
  {
    label: "New booking",
    href: "/new-booking",
    icon: CalendarPlus,
    description: "Create trip",
  },
];

export function GuestSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar className="border-r border-border" collapsible="offcanvas">
      <SidebarHeader className="gap-1">
        <Link href="/" className="flex items-center gap-2 rounded-lg px-2 py-1">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary font-semibold">
            SH
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold leading-none">
              Shuttle OPS
            </span>
            <span className="text-xs text-muted-foreground">Guest access</span>
          </div>
        </Link>
        <Badge variant="outline" className="w-fit px-2 text-xs">
          Guest
        </Badge>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workflows</SidebarGroupLabel>
          <SidebarMenu>
            {guestNavigation.map((item) => {
              const Icon = item.icon;
              return (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname.startsWith(item.href)}
                  >
                    <Link href={item.href} className="items-center">
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
        <SidebarSeparator />
        <SidebarGroup>
          <SidebarGroupLabel>Need a driver?</SidebarGroupLabel>
          <div className="rounded-lg border border-dashed border-border/60 bg-muted/30 px-3 py-4 text-sm text-muted-foreground">
            Assign a shuttle driver to your upcoming hotel transfers or request
            support for special itineraries.
            <Button
              variant="secondary"
              size="sm"
              className="mt-3 w-full justify-between"
            >
              Request driver
              <ArrowRightLeft className="h-4 w-4" />
            </Button>
          </div>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <Button size="sm" className="w-full">
          <CalendarPlus className="mr-2 h-4 w-4" />
          Quick booking
        </Button>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
