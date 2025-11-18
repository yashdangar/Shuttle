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
}

export interface SidebarSecondaryItem {
  title: string;
  url: string;
  icon: ComponentType<{ className?: string }>;
  isActive?: boolean;
}

export interface SidebarData {
  organization: SidebarOrganization;
  user: SidebarUser;
  navMain: SidebarNavItem[];
  navSecondary: SidebarSecondaryItem[];
}
