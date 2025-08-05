# Trip Management Improvements

## Overview

This document outlines the improvements made to the trip management system to address the following issues:

1. **Missing shuttle capacity reset after trip completion**
2. **Data overlap between current and next trips**
3. **Lack of proper trip state management**
4. **Missing capacity reset when bookings are cancelled or rejected**

## Problems Solved

### 1. Shuttle Capacity Reset

**Problem**: After a trip was completed, the shuttle's seat capacity (held and confirmed seats) was not being reset, causing issues for subsequent trips.

**Solution**: 
- Added shuttle capacity reset logic to the `endTrip` function
- The `resetSeatCapacityForNewBookings` function is now called after trip completion
- This ensures the shuttle is ready for the next trip with full capacity

### 2. Data Overlap Prevention

**Problem**: Current and next trips were sharing data, causing conflicts and incorrect seat allocations.

**Solution**:
- Created `prepareNextTrip` function to properly transition between trips
- Added `checkAndCleanupOverlappingTrips` function to detect and resolve conflicts
- Implemented automatic cleanup before starting new trips

### 3. Trip State Management

**Problem**: No clear mechanism to manage the transition from current trip to next trip.

**Solution**:
- Added proper trip lifecycle management
- Implemented status-based trip tracking
- Created endpoints for trip preparation and cleanup

### 4. Booking Cancellation/Rejection Capacity Reset

**Problem**: When bookings were cancelled or rejected (by frontdesk, guest, or system), the shuttle capacity was not being reset, causing incorrect seat allocations.

**Solution**:
- Created `releaseAllSeatsForBooking` function to handle both held and confirmed seats
- Added `releaseConfirmedSeatsInShuttle` function for confirmed seat releases
- Updated all cancellation/rejection flows to use the new functions
- Enhanced existing `releaseHeldSeats` function to handle both held and confirmed seats

## New Functions

### 1. `prepareNextTrip(driverId, currentTripId?)`

This function handles the transition from current trip to next trip:

- Completes the current trip if provided
- Resets shuttle capacity for both directions
- Creates a new trip with available bookings
- Assigns bookings to the new trip
- Returns information about the transition

**Usage**:
```javascript
// Prepare next trip (automatically finds current trip)
const result = await prepareNextTrip(driverId);

// Prepare next trip with specific current trip
const result = await prepareNextTrip(driverId, currentTripId);
```

### 2. `checkAndCleanupOverlappingTrips(driverId)`

This function detects and resolves overlapping trips:

- Finds all active trips for a driver
- Keeps only the most recent trip
- Completes and cleans up overlapping trips
- Resets shuttle capacity for cleaned trips
- Unassigns unverified bookings from cleaned trips

**Usage**:
```javascript
const result = await checkAndCleanupOverlappingTrips(driverId);
```

### 3. `releaseAllSeatsForBooking(bookingId)`

This function releases all seats (both held and confirmed) for a booking:

- Handles both held and confirmed seats
- Releases seats based on booking direction
- Updates booking to clear all seat-related fields
- Used for cancellations and rejections

**Usage**:
```javascript
const result = await releaseAllSeatsForBooking(bookingId);
```

### 4. `releaseConfirmedSeatsInShuttle(shuttleId, numberOfPersons, direction?)`

This function releases confirmed seats in a shuttle:

- Reduces confirmed seat counts based on direction
- Handles both direction-specific and general seat counts
- Used when confirmed bookings are cancelled

**Usage**:
```javascript
const result = await releaseConfirmedSeatsInShuttle(shuttleId, numberOfPersons, 'HOTEL_TO_AIRPORT');
```

## Capacity Reset Scenarios

### 1. Frontdesk Cancellation

When frontdesk cancels a booking:
- Both held and confirmed seats are released
- Shuttle capacity is updated accordingly
- Booking is marked as cancelled

### 2. Frontdesk Rejection

