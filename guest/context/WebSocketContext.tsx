"use client";

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { toast } from "sonner";
import { api } from "@/lib/api";

interface WebSocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  notifications: any[];
  refreshNotifications: () => void;
  onBookingUpdate?: (callback: (booking: any) => void) => void;
  onNotificationUpdate?: (callback: () => void) => void;
  onDriverLocationUpdate?: (callback: (data: any) => void) => void;
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
  const bookingUpdateCallbacksRef = useRef<((booking: any) => void)[]>([]);
  const notificationUpdateCallbacksRef = useRef<(() => void)[]>([]);
  const driverLocationUpdateCallbacksRef = useRef<((data: any) => void)[]>([]);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const refreshNotifications = useCallback(async () => {
    try {
      const response = await api.get("/guest/notifications?page=1&limit=50");
      setNotifications(response.notifications || []);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  }, []);

  useEffect(() => {
    if (!hasMounted) return;

    const token = localStorage.getItem("guestToken");

    if (!token) {
      return;
    }

    const socketInstance = io(
      process.env.NEXT_PUBLIC_WEBSOCKET_URL || "http://localhost:8080",
      {
        auth: {
          token,
        },
        transports: ["websocket"],
        upgrade: false,
        timeout: 20000,
      }
    );

    setSocket(socketInstance);

    socketInstance.on("connect", () => {
      setIsConnected(true);
      
      // Initial load of notifications
      refreshNotifications();
    });

    socketInstance.on("disconnect", () => {
      setIsConnected(false);
    });

    socketInstance.on("heartbeat", (data: any) => {
      // Heartbeat received
    });

    // Listen for booking updates
    socketInstance.on("booking_verified", async (data: any) => {
      toast.success("Your booking has been verified by the frontdesk!");
      
      // Refresh notifications from database
      await refreshNotifications();
      
      // Notify all registered callbacks
      bookingUpdateCallbacksRef.current.forEach(callback => {
        callback(data.booking);
      });
      
      // Trigger notification update callbacks to update UI
      notificationUpdateCallbacksRef.current.forEach(callback => {
        callback();
      });
    });

    socketInstance.on("booking_cancelled", async (data: any) => {
      toast.error("Your booking has been cancelled.");
      
      // Refresh notifications from database
      await refreshNotifications();
      
      // Notify all registered callbacks
      bookingUpdateCallbacksRef.current.forEach(callback => {
        callback(data.booking);
      });
      
      // Trigger notification update callbacks
      notificationUpdateCallbacksRef.current.forEach(callback => {
        callback();
      });
    });

    socketInstance.on("booking_assigned", async (data: any) => {
      toast.info("Your booking has been assigned to a driver!");
      
      // Refresh notifications from database
      await refreshNotifications();
      
      // Notify all registered callbacks
      bookingUpdateCallbacksRef.current.forEach(callback => {
        callback(data.booking);
      });
      
      // Trigger notification update callbacks
      notificationUpdateCallbacksRef.current.forEach(callback => {
        callback();
      });
    });

    socketInstance.on("driver_check_in", async (data: any) => {
      toast.success("✅ Check-in confirmed! You're all set for your journey!");
      
      // Refresh notifications from database
      await refreshNotifications();
      
      // Notify all registered callbacks
      bookingUpdateCallbacksRef.current.forEach(callback => {
        callback(data.booking);
      });
      
      // Trigger notification update callbacks
      notificationUpdateCallbacksRef.current.forEach(callback => {
        callback();
      });
    });

    socketInstance.on("trip_completed", async (data: any) => {
      toast.success("🎉 Trip completed! Thank you for choosing our service!");
      
      // Refresh notifications from database
      await refreshNotifications();
      
      // Notify all registered callbacks
      bookingUpdateCallbacksRef.current.forEach(callback => {
        callback(data.booking);
      });
      
      // Trigger notification update callbacks
      notificationUpdateCallbacksRef.current.forEach(callback => {
        callback();
      });
    });

    // Listen for real-time driver location updates
    socketInstance.on("driver_location_update", (data: any) => {
      console.log("Real-time driver location update received:", data);
      
      // Notify all registered driver location update callbacks
      driverLocationUpdateCallbacksRef.current.forEach(callback => {
        callback(data);
      });
    });

    // Initial load of notifications
    refreshNotifications();

    return () => {
      socketInstance.disconnect();
    };
  }, [hasMounted, refreshNotifications]);

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

  const onDriverLocationUpdate = (callback: (data: any) => void) => {
    driverLocationUpdateCallbacksRef.current.push(callback);
    
    // Return cleanup function
    return () => {
      const index = driverLocationUpdateCallbacksRef.current.indexOf(callback);
      if (index > -1) {
        driverLocationUpdateCallbacksRef.current.splice(index, 1);
      }
    };
  };

  return (
    <WebSocketContext.Provider value={{ 
      socket, 
      isConnected, 
      notifications, 
      refreshNotifications, 
      onBookingUpdate, 
      onNotificationUpdate,
      onDriverLocationUpdate
    }}>
      {children}
    </WebSocketContext.Provider>
  );
};
