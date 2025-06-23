"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { toast } from "sonner";

interface WebSocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  notifications: any[];
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
      toast.success("Real-time connection established!");
      setIsConnected(true);
    });

    socketInstance.on("disconnect", () => {
      console.log("Frontdesk WebSocket disconnected.");
      toast.error("Real-time connection lost.");
      setIsConnected(false);
    });

    socketInstance.on("heartbeat", (data: any) => {
      console.log("Frontdesk received heartbeat:", data.timestamp);
    });

    socketInstance.on("new_booking", (data: any) => {
      console.log("New booking notification received:", data);
      toast.info(data.title, {
        description: data.message,
      });
      setNotifications((prev) => [data, ...prev]);
    });

    return () => {
      socketInstance.disconnect();
    };
  }, [hasMounted]);

  return (
    <WebSocketContext.Provider value={{ socket, isConnected, notifications }}>
      {children}
    </WebSocketContext.Provider>
  );
};
