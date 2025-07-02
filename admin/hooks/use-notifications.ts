"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";

export interface Notification {
  id: number;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError(null);
      // You can implement this API endpoint later
      // const response = await api.get("/admin/notifications");
      // setNotifications(response.notifications || []);
      
      // For now, return empty array
      setNotifications([]);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      setError("Failed to load notifications");
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: number) => {
    try {
      // You can implement this API endpoint later
      // await api.put(`/admin/notifications/${notificationId}/read`);
      
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, isRead: true }
            : notification
        )
      );
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return {
    notifications,
    unreadCount,
    loading,
    error,
    refetch: fetchNotifications,
    markAsRead,
  };
} 