I have a bookig system where user will come and book a thing , now it will have select trip , date and time and seats number as main props / inputs other are there but they are redudant for logical part

now first how trips works in our system ? trips means they are a template which define from and to with charges , and from and to will be locations

and tripInstance are real world use case fpor trips means when user comes then we create bookng and a tripInstance and trip to them

now how i want it to work ?

User will come and fill up the login form -> form will have select trip , date and time and seats number as main props and some name and all as direct db save -> req will come to frontdesk -> front desk have 2 options until frontdesk do anything they will have bookingStatus as pending so it means seats are on hold and also in tripInstance seatheld will be increased

@convex/schema.ts:85-90
@convex/schema.ts:160-161


1. reject -> seats wot get hold and we will leave the booking as dead , and seat hold will be released and dec the seatHeld from tripInstance and booking status will become cancelled
2. accept -> now if frontdesk accept then booking status wil become confirmed and seats will be occupied in tripinstacne


now one main thing :

When new booking comes then we will make a function as getAvaiableShusttle which wil give us a shuttleId which is avaiable at that tripInstance time , now how we will know which shuttle is avaiables?

any shuttle which has capacity at that time and isActive is considered as avaiable , means let say there us two tripInstance at 8:00 pm to 9:00 pm , one shuttle has 8 setaoccuper and 2 hold and another is 3 occ and 4 hold and capacty of both are 12 , then we will tryto assign a shuttle with best possible solution greedly

let say 2 people wants to seat then shuttle 1 , 5 thn shutte 2 will come as return Id , so this function should be greedy fundtion

now if only one shuttle is there and that is also fully occupied then we will return an error saying that no shuttle is availae at this time

also we will make a new notification to frontdesk that this person wanted to try to book a trip with rhis and this things but he is not able to do it becuase of this reason , alos booking will be created but it will be auto cancelled with reason that no shuttle is avaiable , now frontdesk and user can talk in chat and figure out themselves

now one more thing , tripInstance when to mak and how to make

now let say a user comes at 7:30 and says he wants to book at 7:45 then we will create tripInstance of 8 to 9 , tripInstance starttime and edn time will alswsy and always round figure time with 00 as min and 00 sec , only hour will be there
@convex/schema.ts:156-157

now see when user comes to make a booking at 8-9 slot of tripInstance of date x then we wont crate duplicate tripInstance of same slot , we will use created instance only
so if firts booking og that slot then create else use the one there is , means we have to make getAvailableTripInstaceSlot or something likee that function

so flowis booking creaste -> getAvailableTripInstaceSlot -> in this function getAvaianleshuttle and make booking and link with this , so function which cr3eate booking wil also be there then -> this bookjing will reach to frontdesk for approvale -> acc or rej and do process for acc and rej

now driveer will login in his dahsboard and see all the activeshuttle list , now ithis lisy will also show number pf tripinstaces he has to run today , now he will select ayone of the shuttle and continue torun that through out the day.
now when he sleect as soon as he selects the shuttleID , we will assign driver Id to all the tripInstances which has this shiuttle Id today

now main thing is we will get the current date / any time in backedn from @convex/schema.ts:28-35 time zone field from this hotel thing , else we wil get from frontend , like above i have written that shuttl if of today means we will now do date.now in server direclt, we will get the current time from driver frontend and store / accpet it in UTC form only no non standard way
anywhere you see toime , store it in UTC in db and other wise it will create mess everywre

now what i want is you to give me sugegstion pf anything i am tihnking wrong as i am human
File refs : @convex/schema.ts @app/(dashboards)/(guest)/new-booking/[slug]/page.tsx
1 accpetd do it , 2 do it , @convex/schema.ts:110-111 use this cancelationReason @convex/schema.ts:112-118 and use this AUTO_CANCEL for cancelling so 3rd wil be resolved , 4.1 acc , 4.2 acc , 4.3 sort and all is good see we canot havd 2 tripInstace with same shuttle id or 2 tripInstace on same date and with same time slot and same shuttleId all 3 will be come as array of unique things means all 4 will combined uniqure , there can be a possiblity where there are 2 tripInstace with same date and time but shuttle Id will be diff , and also in one @convex/schema.ts:156-158


means starttime endtime shutle trip ad date all 5 will be combiined unique for a tripinstcae , there can be a way where there are 2 diff shuttle and other things are same like trip is same and start time endtime and date is also same , so all 5 unique but we have to make it work logically lik starttime end time thing and date thing is mainly to check if any tripinstcane is there or not then we can proccedd to next step of finding if not there then make if thetre then we have to check if same shutte id ? if yes then cant make new tripInstace we will assign booking to thus only else we will make new tripInstace like thsy


5 -> triptimes is a array of time range like 7-8 , 8-9 , 9-10 etc 1 hour slots mainly , can be multple hour slots too store sin UTC

