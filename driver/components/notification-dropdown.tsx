"use client";

import { Bell, CheckCircle, AlertTriangle, Info, Clock } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const recentNotifications = [
  {
    id: 1,
    title: "New Trip Assigned",
    message: "You have been assigned to Trip #1234",
    time: "5 minutes ago",
    type: "info",
    read: false,
  },
  {
    id: 2,
    title: "Trip Reminder",
    message: "Your next trip starts in 30 minutes",
    time: "1 hour ago",
    type: "warning",
    read: false,
  },
  {
    id: 3,
    title: "System Update",
    message: "New features have been added to the dashboard",
    time: "2 hours ago",
    type: "success",
    read: true,
  },
];

interface NotificationDropdownProps {
  onClose: () => void;
}

export function NotificationDropdown({ onClose }: NotificationDropdownProps) {
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

  return (
    <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-slate-200 overflow-hidden">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Notifications</h3>
          <button
            className="text-sm text-blue-600 hover:text-blue-700"
            onClick={() => {
              toast.error("Failed to clear notifications");
            }}
          >
            Clear all
          </button>
        </div>
      </div>
      <div className="max-h-[400px] overflow-y-auto">
        {recentNotifications.map((notification) => (
          <div
            key={notification.id}
            className={cn(
              "flex items-start gap-3 p-3 hover:bg-slate-50 transition-colors cursor-pointer",
              !notification.read && "bg-blue-50"
            )}
            onClick={() => {
              toast.error("Failed to mark notification as read");
            }}
          >
            <div className="mt-1">{getIcon(notification.type)}</div>
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
                  {notification.time}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="p-3 border-t bg-slate-50">
        <Link
          href="/dashboard/notifications"
          className="block text-center text-sm text-blue-600 hover:text-blue-700"
          onClick={() => {
            toast.error("Failed to clear notifications");
          }}
        >
          View all notifications
        </Link>
      </div>
    </div>
  );
}
