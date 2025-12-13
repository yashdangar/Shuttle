---
name: Booking System Implementation
overview: Fix schema issues and implement the complete booking flow with shuttle assignment, tripInstance management, seat holding logic, and driver assignment.
todos:
  - id: schema-tripinstance
    content: "Update tripInstances table: add scheduledDate, scheduledStartTime, scheduledEndTime, status fields and new indexes"
    status: completed
  - id: schema-bookings
    content: "Update bookings table: make verifiedAt, verifiedBy, cancellationReason, cancelledBy optional; add by_hotel_status index"
    status: completed
  - id: schema-shuttles
    content: "Update shuttles table: add currentlyAssignedTo field"
    status: completed
  - id: schema-notifications
    content: "Update notifications table: add type and relatedBookingId fields"
    status: completed
  - id: fn-validate-triptime
    content: Implement validateTripTime helper to check if selected time exists in tripTimes
    status: completed
  - id: fn-get-available-shuttle
    content: Implement getAvailableShuttle query with greedy algorithm (least available first)
    status: completed
  - id: fn-get-or-create-tripinstance
    content: Implement getOrCreateTripInstance mutation with 5-field uniqueness
    status: completed
  - id: fn-create-booking
    content: Implement createBooking mutation with full flow (tripInstance + shuttle + notifications)
    status: completed
  - id: fn-confirm-booking
    content: Implement confirmBooking mutation (held -> occupied)
    status: completed
  - id: fn-reject-booking
    content: Implement rejectBooking mutation (release held seats)
    status: completed
  - id: fn-assign-driver
    content: Implement assignDriverToShuttle mutation (update tripInstances + shuttle.currentlyAssignedTo)
    status: completed
  - id: queries-frontdesk
    content: Implement getPendingBookingsForHotel query
    status: completed
  - id: queries-driver
    content: Implement getDriverTripInstances and getAvailableShuttlesForDriver queries
    status: completed
---

# Booking System Implementation Plan

## Part 1: Schema Fixes

### 1.1 TripInstances Table - Missing Fields

**Current Problem:** Cannot query tripInstances by date/time slot, cannot deduplicate slots.

**Add these fields:**

```typescript
scheduledDate: v.string(),        // "2025-12-12" (ISO date in UTC)
scheduledStartTime: v.string(),   // "20:00" (HH:mm in UTC)
scheduledEndTime: v.string(),     // "21:00" (HH:mm in UTC)
status: v.union(
  v.literal("SCHEDULED"),
  v.literal("IN_PROGRESS"),
  v.literal("COMPLETED"),
  v.literal("CANCELLED")
),
```

**Add these indexes:**

```typescript
.index("by_trip_date_time", ["tripId", "scheduledDate", "scheduledStartTime"])
.index("by_shuttle_date", ["shuttleId", "scheduledDate"])
.index("by_date", ["scheduledDate"])
```

**Uniqueness:** TripInstance is unique by 5 fields: `tripId + scheduledDate + scheduledStartTime + scheduledEndTime + shuttleId`

### 1.2 Bookings Table - Required Fields Should Be Optional

**Current Problem:** `verifiedAt`, `verifiedBy`, `cancellationReason`, `cancelledBy` are required but don't exist at creation.

**Change to optional:**

```typescript
verifiedAt: v.optional(v.string()),
verifiedBy: v.optional(v.id("users")),
cancellationReason: v.optional(v.string()),
cancelledBy: v.optional(v.union(...)),
```

**For auto-cancel:** Use existing `cancelledBy: "AUTO_CANCEL"` + `cancellationReason: "No shuttle available"` (NO new field needed)

**Add new index:**

```typescript
.index("by_hotel_status", ["hotelId", "bookingStatus"])
```

### 1.3 Shuttles Table - Add Driver Assignment Field

**Add field:**

```typescript
currentlyAssignedTo: v.optional(v.id("users")), // Driver currently assigned to this shuttle for today
```

### 1.4 Notifications Table - Add Type

**Add field:**

```typescript
type: v.optional(v.union(
  v.literal("NEW_BOOKING"),
  v.literal("BOOKING_FAILED"),
  v.literal("BOOKING_CONFIRMED"),
  v.literal("BOOKING_REJECTED"),
  v.literal("GENERAL")
)),
relatedBookingId: v.optional(v.id("bookings")),
```

### 1.5 TripTimes - Validation Required

**Decision:** TripTimes is REQUIRED for validation. User can ONLY book at predefined tripTimes slots. Backend MUST validate that the selected time slot exists in tripTimes for that trip.

---

## Part 2: Core Functions to Implement

### Type Definitions (convex/lib/types.ts)

