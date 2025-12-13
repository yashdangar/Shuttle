import { Id } from "../_generated/dataModel";

export type BookingStatus = "PENDING" | "CONFIRMED" | "REJECTED";

export type TripInstanceStatus =
  | "SCHEDULED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";

export type CancelledBy =
  | "GUEST"
  | "DRIVER"
  | "FRONTDESK"
  | "ADMIN"
  | "AUTO_CANCEL";

export type NotificationType =
  | "NEW_BOOKING"
  | "BOOKING_FAILED"
  | "BOOKING_CONFIRMED"
  | "BOOKING_REJECTED"
  | "GENERAL";

export interface CreateBookingArgs {
  tripId: Id<"trips">;
  scheduledDate: string;
  scheduledStartTime: string;
  scheduledEndTime: string;
  seats: number;
  bags: number;
  hotelId: Id<"hotels">;
  guestId: Id<"users">;
  name?: string;
  confirmationNum?: string;
  notes: string;
  isParkSleepFly: boolean;
  paymentMethod: "APP" | "FRONTDESK" | "DEPOSIT";
}

export interface ShuttleWithAvailability {
  shuttleId: Id<"shuttles">;
  totalSeats: number;
  availableSeats: number;
}
