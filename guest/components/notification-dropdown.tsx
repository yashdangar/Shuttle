"use client";

import { Bell, X, CheckCircle, AlertCircle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useRouter } from "next/navigation";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: "success" | "warning" | "info";
  timestamp: string;
  read: boolean;
}

export function NotificationDropdown({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  // Mock notifications - in a real app, these would come from an API
  const notifications: Notification[] = [
    {
      id: "1",
      title: "Booking Confirmed",
      message: "Your shuttle booking for tomorrow has been confirmed.",
      type: "success",
      timestamp: "2 hours ago",
      read: false,
    },
    {
      id: "2",
      title: "Driver Update",
      message: "Your driver will arrive 5 minutes early.",
      type: "info",
      timestamp: "1 hour ago",
      read: false,
    },
    {
      id: "3",
      title: "Payment Successful",
      message: "Payment for your recent booking has been processed.",
      type: "success",
      timestamp: "3 hours ago",
      read: true,
    },
    {
      id: "4",
      title: "Service Reminder",
      message: "Don't forget to rate your recent shuttle experience.",
      type: "warning",
      timestamp: "1 day ago",
      read: true,
    },
  ];

  const getIcon = (type: string) => {
    switch (type) {
      case "success":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "warning":
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case "info":
        return <Info className="w-4 h-4 text-blue-500" />;
      default:
        return <Bell className="w-4 h-4 text-gray-500" />;
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleViewAllNotifications = () => {
    onClose();
    router.push("/notifications");
  };

  return (
    <div className="absolute right-0 top-12 w-80 z-50">
      <Card className="shadow-lg border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">Notifications</CardTitle>
            <div className="flex items-center space-x-2">
              {unreadCount > 0 && (
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  {unreadCount} new
                </Badge>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-6 w-6"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-80">
            <div className="space-y-1">
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  <Bell className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p>No notifications yet</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 border-b border-border last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer ${
                      !notification.read ? "bg-blue-50 dark:bg-blue-950/20" : ""
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-0.5">
                        {getIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-foreground">
                            {notification.title}
                          </p>
                          {!notification.read && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          )}
                        </div>
                        <p className="text-sm text-foreground/70 mt-1">
                          {notification.message}
                        </p>
                        <p className="text-xs text-foreground/50 mt-2">
                          {notification.timestamp}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
          {notifications.length > 0 && (
            <div className="p-3 border-t border-border">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                onClick={handleViewAllNotifications}
              >
                View All Notifications
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 