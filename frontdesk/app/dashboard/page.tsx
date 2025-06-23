"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Car, Users, MapPin, Bell, Inbox } from "lucide-react";
import { useWebSocket } from "@/context/WebSocketContext";

const stats = [
  { name: "Total Shuttles", value: "12", icon: Car, color: "text-blue-600" },
  { name: "Total Drivers", value: "8", icon: Users, color: "text-green-600" },
  { name: "Active Trips", value: "5", icon: MapPin, color: "text-orange-600" },
  { name: "Notifications", value: "3", icon: Bell, color: "text-red-600" },
];

export default function DashboardPage() {
  const { notifications } = useWebSocket();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">
          Welcome back! Here's what's happening today.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.name} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {stat.name}
              </CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Active Trips */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Booking Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {notifications.length > 0 ? (
              notifications.map((notification) => (
                <div
                  key={notification.booking.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-medium">{notification.title}</h3>
                      <Badge variant="default">New</Badge>
                    </div>
                    <div className="text-sm text-gray-600">
                      <p>{notification.message}</p>
                      <p>Booking ID: {notification.booking.id}</p>
                      <p>Guests: {notification.booking.numberOfPersons}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      {new Date(
                        notification.booking.preferredTime
                      ).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Inbox className="mx-auto h-12 w-12" />
                <h3 className="mt-2 text-sm font-medium">
                  No new notifications
                </h3>
                <p className="mt-1 text-sm">
                  New bookings will appear here in real-time.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