```typescript
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
```

### 2.1 `validateTripTime` (Helper function - NOT a query)

**Location:** `convex/lib/tripTimeUtils.ts`

**Type:**

```typescript
export async function validateTripTime(
  ctx: QueryCtx | MutationCtx,
  tripId: Id<"trips">,
  startTime: string,
  endTime: string
): Promise<boolean>;
```

**Logic:**

1. Get trip by tripId using `ctx.db.get(tripId)`
2. Get all tripTimes for this trip via `tripTimesIds`
3. Check if any tripTime matches the provided startTime + endTime
4. Return true if valid, throw `ConvexError` if invalid

**Note:** This is a pure helper function that uses `ctx.db` directly, NOT a separate query.

### 2.2 `getAvailableShuttle` - **internalQuery**

**Location:** `convex/shuttles/queries.ts`

**Type:**

```typescript
export const getAvailableShuttle = internalQuery({
  args: {
    hotelId: v.id("hotels"),
    scheduledDate: v.string(),
    scheduledStartTime: v.string(),
    scheduledEndTime: v.string(),
    requiredSeats: v.number(),
  },
  returns: v.union(v.id("shuttles"), v.null()),
  handler: async (ctx, args) => { ... }
});
```

**Logic:**

1. Get all shuttles where `hotelId === hotelId` AND `isActive === true`
2. For each shuttle:

   - Find tripInstance for this shuttle on `scheduledDate` with matching `scheduledStartTime` and `scheduledEndTime`
   - If tripInstance exists: `usedSeats = Number(seatsOccupied) + Number(seatHeld)`
   - If no tripInstance: `usedSeats = 0` (shuttle is free for this slot)
   - Calculate `availableSeats = Number(totalSeats) - usedSeats`

3. Filter shuttles where `availableSeats >= requiredSeats`
4. **Sort by `availableSeats` ASCENDING** (greedy: pick LEAST available that fits)
5. Return first shuttle ID OR null if none available

**Example:**

