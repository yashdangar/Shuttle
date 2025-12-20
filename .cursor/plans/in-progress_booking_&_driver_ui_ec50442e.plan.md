---
name: In-Progress Booking & Driver UI
overview: Fix booking availability for IN_PROGRESS trips to allow bookings for incomplete route segments, redesign driver UI for sequential route progression with Start/Revert flow, and verify seat management logic.
todos:
  - id: backend-inprogress-slots
    content: Update checkSlotAvailability to allow booking for incomplete segments of IN_PROGRESS trips
    status: in_progress
  - id: backend-slotfinder-inprogress
    content: Update slotFinder.ts checkSlotAvailabilityForRoutes with same IN_PROGRESS logic
    status: pending
  - id: backend-start-next-mutation
    content: Create startNextRouteSegment mutation that auto-completes previous segment
    status: pending
  - id: frontend-driver-route-states
    content: Add route state calculation (in_progress/completed/upcoming) with visual styling
    status: pending
  - id: frontend-driver-start-next
    content: Replace Complete buttons with single Start Next button on next segment
    status: pending
  - id: frontend-driver-confirm-modal
    content: Add confirmation modal for starting next segment with revert option
    status: pending
  - id: verify-seat-allocation
    content: Test and verify seat allocation/deallocation across overlapping bookings
    status: pending
---

# In-Progress Booking & Driver UI Improvements

## Issue 1: Allow Booking for IN_PROGRESS Trips (Incomplete Route Segments)

### Problem

In [`convex/trips/index.ts`](convex/trips/index.ts) line 308-310, when a trip instance is IN_PROGRESS, the code skips it entirely:

```typescript
if (matchingInstance.status !== "SCHEDULED") {
  continue;  // Skips IN_PROGRESS trips!
}
```

This prevents users from booking C->A when the driver has left H but hasn't reached C yet.

### Solution

Modify `getAvailableSlotsForTrip` and `checkSlotAvailability` to:

1. For IN_PROGRESS trips, check if the **requested route segments** are still incomplete
2. Only allow booking if ALL requested segments have `completed: false`
3. Check seat availability across only those incomplete segments

**Files to modify:**

- [`convex/trips/index.ts`](convex/trips/index.ts) - Update `checkSlotAvailability` inner function
- [`convex/lib/slotFinder.ts`](convex/lib/slotFinder.ts) - Update `checkSlotAvailabilityForRoutes`

**Logic change:**

```javascript
IF status === "IN_PROGRESS":
    - Get routeInstances for this tripInstance
    - Check if ALL routes from fromIndex to toIndex have completed === false
    - If any requested segment is completed, REJECT (can't book for past segments)
    - If all requested segments are incomplete, check seat availability
    - Return available if seats available
```

---

## Issue 2: Driver Route UI Redesign

### Current Behavior

- Each route has a "Complete" button
- No visual distinction for current segment
- Driver clicks "Complete" on each segment individually

### Requested Behavior

- **Visual states:** Yellow/Amber = In Progress, Green = Completed, White/Gray = Upcoming
- First segment automatically starts when trip starts (no "Start" button needed on first)
- Show "Start Next Segment" button ONLY on the next upcoming segment
- Clicking "Start" auto-completes the previous segment
- Confirmation modal before action
- "Revert" option for mistakes (undo last completion)

### Changes to [`components/interfaces/driver/trip-instance-detail.tsx`](components/interfaces/driver/trip-instance-detail.tsx)

**A) Determine route states:**

```typescript
// Find current route index (first incomplete route)
const currentRouteIndex = routes.findIndex(r => !r.completed);

// Route states:
// - completed = true -> "completed" (green)
// - completed = false && index === currentRouteIndex -> "in_progress" (yellow)
// - completed = false && index > currentRouteIndex -> "upcoming" (white)
```

**B) UI Changes:**

- Yellow background for current in-progress segment
- Green background for completed segments
- White/gray for upcoming segments
- Show "Start Next Segment" button ONLY on `currentRouteIndex + 1` (the next segment)
- Remove "Complete" buttons from all segments
- Add "Revert Last" button (to undo last completion)

**C) New mutation: `startNextRouteSegment`**

- In [`convex/routeInstances/mutations.ts`](convex/routeInstances/mutations.ts)
- Accepts `tripInstanceId` and `nextRouteInstanceId`
- Validates that previous route is in progress
- Auto-completes the current route (releases seats for passengers ending there)
- Marks next route as "started" (though we don't have a started field - it's implicit)

**D) Confirmation Modal:**

- Show modal before starting next segment: "Starting [X -> Y] will mark [H -> X] as completed. Are you sure?"
- Include revert option in the modal or as separate button

---

## Issue 3: Seat Management Verification & Display

### Current Implementation Review

The seat management logic in [`convex/routeInstances/mutations.ts`](convex/routeInstances/mutations.ts) looks correct:**On route completion (lines 153-168):**

- Finds all bookings where `toRouteIndex === currentRouteIndex`
- Releases those seats from `seatsOccupied`
- This correctly handles: H->C passengers getting off at C

**Verification needed:**

- When booking H->A (covering H->C, C->X, X->A), seats should be added to ALL three route instances
- When C->X is completed, only passengers ending at X should have seats released
- Passengers continuing to A keep their seats counted

### Seat Display for Driver

Already implemented in lines 476-479:

```tsx
<span className="flex items-center gap-1">
  <Users className="h-3 w-3" />
  {route.seatsOccupied} occupied / {route.seatHeld} held
</span>
```

This is correct but could be enhanced to show:

- Total capacity vs used
- Which passengers are getting off at this stop

---

## Implementation Tasks

### Task 1: Backend - Allow IN_PROGRESS bookings

1. Update `checkSlotAvailability` in [`convex/trips/index.ts`](convex/trips/index.ts):

- Handle `status === "IN_PROGRESS"` specially
- Check if all requested route segments are incomplete
- Only then check seat availability

2. Update `checkSlotAvailabilityForRoutes` in [`convex/lib/slotFinder.ts`](convex/lib/slotFinder.ts):

- Same logic for the mutation-side slot finder

### Task 2: Backend - New startNextSegment mutation

1. Add `startNextRouteSegment` mutation in [`convex/routeInstances/mutations.ts`](convex/routeInstances/mutations.ts):

- Find current in-progress route (first incomplete)
- Complete it (release seats for passengers ending there)
- Validate next route exists and is not completed
- Return success with updated state

### Task 3: Frontend - Driver UI Redesign

1. Refactor route segment rendering in [`trip-instance-detail.tsx`](components/interfaces/driver/trip-instance-detail.tsx):

- Calculate `currentRouteIndex`
- Apply conditional styling (yellow/green/white)
- Show "Start Next" button only on next segment
- Add "Revert Last" button
- Add confirmation modal with AlertDialog

### Task 4: Verify seat math

1. Test scenario: