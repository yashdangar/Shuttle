"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { toast } from "sonner";
import { fetchWithAuth } from "@/lib/api";

interface WebSocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  notifications: any[];
  refreshNotifications: () => void;
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

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const refreshNotifications = async () => {
    try {
      const response = await fetchWithAuth("/frontdesk/notifications");
      const data = await response.json();
      setNotifications(data.notifications || []);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  useEffect(() => {
    if (!hasMounted) return;

    const token = localStorage.getItem("frontdeskToken");

    if (!token) {
      console.log(
        "No frontdesk token found, WebSocket connection not initiated."
      );
      return;
    }

    const socketInstance = io(
      process.env.NEXT_PUBLIC_WEBSOCKET_URL || "http://localhost:8080",
      {
        auth: {
          token,
        },
      }
    );

    setSocket(socketInstance);

    socketInstance.on("connect", () => {
      console.log("Frontdesk WebSocket connected!");
      setIsConnected(true);
    });

    socketInstance.on("disconnect", () => {
      console.log("Frontdesk WebSocket disconnected.");
      setIsConnected(false);
    });

    socketInstance.on("heartbeat", (data: any) => {
      console.log("Frontdesk received heartbeat:", data.timestamp);
    });

    socketInstance.on("new_booking", async (data: any) => {
      console.log("New booking notification received:", data);
      toast.info(data.title || "New Booking", {
        description: data.message || "A new booking has been created",
        duration: 5000,
      });
      
      // Immediately refresh notifications from database to update count
      await refreshNotifications();
    });

    socketInstance.on("booking_update", async (data: any) => {
      console.log("Booking update notification received:", data);
      toast.info(data.title || "Booking Update", {
        description: data.message || "A booking has been updated",
        duration: 5000,
      });
      
      // Immediately refresh notifications from database to update count
      await refreshNotifications();
    });

    socketInstance.on("driver_update", async (data: any) => {
      console.log("Driver update notification received:", data);
      toast.info(data.title || "Driver Update", {
        description: data.message || "Driver status has been updated",
        duration: 5000,
      });
      
      // Immediately refresh notifications from database to update count
      await refreshNotifications();
    });

    socketInstance.on("shuttle_update", async (data: any) => {
      console.log("Shuttle update notification received:", data);
      toast.info(data.title || "Shuttle Update", {
        description: data.message || "Shuttle status has been updated",
        duration: 5000,
      });
      
      // Immediately refresh notifications from database to update count
      await refreshNotifications();
    });

    // Initial load of notifications
    refreshNotifications();

    return () => {
      socketInstance.disconnect();
    };
  }, [hasMounted]);

  return (
    <WebSocketContext.Provider value={{ socket, isConnected, notifications, refreshNotifications }}>
      {children}
    </WebSocketContext.Provider>
  );
};
