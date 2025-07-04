import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";

interface Notification {
  id: number;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
  driverId: number | null;
  guestId: number | null;
  frontDeskId: number | null;
  adminId: number | null;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.get("/driver/notifications");
      setNotifications(data.notifications);
    } catch (err: any) {
      console.error("Error fetching notifications:", err);
      setError(err.message || "Failed to fetch notifications");
      toast.error("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, []);

  const markAsRead = useCallback(async (notificationId: number) => {
    try {
      await api.put(`/driver/notifications/${notificationId}/read`, {
        headers: {
          "Content-Type": "application/json",
        },
      });
      setNotifications(prev =>
        prev.map(notification =>
          notification.id === notificationId
            ? { ...notification, isRead: true }
            : notification
        )
      );
      toast.success("Notification marked as read");
    } catch (err: any) {
      console.error("Error marking notification as read:", err);
      toast.error("Failed to mark notification as read");
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      const data = await api.put("/driver/notifications/mark-all-read", {
        headers: {
          "Content-Type": "application/json",
        },
      });
      setNotifications(prev =>
        prev.map(notification => ({ ...notification, isRead: true }))
      );
      toast.success("All notifications marked as read", {
        description: `${data.updatedCount} notifications updated`,
      });
    } catch (err: any) {
      console.error("Error marking all notifications as read:", err);
      toast.error("Failed to mark all notifications as read");
    }
  }, []);

  const getUnreadCount = useCallback(() => {
    return notifications.filter(notification => !notification.isRead).length;
  }, [notifications]);

  const formatTimeAgo = useCallback((dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return "Just now";
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
    } else {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} day${days !== 1 ? "s" : ""} ago`;
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  return {
    notifications,
    loading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    getUnreadCount,
    formatTimeAgo,
  };
} 