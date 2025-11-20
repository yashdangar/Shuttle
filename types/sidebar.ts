import type { ComponentType } from "react";

export interface SidebarOrganization {
  name: string;
  url: string;
  icon?: ComponentType<{ className?: string }>;
}

export interface SidebarUser {
  name: string;
  email: string;
  avatar: string;
}

export interface SidebarNavItem {
  title: string;
  url: string;
  icon?: ComponentType<{ className?: string }>;
  isActive?: boolean;
  matchPaths?: string[];
}

export interface SidebarSecondaryItem {
  title: string;
  url: string;
  icon: ComponentType<{ className?: string }>;
  isActive?: boolean;
  matchPaths?: string[];
}

export interface SidebarData {
  organization: SidebarOrganization;
  navMain: SidebarNavItem[];
  navSecondary: SidebarSecondaryItem[];
}
