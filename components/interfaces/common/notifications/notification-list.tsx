"use client";

import { CheckCheck, Inbox, Loader2 } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";
import type { NotificationRecord } from "@/convex/notifications";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EmptyMuted } from "@/components/interfaces/common/EmptyState";

type NotificationListProps = {
  notifications: NotificationRecord[];
  onMarkRead: (id: Id<"notifications">) => void;
  markingId: Id<"notifications"> | null;
  selectedIds: Id<"notifications">[];
  onToggleSelect: (id: Id<"notifications">) => void;
  emptyTitle: string;
  emptyDescription: string;
};

export function NotificationList({
  notifications,
  onMarkRead,
  markingId,
  selectedIds,
  onToggleSelect,
  emptyTitle,
  emptyDescription,
}: NotificationListProps) {
  if (!notifications.length) {
    return (
      <EmptyMuted
        title={emptyTitle}
        description={emptyDescription}
        icon={<Inbox className="size-6" />}
      />
    );
  }

  return (
    <ScrollArea className="max-h-[70vh]">
      <div className="space-y-4 pr-2">
        {notifications.map((notification) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onMarkRead={onMarkRead}
            isMarking={markingId === notification.id}
            isSelected={selectedIds.includes(notification.id)}
            onToggleSelect={onToggleSelect}
          />
        ))}
      </div>
    </ScrollArea>
  );
}

type NotificationItemProps = {
  notification: NotificationRecord;
  onMarkRead: (id: Id<"notifications">) => void;
  isMarking: boolean;
  isSelected: boolean;
  onToggleSelect: (id: Id<"notifications">) => void;
};

function NotificationItem({
  notification,
  onMarkRead,
  isMarking,
  isSelected,
  onToggleSelect,
}: NotificationItemProps) {
  return (
    <div
      className={`border-muted flex items-center gap-3 rounded-lg border p-4 ${
        notification.isRead ? "bg-background" : "bg-muted/50"
      }`}
    >
      <Checkbox
        checked={isSelected}
        onCheckedChange={() => onToggleSelect(notification.id)}
      />
      <div className="flex-1 space-y-2">
        <div className="flex flex-wrap items-baseline gap-2">
          <p className="font-medium">{notification.title}</p>
          <span className="text-xs text-muted-foreground">
            ({formatRelativeTime(notification.createdAt)})
          </span>
        </div>
        <p className="text-sm text-muted-foreground">{notification.message}</p>
      </div>
      {!notification.isRead && (
        <Button
          variant="secondary"
          size="sm"
          disabled={isMarking}
          onClick={() => onMarkRead(notification.id)}
        >
          {isMarking ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <CheckCheck className="mr-2 size-4" />
          )}
          Mark read
        </Button>
      )}
    </div>
  );
}

function formatRelativeTime(timestamp: number) {
  const delta = Date.now() - timestamp;
  const seconds = Math.floor(delta / 1000);
  if (seconds < 60) {
    return "Just now";
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `${days}d ago`;
  }
  return new Date(timestamp).toLocaleDateString();
}
