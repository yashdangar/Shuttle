---
name: In-Progress Booking & Driver UI
overview: Fix booking availability for IN_PROGRESS trips, redesign driver UI with sequential route progression, implement smart segment skipping for empty stops, and build real-time ETA system using Google Maps Routes API.
todos:
  - id: backend-inprogress-slots
    content: Update checkSlotAvailability in trips/index.ts and slotFinder.ts for IN_PROGRESS trips
    status: completed
  - id: backend-start-next-mutation
    content: Create startNextRouteSegment mutation that auto-completes previous segment
    status: completed
  - id: frontend-driver-route-states
    content: Add route state calculation with visual styling (yellow/green/white)
    status: completed
  - id: frontend-driver-start-next
    content: Replace Complete buttons with single Start Next button on next segment
    status: completed
  - id: frontend-driver-confirm-modal
    content: Add confirmation modal for starting next segment with revert option
    status: completed
  - id: backend-smart-skip
    content: Implement smart segment skipping when no bookings exist for intermediate stops
    status: completed
  - id: backend-update-driver-location
    content: Create updateDriverLocation mutation for storing driver lat/lng
    status: completed
  - id: backend-eta-action
    content: Create calculateAndUpdateETAs action using Google Routes API
    status: completed
  - id: frontend-eta-updater-hook
    content: Create useETAUpdater hook for driver panel to trigger ETA updates
    status: completed
  - id: frontend-eta-display-hook
    content: Create useTripETA hook for displaying ETAs across all panels
    status: completed
  - id: frontend-eta-integration
    content: Integrate ETA display in driver panel, frontdesk dashboard, and guest booking page
    status: completed
---

# In-Progress Booking, Driver UI & ETA System

## Overview

This plan covers 6 major areas:

1. Allow booking for incomplete segments of IN_PROGRESS trips
2. Redesign driver route UI with Start Next / Revert flow
3. Smart segment skipping when no bookings exist for intermediate stops
4. Real-time ETA system using Google Maps Routes API

---

## Issue 1: Allow Booking for IN_PROGRESS Trips

### Problem