When frontdesk rejects a booking:
- Both held and confirmed seats are released
- Shuttle capacity is updated accordingly
- Booking is marked as cancelled with rejection reason

### 3. Guest Cancellation

When guest cancels their own booking:
- Both held and confirmed seats are released
- Shuttle capacity is updated accordingly
- Booking is marked as cancelled

### 4. System Cancellation (Cron Job)

When system automatically cancels expired bookings:
- Both held and confirmed seats are released
- Shuttle capacity is updated accordingly
- Booking is marked as cancelled with system reason

## New Endpoints

### 1. `POST /api/trips/prepare-next`

Prepares the next trip by transitioning from the current trip.

**Request Body**:
```json
{
  "currentTripId": "optional-trip-id"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Successfully transitioned to next trip",
  "currentTrip": { /* completed trip info */ },
  "nextTrip": { /* new trip info */ },
  "assignedBookings": 5
}
```

### 2. `POST /api/trips/cleanup-overlapping`

Manually triggers cleanup of overlapping trips.

**Response**:
```json
{
  "success": true,
  "message": "Cleaned up 2 overlapping trips",
  "cleanedTrips": [
    {
      "id": "trip-id",
      "startTime": "2024-01-01T10:00:00Z",
      "endTime": "2024-01-01T12:00:00Z",
      "bookingsCount": 3
    }
  ],
  "remainingTrip": { /* remaining active trip */ }
}
```

## Updated Functions

### 1. `endTrip` Function

**Changes**:
- Added shuttle capacity reset after trip completion
- Added WebSocket notifications for frontdesk
- Improved error handling for capacity reset

**New Logic**:
```javascript
// Reset shuttle capacity after trip completion
await resetSeatCapacityForNewBookings(trip.shuttleId, 'HOTEL_TO_AIRPORT');
await resetSeatCapacityForNewBookings(trip.shuttleId, 'AIRPORT_TO_HOTEL');
```

### 2. `startTrip` Function

**Changes**:
- Added automatic overlapping trip cleanup before starting new trip
- Improved error handling and logging

**New Logic**:
```javascript
// Check for and cleanup any overlapping trips
const cleanupResult = await checkAndCleanupOverlappingTrips(driverId);
```

### 3. `releaseHeldSeats` Function

**Changes**:
- Now handles both held and confirmed seats
- Automatically detects seat status and releases accordingly
- Enhanced logging for better debugging

**New Logic**:
```javascript
// If seats are confirmed, release confirmed seats
if (booking.seatsConfirmed) {
  await releaseConfirmedSeatsInShuttle(booking.shuttleId, booking.numberOfPersons, direction);
}
// If seats are held but not confirmed, release held seats
else if (booking.seatsHeld) {
  await releaseSeatsInShuttle(booking.shuttleId, booking.numberOfPersons, direction);
}
```

## Trip Lifecycle

### Current Flow

1. **Trip Start**: Driver starts a trip with available bookings
2. **Trip Active**: Trip is in progress with bookings assigned
3. **Trip Phase Transition**: Trip moves from OUTBOUND to RETURN phase
4. **Trip Completion**: Trip is marked as completed
5. **Capacity Reset**: Shuttle capacity is reset for next trip
6. **Next Trip Preparation**: New trip is prepared with available bookings

### Data Separation

- **Current Trip**: Only one active trip per driver at a time
- **Next Trip**: Prepared in advance but doesn't interfere with current trip
- **Completed Trips**: Marked as completed and don't affect current operations
- **Shuttle Capacity**: Reset after each trip completion

### Capacity Reset Flow

1. **Booking Cancellation/Rejection**: Any cancellation triggers seat release
2. **Seat Status Check**: System checks if seats are held or confirmed
3. **Appropriate Release**: Releases held or confirmed seats accordingly
4. **Capacity Update**: Updates shuttle capacity in database
5. **Booking Cleanup**: Clears all seat-related fields from booking

## Error Handling

### Capacity Reset Errors

