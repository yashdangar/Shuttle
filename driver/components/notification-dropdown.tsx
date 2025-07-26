"use client";

import { Bell, CheckCircle, AlertTriangle, Info, Clock } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useCallback } from "react";
import { useNotifications } from "@/hooks/use-notifications";

// Helper function to determine notification type based on title/message
const getNotificationType = (title: string, message: string) => {
  const lowerTitle = title.toLowerCase();
  const lowerMessage = message.toLowerCase();
  
  if (lowerTitle.includes("success") || lowerTitle.includes("confirmed") || lowerMessage.includes("successfully")) {
    return "success";
  } else if (lowerTitle.includes("warning") || lowerTitle.includes("alert") || lowerTitle.includes("traffic") || lowerTitle.includes("delay")) {
    return "warning";
  } else {
    return "info";
  }
};

interface NotificationDropdownProps {
  onClose: () => void;
}

export function NotificationDropdown({ onClose }: NotificationDropdownProps) {
  const { notifications, markAsRead, markAllAsRead, formatTimeAgo } = useNotifications();
  
  // Get only recent notifications (first 5)
  const recentNotifications = notifications.slice(0, 5);

  const getIcon = (type: string) => {
    switch (type) {
      case "success":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case "info":
        return <Info className="h-5 w-5 text-blue-500" />;
      default:
        return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };

  const handleClearAll = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    markAllAsRead();
  }, [markAllAsRead]);

  const handleMarkAsRead = useCallback((e: React.MouseEvent, notificationId: number) => {
    e.preventDefault();
    e.stopPropagation();
    markAsRead(notificationId);
  }, [markAsRead]);

  const handleViewAll = useCallback(() => {
    onClose();
  }, [onClose]);

  return (
    <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-slate-200 overflow-hidden">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Notifications</h3>
          <button
            className="text-sm text-blue-600 hover:text-blue-700"
            onClick={handleClearAll}
          >
            Mark all Read
          </button>
        </div>
      </div>
      <div className="max-h-[400px] overflow-y-auto">
        {recentNotifications.length > 0 ? (
          recentNotifications.map((notification) => {
            const notificationType = getNotificationType(notification.title, notification.message);
            return (
              <div
                key={notification.id}
                className={cn(
                  "flex items-start gap-3 p-3 hover:bg-slate-50 transition-colors cursor-pointer",
                  !notification.isRead && "bg-blue-50"
                )}
                onClick={(e) => !notification.isRead && handleMarkAsRead(e, notification.id)}
              >
                <div className="mt-1">{getIcon(notificationType)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900">
                    {notification.title}
                  </p>
                  <p className="text-sm text-slate-500 truncate">
                    {notification.message}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Clock className="h-3 w-3 text-slate-400" />
                    <span className="text-xs text-slate-400">
                      {formatTimeAgo(notification.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-4 text-center text-slate-500">
            <Bell className="h-8 w-8 mx-auto mb-2 text-slate-400" />
            <p className="text-sm">No notifications</p>
          </div>
        )}
      </div>
      <div className="p-3 border-t bg-slate-50">
        <Link
          href="/dashboard/notifications"
          className="block text-center text-sm text-blue-600 hover:text-blue-700"
          onClick={handleViewAll}
        >
          View all notifications
        </Link>
      </div>
    </div>
  );
}
