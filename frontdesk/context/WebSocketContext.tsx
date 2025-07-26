"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { io, Socket } from "socket.io-client";
import { toast } from "sonner";
import { fetchWithAuth } from "@/lib/api";
import { useNotificationSound } from "@/hooks/use-notification-sound";
import { NotificationModal } from "@/components/notification-modal";

interface WebSocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  notifications: any[];
  refreshNotifications: () => void;
  stopNotificationSound: () => void;
  markUserInteraction: () => void;
  connectWebSocket: () => void;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error("useWebSocket must be used within a WebSocketProvider");
  }
  return context;
};

export const WebSocketProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [hasMounted, setHasMounted] = useState(false);
  const [notificationModal, setNotificationModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
  }>({
    isOpen: false,
    title: "",
    message: "",
  });
  const {
    playContinuousNotificationSound,
    stopNotificationSound,
    markUserInteraction: markInteraction,
  } = useNotificationSound();

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const refreshNotifications = useCallback(async () => {
    try {
      const response = await fetchWithAuth("/frontdesk/notifications");
      const data = await response.json();
      setNotifications(data.notifications || []);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  }, []);

  const handleNotificationAcknowledge = useCallback(() => {
    console.log("User acknowledged notification, stopping sound...");
    stopNotificationSound();
  }, [stopNotificationSound]);

  const handleNotificationModalClose = useCallback(() => {
    setNotificationModal((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const markUserInteraction = useCallback(() => {
    markInteraction();
  }, [markInteraction]);

  const connectWebSocket = useCallback(() => {
    const token = localStorage.getItem("frontdeskToken");

    if (!token) {
      console.log("No frontdesk token found, cannot connect WebSocket.");
      return;
    }

    console.log("Token found, attempting WebSocket connection...");

    // If socket already exists and is connected, don't create a new one
    if (socket && socket.connected) {
      console.log("WebSocket already connected.");
      return;
    }

    // If socket exists but is disconnected, try to reconnect
    if (socket && socket.disconnected) {
      console.log("Attempting to reconnect existing WebSocket...");
      socket.connect();
      return;
    }

    const wsUrl =
      process.env.NEXT_PUBLIC_WEBSOCKET_URL || "http://localhost:8080";
    console.log("Creating new WebSocket connection to:", wsUrl);

    const socketInstance = io(wsUrl, {
      auth: {
        token,
      },
      transports: ["websocket", "polling"],
      upgrade: true,
      timeout: 20000,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      // maxReconnectionAttempts: 5,
      forceNew: true,
    });

    setSocket(socketInstance);

    // Set up connection event handlers
    const handleConnect = () => {
      console.log("Frontdesk WebSocket connected!");
      setIsConnected(true);
    };

    const handleDisconnect = (reason: string) => {
      console.log("Frontdesk WebSocket disconnected:", reason);
      setIsConnected(false);
    };

    const handleConnectError = (error: any) => {
      console.error("Frontdesk WebSocket connection error:", error);
      setIsConnected(false);
    };

    const handleReconnect = (attemptNumber: number) => {
      console.log(
        "Frontdesk WebSocket reconnected after",
        attemptNumber,
        "attempts"
      );
      setIsConnected(true);
    };

    const handleReconnectError = (error: any) => {
      console.error("Frontdesk WebSocket reconnection error:", error);
    };

    const handleReconnectFailed = () => {
      console.error("Frontdesk WebSocket reconnection failed");
    };

    // Add event listeners
    socketInstance.on("connect", handleConnect);
    socketInstance.on("disconnect", handleDisconnect);
    socketInstance.on("connect_error", handleConnectError);
    socketInstance.on("reconnect", handleReconnect);
    socketInstance.on("reconnect_error", handleReconnectError);
    socketInstance.on("reconnect_failed", handleReconnectFailed);

    // Try to connect immediately
    if (socketInstance.disconnected) {
      socketInstance.connect();
    }

    socketInstance.on("heartbeat", (data: any) => {
      console.log("Frontdesk received heartbeat:", data.timestamp);
    });

    socketInstance.on("new_booking", async (data: any) => {
      console.log("New booking notification received:", data);

      try {
        // Immediately refresh notifications from database to update count
        await refreshNotifications();

        // Show toast notification immediately
        toast.info(
          `${data.title || "New Booking"}\n${
            data.message || "A new booking has been created"
          }`,
          {
            duration: 5000,
            action: {
              label: "Stop Sound",
              onClick: () => stopNotificationSound(),
            },
          }
        );

        // Play continuous notification sound immediately
        console.log("Triggering continuous notification sound...");
        await playContinuousNotificationSound();

        // Show custom notification modal
        console.log("Showing custom notification modal...");
        setNotificationModal({
          isOpen: true,
          title: data.title || "New Booking",
          message: data.message || "A new booking has been created",
        });
      } catch (error) {
        console.error("Error handling new booking notification:", error);
      }
    });

    socketInstance.on("booking_update", async (data: any) => {
      console.log("Booking update notification received:", data);

      try {
        // Immediately refresh notifications from database to update count
        await refreshNotifications();

        // Show toast notification immediately
        toast.info(
          `${data.title || "Booking Update"}\n${
            data.message || "A booking has been updated"
          }`,
          {
            duration: 5000,
            action: {
              label: "Stop Sound",
              onClick: () => stopNotificationSound(),
            },
          }
        );

        // Play continuous notification sound immediately
        await playContinuousNotificationSound();

        // Show custom notification modal
        setNotificationModal({
          isOpen: true,
          title: data.title || "Booking Update",
          message: data.message || "A booking has been updated",
        });
      } catch (error) {
        console.error("Error handling booking update notification:", error);
      }
    });

    socketInstance.on("driver_update", async (data: any) => {
      console.log("Driver update notification received:", data);

      try {
        // Immediately refresh notifications from database to update count
        await refreshNotifications();

        // Show toast notification immediately
        toast.info(
          `${data.title || "Driver Update"}\n${
            data.message || "Driver status has been updated"
          }`,
          {
            duration: 5000,
            action: {
              label: "Stop Sound",
              onClick: () => stopNotificationSound(),
            },
          }
        );

        // Play continuous notification sound immediately
        await playContinuousNotificationSound();

        // Show custom notification modal
        setNotificationModal({
          isOpen: true,
          title: data.title || "Driver Update",
          message: data.message || "Driver status has been updated",
        });
      } catch (error) {
        console.error("Error handling driver update notification:", error);
      }
    });

    socketInstance.on("shuttle_update", async (data: any) => {
      console.log("Shuttle update notification received:", data);

      try {
        // Immediately refresh notifications from database to update count
        await refreshNotifications();

        // Show toast notification immediately
        toast.info(
          `${data.title || "Shuttle Update"}\n${
            data.message || "Shuttle status has been updated"
          }`,
          {
            duration: 5000,
            action: {
              label: "Stop Sound",
              onClick: () => stopNotificationSound(),
            },
          }
        );

        // Play continuous notification sound immediately
        await playContinuousNotificationSound();
        // Show custom notification modal
        setNotificationModal({
          isOpen: true,
          title: data.title || "Shuttle Update",
          message: data.message || "Shuttle status has been updated",
        });
      } catch (error) {
        console.error("Error handling shuttle update notification:", error);
      }
    });

    // Initial load of notifications
    refreshNotifications();

    return () => {
      socketInstance.disconnect();
    };
  }, [
    socket,
    refreshNotifications,
    stopNotificationSound,
    playContinuousNotificationSound,
  ]);

  useEffect(() => {
    if (!hasMounted) return;

    // Add a small delay to ensure localStorage is available and token is set
    const timer = setTimeout(() => {
      connectWebSocket();
    }, 100);

    return () => clearTimeout(timer);
  }, [hasMounted, connectWebSocket]);

  return (
    <WebSocketContext.Provider
      value={{
        socket,
        isConnected,
        notifications,
        refreshNotifications,
        stopNotificationSound,
        markUserInteraction,
        connectWebSocket,
      }}
    >
      {children}

      {/* Custom Notification Modal */}
      <NotificationModal
        isOpen={notificationModal.isOpen}
        onClose={handleNotificationModalClose}
        title={notificationModal.title}
        message={notificationModal.message}
        onAcknowledge={handleNotificationAcknowledge}
      />
    </WebSocketContext.Provider>
  );
};
