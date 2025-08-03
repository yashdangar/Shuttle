import prisma from "../db/prisma";
import { findAvailableShuttle, holdSeatsInShuttle } from "./shuttleSeatUtils";

// Configuration for seat holding
const SEAT_HOLD_DURATION_MINUTES = 5; // Hold seats for 5 minutes

/**
 * Hold seats for a booking temporarily
 * @param bookingId - The booking ID
 * @param numberOfPersons - Number of persons to hold seats for
 * @param hotelId - The hotel ID
 * @param preferredTime - Preferred time for the booking
 * @param direction - Direction of the trip (AIRPORT_TO_HOTEL or HOTEL_TO_AIRPORT)
 * @returns Promise<boolean> - Whether seats were successfully held
 */
export const holdSeatsForBooking = async (
  bookingId: string,
  numberOfPersons: number,
  hotelId: number,
  preferredTime?: Date,
  direction?: 'AIRPORT_TO_HOTEL' | 'HOTEL_TO_AIRPORT'
): Promise<boolean> => {
  try {
    console.log(`=== HOLDING SEATS FOR BOOKING ===`);
    console.log(`Booking ID: ${bookingId}, Persons: ${numberOfPersons}, Hotel: ${hotelId}`);

    // Find available shuttle
    const availableShuttle = await findAvailableShuttle(hotelId, numberOfPersons, preferredTime, direction);
    
    if (!availableShuttle) {
      console.log(`❌ No available shuttle found for booking ${bookingId}`);
      return false;
    }

    // Hold seats in the shuttle
    const seatsHeld = await holdSeatsInShuttle(availableShuttle.id, numberOfPersons, direction);
    
    if (!seatsHeld) {
      console.log(`❌ Failed to hold seats in shuttle ${availableShuttle.id}`);
      return false;
    }

    // Calculate hold duration
    const now = new Date();
    const holdUntil = new Date(now.getTime() + SEAT_HOLD_DURATION_MINUTES * 60 * 1000);

    // Update booking with seat hold information and shuttle assignment
    await prisma.booking.update({
      where: { id: bookingId },
      data: {
        seatsHeld: true,
        seatsHeldAt: now,
        seatsHeldUntil: holdUntil,
        shuttleId: availableShuttle.id, // Assign the shuttle
      },
    });

    console.log(`✅ Seats held for booking ${bookingId} in shuttle ${availableShuttle.vehicleNumber} until ${holdUntil.toISOString()}`);
    console.log(`=== END SEAT HOLDING ===`);

    return true;
  } catch (error) {
    console.error("Error holding seats:", error);
    return false;
  }
};

import { confirmSeatsInShuttle } from "./shuttleSeatUtils";

/**
 * Confirm held seats for a booking
 * @param bookingId - The booking ID
 * @returns Promise<boolean> - Whether seats were successfully confirmed
 */
export const confirmHeldSeats = async (bookingId: string): Promise<boolean> => {
  try {
    console.log(`=== CONFIRMING HELD SEATS ===`);
    console.log(`Booking ID: ${bookingId}`);

    // Get the booking to check if seats are held
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        pickupLocation: true,
        dropoffLocation: true,
      },
    });

    if (!booking) {
      console.log(`❌ Booking ${bookingId} not found`);
      return false;
    }

    if (!booking.seatsHeld) {
      console.log(`❌ Booking ${bookingId} has no held seats to confirm`);
      return false;
    }

    if (!booking.shuttleId) {
      console.log(`❌ Booking ${bookingId} has no shuttle assignment`);
      return false;
    }

    // Check if hold has expired
    if (booking.seatsHeldUntil && new Date() > booking.seatsHeldUntil) {
      console.log(`❌ Seat hold for booking ${bookingId} has expired`);
      return false;
    }

    // Determine direction based on booking type
    let direction: 'AIRPORT_TO_HOTEL' | 'HOTEL_TO_AIRPORT' | undefined;
    
    if (booking.bookingType === 'AIRPORT_TO_HOTEL') {
      direction = 'AIRPORT_TO_HOTEL';
    } else if (booking.bookingType === 'HOTEL_TO_AIRPORT') {
      direction = 'HOTEL_TO_AIRPORT';
    }

    // Confirm the held seats in the shuttle
    const seatsConfirmed = await confirmSeatsInShuttle(booking.shuttleId, booking.numberOfPersons, direction);
    
    if (!seatsConfirmed) {
      console.log(`❌ Failed to confirm seats in shuttle ${booking.shuttleId}`);
      return false;
    }

    // Confirm the held seats in the booking
    await prisma.booking.update({
      where: { id: bookingId },
      data: {
        seatsConfirmed: true,
        seatsConfirmedAt: new Date(),
        seatsHeld: false, // Clear the hold since seats are now confirmed
        seatsHeldAt: null,
        seatsHeldUntil: null,
        // Keep shuttleId assigned since seats are now confirmed
      },
    });

    console.log(`✅ Seats confirmed for booking ${bookingId} in shuttle ${booking.shuttleId}`);
    console.log(`=== END SEAT CONFIRMATION ===`);

    return true;
  } catch (error) {
    console.error("Error confirming held seats:", error);
    return false;
  }
};

import { releaseSeatsInShuttle } from "./shuttleSeatUtils";

