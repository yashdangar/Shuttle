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

    // Get the WebSocket URL and ensure proper protocol
    const wsUrl =
      process.env.NEXT_PUBLIC_WEBSOCKET_URL || "http://localhost:8080";

    const socketInstance = io(wsUrl, {
      auth: {
        token,
      },
      transports: ["websocket", "polling"], // Prefer websocket, fallback to polling
      upgrade: true, // Allow transport upgrades
      secure: true, // Force secure connections in production
      rejectUnauthorized: false, // Accept self-signed certificates if needed
      forceNew: true, // Force a new connection
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
