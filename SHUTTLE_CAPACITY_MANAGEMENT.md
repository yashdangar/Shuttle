# Shuttle Capacity Management Implementation

## Overview

This document describes the implementation of shuttle capacity management in the Shuttle booking system. The system now properly handles multiple shuttles when one shuttle's seats are full, automatically assigning bookings to the next available shuttle with capacity.

## Problem Solved

**Before**: The system would assign all bookings to the first available shuttle regardless of capacity, potentially overloading shuttles.

**After**: The system now:
- Checks shuttle capacity before assignment
- Automatically finds the next available shuttle when one is full
- Prevents overloading of individual shuttles
- Provides real-time capacity status

## Key Changes Made

### 1. New Utility Functions (`server/src/utils/bookingUtils.ts`)

#### `checkShuttleCapacity(shuttleId, numberOfPersons)`
- Checks if a specific shuttle has available capacity for new passengers
- Returns `true` if capacity is available, `false` otherwise
- Only counts active trip bookings (not just assigned to shuttle)

#### `findAvailableShuttleWithCapacity(hotelId, numberOfPersons)`
- Finds the first available shuttle with sufficient capacity
- Returns shuttle object or `null` if no capacity available
- Orders shuttles consistently by ID for predictable assignment

### 2. Updated Booking Assignment Logic

#### Frontdesk Controller (`server/src/controller/frontdeskController.ts`)
- `createBooking()`: Now uses capacity-aware shuttle finding
- `assignUnassignedBookings()`: Checks capacity before assignment
- `verifyGuestBooking()`: Ensures capacity before verification

#### Driver Controller (`server/src/controller/driverController.ts`)
- `assignUnassignedBookings()`: Checks current shuttle capacity, finds alternative if full

#### Booking Utils (`server/src/utils/bookingUtils.ts`)
- `assignBookingToTrip()`: Added capacity check before assignment
- Returns appropriate error messages when capacity is exceeded

### 3. New Capacity Status Endpoint

#### `GET /frontdesk/shuttle-capacity-status`
Returns detailed capacity information for all shuttles:
```json
{
  "shuttles": [
    {
      "shuttleId": 1,
      "vehicleNumber": "SH-001",
      "totalSeats": 12,
      "currentPassengers": 8,
      "availableSeats": 4,
      "utilization": 67,
      "driver": "John Doe",
      "isAvailable": true
    }
  ],
  "totalShuttles": 2,
  "availableShuttles": 1
}
```

### 4. Frontend Updates

#### Frontdesk Shuttles Page (`frontdesk/app/dashboard/shuttles/page.tsx`)
- Added "Capacity Status" column showing:
  - Current passengers vs total seats
  - Available seats
  - Utilization percentage
  - Visual indicator (green/red dot) for availability

## How It Works

### Booking Assignment Flow

1. **New Booking Created**: System calls `findAvailableShuttleWithCapacity()`
2. **Capacity Check**: For each shuttle, calculates current passengers from active trips
3. **Assignment**: Assigns to first shuttle with sufficient capacity
4. **Fallback**: If no shuttle has capacity, booking remains unassigned

### Example Scenario

**Setup**: 
- Shuttle A: 12 seats, currently 10 passengers (2 available)
- Shuttle B: 12 seats, currently 5 passengers (7 available)

**Booking Request**: 4 passengers

**Result**:
- Shuttle A: Cannot accommodate (2 < 4)
- Shuttle B: Can accommodate (7 >= 4)
- **Assignment**: Booking goes to Shuttle B

## Testing the Implementation

### 1. Test Capacity Status Endpoint

```bash
# Get capacity status for all shuttles
curl -X GET "http://localhost:3001/frontdesk/shuttle-capacity-status" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2. Test Booking Assignment

1. Create multiple bookings with different passenger counts
2. Check that bookings are distributed across shuttles based on capacity
3. Verify that no shuttle exceeds its seat limit

### 3. Test Frontend Display

1. Navigate to Frontdesk → Shuttles
2. Verify capacity status column shows:
   - Current passenger count
   - Available seats
   - Utilization percentage
   - Availability indicator

### 4. Test Edge Cases

- **All shuttles full**: Booking should remain unassigned
- **Large group**: Should find shuttle with sufficient capacity
- **Mixed capacity**: Should distribute bookings efficiently

## API Response Changes

### Booking Assignment Responses

**Before**:
```json
{
  "assigned": true,
  "tripId": "trip-123",
  "reason": "Assigned to active outbound trip"
}
```

**After** (when capacity exceeded):
```json
{
  "assigned": false,
  "reason": "Shuttle is at capacity",
  "shuttleAssigned": false
}
```

### Error Messages

- `"No available shuttle with capacity found for this booking"`
- `"Shuttle is at capacity"`
- `"No available shuttle with capacity"`

## Benefits

1. **Prevents Overloading**: No shuttle can exceed its seat capacity
2. **Efficient Distribution**: Bookings are automatically distributed across available shuttles
3. **Real-time Monitoring**: Frontend shows current capacity status
4. **Scalable**: Works with any number of shuttles
5. **Consistent**: Predictable assignment order based on shuttle ID

## Future Enhancements

1. **Smart Routing**: Consider pickup/dropoff locations for optimal assignment
2. **Time-based Capacity**: Consider time slots for better distribution
3. **Priority Booking**: Handle VIP or priority bookings
4. **Capacity Alerts**: Notify when shuttles are approaching capacity
5. **Dynamic Scheduling**: Automatically adjust schedules based on demand

## Configuration

No additional configuration required. The system automatically:
- Reads shuttle seat capacity from the database
- Calculates current passenger count from active trips
- Applies capacity limits during booking assignment

## Monitoring

Monitor the following metrics:
- Shuttle utilization rates
- Number of unassigned bookings due to capacity
- Distribution of bookings across shuttles
- Response times for capacity calculations 