/**
 * Release held seats for a booking
 * @param bookingId - The booking ID
 * @returns Promise<boolean> - Whether seats were successfully released
 */
export const releaseHeldSeats = async (bookingId: string): Promise<boolean> => {
  try {
    console.log(`=== RELEASING HELD SEATS ===`);
    console.log(`Booking ID: ${bookingId}`);

    // Get the booking to check if it has a shuttle assignment
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        shuttleId: true,
        numberOfPersons: true,
      },
    });

    if (!booking) {
      console.log(`❌ Booking ${bookingId} not found`);
      return false;
    }

    // Release seats in the shuttle if assigned
    if (booking.shuttleId) {
      // Get booking details to determine direction
      const bookingDetails = await prisma.booking.findUnique({
        where: { id: bookingId },
        select: { bookingType: true }
      });

      let direction: 'AIRPORT_TO_HOTEL' | 'HOTEL_TO_AIRPORT' | undefined;
      
      if (bookingDetails?.bookingType === 'AIRPORT_TO_HOTEL') {
        direction = 'AIRPORT_TO_HOTEL';
      } else if (bookingDetails?.bookingType === 'HOTEL_TO_AIRPORT') {
        direction = 'HOTEL_TO_AIRPORT';
      }

      const seatsReleased = await releaseSeatsInShuttle(booking.shuttleId, booking.numberOfPersons, direction);
      
      if (!seatsReleased) {
        console.log(`❌ Failed to release seats in shuttle ${booking.shuttleId}`);
        return false;
      }
    }

    // Update booking to clear seat hold
    await prisma.booking.update({
      where: { id: bookingId },
      data: {
        seatsHeld: false,
        seatsHeldAt: null,
        seatsHeldUntil: null,
        shuttleId: null, // Remove shuttle assignment
      },
    });

    console.log(`✅ Seats released for booking ${bookingId}`);
    console.log(`=== END SEAT RELEASE ===`);

    return true;
  } catch (error) {
    console.error("Error releasing held seats:", error);
    return false;
  }
};

/**
 * Check if a booking has held seats
 * @param bookingId - The booking ID
 * @returns Promise<boolean> - Whether the booking has held seats
 */
export const hasHeldSeats = async (bookingId: string): Promise<boolean> => {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        seatsHeld: true,
        seatsHeldUntil: true,
      },
    });

    if (!booking) return false;

    // Check if seats are held and not expired
    return Boolean(booking.seatsHeld) && 
           booking.seatsHeldUntil !== null && 
           new Date() <= booking.seatsHeldUntil;
  } catch (error) {
    console.error("Error checking held seats:", error);
    return false;
  }
};

import { cleanupExpiredShuttleSeatHolds } from "./shuttleSeatUtils";

/**
 * Clean up expired seat holds
 * This should be called periodically (e.g., via cron job)
 */
export const cleanupExpiredSeatHolds = async (): Promise<void> => {
  try {
    console.log(`=== CLEANING UP EXPIRED SEAT HOLDS ===`);
    
    // Use the shuttle-based cleanup function
    await cleanupExpiredShuttleSeatHolds();
    
    console.log(`=== END CLEANUP ===`);
  } catch (error) {
    console.error("Error cleaning up expired seat holds:", error);
  }
};

import { getShuttleAvailability } from "./shuttleSeatUtils";

/**
 * Get seat hold status for a booking
 * @param bookingId - The booking ID
 * @returns Promise<object> - Seat hold status information
 */
export const getSeatHoldStatus = async (bookingId: string) => {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        seatsHeld: true,
        seatsHeldAt: true,
        seatsHeldUntil: true,
        seatsConfirmed: true,
        seatsConfirmedAt: true,
        numberOfPersons: true,
        shuttleId: true,
        shuttle: {
          select: {
            id: true,
            vehicleNumber: true,
            seats: true,
          },
        },
      },
    });

    if (!booking) {
      return {
        hasHeldSeats: false,
        hasConfirmedSeats: false,
        isExpired: false,
        timeRemaining: null,
      };
    }

    const now = new Date();
    const isExpired = booking.seatsHeldUntil ? now > booking.seatsHeldUntil : false;
    const timeRemaining = booking.seatsHeldUntil 
      ? Math.max(0, booking.seatsHeldUntil.getTime() - now.getTime())
      : null;

    // Get shuttle availability if shuttle is assigned
    let shuttleAvailability = null;
    if (booking.shuttleId) {
      shuttleAvailability = await getShuttleAvailability(booking.shuttleId);
    }

    return {
      hasHeldSeats: booking.seatsHeld && !isExpired,
      hasConfirmedSeats: booking.seatsConfirmed,
      isExpired,
      timeRemaining,
      numberOfPersons: booking.numberOfPersons,
      heldAt: booking.seatsHeldAt,
      heldUntil: booking.seatsHeldUntil,
      confirmedAt: booking.seatsConfirmedAt,
      shuttleId: booking.shuttleId,
      shuttle: booking.shuttle,
      shuttleAvailability,
    };
  } catch (error) {
    console.error("Error getting seat hold status:", error);
    return {
      hasHeldSeats: false,
      hasConfirmedSeats: false,
      isExpired: false,
      timeRemaining: null,
    };
  }
}; 