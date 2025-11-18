I need to add a sidebar 

and we will aslo need this type ofg thing "use client";

import { usePathname } from "next/navigation";
import { useMemo } from "react";

export type SidebarType = "organization" | "hidden";

export interface RouteConfig {
  sidebarType: SidebarType;
  headerTitle: string | null;
  shouldShowOrgSelector: boolean;
  shouldShowSidebar: boolean;
  pathname: string;
}

export function useRouteConfig(): RouteConfig {
  const pathname = usePathname();

  return useMemo((): RouteConfig => {
    // Organization routes with sidebar
    if (
      pathname.startsWith("/organization/") ||
      pathname === "/inbox" ||
      pathname === "/members" ||
      pathname === "/org-settings"
    ) {
      return {
        sidebarType: "organization",
        headerTitle: null,
        shouldShowOrgSelector: true,
        shouldShowSidebar: true,
        pathname,
      };
    }

    // Specific dashboard routes with no sidebar
    if (pathname === "/organizations") {
      return {
        sidebarType: "hidden",
        headerTitle: "Organizations",
        shouldShowOrgSelector: false,
        shouldShowSidebar: false,
        pathname,
      };
    }

    if (pathname === "/new") {
      return {
        sidebarType: "hidden",
        headerTitle: "New organization",
        shouldShowOrgSelector: false,
        shouldShowSidebar: false,
        pathname,
      };
    }

    // Auth and welcome routes with no sidebar
    if (
      pathname.startsWith("/auth") ||
      pathname.startsWith("/welcome") ||
      pathname === "/"
    ) {
      return {
        sidebarType: "hidden",
        headerTitle: null,
        shouldShowOrgSelector: false,
        shouldShowSidebar: false,
        pathname,
      };
    }

    // Default fallback for any other routes
    return {
      sidebarType: "hidden",
      headerTitle: "Dashboard",
      shouldShowOrgSelector: false,
      shouldShowSidebar: false,
      pathname,
    };
  }, [pathname]);
}


"use client";
import { PropsWithChildren } from "react";

import { useRouteConfig } from "@/hooks/layout/useRouteConfig";
import {
  SidebarInset,
  SidebarProvider,
} from "@zeropaper/ui/components/sidebar";
import { DynamicSidebar } from "./components/dynamic-sidebar";
import { MainHeader } from "./components/main-header";

const DefaultLayout = ({ children }: PropsWithChildren) => {
  const routeConfig = useRouteConfig();

  return (
    <div>
      <SidebarProvider className="flex h-screen flex-col">
        <div className="flex h-screen w-screen flex-col">
          {/* Main Content Area */}
          <div className="h-100svh flex flex-1 grow overflow-y-auto">
            {/* Dynamic Sidebar */}
            {routeConfig.shouldShowSidebar && (
              <DynamicSidebar sidebarType={routeConfig.sidebarType} />
            )}

            {/* Main Content with Header */}
            <SidebarInset className="@container flex h-full w-full flex-1 flex-col overflow-x-hidden overflow-y-auto">
              {/* Header inside SidebarInset */}
              <MainHeader />
              {/* Page Content */}
              <div className="flex flex-1 flex-col gap-4 p-2">{children}</div>
            </SidebarInset>
          </div>
        </div>
      </SidebarProvider>
    </div>
  );
};

export default DefaultLayout;
"use client";

import { SidebarType } from "@/hooks";
import { OrganizationSidebar } from "./organization-sidebar";

interface DynamicSidebarProps {
  sidebarType: SidebarType;
}

export function DynamicSidebar({ sidebarType }: DynamicSidebarProps) {
  // Render organization sidebar for organization routes
  if (sidebarType === "organization") {
    return <OrganizationSidebar />;
  }

  return null;
}
"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  Cog,
  Eye,
  FileText,
  FolderOpen,
  Inbox,
  LayoutDashboard,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";

import { useSidebarData } from "@/hooks/layout/useSidebarData";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarHeader as UISidebarHeader,
} from "@zeropaper/ui/components/sidebar";
import { SidebarHeader } from "./sidebar-header";

// 1. Orchestrates the staggering of the main sidebar groups
const sidebarVariants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.06,
    },
  },
};

// 2. How each main group (Inbox, Workspace) animates in
const groupVariants = {
  initial: { opacity: 0, y: -20 },
  animate: { opacity: 1, y: 0 },
};

// 3. The "grow/shrink" animation for collapsible sections
const collapsibleVariants = {
  initial: { opacity: 0, height: 0 },
  animate: {
    opacity: 1,
    height: "auto",
    transition: {
      staggerChildren: 0.04,
    },
  },
  exit: { opacity: 0, height: 0 },
};

// 4. How each item *inside* a collapsible section animates
const menuItemVariants = {
  initial: { opacity: 0, x: -15 },
  animate: { opacity: 1, x: 0 },
};

