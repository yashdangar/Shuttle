import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    email: v.string(),
    role: v.union(
      v.literal("guest"),
      v.literal("admin"),
      v.literal("frontdesk"),
      v.literal("driver"),
      v.literal("superadmin")
    ),
    name: v.string(),
    phoneNumber: v.string(),
    password: v.optional(v.string()), //Hash of the password (optional for OAuth users)
    profilePictureId: v.optional(v.id("files")),
    notificationIds: v.array(v.id("notifications")),
    chatIds: v.array(v.id("chats")),
    // Hotel association: Required for admin, frontdesk, and driver roles.
    // Optional (null) for guest and superadmin roles who are not tied to a specific hotel.
    hotelId: v.optional(v.id("hotels")),
  })
    .index("by_email", ["email"])
    .index("by_role", ["role"])
    .index("by_hotel", ["hotelId"]),

  hotels: defineTable({
    name: v.string(),
    slug: v.string(),
    address: v.string(),
    phoneNumber: v.string(),
    email: v.string(),
    imageIds: v.array(v.id("files")),
    timeZone: v.string(),
    latitude: v.float64(),
    longitude: v.float64(),
    shuttleIds: v.array(v.id("shuttles")),
    userIds: v.array(v.id("users")), //driver , frontdesk , admin
    locationIds: v.array(v.id("locations")), // private and public locations and hotel location itself too
  }).index("by_slug", ["slug"]),

  locations: defineTable({
    name: v.string(),
    latitude: v.float64(),
    longitude: v.float64(),
    address: v.string(),
    locationType: v.union(v.literal("public"), v.literal("private")), //private always if superadmin creates the location then it will be private , otherwise if admin creates the location then it will be private and if hotel creates the location then it will be public
    isAirportLocation: v.boolean(),
    hotelId: v.optional(v.id("hotels")), // if hotel Id is present that means this location is asscoitaed with that hotel , then check the type for more detail
    clonedFromLocationId: v.optional(v.id("locations")), // if clonedFromLocationId is present that means this location is cloned from that location , then check the type for more detail , this will help to get the original location details which are not cloned yet and show what to list in UI

    createdByUserId: v.id("users"),
  })
    .index("by_hotel", ["hotelId"])
    .index("by_airport_location", ["isAirportLocation"])
    .index("by_location_type", ["locationType"]),

  shuttles: defineTable({
    hotelId: v.id("hotels"),
    vehicleNumber: v.string(),
    totalSeats: v.int64(),
  })
    .index("by_hotel", ["hotelId"])
    .index("by_vehicle", ["vehicleNumber"]),

  bookings: defineTable({
    guestId: v.id("users"),
    seats: v.int64(),
    bags: v.int64(),

    name: v.optional(v.string()), // name can be written like when guest itself is not going but is booking from someone else's id , so name will be of that person who is booking for the guest
    confirmationNum: v.optional(v.string()),
    notes: v.string(),
    isParkSleepFly: v.boolean(),

    qrCodePath: v.string(),
    encryptionKey: v.string(),

    totalPrice: v.float64(),

    bookingStatus: v.union(
      v.literal("PENDING"),
      v.literal("CONFIRMED"),
      v.literal("REJECTED")
    ),

    paymentStatus: v.union(
      v.literal("UNPAID"),
      v.literal("PAID"),
      v.literal("REFUNDED"),
      v.literal("WAIVED")
    ),

    paymentMethod: v.union(
      v.literal("APP"),
      v.literal("FRONTDESK"),
      v.literal("DEPOSIT")
    ),

    tripInstanceId: v.optional(v.id("tripInstances")), // who is driver , which shuttle it is , where to where info allw ill be there here

    // Frontdesk verification fields
    verifiedAt: v.number(),
    verifiedBy: v.id("users"),

    cancellationReason: v.string(),
    cancelledBy: v.union(
      v.literal("GUEST"),
      v.literal("DRIVER"),
      v.literal("FRONTDESK"),
      v.literal("ADMIN"),
      v.literal("AUTO_CANCEL") // auto cancel after x minutes of booking time if not verified by anyone means verifiedAt is null
    ),

    waivedAt: v.optional(v.number()),
    waivedBy: v.optional(v.id("users")),
    waiverReason: v.optional(v.string()),
  })
    .index("by_guest", ["guestId"])
    .index("by_status", ["bookingStatus"])
    .index("by_payment", ["paymentStatus"])
    .index("by_trip_instance", ["tripInstanceId"])
    .index("by_confirmation", ["confirmationNum"]),

  trips: defineTable({
    name: v.string(),
    sourceLocationId: v.id("locations"),
    destinationLocationId: v.id("locations"),
    charges: v.float64(),
    tripTimesIds: v.array(v.id("tripTimes")),
  })
    .index("by_source_location", ["sourceLocationId"])
    .index("by_destination_location", ["destinationLocationId"]),

  tripTimes: defineTable({
    tripId: v.id("trips"),
    shuttleId: v.id("shuttles"),
    startTime: v.number(),
    endTime: v.number(),
  })
    .index("by_trip", ["tripId"])
    .index("by_trip_time", ["tripId", "startTime", "endTime"])
    .index("by_shuttle", ["shuttleId"]),

  // Trip instance will be created only for the first booking of that time , and then it will be updated with the booking id
  tripInstances: defineTable({
    tripId: v.id("trips"),
    driverId: v.id("users"),
    shuttleId: v.id("shuttles"), //total seats in shuttle

    actualStartTime: v.optional(v.number()),
    actualEndTime: v.optional(v.number()),

    seatsOccupied: v.int64(),
    seatHeld: v.int64(), // when someone does booking then the setas are held until frontdsk confirms the booking , and this held means total - occupied should always be lesser than held seat , and how many setas to be hold should be decided by the booking Id , emans we have to check the booking seats how many are there to be held

    bookingIds: v.array(v.id("bookings")), // Array of booking ids which are associated with this trip instance

    // This below 2 things will be updated every 2-3 minutes by google api calls which will automatically reflect in UI
    driverCurrentLatitude: v.optional(v.float64()),
    driverCurrentLongitude: v.optional(v.float64()),
    eta_to_destination: v.optional(v.int64()), // in minutes , this will tell the users when the driver is expected to reach the destination , so evrry time we update driver location we will update this eta also , this will be shown in Ui to the users
    eta_to_source: v.optional(v.int64()), // in minutes , this will tell the users when the driver is expected to reach the source , so evrry time we update driver location we will update this eta also , this will be shown in Ui to the users

    seatReservationIds: v.array(v.id("seatReservations")),
  })
    .index("by_trip", ["tripId"])
    .index("by_driver", ["driverId"])
    .index("by_shuttle", ["shuttleId"])
    .index("by_actual_start_time", ["actualStartTime"]),

  notifications: defineTable({
    title: v.string(),
    message: v.string(),
    isRead: v.boolean(),
    userId: v.id("users"),
  })
    .index("by_user", ["userId"])
    .index("by_read_status", ["userId", "isRead"]),

  otps: defineTable({
    email: v.string(),
    code: v.string(),
    expiresAt: v.number(),
    isUsed: v.boolean(),
    attempts: v.int64(),
  })
    .index("by_email", ["email"])
    .index("by_expiry", ["expiresAt"]),

  qrVerificationTokens: defineTable({
    token: v.string(),
    bookingId: v.id("bookings"),
    expiresAt: v.number(),
    isUsed: v.boolean(),
  })
    .index("by_token", ["token"])
    .index("by_booking", ["bookingId"])
    .index("by_expiry", ["expiresAt"]),

  chats: defineTable({
    bookingId: v.optional(v.id("bookings")), // Present if chat is related to a booking, null for general chats
    participantIds: v.array(v.id("users")), // List of user IDs in the chat (required for general chats, also used for booking chats)
    isOpen: v.boolean(),
    chatName: v.optional(v.string()), // Name for group chats, null for personal chats
    isGroupChat: v.boolean(), // true for group chats, false for personal chats
  }).index("by_booking", ["bookingId"]),

  messages: defineTable({
    chatId: v.id("chats"),
    senderId: v.id("users"),
    content: v.string(),
    timestamp: v.number(),
    viewedByUserIds: v.array(v.id("users")),
    attachedFileIds: v.array(v.id("files")),
  })
    .index("by_chat", ["chatId"])
    .index("by_chat_time", ["chatId", "timestamp"]),

  files: defineTable({
    storageId: v.id("_storage"),
    uiName: v.string(), //Original file name
    uploadedByUserId: v.id("users"),
  }).index("by_uploaded_by", ["uploadedByUserId"]),

  seatReservations: defineTable({
    shuttleId: v.id("shuttles"),
    bookingId: v.id("bookings"),
    numberOfSeats: v.int64(),
    reservationStartTime: v.number(),
    reservationEndTime: v.optional(v.number()),
    status: v.union(
      v.literal("HELD"),
      v.literal("CONFIRMED"),
      v.literal("CANCELLED"),
      v.literal("EXPIRED")
    ),
  })
    .index("by_shuttle", ["shuttleId"])
    .index("by_booking", ["bookingId"])
    .index("by_shuttle_time", [
      "shuttleId",
      "reservationStartTime",
      "reservationEndTime",
    ])
    .index("by_time_range", ["reservationStartTime", "reservationEndTime"]),
});
