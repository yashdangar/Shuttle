"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Check, Trash2, Bell, AlertCircle, Info, CheckCheck } from "lucide-react";
import { fetchWithAuth } from "@/lib/api";
import { withAuth } from "@/components/withAuth";
import { EmptyState } from "@/components/ui/empty-state";
import { useWebSocket } from "@/context/WebSocketContext";

interface Notification {
  id: number;
  title: string;
  message: string;
  type: "booking" | "alert" | "info";
  isRead: boolean;
  createdAt: string;
}

function NotificationsPage() {
  const [loading, setLoading] = useState(true);

  const { notifications, refreshNotifications, markUserInteraction } = useWebSocket();

  useEffect(() => {
    refreshNotifications().finally(() => setLoading(false));
  }, [refreshNotifications]);

  // Mark user interaction on component mount to enable audio
  useEffect(() => {
    markUserInteraction();
  }, [markUserInteraction]);

  const markAsRead = async (id: number) => {
    try {
      const response = await fetchWithAuth(
        `/frontdesk/notifications/${id}/read`,
        {
          method: "PUT",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to mark notification as read");
      }

      toast.success("Notification has been marked as read.");
      
      // Refresh notifications
      await refreshNotifications();
    } catch (error) {
      console.error("Error marking notification as read:", error);
      toast.error("Failed to mark notification as read. Please try again.");
    }
  };

  const deleteNotification = async (id: number) => {
    try {
      const response = await fetchWithAuth(`/frontdesk/notifications/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete notification");
      }

      toast.success("Notification has been removed.");
      
      // Refresh notifications
      await refreshNotifications();
    } catch (error) {
      console.error("Error deleting notification:", error);
      toast.error("Failed to delete notification. Please try again.");
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetchWithAuth(
        `/frontdesk/notifications/mark-all-read`,
        {
          method: "PUT",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to mark all notifications as read");
      }

      toast.success("All notifications have been marked as read.");
      
      // Refresh notifications
      await refreshNotifications();
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      toast.error("Failed to mark all notifications as read. Please try again.");
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "booking":
        return <Bell className="h-5 w-5 text-blue-600" />;
      case "alert":
        return <AlertCircle className="h-5 w-5 text-orange-600" />;
      default:
        return <Info className="h-5 w-5 text-gray-600" />;
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
            <p className="text-gray-600">
              Stay updated with your shuttle operations
            </p>
          </div>
        </div>
        <Card>
          <CardContent>
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="animate-pulse">
                  <div className="flex items-start gap-4">
                    <div className="h-5 w-5 bg-gray-200 rounded-full"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <div className="flex items-center gap-2">
            <p className="text-gray-600">
              Stay updated with your shuttle operations
            </p>
            {unreadCount > 0 && (
              <Badge variant="secondary">
                {unreadCount} unread
              </Badge>
            )}
          </div>
        </div>
        {unreadCount > 0 && (
          <Button
            onClick={markAllAsRead}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <CheckCheck className="h-4 w-4" />
            Mark all as read
          </Button>
        )}
      </div>

      <div className="space-y-4">
        {notifications.length === 0 ? (
          <Card>
            <CardContent>
              <EmptyState
                icon={Bell}
                title="No notifications"
                description="You're all caught up! New notifications will appear here."
              />
            </CardContent>
          </Card>
        ) : (
          notifications.map((notification) => (
            <Card
              key={notification.id}
              className={`transition-all hover:shadow-md ${
                !notification.isRead
                  ? "border-l-4 border-l-blue-500 bg-blue-50/30"
                  : ""
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 mt-1">
                    {getIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3
                          className={`font-medium ${
                            !notification.isRead
                              ? "text-gray-900"
                              : "text-gray-700"
                          }`}
                        >
                          {notification.title}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-500 mt-2">
                          {new Date(notification.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {!notification.isRead && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => markAsRead(notification.id)}
                            title="Mark as read"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteNotification(notification.id)}
                          title="Delete notification"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

export default withAuth(NotificationsPage);