- Shuttle 1: 12 capacity, 8 occupied + 2 held = 2 available
- Shuttle 2: 12 capacity, 3 occupied + 4 held = 5 available
- User wants 2 seats -> Return Shuttle 1 (least available that fits)
- User wants 5 seats -> Return Shuttle 2 (Shuttle 1 doesn't fit)

### 2.3 `getOrCreateTripInstance` - **internalMutation**

**Location:** `convex/tripInstances/mutations.ts`

**Type:**

```typescript
export const getOrCreateTripInstance = internalMutation({
  args: {
    tripId: v.id("trips"),
    scheduledDate: v.string(),
    scheduledStartTime: v.string(),
    scheduledEndTime: v.string(),
    shuttleId: v.optional(v.id("shuttles")), // undefined for failed bookings
  },
  returns: v.id("tripInstances"),
  handler: async (ctx, args) => { ... }
});
```

**Logic:**

1. Query tripInstance by all 5 fields: `tripId + scheduledDate + scheduledStartTime + scheduledEndTime + shuttleId`
2. If exists with SAME shuttleId: return existing tripInstance ID
3. If not exists: create new tripInstance with:

   - `tripId, scheduledDate, scheduledStartTime, scheduledEndTime, shuttleId`
   - `driverId: undefined`
   - `seatsOccupied: 0n` (BigInt)
   - `seatHeld: 0n` (BigInt)
   - `status: "SCHEDULED"`
   - `bookingIds: []`

**Note:** Two tripInstances CAN exist for same trip/date/time if they have DIFFERENT shuttleIds.

### 2.4 `createBooking` - **mutation** (public)

**Location:** `convex/bookings/mutations.ts`

**Type:**

```typescript
export const createBooking = mutation({
  args: {
    tripId: v.id("trips"),
    scheduledDate: v.string(),
    scheduledStartTime: v.string(),
    scheduledEndTime: v.string(),
    seats: v.number(),
    bags: v.number(),
    hotelId: v.id("hotels"),
    name: v.optional(v.string()),
    confirmationNum: v.optional(v.string()),
    notes: v.string(),
    isParkSleepFly: v.boolean(),
    paymentMethod: v.union(v.literal("APP"), v.literal("FRONTDESK"), v.literal("DEPOSIT")),
  },
  returns: v.object({
    bookingId: v.id("bookings"),
    success: v.boolean(),
    message: v.string(),
  }),
  handler: async (ctx, args) => { ... }
});
```

**Logic (single atomic mutation):**

1. Get authenticated user (guestId) from context
2. Validate input (seats > 0, valid tripId, date not in past, etc.)
3. **Validate tripTime exists** - call `validateTripTime()` helper
4. Call `ctx.runQuery(internal.shuttles.queries.getAvailableShuttle, {...})` - find shuttle
5. **If shuttle found:**

   - Call `ctx.runMutation(internal.tripInstances.mutations.getOrCreateTripInstance, {...})`
   - Increment `seatHeld` on tripInstance by `BigInt(seats)`
   - Create booking with `bookingStatus: "PENDING"`, link to tripInstance
   - Add bookingId to tripInstance.bookingIds
   - Call `ctx.runMutation(internal.notifications.mutations.createNotification, {...})`

6. **If NO shuttle found:**

   - Create tripInstance with `shuttleId: undefined`
   - Create booking with `bookingStatus: "REJECTED"`, `cancelledBy: "AUTO_CANCEL"`, `cancellationReason: "No shuttle available"`
   - Create notification for frontdesk

7. Return `{ bookingId, success, message }`

### 2.5 `confirmBooking` - **mutation** (public)

**Location:** `convex/bookings/mutations.ts`

**Type:**

```typescript
export const confirmBooking = mutation({
  args: {
    bookingId: v.id("bookings"),
  },
  returns: v.object({ success: v.boolean(), message: v.string() }),
  handler: async (ctx, args) => { ... }
});
```

**Logic:**

1. Get authenticated frontdesk user from context
2. Get booking, validate status is "PENDING"
3. Get tripInstance
4. Update booking:

   - `bookingStatus: "CONFIRMED"`
   - `verifiedAt: new Date().toISOString()`
   - `verifiedBy: frontdeskUserId`

5. Update tripInstance:

   - Decrement `seatHeld` by booking.seats
   - Increment `seatsOccupied` by booking.seats

6. Create notification for guest

### 2.6 `rejectBooking` - **mutation** (public)

**Location:** `convex/bookings/mutations.ts`

**Type:**

```typescript
export const rejectBooking = mutation({
  args: {
    bookingId: v.id("bookings"),
    reason: v.string(),
  },
  returns: v.object({ success: v.boolean(), message: v.string() }),
  handler: async (ctx, args) => { ... }
});
```

**Logic:**

1. Get authenticated frontdesk user from context
2. Get booking, validate status is "PENDING"
3. Get tripInstance
4. Update booking:

   - `bookingStatus: "REJECTED"`
   - `cancellationReason: reason`
   - `cancelledBy: "FRONTDESK"`

5. Update tripInstance:

   - Decrement `seatHeld` by booking.seats
   - Remove bookingId from bookingIds array

6. Create notification for guest

### 2.7 `assignDriverToShuttle` - **mutation** (public)

**Location:** `convex/shuttles/mutations.ts`

**Type:**

```typescript
export const assignDriverToShuttle = mutation({
  args: {
    shuttleId: v.id("shuttles"),
    currentDate: v.string(), // ISO date string in UTC from frontend
  },
  returns: v.object({ assignedCount: v.number() }),
  handler: async (ctx, args) => { ... }
});
```

**Logic:**

1. Get authenticated driver from context
2. Validate driver belongs to same hotel as shuttle
3. **Update shuttle:** set `currentlyAssignedTo: driverId`
4. Query all tripInstances where:

   - `shuttleId === shuttleId`
   - `scheduledDate === currentDate`

5. Update each tripInstance: set `driverId`
6. Return `{ assignedCount }`

### 2.8 `createNotification` - **internalMutation**

**Location:** `convex/notifications/mutations.ts`

**Type:**

```typescript
export const createNotification = internalMutation({
  args: {
    userId: v.id("users"),
    title: v.string(),
    message: v.string(),
    type: v.union(
      v.literal("NEW_BOOKING"),
      v.literal("BOOKING_FAILED"),
      v.literal("BOOKING_CONFIRMED"),
      v.literal("BOOKING_REJECTED"),
      v.literal("GENERAL")
    ),
    relatedBookingId: v.optional(v.id("bookings")),
  },
  handler: async (ctx, args) => { ... }
});
```

---

## Part 3: Query Functions

### 3.1 `getPendingBookingsForHotel` - **query** (public)

**Location:** `convex/bookings/queries.ts`

```typescript
export const getPendingBookingsForHotel = query({
  args: {
    hotelId: v.id("hotels"),
  },
  returns: v.array(v.object({
    _id: v.id("bookings"),
    guestId: v.id("users"),
    guestName: v.string(),
    seats: v.number(),
    tripName: v.string(),
    scheduledDate: v.string(),
    scheduledTime: v.string(),
    createdAt: v.string(),
  })),
  handler: async (ctx, args) => { ... }
});
```

### 3.2 `getDriverTripInstances` - **query** (public)

**Location:** `convex/tripInstances/queries.ts`

```typescript
export const getDriverTripInstances = query({
  args: {
    date: v.string(), // ISO date in UTC
  },
  returns: v.array(v.object({
    _id: v.id("tripInstances"),
    tripName: v.string(),
    sourceLocation: v.string(),
    destinationLocation: v.string(),
    scheduledStartTime: v.string(),
    scheduledEndTime: v.string(),
    seatsOccupied: v.number(),
    totalSeats: v.number(),
    status: v.string(),
  })),
  handler: async (ctx, args) => { ... }
});
```

### 3.3 `getAvailableShuttlesForDriver` - **query** (public)

**Location:** `convex/shuttles/queries.ts`

```typescript
export const getAvailableShuttlesForDriver = query({
  args: {},
  returns: v.array(v.object({
    _id: v.id("shuttles"),
    vehicleNumber: v.string(),
    totalSeats: v.number(),
    tripCountToday: v.number(),
    currentlyAssignedTo: v.optional(v.id("users")),
    currentDriverName: v.optional(v.string()),
  })),
  handler: async (ctx, args) => { ... }
});
```

### 3.4 `getTripInstanceAvailability` - **query** (public)

**Location:** `convex/tripInstances/queries.ts`

```typescript
export const getTripInstanceAvailability = query({
  args: {
    tripId: v.id("trips"),
    scheduledDate: v.string(),
    scheduledStartTime: v.string(),
    scheduledEndTime: v.string(),
  },
  returns: v.object({
    totalAvailableSeats: v.number(),
    shuttles: v.array(v.object({
      shuttleId: v.id("shuttles"),
      vehicleNumber: v.string(),
      availableSeats: v.number(),
    })),
  }),
  handler: async (ctx, args) => { ... }
});
```

---

## Part 4: File Structure

```
convex/
├── lib/
│   ├── types.ts              # Type definitions (CreateBookingArgs, etc.)
│   └── tripTimeUtils.ts      # validateTripTime helper function
├── bookings/
│   ├── mutations.ts          # createBooking (mutation), confirmBooking (mutation), rejectBooking (mutation)
│   └── queries.ts            # getPendingBookingsForHotel (query)
├── tripInstances/
│   ├── mutations.ts          # getOrCreateTripInstance (internalMutation)
│   └── queries.ts            # getDriverTripInstances (query), getTripInstanceAvailability (query)
├── shuttles/
│   ├── mutations.ts          # assignDriverToShuttle (mutation)
│   └── queries.ts            # getAvailableShuttle (internalQuery), getAvailableShuttlesForDriver (query)
└── notifications/
    └── mutations.ts          # createNotification (internalMutation)
```

### Function Access Summary

| Function                        | Type             | Access                                     |

| ------------------------------- | ---------------- | ------------------------------------------ |

| `validateTripTime`              | Helper           | Internal (ctx.db)                          |

| `getAvailableShuttle`           | internalQuery    | Called via `ctx.runQuery(internal....)`    |

| `getOrCreateTripInstance`       | internalMutation | Called via `ctx.runMutation(internal....)` |

| `createNotification`            | internalMutation | Called via `ctx.runMutation(internal....)` |

| `createBooking`                 | mutation         | Public (client callable)                   |

| `confirmBooking`                | mutation         | Public (frontdesk only)                    |

| `rejectBooking`                 | mutation         | Public (frontdesk only)                    |

| `assignDriverToShuttle`         | mutation         | Public (driver only)                       |

| `getPendingBookingsForHotel`    | query            | Public (frontdesk only)                    |

| `getDriverTripInstances`        | query            | Public (driver only)                       |

| `getAvailableShuttlesForDriver` | query            | Public (driver only)                       |

| `getTripInstanceAvailability`   | query            | Public (guest UI)                          |

---

## Part 5: Edge Cases to Handle

1. **Concurrent bookings:** Convex OCC handles this - if two users book simultaneously, one will retry automatically
2. **Booking for past time:** Reject if selected slot's date/time is in the past
3. **Invalid tripTime:** Reject if selected time slot doesn't exist in tripTimes for that trip
4. **Shuttle becomes inactive:** Don't affect existing tripInstances, only new bookings
5. **Driver re-assignment:** Allow updating driverId on tripInstance and shuttle.currentlyAssignedTo if needed
6. **TripInstance with no confirmed bookings:** If all bookings rejected, tripInstance can remain with 0 seats (cleanup optional)
7. **Failed booking with no shuttle:** TripInstance created with shuttleId: undefined, booking status REJECTED with AUTO_CANCEL