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
} from "lucide-react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

const schedules = [
  {
    id: 1,
    route: "Terminal A → Downtown Hotels",
    time: "6:00 AM - 8:00 AM",
    days: ["Mon", "Wed", "Fri"],
    status: "active",
  },
  {
    id: 2,
    route: "Downtown Hotels → Terminal B",
    time: "2:00 PM - 4:00 PM",
    days: ["Mon", "Tue", "Wed", "Thu", "Fri"],
    status: "active",
  },
  {
    id: 3,
    route: "Terminal C → City Center",
    time: "6:00 PM - 8:00 PM",
    days: ["Sat", "Sun"],
    status: "active",
  },
  {
    id: 4,
    route: "Airport Express Route",
    time: "10:00 PM - 12:00 AM",
    days: ["Fri", "Sat"],
    status: "inactive",
  },
];

export default function ProfilePage() {
  const [driverName, setDriverName] = useState("");
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const name = localStorage.getItem("driverName") || "John Smith";
    setDriverName(name);
    toast({
      title: "Profile loaded",
      description: "Your profile information is ready",
    });
  }, [toast]);

  const handleLogout = () => {
    localStorage.removeItem("driverLoggedIn");
    localStorage.removeItem("driverName");
    toast({
      title: "Logged out successfully",
      description: "See you next time!",
    });
    router.push("/login");
  };

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    toast({
      title: "Theme changed",
      description: `Switched to ${newTheme} mode`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <h1 className="text-3xl font-bold">Driver Profile</h1>

      {/* Profile Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 bg-muted rounded-lg">
              <User className="h-5 w-5" />
            </div>
            Personal Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 bg-primary rounded-2xl flex items-center justify-center">
              <User className="h-10 w-10 text-primary-foreground" />
            </div>
            <div>
              <h3 className="text-2xl font-bold">{driverName}</h3>
              <p className="text-muted-foreground font-medium">
                Professional Driver
              </p>
              <div className="flex items-center gap-2 mt-1">
                <Star className="h-4 w-4 fill-current" />
                <span className="text-sm font-medium">4.9 Rating</span>
              </div>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="flex items-center gap-3 p-3 bg-card rounded-lg border">
              <Phone className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium">+1 (555) 123-4567</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-card rounded-lg border">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium">john.smith@airport.com</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-card rounded-lg border">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium">Driver since March 2023</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            Performance Stats
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-muted rounded-xl">
              <p className="text-3xl font-bold">156</p>
              <p className="text-sm text-muted-foreground">Total Trips</p>
            </div>
            <div className="text-center p-4 bg-muted rounded-xl">
              <p className="text-3xl font-bold">624</p>
              <p className="text-sm text-muted-foreground">Passengers</p>
            </div>
            <div className="text-center p-4 bg-muted rounded-xl">
              <p className="text-3xl font-bold">4.9</p>
              <p className="text-sm text-muted-foreground">Rating</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Assigned Schedules */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Assigned Schedules
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {schedules.map((schedule) => (
            <div
              key={schedule.id}
              className="border rounded-xl p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-bold text-lg">{schedule.route}</h4>
                  <p className="text-sm text-muted-foreground font-medium">
                    {schedule.time}
                  </p>
                </div>
                <Badge
                  variant={
                    schedule.status === "active" ? "default" : "secondary"
                  }
                >
                  {schedule.status}
                </Badge>
              </div>

              <div className="flex gap-2">
                {schedule.days.map((day) => (
                  <Badge key={day} variant="outline" className="text-xs">
                    {day}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted rounded-xl">
            <div className="flex items-center gap-3">
              {theme === "dark" ? (
                <Moon className="h-5 w-5" />
              ) : (
                <Sun className="h-5 w-5" />
              )}
              <span className="font-medium">Theme</span>
            </div>
            <Button variant="outline" size="sm" onClick={toggleTheme}>
              Switch to {theme === "dark" ? "Light" : "Dark"}
            </Button>
          </div>

          <div className="flex items-center justify-between p-4 bg-muted rounded-xl">
            <div className="flex items-center gap-3">
              <LogOut className="h-5 w-5 text-destructive" />
              <span className="font-medium">Account</span>
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
