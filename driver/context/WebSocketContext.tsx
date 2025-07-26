"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
} from "react";
import { io, Socket } from "socket.io-client";
import { toast } from "sonner";

interface WebSocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  onBookingUpdate?: (callback: (booking: any) => void) => void;
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
  const bookingUpdateCallbacksRef = useRef<((booking: any) => void)[]>([]);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const onBookingUpdate = (callback: (booking: any) => void) => {
    bookingUpdateCallbacksRef.current.push(callback);

    // Return cleanup function
    return () => {
      const index = bookingUpdateCallbacksRef.current.indexOf(callback);
      if (index > -1) {
        bookingUpdateCallbacksRef.current.splice(index, 1);
      }
    };
  };

  const connectWebSocket = () => {
    const token = localStorage.getItem("driverToken");

    if (!token) {
      console.log("No driver token found, cannot connect WebSocket.");
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
      console.log("Driver WebSocket connected!");
      setIsConnected(true);
    };

    const handleDisconnect = (reason: string) => {
      console.log("Driver WebSocket disconnected:", reason);
      setIsConnected(false);
    };

    const handleConnectError = (error: any) => {
      console.error("Driver WebSocket connection error:", error);
      setIsConnected(false);
    };

    const handleReconnect = (attemptNumber: number) => {
      console.log(
        "Driver WebSocket reconnected after",
        attemptNumber,
        "attempts"
      );
      setIsConnected(true);
    };

    const handleReconnectError = (error: any) => {
      console.error("Driver WebSocket reconnection error:", error);
    };

    const handleReconnectFailed = () => {
      console.error("Driver WebSocket reconnection failed");
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

    socketInstance.on("welcome", (data: any) => {
      console.log("Received welcome message:", data);
      toast.success("Connection established", {
        description: data.message,
      });
    });

    socketInstance.on("booking_assigned", (data: any) => {
      console.log("New booking assigned via WebSocket:", data);

      // Show toast notification
      toast.success(data.title, {
        description: data.message,
      });

      // Notify all registered callbacks
      bookingUpdateCallbacksRef.current.forEach((callback) => {
        callback(data.booking);
      });
    });

    socketInstance.on("heartbeat", (data: any) => {
      console.log("Received heartbeat:", data.timestamp);
    });

    return () => {
      socketInstance.disconnect();
    };
  };

  useEffect(() => {
    if (!hasMounted) return;

    // Add a small delay to ensure localStorage is available and token is set
    const timer = setTimeout(() => {
      connectWebSocket();
    }, 100);

    return () => clearTimeout(timer);
  }, [hasMounted, connectWebSocket]);

  return (
    <WebSocketContext.Provider value={{ socket, isConnected, onBookingUpdate, connectWebSocket }}>
      {children}
    </WebSocketContext.Provider>
  );
};
