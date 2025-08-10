"use client";

import { useMemo, useState } from "react";
import { Bell, Check, CheckCheck, AlertCircle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useWebSocket } from "@/context/WebSocketContext";
import { fetchWithAuth } from "@/lib/api";
import { cn } from "@/lib/utils";

type Notification = {
  id: number;
  title: string;
  message: string;
  type: "booking" | "alert" | "info";
  isRead: boolean;
  createdAt: string;
};

// Relative time helper for modern timestamps
function timeAgo(iso: string) {
  const date = new Date(iso);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  const thresholds: [number, Intl.RelativeTimeFormatUnit][] = [
    [60, "second"],
    [60, "minute"],
    [24, "hour"],
    [7, "day"],
    [4.34524, "week"],
    [12, "month"],
    [Number.POSITIVE_INFINITY, "year"],
  ];
  let count = seconds;
  let unit: Intl.RelativeTimeFormatUnit = "second";
  for (let i = 0; i < thresholds.length; i++) {
    const [step, nextUnit] = thresholds[i];
    if (count < step) {
      unit = nextUnit;
      break;
    }
    count = Math.floor(count / step);
  }
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  return rtf.format(-count, unit);
}

export function NotificationDropdown() {
  // Backwards-compatible named export
  return <NotificationDropdownRenderer />;
}

export default function NotificationDropdownRenderer() {
  const { notifications } = useWebSocket();
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const unreadCount = useMemo(
    () => (notifications as Notification[]).filter((n) => !n.isRead).length,
    [notifications]
  );
  const filtered = useMemo(() => {
    const list = notifications as Notification[];
    return filter === "unread" ? list.filter((n) => !n.isRead) : list;
  }, [filter, notifications]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative data-[state=open]:bg-muted/60"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 inline-flex h-5 min-w-[1.1rem] items-center justify-center rounded-full bg-blue-600 px-1.5 text-[10px] font-semibold text-white shadow-md">
              {unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-[420px] p-0 overflow-hidden rounded-xl shadow-lg ring-1 ring-black/5"
      >
        <div className="relative">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-300/60 to-transparent" />
          <DropdownMenuLabel className="flex items-center justify-between px-4 py-3 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-blue-50 text-blue-600 ring-1 ring-inset ring-blue-200">
                <Bell className="h-3.5 w-3.5" />
              </span>
              <span className="text-sm font-semibold">Notifications</span>
              {unreadCount > 0 && (
                <Badge variant="secondary" className="ml-1">{unreadCount}</Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <FilterToggle value={filter} onChange={setFilter} />
              <MarkAllButton />
            </div>
          </DropdownMenuLabel>
        </div>
        <DropdownMenuSeparator />
        <ScrollArea className="max-h-[380px]">
          <div className="py-2">
            {filtered.length === 0 ? (
              <EmptyState unreadOnly={filter === "unread"} />
            ) : (
              filtered.map((n) => <NotificationRow key={n.id} notification={n} />)
            )}
          </div>
        </ScrollArea>
        <DropdownMenuSeparator />
        <div className="p-2">
          <Button
            variant="ghost"
            className="w-full justify-center text-sm"
            onClick={() => (window.location.href = "/dashboard/notifications")}
          >
            View all
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MarkAllButton() {
  const { notifications, refreshNotifications } = useWebSocket();
  const [loading, setLoading] = useState(false);
  const unread = (notifications as Notification[]).some((n) => !n.isRead);

  const onClick = async () => {
    try {
      setLoading(true);
      await fetchWithAuth(`/frontdesk/notifications/mark-all-read`, {
        method: "PUT",
      });
      await refreshNotifications();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (!unread) return null;

  return (
    <Button
      onClick={onClick}
      size="sm"
      variant="outline"
      className="h-7 gap-1 border-blue-200 text-blue-700 hover:bg-blue-50"
      disabled={loading}
    >
      <CheckCheck className="h-3.5 w-3.5" />
      {loading ? "Marking..." : "Mark all as read"}
    </Button>
  );
}

function NotificationRow({ notification }: { notification: Notification }) {
  const { refreshNotifications } = useWebSocket();
  const onMarkOne = async () => {
    try {
      await fetchWithAuth(`/frontdesk/notifications/${notification.id}/read`, {
        method: "PUT",
      });
      await refreshNotifications();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div
      className={cn(
        "group relative flex items-start gap-3 px-4 py-3 transition-colors",
        !notification.isRead ? "bg-blue-50/40" : "hover:bg-muted/50"
      )}
    >
      <div className="mt-0.5 flex-shrink-0">
        <span
          className={cn(
            "inline-flex h-7 w-7 items-center justify-center rounded-full ring-1 ring-inset",
            notification.type === "booking" && "bg-blue-50 text-blue-600 ring-blue-200",
            notification.type === "alert" && "bg-orange-50 text-orange-600 ring-orange-200",
            notification.type === "info" && "bg-gray-50 text-gray-600 ring-gray-200"
          )}
        >
          {notification.type === "booking" ? (
            <Bell className="h-3.5 w-3.5" />
          ) : notification.type === "alert" ? (
            <AlertCircle className="h-3.5 w-3.5" />
          ) : (
            <Info className="h-3.5 w-3.5" />
          )}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div
              className={cn(
                "truncate text-sm font-medium",
                !notification.isRead ? "text-gray-900" : "text-gray-700"
              )}
            >
              {notification.title}
            </div>
            <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
              {notification.message}
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground">
              {timeAgo(notification.createdAt)}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!notification.isRead && (
              <span className="mr-1 inline-flex h-2 w-2 translate-y-1 rounded-full bg-blue-600" />
            )}
            {!notification.isRead && (
              <Button
                onClick={onMarkOne}
                variant="ghost"
                size="icon"
                className="h-6 w-6 hover:bg-blue-50"
                title="Mark as read"
              >
                <Check className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function FilterToggle({
  value,
  onChange,
}: {
  value: "all" | "unread";
  onChange: (v: "all" | "unread") => void;
}) {
  return (
    <div className="inline-flex items-center rounded-md border border-gray-200 bg-white p-0.5 text-xs">
      <button
        className={cn(
          "rounded-sm px-2 py-1 transition-colors",
          value === "all" ? "bg-gray-100 text-gray-900" : "text-gray-600 hover:text-gray-900"
        )}
        onClick={() => onChange("all")}
      >
        All
      </button>
      <button
        className={cn(
          "rounded-sm px-2 py-1 transition-colors",
          value === "unread" ? "bg-gray-100 text-gray-900" : "text-gray-600 hover:text-gray-900"
        )}
        onClick={() => onChange("unread")}
      >
        Unread
      </button>
    </div>
  );
}

function EmptyState({ unreadOnly }: { unreadOnly: boolean }) {
  return (
    <div className="px-6 py-10 text-center text-sm text-muted-foreground">
      <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-gray-50 ring-1 ring-inset ring-gray-200">
        <Bell className="h-5 w-5 text-gray-400" />
      </div>
      <div className="font-medium text-gray-900">{unreadOnly ? "No unread notifications" : "You're all caught up!"}</div>
      <div className="mt-1 text-xs text-muted-foreground">
        {unreadOnly
          ? "You have read all your notifications."
          : "We’ll let you know when something new arrives."}
      </div>
    </div>
  );
}


