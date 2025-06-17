"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, CheckCircle, AlertTriangle, Info, Clock } from "lucide-react";
import { toast } from "sonner";

const notifications = [
  {
    id: 1,
    title: "New Passenger Added",
    message:
      "Sarah Johnson has been added to your current trip. Pickup at Hilton Downtown Hotel.",
    time: "2 minutes ago",
    type: "info",
    read: false,
  },
  {
    id: 2,
    title: "Route Update",
    message:
      "Traffic detected on Main Street. Alternative route suggested via Oak Avenue.",
    time: "5 minutes ago",
    type: "warning",
    read: false,
  },
  {
    id: 3,
    title: "Passenger Check-in",
    message: "Mike Chen has successfully checked in. Seat A1 assigned.",
    time: "8 minutes ago",
    type: "success",
    read: false,
  },
  {
    id: 4,
    title: "Trip Reminder",
    message:
      "Your next trip starts in 30 minutes. Route: Downtown → Terminal B",
    time: "15 minutes ago",
    type: "info",
    read: true,
  },
  {
    id: 5,
    title: "Payment Confirmed",
    message: "Payment received from Emily Davis. Amount: $45.00",
    time: "1 hour ago",
    type: "success",
    read: true,
  },
  {
    id: 6,
    title: "Schedule Change",
    message:
      "Your 4:00 PM trip has been rescheduled to 4:15 PM due to flight delay.",
    time: "2 hours ago",
    type: "warning",
    read: true,
  },
];

export default function NotificationsPage() {
  const [notificationList, setNotificationList] = useState(notifications);
  const unreadCount = notificationList.filter((n) => !n.read).length;

  const markAsRead = (id: number) => {
    setNotificationList((prev) =>
      prev.map((notification) =>
        notification.id === id ? { ...notification, read: true } : notification
      )
    );
    toast.error("Failed to mark notification as read");
  };

  const markAllAsRead = () => {
    setNotificationList((prev) =>
      prev.map((notification) => ({ ...notification, read: true }))
    );
    toast.success("All notifications marked as read", {
      description: `${unreadCount} notifications updated`,
    });
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "success":
        return <CheckCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />;
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-blue-600 dark:text-blue-400" />;
      case "info":
      default:
        return <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Notifications</h1>
          {unreadCount > 0 && (
            <p className="text-sm text-foreground">
              {unreadCount} unread notification{unreadCount !== 1 ? "s" : ""}
            </p>
          )}
        </div>
        {unreadCount > 0 && (
          <Button 
            variant="outline" 
            onClick={markAllAsRead}
            className="border-blue-200 hover:bg-blue-50 dark:border-blue-800 dark:hover:bg-blue-950"
          >
            Mark All Read
          </Button>
        )}
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {notificationList.map((notification) => (
          <Card
            key={notification.id}
            className={`hover:shadow-lg transition-all cursor-pointer border-border hover:border-blue-300 dark:hover:border-blue-700 ${
              !notification.read ? "bg-blue-50 dark:bg-blue-950" : ""
            }`}
            onClick={() => !notification.read && markAsRead(notification.id)}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 mt-1">
                  {getIcon(notification.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-bold text-lg text-foreground">{notification.title}</h3>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {!notification.read && (
                        <Badge className="text-xs bg-blue-600 dark:bg-blue-500 text-white">New</Badge>
                      )}
                    </div>
                  </div>

                  <p className="text-sm text-foreground mb-3 leading-relaxed">
                    {notification.message}
                  </p>

                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-sm text-foreground">
                      {notification.time}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {notificationList.length === 0 && (
        <div className="text-center py-16">
          <Bell className="h-16 w-16 mx-auto mb-4 text-blue-600 dark:text-blue-400" />
          <h3 className="text-xl font-semibold mb-2 text-foreground">
            No notifications
          </h3>
          <p className="text-foreground">You're all caught up!</p>
        </div>
      )}
    </div>
  );
}
