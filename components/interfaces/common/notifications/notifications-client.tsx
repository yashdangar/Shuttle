"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { CheckCheck, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuthSession } from "@/hooks/use-auth-session";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { NotificationList } from "./notification-list";

type TabValue = "unread" | "recent";

export function NotificationsClient() {
  const { user, status } = useAuthSession();
  const [activeTab, setActiveTab] = useState<TabValue>("unread");
  const [markingId, setMarkingId] = useState<Id<"notifications"> | null>(null);
  const [markingAll, setMarkingAll] = useState(false);
  const [selectedNotificationIds, setSelectedNotificationIds] = useState<
    Id<"notifications">[]
  >([]);
  const [clearingSelected, setClearingSelected] = useState(false);
  const [clearingAll, setClearingAll] = useState(false);

  const notificationsArgs = user?.id
    ? ({ userId: user.id as Id<"users">, limit: 50 } as const)
    : "skip";

  const notifications = useQuery(
    api.notifications.listUserNotifications,
    notificationsArgs
  );

  const markNotificationRead = useMutation(
    api.notifications.markNotificationRead
  );
  const markAllNotificationsRead = useMutation(
    api.notifications.markAllNotificationsRead
  );
  const clearNotifications = useMutation(api.notifications.clearNotifications);
  const clearAllNotifications = useMutation(
    api.notifications.clearAllNotifications
  );

  const isLoadingSession = status === "loading";
  const isLoadingNotifications = !!user && notifications === undefined;

  const unreadNotifications = useMemo(
    () => (notifications ?? []).filter((notification) => !notification.isRead),
    [notifications]
  );
  const recentNotifications = notifications ?? [];

  useEffect(() => {
    if (!recentNotifications.length) {
      setSelectedNotificationIds([]);
      return;
    }
    setSelectedNotificationIds((prev) =>
      prev.filter((id) =>
        recentNotifications.some((notification) => notification.id === id)
      )
    );
  }, [recentNotifications]);

  const handleMarkSingle = async (notificationId: Id<"notifications">) => {
    if (!user?.id) {
      return;
    }
    try {
      setMarkingId(notificationId);
      await markNotificationRead({
        userId: user.id as Id<"users">,
        notificationId,
      });
    } catch (error: any) {
      toast.error(error?.message ?? "Failed to mark the notification as read.");
    } finally {
      setMarkingId(null);
    }
  };

  const handleMarkAll = async () => {
    if (!user?.id) {
      return;
    }
    try {
      setMarkingAll(true);
      await markAllNotificationsRead({
        userId: user.id as Id<"users">,
      });
      toast.success("All notifications marked as read.");
    } catch (error: any) {
      toast.error(error?.message ?? "Failed to mark notifications as read.");
    } finally {
      setMarkingAll(false);
    }
  };

  const handleToggleSelection = (notificationId: Id<"notifications">) => {
    setSelectedNotificationIds((prev) =>
      prev.includes(notificationId)
        ? prev.filter((id) => id !== notificationId)
        : [...prev, notificationId]
    );
  };

  const handleClearSelected = async () => {
    if (!user?.id || !selectedNotificationIds.length) {
      return;
    }
    try {
      setClearingSelected(true);
      await clearNotifications({
        userId: user.id as Id<"users">,
        notificationIds: selectedNotificationIds,
      });
      setSelectedNotificationIds([]);
      toast.success("Selected notifications cleared.");
    } catch (error: any) {
      toast.error(error?.message ?? "Failed to clear selected notifications.");
    } finally {
      setClearingSelected(false);
    }
  };

  const handleClearAll = async () => {
    if (!user?.id || !recentNotifications.length) {
      return;
    }
    try {
      setClearingAll(true);
      await clearAllNotifications({
        userId: user.id as Id<"users">,
      });
      setSelectedNotificationIds([]);
      toast.success("All notifications cleared.");
    } catch (error: any) {
      toast.error(error?.message ?? "Failed to clear notifications.");
    } finally {
      setClearingAll(false);
    }
  };

  const isLoading = isLoadingSession || isLoadingNotifications;

  if (!user && !isLoadingSession) {
    return <SignedOutEmptyState />;
  }

  return (
    <div className="space-y-6">
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as TabValue)}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="unread">
              Unread
              {!!unreadNotifications.length && (
                <Badge variant="secondary" className="ml-2">
                  {unreadNotifications.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="recent">Recent</TabsTrigger>
          </TabsList>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAll}
              disabled={
                isLoading ||
                markingAll ||
                !user ||
                !unreadNotifications.length ||
                !recentNotifications.length
              }
            >
              {markingAll ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <CheckCheck className="mr-2 size-4" />
              )}
              Mark all read
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearSelected}
              disabled={
                isLoading ||
                clearingSelected ||
                !user ||
                !selectedNotificationIds.length
              }
            >
              {clearingSelected ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 size-4" />
              )}
              Clear selected
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleClearAll}
              disabled={
                isLoading || clearingAll || !user || !recentNotifications.length
              }
            >
              {clearingAll ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 size-4" />
              )}
              Clear all
            </Button>
          </div>
        </div>
        <TabsContent value="unread" className="mt-6">
          {isLoading ? (
            <NotificationsLoadingState />
          ) : (
            <NotificationList
              notifications={unreadNotifications}
              onMarkRead={handleMarkSingle}
              markingId={markingId}
              selectedIds={selectedNotificationIds}
              onToggleSelect={handleToggleSelection}
              emptyTitle="You're all caught up"
              emptyDescription="Check the recent tab to review older activity."
            />
          )}
        </TabsContent>
        <TabsContent value="recent" className="mt-6">
          {isLoading ? (
            <NotificationsLoadingState />
          ) : (
            <NotificationList
              notifications={recentNotifications}
              onMarkRead={handleMarkSingle}
              markingId={markingId}
              selectedIds={selectedNotificationIds}
              onToggleSelect={handleToggleSelection}
              emptyTitle="No notifications yet"
              emptyDescription="We'll keep this area updated with the latest activity."
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function NotificationsLoadingState() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="h-24 w-full animate-pulse rounded-lg bg-muted"
        />
      ))}
    </div>
  );
}

function SignedOutEmptyState() {
  return (
    <div className="space-y-2 text-center">
      <p className="text-lg font-semibold">You are not signed in</p>
      <p className="text-sm text-muted-foreground">
        Sign in to review your notifications.
      </p>
    </div>
  );
}
