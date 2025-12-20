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

    // This fields are only used for "driver" role , for tracking the driver's current location
    driverCurrentLatitude: v.optional(v.float64()),
    driverCurrentLongitude: v.optional(v.float64()),
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
    bookingIds: v.array(v.id("bookings")),
    tripIds: v.array(v.id("trips")),
  }).index("by_slug", ["slug"]),

  locations: defineTable({
    name: v.string(),
    latitude: v.float64(),
    longitude: v.float64(),
    address: v.string(),
    locationPrivacy: v.union(v.literal("public"), v.literal("private")), //private always if superadmin creates the location then it will be private , otherwise if admin creates the location then it will be private and if hotel creates the location then it will be public
    locationType: v.union(
      v.literal("airport"),
      v.literal("hotel"),
      v.literal("other")
    ), // airport means it is an airport location , hotel means it is a hotel location , other means it is a other location
    hotelId: v.optional(v.id("hotels")), // if hotel Id is present that means this location is asscoitaed with that hotel , then check the type for more detail
    clonedFromLocationId: v.optional(v.id("locations")), // if clonedFromLocationId is present that means this location is cloned from that location , then check the type for more detail , this will help to get the original location details which are not cloned yet and show what to list in UI

    createdByUserId: v.id("users"),
  })
    .index("by_hotel", ["hotelId"])
    .index("by_location_type", ["locationType"])
    .index("by_location_privacy", ["locationPrivacy"]),

  shuttles: defineTable({
    hotelId: v.id("hotels"),
    vehicleNumber: v.string(),
    totalSeats: v.int64(),
    isActive: v.boolean(),
    currentlyAssignedTo: v.optional(v.id("users")),
  })
    .index("by_hotel", ["hotelId"])
    .index("by_vehicle", ["vehicleNumber"])
    .index("by_active", ["isActive"])
    .index("by_hotel_active", ["hotelId", "isActive"]),

  bookings: defineTable({
    guestId: v.id("users"),
    seats: v.int64(),
    bags: v.int64(),
    hotelId: v.id("hotels"),
    name: v.optional(v.string()),
    confirmationNum: v.optional(v.string()),
    notes: v.string(),
    isParkSleepFly: v.boolean(),

    qrCodePath: v.string(),
    qrCodeStatus: v.union(v.literal("UNVERIFIED"), v.literal("VERIFIED")),
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

    fromRouteIndex: v.optional(v.int64()), // Index of first route segment in trip
    toRouteIndex: v.optional(v.int64()), // Index of last route segment (inclusive)

    verifiedAt: v.optional(v.string()),
    verifiedBy: v.optional(v.id("users")),

    cancellationReason: v.optional(v.string()),
    cancelledBy: v.optional(
      v.union(
        v.literal("GUEST"),
        v.literal("DRIVER"),
        v.literal("FRONTDESK"),
        v.literal("ADMIN"),
        v.literal("AUTO_CANCEL") // auto cancel after x minutes of booking time if not verified by anyone means verifiedAt is null
      )
    ),

    waivedAt: v.optional(v.string()),
    waivedBy: v.optional(v.id("users")),
    waiverReason: v.optional(v.string()),
  })
    .index("by_guest", ["guestId"])
    .index("by_hotel", ["hotelId"])
    .index("by_status", ["bookingStatus"])
    .index("by_payment", ["paymentStatus"])
    .index("by_trip_instance", ["tripInstanceId"])
    .index("by_confirmation", ["confirmationNum"])
    .index("by_hotel_status", ["hotelId", "bookingStatus"]),

  routes: defineTable({
    tripId: v.id("trips"),
    startLocationId: v.id("locations"),
    endLocationId: v.id("locations"),
    charges: v.float64(),
    orderIndex: v.int64(),
  })
    .index("by_trip", ["tripId"])
    .index("by_trip_order", ["tripId", "orderIndex"]),

  trips: defineTable({
    name: v.string(),
    routeIds: v.array(v.id("routes")),
    tripTimesIds: v.array(v.id("tripTimes")),
    hotelId: v.id("hotels"),
  }).index("by_hotel", ["hotelId"]),

  tripTimes: defineTable({
    tripId: v.id("trips"),
    startTime: v.string(),
    endTime: v.string(),
  })
    .index("by_trip", ["tripId"])
    .index("by_trip_time", ["tripId", "startTime", "endTime"]),

  tripInstances: defineTable({
    tripId: v.id("trips"),
    shuttleId: v.optional(v.id("shuttles")), // Driver is obtained from shuttle.currentlyAssignedTo

    tripInstancePriority: v.optional(v.int64()),

    scheduledDate: v.string(), // UTC date string YYYY-MM-DD
    scheduledStartTime: v.string(),
    scheduledEndTime: v.string(),
    status: v.union(
      v.literal("SCHEDULED"),
      v.literal("IN_PROGRESS"),
      v.literal("COMPLETED"),
      v.literal("CANCELLED")
    ),

    actualStartTime: v.optional(v.string()),
    actualEndTime: v.optional(v.string()),

    bookingIds: v.array(v.id("bookings")),
  })
    .index("by_trip", ["tripId"])
    .index("by_shuttle", ["shuttleId"])
    .index("by_actual_start_time", ["actualStartTime"])
    .index("by_trip_date_time", [
      "tripId",
      "scheduledDate",
      "scheduledStartTime",
    ])
    .index("by_shuttle_date", ["shuttleId", "scheduledDate"])
    .index("by_date", ["scheduledDate"]),

  routeInstances: defineTable({
    tripInstanceId: v.id("tripInstances"),
    routeId: v.id("routes"),
    orderIndex: v.int64(),
    seatsOccupied: v.int64(),
    seatHeld: v.int64(),
    completed: v.boolean(),
    eta: v.optional(v.string()),
  })
    .index("by_trip_instance", ["tripInstanceId"])
    .index("by_trip_instance_order", ["tripInstanceId", "orderIndex"])
    .index("by_route", ["routeId"]),

  notifications: defineTable({
    title: v.string(),
    message: v.string(),
    isRead: v.boolean(),
    userId: v.id("users"),
    type: v.optional(
      v.union(
        v.literal("NEW_BOOKING"),
        v.literal("BOOKING_FAILED"),
        v.literal("BOOKING_CONFIRMED"),
        v.literal("BOOKING_REJECTED"),
        v.literal("GENERAL")
      )
    ),
    relatedBookingId: v.optional(v.id("bookings")),
  })
    .index("by_user", ["userId"])
    .index("by_read_status", ["userId", "isRead"]),

  otps: defineTable({
    email: v.string(),
    code: v.string(),
    expiresAt: v.string(),
    isUsed: v.boolean(),
    attempts: v.int64(),
  })
    .index("by_email", ["email"])
    .index("by_expiry", ["expiresAt"]),

  qrVerificationTokens: defineTable({
    token: v.string(),
    bookingId: v.id("bookings"),
    expiresAt: v.string(),
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
    timestamp: v.string(),
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
});
