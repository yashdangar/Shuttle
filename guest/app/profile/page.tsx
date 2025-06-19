"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  User,
  Phone,
  Mail,
  Calendar,
  Clock,
  LogOut,
  Moon,
  Sun,
  Star,
  MapPin,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const recentBookings = [
  {
    id: 1,
    route: "Hilton Downtown → Airport Terminal A",
    date: "Dec 15, 2024",
    time: "9:00 AM",
    status: "completed",
  },
  {
    id: 2,
    route: "Marriott Hotel → Airport Terminal B",
    date: "Dec 12, 2024",
    time: "2:30 PM",
    status: "completed",
  },
  {
    id: 3,
    route: "Airport Terminal C → Grand Hotel",
    date: "Dec 10, 2024",
    time: "11:15 AM",
    status: "completed",
  },
  {
    id: 4,
    route: "Sheraton Hotel → Airport Terminal A",
    date: "Dec 8, 2024",
    time: "7:45 AM",
    status: "completed",
  },
];

export default function ProfilePage() {
  const [guestName, setGuestName] = useState("");
  const { theme, setTheme } = useTheme();
  const router = useRouter();

  useEffect(() => {
    const name = localStorage.getItem("guestName") || "John Doe";
    setGuestName(name);
    toast.success("Profile loaded");
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("guestToken");
    localStorage.removeItem("currentBooking");
    localStorage.removeItem("guestName");
    toast.success("Logged out successfully");
    router.push("/login");
  };

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    toast.success(`Switched to ${newTheme} mode`);
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <h1 className="text-3xl font-bold text-foreground">Guest Profile</h1>

      {/* Profile Information */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            Personal Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 bg-blue-600 dark:bg-blue-500 rounded-2xl flex items-center justify-center">
              <User className="h-10 w-10 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-foreground">{guestName}</h3>
              <p className="text-foreground/70 font-medium">
                Valued Guest
              </p>
              <div className="flex items-center gap-2 mt-1">
                <Star className="h-4 w-4 text-blue-600 dark:text-blue-400 fill-current" />
                <span className="text-sm font-medium text-foreground">Premium Member</span>
              </div>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="flex items-center gap-3 p-3 bg-background rounded-lg border border-border hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
              <Phone className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <span className="font-medium text-foreground">+1 (555) 123-4567</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-background rounded-lg border border-border hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
              <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <span className="font-medium text-foreground">john.doe@example.com</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-background rounded-lg border border-border hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
              <MapPin className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <span className="font-medium text-foreground">123 Main St, New York, NY 10001</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-background rounded-lg border border-border hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
              <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <span className="font-medium text-foreground">Member since January 2023</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Travel Stats */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Star className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            Travel Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-950 rounded-xl">
              <p className="text-3xl font-bold text-foreground">24</p>
              <p className="text-sm text-foreground/70">Total Rides</p>
            </div>
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-950 rounded-xl">
              <p className="text-3xl font-bold text-foreground">8</p>
              <p className="text-sm text-foreground/70">Hotels Visited</p>
            </div>
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-950 rounded-xl">
              <p className="text-3xl font-bold text-foreground">4.8</p>
              <p className="text-sm text-foreground/70">Average Rating</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Settings */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-950 rounded-xl">
            <div className="flex items-center gap-3">
              <LogOut className="h-5 w-5 text-destructive" />
              <span className="font-medium text-foreground">Account</span>
            </div>
            <Button variant="destructive" size="sm" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 