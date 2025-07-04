import prisma from "../db/prisma";
import { sendToUser } from "../ws/index";
import { WsEvents } from "../ws/events";

export interface CreateNotificationData {
  title: string;
  message: string;
  driverId?: number;
  guestId?: number;
  frontDeskId?: number;
  adminId?: number;
}

/**
 * Create a notification and optionally send it via WebSocket
 */
export async function createNotification(data: CreateNotificationData) {
  try {
    const notification = await prisma.notification.create({
      data: {
        title: data.title,
        message: data.message,
        driverId: data.driverId || null,
        guestId: data.guestId || null,
        frontDeskId: data.frontDeskId || null,
        adminId: data.adminId || null,
      },
    });

    // Send real-time notification via WebSocket if driverId is provided
    if (data.driverId) {
      sendToUser(data.driverId, "driver", WsEvents.WELCOME, {
        title: data.title,
        message: data.message,
        notificationId: notification.id,
      });
    }

    return notification;
  } catch (error) {
    console.error("Error creating notification:", error);
    throw error;
  }
}

/**
 * Create a notification for a driver
 */
export async function createDriverNotification(
  driverId: number,
  title: string,
  message: string
) {
  return createNotification({
    title,
    message,
    driverId,
  });
}

/**
 * Create notifications for common driver events
 */
export const DriverNotificationTypes = {
  // Trip related notifications
  TRIP_ASSIGNED: (driverName: string, tripId: string) => ({
    title: "New Trip Assigned",
    message: `Hello ${driverName}, you have been assigned to Trip #${tripId}. Please check your dashboard for details.`,
  }),

  TRIP_STARTED: (tripId: string) => ({
    title: "Trip Started",
    message: `Trip #${tripId} has started. Safe driving!`,
  }),

  TRIP_COMPLETED: (tripId: string) => ({
    title: "Trip Completed",
    message: `Trip #${tripId} has been completed successfully. Great job!`,
  }),

  // Passenger related notifications
  PASSENGER_ADDED: (passengerName: string, tripId: string) => ({
    title: "New Passenger Added",
    message: `${passengerName} has been added to Trip #${tripId}.`,
  }),

  PASSENGER_CHECKED_IN: (passengerName: string, seatNumber: string) => ({
    title: "Passenger Checked In",
    message: `${passengerName} has successfully checked in. Seat assigned: ${seatNumber}`,
  }),

  // Schedule related notifications
  SCHEDULE_UPDATED: (date: string, time: string) => ({
    title: "Schedule Updated",
    message: `Your schedule for ${date} at ${time} has been updated. Please check the new details.`,
  }),

  SCHEDULE_CANCELLED: (date: string, time: string) => ({
    title: "Schedule Cancelled",
    message: `Your schedule for ${date} at ${time} has been cancelled.`,
  }),

  // System notifications
  SYSTEM_MAINTENANCE: (message: string) => ({
    title: "System Maintenance",
    message: `System maintenance: ${message}`,
  }),

  PAYMENT_RECEIVED: (amount: string, passengerName: string) => ({
    title: "Payment Received",
    message: `Payment of ${amount} received from ${passengerName}.`,
  }),

  // Route and traffic notifications
  ROUTE_UPDATE: (reason: string) => ({
    title: "Route Update",
    message: `Route has been updated: ${reason}`,
  }),

  TRAFFIC_ALERT: (location: string, delay: string) => ({
    title: "Traffic Alert",
    message: `Traffic detected at ${location}. Expected delay: ${delay}`,
  }),

  // Weather notifications
  WEATHER_ALERT: (condition: string, location: string) => ({
    title: "Weather Alert",
    message: `${condition} weather conditions in ${location}. Drive safely!`,
  }),
};

 