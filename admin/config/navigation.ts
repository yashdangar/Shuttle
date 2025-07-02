import {
  LayoutDashboard,
  Building2,
  Users,
  Car,
  Truck,
  Calendar,
  Route,
  MapPin,
  BookOpen,
} from "lucide-react";

export interface NavigationItem {
  name: string;
  href: string;
  icon: any;
  description?: string;
  badge?: string;
  disabled?: boolean;
}

export const adminNavigation: NavigationItem[] = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    description: "Overview and analytics",
  },
  {
    name: "Hotels",
    href: "/hotels",
    icon: Building2,
    description: "Manage hotel information",
  },
  {
    name: "Front Desks",
    href: "/frontdesks",
    icon: Users,
    description: "Manage front desk staff",
  },
  {
    name: "Drivers",
    href: "/drivers",
    icon: Car,
    description: "Manage shuttle drivers",
  },
  {
    name: "Shuttles",
    href: "/shuttles",
    icon: Truck,
    description: "Manage shuttle vehicles",
  },
  {
    name: "Schedules",
    href: "/schedules",
    icon: Calendar,
    description: "Manage shuttle schedules",
  },
  {
    name: "Bookings",
    href: "/bookings",
    icon: BookOpen,
    description: "View and manage bookings",
  },
  // {
  //   name: "Trips",
  //   href: "/trips",
  //   icon: Route,
  //   description: "Monitor active trips",
  //   disabled: true,
  // },
];

export interface UserProfile {
  name: string;
  email: string;
  role: string;
  avatar?: string;
}

export const defaultUserProfile: UserProfile = {
  name: "Admin User",
  email: "admin@shuttle.com",
  role: "Administrator",
}; 