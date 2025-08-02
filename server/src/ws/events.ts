/**
 * This file defines the event names and payload structures for WebSocket communication.
 * It serves as a single source of truth for both the server and the clients.
 */

// A generic booking object structure that can be part of many payloads
interface BookingPayload {
  id: string;
  guestId: number;
  numberOfPersons: number;
  isCancelled: boolean;
  // ... other relevant booking fields
}

// A generic schedule object structure
interface SchedulePayload {
  id: number;
  driverId: number;
  shuttleId: number;
  startTime: string;
  endTime: string;
  // ... other relevant schedule fields
}

export const WsEvents = {
  // Server-to-Client Events

  /**
   * Sent to a user upon successful connection.
   * A generic welcome or confirmation message.
   */
  WELCOME: "welcome",

  /**
   * Sent periodically to a client to confirm the connection is live.
   */
  HEARTBEAT: "heartbeat",

  /**
   * Sent to frontdesk users when a guest creates a new booking.
   */
  NEW_BOOKING: "new_booking",

  /**
   * Sent to a guest or driver when their booking has been cancelled.
   */
  BOOKING_CANCELLED: "booking_cancelled",

  /**
   * Sent to a guest when their booking has been verified by frontdesk.
   */
  BOOKING_VERIFIED: "booking_verified",

  /**
   * Sent to frontdesk users when a booking is updated (verified, rescheduled, etc.).
   */
  BOOKING_UPDATED: "booking_updated",

  /**
   * Sent to a driver when they are assigned a new schedule.
   */
  NEW_SCHEDULE: "new_schedule",

  /**
   * Sent to a driver when their existing schedule is updated.
   */
  UPDATED_SCHEDULE: "updated_schedule",

  /**
   * Sent to a driver when their schedule is deleted.
   */
  DELETED_SCHEDULE: "deleted_schedule",

  /**
   * Sent to a driver and a guest when a booking is assigned to a trip.
   */
  BOOKING_ASSIGNED: "booking_assigned",

  /**
   * Sent to a guest when their QR code is verified by a driver during check-in.
   */
  DRIVER_CHECK_IN: "driver_check_in",

  /**
   * Sent to a guest when their trip is completed by the driver.
   */
  TRIP_COMPLETED: "trip_completed",

  /**
   * Sent to frontdesk when a driver starts a trip.
   */
  TRIP_STARTED: "trip_started",

  /**
   * Sent to frontdesk when a trip status is updated.
   */
  TRIP_UPDATED: "trip_updated",

  // Chat Events
  /**
   * Sent when a user joins a chat room.
   */
  JOIN_CHAT: "join_chat",

  /**
   * Sent when a user leaves a chat room.
   */
  LEAVE_CHAT: "leave_chat",

  /**
   * Sent when a new message is received in a chat.
   */
  NEW_MESSAGE: "new_message",

  /**
   * Sent when a user starts typing in a chat.
   */
  TYPING_START: "typing_start",

  /**
   * Sent when a user stops typing in a chat.
   */
  TYPING_STOP: "typing_stop",

  /**
   * Sent when a message is sent (confirmation).
   */
  MESSAGE_SENT: "message_sent",

  // Client-to-Server Events (Example for future use)

  /**
   * Sent from a driver client to update their location.
   * Example: `socket.emit(WsEvents.DRIVER_LOCATION_UPDATE, { lat: 12.34, lng: 56.78 });`
   */
  DRIVER_LOCATION_UPDATE: "driver_location_update",
} as const;

// Defining the payload types for each event

export type WsPayloads = {
  [WsEvents.WELCOME]: {
    message: string;
  };

  [WsEvents.HEARTBEAT]: {
    timestamp: string;
  };

  [WsEvents.NEW_BOOKING]: {
    title: string;
    message: string;
    booking: BookingPayload;
  };

  [WsEvents.BOOKING_CANCELLED]: {
    title: string;
    message: string;
    booking: BookingPayload;
  };

  [WsEvents.BOOKING_VERIFIED]: {
    title: string;
    message: string;
    booking: BookingPayload;
  };

  [WsEvents.BOOKING_UPDATED]: {
    title: string;
    message: string;
    booking: BookingPayload;
  };

  [WsEvents.NEW_SCHEDULE]: {
    title: string;
    message: string;
    schedule: SchedulePayload;
  };

  [WsEvents.UPDATED_SCHEDULE]: {
    title: string;
    message: string;
    schedule: SchedulePayload;
  };

  [WsEvents.DELETED_SCHEDULE]: {
    title: string;
    message: string;
    schedule: SchedulePayload;
  };

  [WsEvents.BOOKING_ASSIGNED]: {
    title: string;
    message: string;
    booking: BookingPayload;
    tripId: string;
  };

  [WsEvents.DRIVER_CHECK_IN]: {
    title: string;
    message: string;
    booking: BookingPayload;
  };

  [WsEvents.TRIP_COMPLETED]: {
    title: string;
    message: string;
    booking: BookingPayload;
  };

  [WsEvents.TRIP_STARTED]: {
    title: string;
    message: string;
    booking: BookingPayload;
  };

  [WsEvents.TRIP_UPDATED]: {
    title: string;
    message: string;
    booking: BookingPayload;
  };

  [WsEvents.DRIVER_LOCATION_UPDATE]: {
    lat: number;
    lng: number;
    heading?: number;
  };

  // Chat Payloads
  [WsEvents.JOIN_CHAT]: {
    chatId: string;
    hotelId: number;
  };

  [WsEvents.LEAVE_CHAT]: {
    chatId: string;
    hotelId: number;
  };

  [WsEvents.NEW_MESSAGE]: {
    chatId: string;
    message: {
      id: string;
      content: string;
      senderType: "GUEST" | "FRONTDESK" | "DRIVER";
      senderId: number;
      createdAt: string;
    };
  };

  [WsEvents.TYPING_START]: {
    chatId: string;
    senderType: "GUEST" | "FRONTDESK" | "DRIVER";
    senderId: number;
  };

  [WsEvents.TYPING_STOP]: {
    chatId: string;
    senderType: "GUEST" | "FRONTDESK" | "DRIVER";
    senderId: number;
  };

  [WsEvents.MESSAGE_SENT]: {
    chatId: string;
    messageId: string;
    success: boolean;
  };
};
