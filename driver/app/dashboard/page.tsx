"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, MapPin, Users, Clock, Car, TrendingUp } from "lucide-react";
import { NotificationDropdown } from "@/components/notification-dropdown";
import { toast } from "sonner";
import { useWebSocket } from "@/context/WebSocketContext";

export default function DashboardPage() {
  const [driverName, setDriverName] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationCount, setNotificationCount] = useState(3);
  const { socket, isConnected } = useWebSocket();

  useEffect(() => {
    // You can add other WebSocket listeners here if they are specific to this page
    // For example, listening for live trip updates
  }, [socket]);

  useEffect(() => {
    const name = localStorage.getItem("driverName") || "Driver";
    setDriverName(name);

    // Welcome toast
    toast.success("Welcome back!", {
      description: "Your dashboard is ready",
    });
  }, []);

  const currentTime = new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const handleCardClick = (cardName: string) => {
    toast.loading(cardName, {
      description: "Loading detailed information...",
    });
  };

  return (
    <div className="space-y-6 bg-background">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Welcome back,</h1>
          <p className="text-xl font-semibold text-foreground">{driverName}</p>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Current Trip Status */}
        <Card
          className="hover:shadow-lg transition-all cursor-pointer border-border hover:border-blue-300 dark:hover:border-blue-700"
          onClick={() => handleCardClick("Current Trip Status")}
        >
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg text-foreground">
              <div className="p-2 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <Car className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              Current Trip Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-2xl font-bold text-foreground">Active</p>
            <p className="text-sm text-foreground">
              Terminal A → Downtown Hotels
            </p>
            <p className="text-sm text-foreground">Started: {currentTime}</p>
          </CardContent>
        </Card>

        {/* Next Trip */}
        <Card
          className="hover:shadow-lg transition-all cursor-pointer border-border hover:border-blue-300 dark:hover:border-blue-700"
          onClick={() => handleCardClick("Next Trip")}
        >
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg text-foreground">
              <div className="p-2 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              Next Trip
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-2xl font-bold text-foreground">2:30 PM</p>
            <p className="text-sm text-foreground">Downtown → Terminal B</p>
            <p className="text-sm text-foreground">8 passengers scheduled</p>
          </CardContent>
        </Card>

        {/* Total Passengers */}
        <Card
          className="hover:shadow-lg transition-all cursor-pointer border-border hover:border-blue-300 dark:hover:border-blue-700"
          onClick={() => handleCardClick("Current Trip Passengers")}
        >
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg text-foreground">
              <div className="p-2 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              Current Passengers
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-2xl font-bold text-foreground">6 / 12</p>
            <p className="text-sm text-foreground">4 checked in, 2 pending</p>
            <div className="w-full bg-blue-100 dark:bg-blue-900 rounded-full h-2">
              <div
                className="bg-blue-600 dark:bg-blue-400 h-2 rounded-full transition-all duration-500"
                style={{ width: "50%" }}
              ></div>
            </div>
          </CardContent>
        </Card>

        {/* Next Passenger */}
        <Card
          className="hover:shadow-lg transition-all cursor-pointer border-border hover:border-blue-300 dark:hover:border-blue-700"
          onClick={() => handleCardClick("Next Passenger")}
        >
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg text-foreground">
              <div className="p-2 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <MapPin className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              Next Passenger
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="font-semibold text-foreground">Sarah Johnson</p>
              <p className="text-sm text-foreground">Hilton Downtown Hotel</p>
              <p className="text-sm text-foreground">2 passengers, 3 bags</p>
            </div>
            <Button
              size="sm"
              className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white"
              onClick={(e) => {
                e.stopPropagation();
                toast.loading("Opening map", {
                  description: "Loading passenger location...",
                });
              }}
            >
              <MapPin className="h-4 w-4 mr-2" />
              View on Map
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Performance Stats */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            Today's Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">12</p>
              <p className="text-sm text-foreground">Trips Completed</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">48</p>
              <p className="text-sm text-foreground">Passengers Served</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">4.9</p>
              <p className="text-sm text-foreground">Rating</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
