"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { toast } from "sonner";

interface WebSocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error("useWebSocket must be used within a WebSocketProvider");
  }
  return context;
};

// WebSocket event names - matching server events
export const WsEvents = {
  WELCOME: "welcome",
  HEARTBEAT: "heartbeat",
  NEW_BOOKING: "new_booking",
  BOOKING_CANCELLED: "booking_cancelled",
  BOOKING_VERIFIED: "booking_verified",
  BOOKING_UPDATED: "booking_updated",
  NEW_SCHEDULE: "new_schedule",
  UPDATED_SCHEDULE: "updated_schedule",
  DELETED_SCHEDULE: "deleted_schedule",
  BOOKING_ASSIGNED: "booking_assigned",
  DRIVER_LOCATION_UPDATE: "driver_location_update",
} as const;

export const WebSocketProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (!hasMounted) return;

    const token = localStorage.getItem("driverToken");

    if (!token) {
      console.log("No token found, WebSocket connection not initiated.");
      return;
    }

    const socketInstance = io(process.env.NEXT_PUBLIC_WEBSOCKET_URL || "http://localhost:8080", {
      auth: {
        token,
      },
    });

    setSocket(socketInstance);

    socketInstance.on("connect", () => {
      console.log("WebSocket connected!");
      toast.success("Real-time connection established!");
      setIsConnected(true);
    });

    socketInstance.on("disconnect", () => {
      console.log("WebSocket disconnected.");
      toast.error("Real-time connection lost.");
      setIsConnected(false);
    });

    socketInstance.on("welcome", (data: any) => {
      console.log("Received welcome message:", data);
      toast.success("Message from server", {
        description: data.message,
      });
    });

    return () => {
      socketInstance.disconnect();
    };
  }, [hasMounted]);

  return (
    <WebSocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </WebSocketContext.Provider>
  );
};