// 5. Premium Chevron icon animation
const iconVariants = {
  initial: { scale: 0.8, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  exit: { scale: 0.8, opacity: 0 },
};

export function OrganizationSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const { activeOrganization } = useSidebarData();

  const [expandedSections, setExpandedSections] = React.useState({
    workspace: true,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  return (
    <Sidebar collapsible="icon" {...props}>
      <UISidebarHeader>
        <SidebarHeader />
      </UISidebarHeader>
      <SidebarContent>
        <motion.div
          key="sidebar-content"
          variants={sidebarVariants}
          initial="initial"
          animate="animate"
          className="space-y-2"
        >
          {/* Inbox - Always at top */}
          <motion.div variants={groupVariants}>
            <SidebarGroup className="gap-0.5">
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === "/inbox"}
                    tooltip="Inbox"
                  >
                    <Link href="/inbox">
                      <Inbox className="h-4 w-4" />
                      <span className="sidebar-text">Inbox</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroup>
          </motion.div>

          {/* Workspace Section */}
          <motion.div variants={groupVariants}>
            <SidebarGroup className="gap-0.5">
              <SidebarGroupLabel
                className="hover:bg-sidebar-accent/50 flex cursor-pointer items-center justify-between rounded-md px-2 py-1"
                onClick={() => toggleSection("workspace")}
              >
                <span>Workspace</span>
                <AnimatePresence mode="wait">
                  {expandedSections.workspace ? (
                    <motion.div
                      key="minus"
                      variants={iconVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                    >
                      <ChevronDownIcon className="h-3 w-3" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="plus"
                      variants={iconVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                    >
                      <ChevronRightIcon className="h-3 w-3" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </SidebarGroupLabel>

              <AnimatePresence initial={false}>
                {expandedSections.workspace && (
                  <motion.div
                    key="workspace-content"
                    variants={collapsibleVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    className="overflow-hidden"
                  >
                    <SidebarMenu>
                      <motion.div variants={menuItemVariants}>
                        <SidebarMenuItem>
                          <SidebarMenuButton
                            asChild
                            isActive={pathname.includes("/dashboard")}
                            tooltip="Dashboard"
                          >
                            <Link
                              href={
                                activeOrganization
                                  ? `/organization/${activeOrganization.slug}/dashboard`
                                  : "/organization/current/dashboard"
                              }
                            >
                              <LayoutDashboard className="h-4 w-4" />
                              <span className="sidebar-text">Dashboard</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      </motion.div>
                      <motion.div variants={menuItemVariants}>
                        <SidebarMenuItem>
                          <SidebarMenuButton
                            asChild
                            isActive={
                              pathname.startsWith("/organization/") &&
                              !pathname.includes("/dashboard") &&
                              !pathname.includes("/datarooms") &&
                              !pathname.includes("/viewer") &&
                              !pathname.includes("/settings")
                            }
                            tooltip="All Documents"
                          >
                            <Link
                              href={
                                activeOrganization
                                  ? `/organization/${activeOrganization.slug}`
                                  : "/organization/current"
                              }
                            >
                              <FileText className="h-4 w-4" />
                              <span className="sidebar-text">
                                All Documents
                              </span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      </motion.div>
                      <motion.div variants={menuItemVariants}>
                        <SidebarMenuItem>
                          <SidebarMenuButton
                            asChild
                            isActive={pathname.includes("/datarooms")}
                            tooltip="Data Rooms"
                          >
                            <Link
                              href={
                                activeOrganization
                                  ? `/organization/${activeOrganization.slug}/datarooms`
                                  : "/organization/current/datarooms"
                              }
                            >
                              <FolderOpen className="h-4 w-4" />
                              <span className="sidebar-text">Data Rooms</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      </motion.div>
                      <motion.div variants={menuItemVariants}>
                        <SidebarMenuItem>
                          <SidebarMenuButton
                            asChild
                            isActive={pathname.includes("/viewer")}
                            tooltip="Viewer"
                          >
                            <Link
                              href={
                                activeOrganization
                                  ? `/organization/${activeOrganization.slug}/viewer`
                                  : "/organization/current/viewer"
                              }
                            >
                              <Eye className="h-4 w-4" />
                              <span className="sidebar-text">Viewer</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      </motion.div>
                      <motion.div variants={menuItemVariants}>
                        <SidebarMenuItem>
                          <SidebarMenuButton
                            asChild
                            isActive={pathname.includes("/settings")}
                            tooltip="Settings"
                          >
                            <Link
                              href={
                                activeOrganization
                                  ? `/organization/${activeOrganization.slug}/settings`
                                  : "/organization/current/settings"
                              }
                            >
                              <Cog className="h-4 w-4" />
                              <span className="sidebar-text">Settings</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      </motion.div>
                    </SidebarMenu>
                  </motion.div>
                )}
              </AnimatePresence>
            </SidebarGroup>
          </motion.div>
        </motion.div>
      </SidebarContent>
      <SidebarFooter />
      <SidebarRail />
    </Sidebar>
  );
}


this is the ref 