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

    const token = localStorage.getItem("adminToken");

    if (!token) {
      console.log("No admin token found, WebSocket connection not initiated.");
      return;
    }

    const wsUrl =
      process.env.NEXT_PUBLIC_WEBSOCKET_URL || "http://localhost:8080";

    const socketInstance = io(wsUrl, {
      auth: {
        token,
      },
      transports: ["websocket"], // Only WebSocket transport
      upgrade: false, // Don't try to upgrade
      timeout: 20000, // 20 second timeout
    });

    setSocket(socketInstance);

    socketInstance.on("connect", () => {
      console.log("Admin WebSocket connected!");
      console.log("Transport used:", socketInstance.io.engine.transport.name);
      toast.success("Real-time connection established!");
      setIsConnected(true);
    });

    socketInstance.on("disconnect", () => {
      console.log("Admin WebSocket disconnected.");
      toast.error("Real-time connection lost.");
      setIsConnected(false);
    });

    socketInstance.on("connect_error", (error) => {
      console.error("WebSocket connection error:", error);
      toast.error("Failed to establish real-time connection.");
      setIsConnected(false);
    });

    socketInstance.on("welcome", (data: any) => {
      console.log("Received welcome message:", data);
      toast.success("WebSocket connection confirmed!", {
        description: data.message,
      });
    });

    socketInstance.on("heartbeat", (data: any) => {
      console.log("Admin received heartbeat:", data.timestamp);
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
