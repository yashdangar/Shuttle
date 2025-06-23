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
      console.log("Admin WebSocket connected!");
      toast.success("Real-time connection established!");
      setIsConnected(true);
    });

    socketInstance.on("disconnect", () => {
      console.log("Admin WebSocket disconnected.");
      toast.error("Real-time connection lost.");
      setIsConnected(false);
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
