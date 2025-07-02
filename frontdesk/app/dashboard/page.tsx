"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Car, Users, MapPin, Bell, Inbox } from "lucide-react";
import { useWebSocket } from "@/context/WebSocketContext";

interface Notification {
  id: number;
  title: string;
  message: string;
  type: "booking" | "alert" | "info";
  isRead: boolean;
  createdAt: string;
}

export default function DashboardPage() {
  const { notifications, isConnected } = useWebSocket();

  const stats = [
    { name: "Total Shuttles", value: "12", icon: Car, color: "text-blue-600" },
    { name: "Total Drivers", value: "8", icon: Users, color: "text-green-600" },
    { name: "Active Trips", value: "5", icon: MapPin, color: "text-orange-600" },
    { name: "Notifications", value: (notifications as Notification[]).length.toString(), icon: Bell, color: "text-red-600" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">
            Welcome back! Here's what's happening today.
          </p>
          <div className="flex items-center gap-2 mt-2">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm text-gray-600">
              WebSocket: {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
        
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

      {/* Recent Notifications */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {(notifications as Notification[]).length > 0 ? (
              (notifications as Notification[]).slice(0, 5).map((notification) => (
                <div
                  key={notification.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-medium">{notification.title}</h3>
                      {!notification.isRead && (
                        <Badge variant="default">New</Badge>
                      )}
                    </div>
                    <div className="text-sm text-gray-600">
                      <p>{notification.message}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(notification.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge 
                      variant={notification.type === "booking" ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {notification.type}
                    </Badge>
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
                  New notifications will appear here in real-time.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