If shuttle capacity reset fails during trip completion:
- Error is logged but doesn't fail the trip completion
- Trip is still marked as completed
- Manual cleanup may be required

### Overlapping Trip Errors

If overlapping trip cleanup fails:
- Error is logged and returned to client
- Trip start is prevented until cleanup succeeds
- Manual cleanup endpoint can be used

### Booking Cancellation Errors

If seat release fails during booking cancellation:
- Error is logged but doesn't fail the cancellation
- Booking is still marked as cancelled
- Manual cleanup may be required

## Monitoring and Debugging

### Logging

All trip management operations are logged with clear prefixes:
- `=== RESETTING SHUTTLE CAPACITY AFTER TRIP COMPLETION ===`
- `=== PREPARING NEXT TRIP ===`
- `=== CHECKING FOR OVERLAPPING TRIPS ===`
- `=== RELEASING ALL SEATS FOR BOOKING ===`
- `=== RELEASING CONFIRMED SEATS IN SHUTTLE ===`

### Debug Endpoints

Existing debug endpoints remain available:
- `/api/trips/debug/bookings`
- `/api/trips/debug/schedule`
- `/api/trips/debug/time`
- `/api/trips/debug/shuttle-capacity/:shuttleId`

## Migration Notes

### For Existing Data

- Existing active trips will continue to work normally
- Overlapping trips will be automatically cleaned up on next trip start
- Shuttle capacity will be reset on next trip completion
- Existing bookings will work with new capacity reset logic

### For New Implementations

- Use `prepareNextTrip` for proper trip transitions
- Call `cleanup-overlapping` endpoint if manual cleanup is needed
- Monitor logs for capacity reset and cleanup operations
- Use `releaseAllSeatsForBooking` for booking cancellations

## Best Practices

1. **Always use `prepareNextTrip`** for transitioning between trips
2. **Monitor shuttle capacity** after trip completions
3. **Use cleanup endpoints** if overlapping trips are detected
4. **Check logs** for any capacity reset or cleanup errors
5. **Test trip transitions** in development before production
6. **Use `releaseAllSeatsForBooking`** for all booking cancellations
7. **Monitor capacity** after booking cancellations and rejections

## Testing

### Test Scenarios

1. **Normal Trip Flow**: Start → Active → Complete → Next Trip
2. **Overlapping Trip Cleanup**: Multiple active trips → Cleanup → Single active trip
3. **Capacity Reset**: Complete trip → Check shuttle capacity → Verify reset
4. **Error Handling**: Simulate capacity reset failure → Verify trip still completes
5. **Booking Cancellation**: Cancel booking → Check capacity reset → Verify seats released
6. **Frontdesk Rejection**: Reject booking → Check capacity reset → Verify seats released
7. **Guest Cancellation**: Guest cancels → Check capacity reset → Verify seats released
8. **System Cancellation**: System cancels → Check capacity reset → Verify seats released

### Test Endpoints

```bash
# Test trip preparation
POST /api/trips/prepare-next

# Test cleanup
POST /api/trips/cleanup-overlapping

# Test normal trip completion
POST /api/trips/{tripId}/end

# Test booking cancellation
POST /api/frontdesk/bookings/{bookingId}/cancel
POST /api/guest/bookings/{bookingId}/cancel

# Test booking rejection
POST /api/frontdesk/bookings/{bookingId}/reject

# Test shuttle capacity debug
GET /api/trips/debug/shuttle-capacity/{shuttleId}
```

## Future Improvements

1. **Automated Cleanup**: Periodic cleanup of overlapping trips
2. **Capacity Monitoring**: Real-time monitoring of shuttle capacity
3. **Trip Analytics**: Track trip completion rates and capacity utilization
4. **Notification System**: Enhanced notifications for trip state changes
5. **Capacity Alerts**: Alerts when capacity is running low
6. **Automatic Seat Optimization**: Automatic seat allocation optimization 