and in frontend we will shpw the time only when the this trip is avaianlbe , so tripInstace cannot be made of a trip which does not habe that time in triptimes
and also let say triptime for a trip is 8-9, 9-10 and user comes tobook at 7:30 then we will let user book it but we will show user that you can only select time range from given , means he wont be able to pass 7:30 from frontend only he can only pass time randing from 8-10 +_ 10 mins as buffer


6 dont worry about this situation , convex handled race conditions dont worry about 6 forget it

7. currentlyAssignedTo add a fielf in shuttle
@convex/schema.ts:61-71 and put user id and a comment rlevenat

8. A
9 ok add one type ting in noti
10 doit

accordig to thi ask any issue is there

and cnfirm that no issue os there and we can doit or not ,

Got it. Now I have full clarity. Let me summarize the changes:
Summary of Changes to Plan
#	Item	Resolution
1	TripInstance schema	Add scheduledDate, scheduledStartTime, scheduledEndTime, status
2	Bookings optional fields	Make verifiedAt, verifiedBy, cancellationReason, cancelledBy optional
3	Auto-cancel reason	Use existing cancelledBy: "AUTO_CANCEL" + cancellationReason field (no new field needed)
4.1-4.2	Shuttle assignment	Greedy algorithm - pick shuttle with LEAST available seats that still fits
4.3	TripInstance uniqueness	Unique by 5 fields: tripId + scheduledDate + scheduledStartTime + scheduledEndTime + shuttleId
5	TripTimes	User can ONLY select from predefined tripTimes. Backend validates slot exists.
6	Race conditions	Removed from plan (Convex handles)
7	Shuttle field	Add currentlyAssignedTo: v.optional(v.id("users")) to track driver assignment
8	Failed booking	Create tripInstance anyway (with null shuttleId)
9	Notifications	Add type field
10	Booking index	Add by_hotel_status index

Corrected TripInstance/Booking Flow
1. User selects Trip -> Frontend shows available tripTimes
2. User selects time slot from tripTimes
3. Backend: Validate selected time exists in tripTimes for that trip
4. Backend: getAvailableShuttle() - find shuttle with least available seats that fits (greedy fill)
5. Backend: Check if tripInstance exists for (tripId, date, startTime, endTime, shuttleId)
* Same shuttleId exists -> use that tripInstance
* Different shuttleId exists (or none) -> create new tripInstance for this shuttle
1. Create booking, increment seatHeld
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

### 1.2 Bookings Table - Required Fields Should Be Optional

**Current Problem:** `verifiedAt`, `verifiedBy`, `cancellationReason`, `cancelledBy` are required but don't exist at creation.

**Change to optional:**

```typescript
verifiedAt: v.optional(v.string()),
verifiedBy: v.optional(v.id("users")),
cancellationReason: v.optional(v.string()),
cancelledBy: v.optional(v.union(...)),
```

**Add auto-cancel reason:**

```typescript
autoCancelReason: v.optional(v.union(
  v.literal("NO_SHUTTLE_AVAILABLE"),
  v.literal("TIMEOUT"),
  v.literal("OTHER")
)),
```

**Add new index:**

```typescript
.index("by_hotel_status", ["hotelId", "bookingStatus"])
```

### 1.3 Notifications Table - Add Type and Metadata

**Current Problem:** Cannot distinguish notification types or store structured data.

**Add fields:**

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

### 1.4 TripTimes Table - Clarify or Remove

**Decision:** Since users can book any hour (rounded), `tripTimes` becomes optional reference for "suggested times" display only. No validation against it for slot creation.

---

## Part 2: Core Functions to Implement

### 2.1 `roundToHourSlot(requestedTime: Date, timezone: string)`

**Location:** `convex/lib/timeUtils.ts`

**Logic:**

- Input: user's requested datetime + hotel timezone
- Convert to UTC
- Round UP to next full hour for start (if past :00)
- End = start + 1 hour
- Return `{ scheduledDate, scheduledStartTime, scheduledEndTime }` in UTC

**Example:**

- User requests 7:45 PM EST on Dec 12
- Convert to UTC: 00:45 Dec 13 UTC
- Round to: 01:00 Dec 13 UTC
- Return: `{ date: "2025-12-13", start: "01:00", end: "02:00" }`

### 2.2 `getOrCreateTripInstance(tripId, scheduledDate, scheduledStartTime, scheduledEndTime)`

**Location:** `convex/tripInstances/mutations.ts`

**Logic:**

1. Query tripInstance by `tripId + scheduledDate + scheduledStartTime`
2. If exists: return existing tripInstance
3. If not exists: create new tripInstance with:

   - `shuttleId: undefined` (assigned later)
   - `driverId: undefined`
   - `seatsOccupied: 0`
   - `seatHeld: 0`
   - `status: "SCHEDULED"`
   - `bookingIds: []`

### 2.3 `getAvailableShuttle(hotelId, scheduledDate, scheduledStartTime, requiredSeats)`

**Location:** `convex/shuttles/queries.ts`

