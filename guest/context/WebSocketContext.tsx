"use client";

import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { toast } from "sonner";

interface WebSocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  onBookingUpdate?: (callback: (booking: any) => void) => void;
  onNotificationUpdate?: (callback: () => void) => void;
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
  const bookingUpdateCallbacksRef = useRef<((booking: any) => void)[]>([]);
  const notificationUpdateCallbacksRef = useRef<(() => void)[]>([]);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (!hasMounted) return;

    const token = localStorage.getItem("guestToken");

    if (!token) {
      console.log("No guest token found, WebSocket connection not initiated.");
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
      console.log("Guest WebSocket connected!");
      toast.success("Real-time connection established!");
      setIsConnected(true);
    });

    socketInstance.on("disconnect", () => {
      console.log("Guest WebSocket disconnected.");
      toast.error("Real-time connection lost.");
      setIsConnected(false);
    });

    socketInstance.on("heartbeat", (data: any) => {
      console.log("Guest received heartbeat:", data.timestamp);
    });

    // Listen for booking updates
    socketInstance.on("booking_verified", (data: any) => {
      console.log("Booking verified via WebSocket:", data);
      toast.success("Your booking has been verified by the frontdesk!");
      
      // Notify all registered callbacks
      bookingUpdateCallbacksRef.current.forEach(callback => {
        callback(data.booking);
      });
      
      // Trigger notification update callbacks
      notificationUpdateCallbacksRef.current.forEach(callback => {
        callback();
      });
    });

    socketInstance.on("booking_cancelled", (data: any) => {
      console.log("Booking cancelled via WebSocket:", data);
      toast.error("Your booking has been cancelled.");
      
      // Notify all registered callbacks
      bookingUpdateCallbacksRef.current.forEach(callback => {
        callback(data.booking);
      });
      
      // Trigger notification update callbacks
      notificationUpdateCallbacksRef.current.forEach(callback => {
        callback();
      });
    });

    socketInstance.on("booking_assigned", (data: any) => {
      console.log("Booking assigned to driver via WebSocket:", data);
      toast.info("Your booking has been assigned to a driver!");
      
      // Notify all registered callbacks
      bookingUpdateCallbacksRef.current.forEach(callback => {
        callback(data.booking);
      });
      
      // Trigger notification update callbacks
      notificationUpdateCallbacksRef.current.forEach(callback => {
        callback();
      });
    });

    socketInstance.on("driver_check_in", (data: any) => {
      console.log("Driver check-in confirmed via WebSocket:", data);
      toast.success("✅ Check-in confirmed! You're all set for your journey!");
      
      // Notify all registered callbacks
      bookingUpdateCallbacksRef.current.forEach(callback => {
        callback(data.booking);
      });
      
      // Trigger notification update callbacks
      notificationUpdateCallbacksRef.current.forEach(callback => {
        callback();
      });
    });

    socketInstance.on("trip_completed", (data: any) => {
      console.log("Trip completed via WebSocket:", data);
      toast.success("🎉 Trip completed! Thank you for choosing our service!");
      
      // Notify all registered callbacks
      bookingUpdateCallbacksRef.current.forEach(callback => {
        callback(data.booking);
      });
      
      // Trigger notification update callbacks
      notificationUpdateCallbacksRef.current.forEach(callback => {
        callback();
      });
    });

    return () => {
      socketInstance.disconnect();
    };
  }, [hasMounted]);

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

  const onNotificationUpdate = (callback: () => void) => {
    notificationUpdateCallbacksRef.current.push(callback);
    
    // Return cleanup function
    return () => {
      const index = notificationUpdateCallbacksRef.current.indexOf(callback);
      if (index > -1) {
        notificationUpdateCallbacksRef.current.splice(index, 1);
      }
    };
  };

  return (
    <WebSocketContext.Provider value={{ socket, isConnected, onBookingUpdate, onNotificationUpdate }}>
      {children}
    </WebSocketContext.Provider>
  );
};
