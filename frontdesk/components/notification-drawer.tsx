"use client";

import { useState, useEffect } from "react";
import { Bell, Check, Trash2, AlertCircle, Info, X, ExternalLink, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/components/hooks/use-toast";
import { fetchWithAuth } from "@/lib/api";
import { useWebSocket } from "@/context/WebSocketContext";
import { useRouter } from "next/navigation";

interface Notification {
  id: number;
  title: string;
  message: string;
  type: "booking" | "alert" | "info";
  isRead: boolean;
  createdAt: string;
}

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationDrawer({ isOpen, onClose }: NotificationDrawerProps) {
  const [loading, setLoading] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const { toast } = useToast();
  const { notifications, refreshNotifications } = useWebSocket();
  const router = useRouter();

  // Load sound preference
  useEffect(() => {
    const savedPreference = localStorage.getItem("frontdesk-sound-enabled");
    if (savedPreference !== null) {
      setSoundEnabled(savedPreference === "true");
    }
  }, []);

  const toggleSound = () => {
    const newState = !soundEnabled;
    setSoundEnabled(newState);
    localStorage.setItem("frontdesk-sound-enabled", newState.toString());
  };

  // Use notifications from WebSocket context instead of local state
  const displayNotifications = notifications as Notification[];

  const handleSeeAllNotifications = () => {
    onClose();
    router.push("/dashboard/notifications");
  };

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

      toast({
        title: "Marked as read",
        description: "Notification has been marked as read.",
      });
      
      // Refresh notifications to update the list
      await refreshNotifications();
    } catch (error) {
      console.error("Error marking notification as read:", error);
      toast({
        title: "Error",
        description: "Failed to mark notification as read. Please try again.",
        variant: "destructive",
      });
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

      toast({
        title: "Notification deleted",
        description: "Notification has been removed.",
      });
      
      // Refresh notifications to update the list
      await refreshNotifications();
    } catch (error) {
      console.error("Error deleting notification:", error);
      toast({
        title: "Error",
        description: "Failed to delete notification. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "booking":
        return <Bell className="h-4 w-4 text-blue-600" />;
      case "alert":
        return <AlertCircle className="h-4 w-4 text-orange-600" />;
      default:
        return <Info className="h-4 w-4 text-gray-600" />;
    }
  };

  const unreadCount = displayNotifications.filter((n) => !n.isRead).length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-end pt-16">
      <div className="fixed inset-0 bg-black/20" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white shadow-xl border-l z-[10000]">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Notifications</h2>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {unreadCount}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSound}
              title={soundEnabled ? "Disable sound" : "Enable sound"}
            >
              {soundEnabled ? (
                <Volume2 className="h-4 w-4" />
              ) : (
                <VolumeX className="h-4 w-4" />
              )}
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <ScrollArea className="h-[calc(100vh-8rem)]">
          <div className="p-4 space-y-3">
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="animate-pulse">
                    <div className="flex items-start gap-3">
                      <div className="h-4 w-4 bg-gray-200 rounded-full"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                        <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : displayNotifications.length === 0 ? (
              <div className="text-center py-8">
                <Bell className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">No notifications</p>
                <p className="text-gray-400 text-xs">You're all caught up!</p>
              </div>
            ) : (
              <>
                {displayNotifications.slice(0, 5).map((notification) => (
                  <Card
                    key={notification.id}
                    className={`transition-all hover:shadow-sm ${
                      !notification.isRead
                        ? "border-l-4 border-l-blue-500 bg-blue-50/30"
                        : ""
                    }`}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          {getIcon(notification.type || "info")}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <h3
                                className={`text-sm font-medium ${
                                  !notification.isRead
                                    ? "text-gray-900"
                                    : "text-gray-700"
                                }`}
                              >
                                {notification.title}
                              </h3>
                              <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                                {notification.message}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                {new Date(notification.createdAt).toLocaleString()}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              {!notification.isRead && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => markAsRead(notification.id)}
                                  title="Mark as read"
                                >
                                  <Check className="h-3 w-3" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => deleteNotification(notification.id)}
                                title="Delete notification"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {/* Always show "See All" button when there are notifications */}
                {displayNotifications.length > 0 && (
                  <div className="pt-4 border-t border-gray-200">
                    <Button
                      variant="outline"
                      className="w-full bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700"
                      onClick={handleSeeAllNotifications}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View All Notifications ({displayNotifications.length})
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
} 