**Logic:**

1. Get all shuttles where `hotelId === hotelId` AND `isActive === true`
2. For each shuttle:

   - Find all tripInstances for this shuttle on `scheduledDate` where time overlaps with `scheduledStartTime`
   - Sum up `seatsOccupied + seatHeld` across overlapping instances
   - Calculate `availableSeats = totalSeats - summed(occupied + held)`

3. Filter shuttles where `availableSeats >= requiredSeats`
4. Sort by `availableSeats` descending (greedy: pick most available first)
5. Return first shuttle OR null if none available

### 2.4 `createBooking(bookingData)`

**Location:** `convex/bookings/mutations.ts`

**Logic (single atomic mutation):**

1. Validate input (seats > 0, valid tripId, etc.)
2. Get hotel timezone from `hotelId`
3. Call `roundToHourSlot()` with user's requested time
4. Call `getOrCreateTripInstance()` - get/create slot
5. Call `getAvailableShuttle()` - find shuttle
6. **If shuttle found:**

   - Assign `shuttleId` to tripInstance (if not already set)
   - Increment `seatHeld` on tripInstance by `booking.seats`
   - Create booking with `bookingStatus: "PENDING"`
   - Add bookingId to tripInstance.bookingIds
   - Create notification for frontdesk: "New booking pending approval"

7. **If NO shuttle found:**

   - Create booking with `bookingStatus: "REJECTED"`, `autoCancelReason: "NO_SHUTTLE_AVAILABLE"`
   - Create notification for frontdesk: "Booking failed - no shuttle available"
   - TripInstance keeps `shuttleId: undefined`

8. Return booking with success/failure info

### 2.5 `confirmBooking(bookingId, frontdeskUserId)`

**Location:** `convex/bookings/mutations.ts`

**Logic:**

1. Get booking, validate status is "PENDING"
2. Get tripInstance
3. Update booking:

   - `bookingStatus: "CONFIRMED"`
   - `verifiedAt: now(UTC)`
   - `verifiedBy: frontdeskUserId`

4. Update tripInstance:

   - Decrement `seatHeld` by booking.seats
   - Increment `seatsOccupied` by booking.seats

5. Create notification for guest: "Your booking is confirmed"

### 2.6 `rejectBooking(bookingId, frontdeskUserId, reason)`

**Location:** `convex/bookings/mutations.ts`

**Logic:**

1. Get booking, validate status is "PENDING"
2. Get tripInstance
3. Update booking:

   - `bookingStatus: "REJECTED"`
   - `cancellationReason: reason`
   - `cancelledBy: "FRONTDESK"`

4. Update tripInstance:

   - Decrement `seatHeld` by booking.seats
   - Remove bookingId from bookingIds array

5. Create notification for guest: "Your booking was rejected"

### 2.7 `assignDriverToShuttle(driverId, shuttleId, currentDateFromFrontend)`

**Location:** `convex/tripInstances/mutations.ts`

**Logic:**

1. Validate driver belongs to same hotel as shuttle
2. Parse `currentDateFromFrontend` (received in UTC)
3. Query all tripInstances where:

   - `shuttleId === shuttleId`
   - `scheduledDate === todayUTC`

4. Update each tripInstance: set `driverId`
5. Return count of assigned trips

---

## Part 3: Query Functions

### 3.1 `getPendingBookingsForHotel(hotelId)`

For frontdesk dashboard - list all pending bookings.

### 3.2 `getDriverTripInstances(driverId, date)`

For driver dashboard - list all tripInstances assigned to driver for a date.

### 3.3 `getAvailableShuttlesForDriver(hotelId)`

For driver to select which shuttle to drive today.

### 3.4 `getTripInstanceAvailability(tripId, date, startTime)`

For UI - show available seats before booking.

---

## Part 4: File Structure

```
convex/
├── lib/
│   └── timeUtils.ts          # roundToHourSlot, UTC conversions
├── bookings/
│   ├── mutations.ts          # createBooking, confirmBooking, rejectBooking
│   └── queries.ts            # getPendingBookingsForHotel
├── tripInstances/
│   ├── mutations.ts          # getOrCreateTripInstance, assignDriverToShuttle
│   └── queries.ts            # getDriverTripInstances, getTripInstanceAvailability
├── shuttles/
│   └── queries.ts            # getAvailableShuttle, getAvailableShuttlesForDriver
└── notifications/
    └── mutations.ts          # createNotification helper
```

---

## Part 5: Edge Cases to Handle

1. **Concurrent bookings:** Convex OCC handles this - if two users book simultaneously, one will retry automatically
2. **Booking for past time:** Reject if rounded slot is in the past
3. **Shuttle becomes inactive:** Don't affect existing tripInstances, only new bookings
4. **Driver re-assignment:** Allow updating driverId on tripInstance if needed
5. **TripInstance with no confirmed bookings:** If all bookings rejected, tripInstance can remain with 0 seats (cleanup optional)

