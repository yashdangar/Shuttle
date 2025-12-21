"use client";

import { PropsWithChildren, useEffect, useRef } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuthSession } from "@/hooks/use-auth-session";
import { toast } from "sonner";

interface NotificationProviderProps extends PropsWithChildren {}

const STORAGE_KEYS = {
  SHOWN_NOTIFICATIONS: "shown_notifications",
  LAST_SHOWN_TIMESTAMP: "last_shown_timestamp",
};

export function NotificationProvider({ children }: NotificationProviderProps) {
  const { user } = useAuthSession();
  const lastNotificationIds = useRef<Set<string>>(new Set());

  // Query for user notifications
  const notifications = useQuery(
    api.notifications.index.listUserNotifications,
    user ? { userId: user.id as any, limit: 10 } : "skip"
  );

  useEffect(() => {
    if (!notifications || !user) return;

    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000; // 1 hour in milliseconds

    // Get stored data from localStorage
    const storedShownNotifications = localStorage.getItem(STORAGE_KEYS.SHOWN_NOTIFICATIONS);
    const storedLastShownTimestamp = localStorage.getItem(STORAGE_KEYS.LAST_SHOWN_TIMESTAMP);
    
    const shownNotifications = storedShownNotifications ? new Set(JSON.parse(storedShownNotifications)) : new Set<string>();
    const lastShownTimestamp = storedLastShownTimestamp ? parseInt(storedLastShownTimestamp) : 0;

    // Filter notifications: only from last hour, not read, not already shown, and max 3
    const recentNotifications = notifications
      .filter((notification: any) => {
        // Only notifications from the last hour
        const createdAt = notification.createdAt || notification._creationTime;
        if (createdAt < oneHourAgo) return false;
        
        // Don't show read notifications
        if (notification.isRead) return false;
        
        // Don't show notifications that were already shown
        if (shownNotifications.has(notification.id)) return false;
        
        return true;
      })
      .slice(0, 3); // Maximum 3 notifications

    // Show toast for each recent notification
    recentNotifications.forEach((notification: any) => {
      // Determine toast type based on notification type
      let toastType: "success" | "error" | "info" | "warning" = "info";
      
      switch (notification.type) {
        case "BOOKING_CONFIRMED":
          toastType = "success";
          break;
        case "BOOKING_FAILED":
        case "BOOKING_REJECTED":
          toastType = "error";
          break;
        case "NEW_BOOKING":
          toastType = "info";
          break;
        default:
          toastType = "info";
      }

      // Show toast notification for 3 seconds
      toast(notification.message, {
        description: notification.title,
        duration: 3000, // 3 seconds
        position: "top-right",
        action: notification.relatedBookingId
          ? {
              label: "View Booking",
              onClick: () => {
                // Navigate to booking page
                window.location.href = `/booking/${notification.relatedBookingId}`;
              },
            }
          : undefined,
      });

      // Add to shown notifications set
      shownNotifications.add(notification.id);
      lastNotificationIds.current.add(notification.id);
    });

    // Update localStorage with new shown notifications and timestamp
    if (recentNotifications.length > 0) {
      localStorage.setItem(STORAGE_KEYS.SHOWN_NOTIFICATIONS, JSON.stringify(Array.from(shownNotifications)));
      localStorage.setItem(STORAGE_KEYS.LAST_SHOWN_TIMESTAMP, now.toString());
    }

    // Clean up old notification IDs to prevent memory leaks
    if (lastNotificationIds.current.size > 100) {
      const idsArray = Array.from(lastNotificationIds.current);
      // Keep only the most recent 50 IDs
      lastNotificationIds.current = new Set(idsArray.slice(-50));
    }

    // Optional: Clean up localStorage entries older than 24 hours
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    if (lastShownTimestamp < oneDayAgo) {
      localStorage.removeItem(STORAGE_KEYS.SHOWN_NOTIFICATIONS);
      localStorage.removeItem(STORAGE_KEYS.LAST_SHOWN_TIMESTAMP);
    }
  }, [notifications, user]);

  return <>{children}</>;
}
