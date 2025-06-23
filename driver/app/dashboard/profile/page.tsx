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
  Star,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

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
  const router = useRouter();

  useEffect(() => {
    const name = localStorage.getItem("driverName") || "John Smith";
    setDriverName(name);
    toast.success("Profile loaded");
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("driverLoggedIn");
    localStorage.removeItem("driverName");
    toast.success("Logged out successfully");
    router.push("/login");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <h1 className="text-3xl font-bold text-foreground">Driver Profile</h1>

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
              <h3 className="text-2xl font-bold text-foreground">{driverName}</h3>
              <p className="text-foreground/70 font-medium">
                Professional Driver
              </p>
              <div className="flex items-center gap-2 mt-1">
                <Star className="h-4 w-4 text-blue-600 dark:text-blue-400 fill-current" />
                <span className="text-sm font-medium text-foreground">4.9 Rating</span>
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
              <span className="font-medium text-foreground">john.smith@airport.com</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-background rounded-lg border border-border hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
              <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <span className="font-medium text-foreground">Driver since March 2023</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Stats */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Star className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            Performance Stats
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-950 rounded-xl">
              <p className="text-3xl font-bold text-foreground">156</p>
              <p className="text-sm text-foreground/70">Total Trips</p>
            </div>
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-950 rounded-xl">
              <p className="text-3xl font-bold text-foreground">624</p>
              <p className="text-sm text-foreground/70">Passengers</p>
            </div>
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-950 rounded-xl">
              <p className="text-3xl font-bold text-foreground">4.9</p>
              <p className="text-sm text-foreground/70">Rating</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Assigned Schedules */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            Assigned Schedules
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {schedules.map((schedule) => (
            <div
              key={schedule.id}
              className="border border-border rounded-xl p-4 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-bold text-lg text-foreground">{schedule.route}</h4>
                  <p className="text-sm text-foreground/70 font-medium">
                    {schedule.time}
                  </p>
                </div>
                <Badge
                  variant={schedule.status === "active" ? "default" : "secondary"}
                  className={schedule.status === "active" ? "bg-blue-600 dark:bg-blue-500" : ""}
                >
                  {schedule.status}
                </Badge>
              </div>

              <div className="flex gap-2">
                {schedule.days.map((day) => (
                  <Badge key={day} variant="outline" className="text-xs border-blue-200 dark:border-blue-800">
                    {day}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
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