In [`convex/trips/index.ts`](convex/trips/index.ts) lines 308-310, IN_PROGRESS trips are skipped entirely, preventing bookings for incomplete segments (e.g., C->A when driver left H but hasn't reached C).

### Solution

Modify `checkSlotAvailability` to handle IN_PROGRESS trips by checking if requested route segments are still incomplete.**Files to modify:**

- [`convex/trips/index.ts`](convex/trips/index.ts) - `checkSlotAvailability` function (line 279)
- [`convex/lib/slotFinder.ts`](convex/lib/slotFinder.ts) - `checkSlotAvailabilityForRoutes` function (line 75)

**Logic:**

```javascript
IF status === "IN_PROGRESS":
    - Get routeInstances for tripInstance
    - Check if ALL routes from fromIndex to toIndex have completed === false
    - If any segment is completed, REJECT (can't book past segments)
    - If all incomplete, check seat availability and return available if seats exist
```

---

## Issue 2: Driver Route UI Redesign

### Current Behavior

- Each route has individual "Complete" button
- No visual distinction for segment states

### New Behavior

- **Visual states:** Yellow = In Progress, Green = Completed, White = Upcoming
- First segment auto-starts when trip starts
- "Start Next" button only on next upcoming segment
- Clicking "Start Next" auto-completes current segment
- Confirmation modal + Revert capability

### New Mutation: `startNextRouteSegment`

**File:** [`convex/routeInstances/mutations.ts`](convex/routeInstances/mutations.ts)

```typescript
export const startNextRouteSegment = mutation({
  args: {
    driverId: v.id("users"),
    tripInstanceId: v.id("tripInstances"),
  },
  handler: async (ctx, args) => {
    // 1. Validate driver and trip
    // 2. Find current route (first incomplete)
    // 3. Complete current route (release seats for passengers ending here)
    // 4. Return updated state
  }
});
```



### Frontend Changes

**File:** [`components/interfaces/driver/trip-instance-detail.tsx`](components/interfaces/driver/trip-instance-detail.tsx)

```typescript
// Route state calculation
const currentRouteIndex = routes.findIndex(r => !r.completed);

// States:
// completed === true -> "completed" (green bg)
// completed === false && index === currentRouteIndex -> "in_progress" (yellow bg)
// completed === false && index > currentRouteIndex -> "upcoming" (white bg)
```



- Show "Start Next Segment" button ONLY on route at `currentRouteIndex + 1`
- Add "Revert Last" button to undo last completion
- Add AlertDialog confirmation modal

---

## Issue 3: Smart Segment Skipping (No Bookings)

### Problem

If trip is H->C->X->A but no bookings for C (convention center), driver shouldn't need to go there.

### Solution

When trip starts or route completes, dynamically identify the "effective next destination" based on actual bookings.

### New Logic

**File:** [`convex/routeInstances/mutations.ts`](convex/routeInstances/mutations.ts) - Add helper function

```typescript
async function getEffectiveNextRouteIndex(
  ctx: MutationCtx,
  tripInstanceId: Id<"tripInstances">,
  currentIndex: number
): number {
  // 1. Get all confirmed bookings for this trip instance
  // 2. Find minimum toRouteIndex > currentIndex that has bookings ending there
  //    OR minimum fromRouteIndex > currentIndex that has bookings starting there
  // 3. Return that index (skip empty intermediate stops)
}
```

**Booking restriction:** When trip is IN_PROGRESS, reject bookings for segments that would require visiting already-skipped stops.

### Frontend Display

- Show skipped segments with strikethrough or "Skipped" badge
- Update ETA to reflect actual next destination

---

## Issue 4: Real-Time ETA System

### Architecture

```javascript
┌─────────────────────────────────────────────────────────────────────┐
│                        ETA System Architecture                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────┐    Browser Geolocation     ┌──────────────────┐   │
│  │   Driver's   │ ──────────────────────────→│  Frontend Hook   │   │
│  │   Browser    │      (every 2 min)         │ useETAUpdater()  │   │
│  └──────────────┘                            └────────┬─────────┘   │
│                                                       │              │
│                                                       ▼              │
│                                              ┌──────────────────┐   │
│                                              │  API Route       │   │
│                                              │  /api/eta/update │   │
│                                              └────────┬─────────┘   │
│                                                       │              │
│         ┌─────────────────────────────────────────────┤              │
│         │                                             │              │
│         ▼                                             ▼              │
│  ┌──────────────┐                            ┌──────────────────┐   │
│  │ Google Maps  │ ◄───────────────────────── │  Convex Action   │   │
│  │ Routes API   │    computeRouteMatrix      │  updateETAs      │   │
│  │ (Matrix)     │ ──────────────────────────→│                  │   │
│  └──────────────┘       ETAs returned        └────────┬─────────┘   │
│                                                       │              │
│                                                       ▼              │
│                                              ┌──────────────────┐   │
│                                              │  routeInstances  │   │
│                                              │  (eta field)     │   │
│                                              └──────────────────┘   │
│                                                       │              │
│                    ┌──────────────────────────────────┤              │
│                    │              │                   │              │
│                    ▼              ▼                   ▼              │
│             ┌──────────┐  ┌──────────────┐   ┌──────────────┐       │
│             │  Driver  │  │  Frontdesk   │   │    Guest     │       │
│             │  Panel   │  │  Dashboard   │   │  Booking     │       │
│             └──────────┘  └──────────────┘   └──────────────┘       │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```



### Constants

**File:** `lib/constants/eta.ts` (NEW)

```typescript
export const ETA_UPDATE_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes
export const GOOGLE_ROUTES_API_URL = "https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix";
```



### Backend Components

#### 1. Update Driver Location Mutation

**File:** [`convex/users/mutations.ts`](convex/users/mutations.ts) (NEW or update existing)

```typescript
export const updateDriverLocation = mutation({
  args: {
    driverId: v.id("users"),
    latitude: v.number(),
    longitude: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.driverId, {
      driverCurrentLatitude: args.latitude,
      driverCurrentLongitude: args.longitude,
    });
  }
});
```



#### 2. ETA Calculation Action

**File:** [`convex/eta/actions.ts`](convex/eta/actions.ts) (NEW)

```typescript
export const calculateAndUpdateETAs = action({
  args: {
    tripInstanceId: v.id("tripInstances"),
    driverLatitude: v.number(),
    driverLongitude: v.number(),
  },
  handler: async (ctx, args) => {
    // 1. Get incomplete route instances with location coords
    // 2. Build waypoints array: [driverLoc, stop1, stop2, ...]
    // 3. Call Google Routes API computeRouteMatrix
    // 4. Parse response and update routeInstances.eta
  }
});
```



#### 3. Google Maps API Call

```typescript
async function fetchETAsFromGoogle(
  driverLat: number,
  driverLng: number,
  destinations: Array<{lat: number, lng: number}>
): Promise<Array<{destinationIndex: number, durationSeconds: number}>> {
  const response = await fetch(GOOGLE_ROUTES_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": process.env.GOOGLE_MAPS_API_KEY!,
      "X-Goog-FieldMask": "originIndex,destinationIndex,duration,status,condition"
    },
    body: JSON.stringify({
      origins: [{
        waypoint: {
          location: { latLng: { latitude: driverLat, longitude: driverLng } }
        }
      }],
      destinations: destinations.map(d => ({
        waypoint: {
          location: { latLng: { latitude: d.lat, longitude: d.lng } }
        }
      })),
      travelMode: "DRIVE",
      routingPreference: "TRAFFIC_AWARE"
    })
  });
  
  return response.json();
}
```



### Frontend Components

#### 1. ETA Updater Hook

**File:** `hooks/maps/use-eta-updater.ts` (NEW)

```typescript
export function useETAUpdater(tripInstanceId: string | null, isDriverPanel: boolean = false) {
  const updateETAs = useAction(api.eta.actions.calculateAndUpdateETAs);
  const updateDriverLocation = useMutation(api.users.mutations.updateDriverLocation);
  
  useEffect(() => {
    if (!tripInstanceId || !isDriverPanel) return;
    
    const interval = setInterval(async () => {
      // 1. Get driver's current position via navigator.geolocation
      // 2. Update driver location in DB
      // 3. Call calculateAndUpdateETAs action
    }, ETA_UPDATE_INTERVAL_MS);
    
    return () => clearInterval(interval);
  }, [tripInstanceId, isDriverPanel]);
}
```



#### 2. ETA Display Hook

**File:** `hooks/use-trip-eta.ts` (NEW)

```typescript
export function useTripETA(tripInstanceId: string) {
  const routeInstances = useQuery(
    api.routeInstances.queries.getRouteInstancesByTripInstance,
    { tripInstanceId }
  );
  
  return {
    segments: routeInstances?.map(ri => ({
      ...ri,
      etaFormatted: ri.eta ? formatETA(ri.eta) : null
    })) ?? [],
    isLoading: routeInstances === undefined
  };
}

function formatETA(etaSeconds: string): string {
  const seconds = parseInt(etaSeconds);
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  return `${hours}h ${remainingMins}m`;
}
```



### ETA Display Locations

1. **Driver Panel** ([`trip-instance-detail.tsx`](components/interfaces/driver/trip-instance-detail.tsx)):

- Show ETA per segment in route list
- Auto-trigger ETA updates every 2 min

2. **Frontdesk Dashboard** (`frontdesk/page.tsx`):

- Show ETA for IN_PROGRESS trips
- Query via `useTripETA` hook

3. **Guest Booking Detail** (`bookings/[id]/page.tsx`):

- Show ETA to pickup location
- Read-only display from `routeInstances.eta`

---

## API Summary

### New Convex Functions

| Function | Type | File | Purpose ||----------|------|------|---------|| `startNextRouteSegment` | mutation | `routeInstances/mutations.ts` | Auto-complete current, advance to next || `updateDriverLocation` | mutation | `users/mutations.ts` | Store driver lat/lng || `calculateAndUpdateETAs` | action | `eta/actions.ts` | Fetch Google ETAs, update DB || `getEffectiveNextRoute` | internal | `routeInstances/mutations.ts` | Find next non-empty stop |

### New Hooks

| Hook | File | Purpose ||------|------|---------|| `useETAUpdater` | `hooks/maps/use-eta-updater.ts` | Trigger ETA updates from driver || `useTripETA` | `hooks/use-trip-eta.ts` | Display ETAs across panels |

### API Routes

| Route | Method | Purpose ||-------|--------|---------|| `/api/eta/update` | POST | Proxy for Google Maps API (keeps API key server-side) |---

## Environment Variables

Add to `.env.local`:

```javascript
GOOGLE_MAPS_API_KEY=your_key_here
```

---

## Implementation Order

1. Backend: IN_PROGRESS booking logic
2. Backend: `startNextRouteSegment` mutation
3. Frontend: Driver UI redesign with visual states
4. Frontend: Confirmation modal + revert
5. Backend: Smart segment skipping