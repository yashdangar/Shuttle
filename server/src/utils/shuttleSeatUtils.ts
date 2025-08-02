import prisma from "../db/prisma";

// Configuration for seat holding
const SEAT_HOLD_DURATION_MINUTES = 5; // Hold seats for 5 minutes

/**
 * Find available shuttle for a booking
 * @param hotelId - The hotel ID
 * @param numberOfPersons - Number of persons to accommodate
 * @param preferredTime - Preferred time for the booking
 * @param direction - Direction of the trip (AIRPORT_TO_HOTEL or HOTEL_TO_AIRPORT)
 * @returns Promise<Shuttle | null> - Available shuttle or null
 */
export const findAvailableShuttle = async (
  hotelId: number,
  numberOfPersons: number,
  preferredTime?: Date,
  direction?: 'AIRPORT_TO_HOTEL' | 'HOTEL_TO_AIRPORT'
): Promise<any | null> => {
  try {
    console.log(`=== FINDING AVAILABLE SHUTTLE ===`);
    console.log(`Hotel ID: ${hotelId}, Persons: ${numberOfPersons}`);
    console.log(`Preferred time: ${preferredTime ? preferredTime.toISOString() : 'Not specified'}`);

    // Get all shuttles for the hotel with their schedules
    const shuttles = await prisma.shuttle.findMany({
      where: { hotelId },
      include: {
        schedules: {
          where: {
            // Only consider schedules that are active for the preferred time
            ...(preferredTime ? {
              startTime: {
                lte: preferredTime,
              },
              endTime: {
                gte: preferredTime,
              },
            } : {
              // If no preferred time, consider schedules active today
              scheduleDate: {
                gte: new Date(new Date().setHours(0, 0, 0, 0)),
                lte: new Date(new Date().setHours(23, 59, 59, 999)),
              },
            }),
          },
          include: {
            driver: true,
          },
        },
      },
    });

    console.log(`Found ${shuttles.length} shuttles for hotel ${hotelId}`);

    // Find shuttle with available capacity AND active schedule
    for (const shuttle of shuttles) {
      console.log(`Shuttle ${shuttle.id} (${shuttle.vehicleNumber}):`);
      console.log(`  Total seats: ${shuttle.seats}`);
      console.log(`  Seats held: ${shuttle.seatsHeld}`);
      console.log(`  Seats confirmed: ${shuttle.seatsConfirmed}`);
      console.log(`  Schedules: ${shuttle.schedules.length}`);

      // Check if shuttle has active schedules
      if (shuttle.schedules.length === 0) {
        console.log(`  ❌ No active schedules for this shuttle`);
        continue;
      }

      // Check if any schedule is currently active
      const now = new Date();
      const hasActiveSchedule = shuttle.schedules.some(schedule => {
        const isActive = now >= schedule.startTime && now <= schedule.endTime;
        console.log(`  Schedule ${schedule.id}: ${schedule.startTime.toISOString()} - ${schedule.endTime.toISOString()} (Active: ${isActive})`);
        return isActive;
      });

      if (!hasActiveSchedule) {
        console.log(`  ❌ No currently active schedules for this shuttle`);
        continue;
      }

      // Use direction-specific capacity if provided, otherwise fall back to general seats
      let capacity = shuttle.seats;
      if (direction === 'AIRPORT_TO_HOTEL' && shuttle.airportToHotelCapacity > 0) {
        capacity = shuttle.airportToHotelCapacity;
      } else if (direction === 'HOTEL_TO_AIRPORT' && shuttle.hotelToAirportCapacity > 0) {
        capacity = shuttle.hotelToAirportCapacity;
      }
      
      const availableSeats = capacity - shuttle.seatsHeld - shuttle.seatsConfirmed;
      console.log(`  Direction: ${direction || 'Not specified'}`);
      console.log(`  Capacity: ${capacity} (${direction === 'AIRPORT_TO_HOTEL' ? 'Airport to Hotel' : direction === 'HOTEL_TO_AIRPORT' ? 'Hotel to Airport' : 'General'})`);
      console.log(`  Available seats: ${availableSeats}`);

      if (availableSeats >= numberOfPersons) {
        console.log(`✅ Found available shuttle with active schedule: ${shuttle.vehicleNumber}`);
        return shuttle;
      } else {
        console.log(`  ❌ Not enough available seats (${availableSeats} < ${numberOfPersons})`);
      }
    }

    console.log(`❌ No available shuttle with active schedule found`);
    console.log(`=== END SHUTTLE SEARCH ===`);
    return null;
  } catch (error) {
    console.error("Error finding available shuttle:", error);
    return null;
  }
};

/**
 * Hold seats in a specific shuttle
 * @param shuttleId - The shuttle ID
 * @param numberOfPersons - Number of persons to hold seats for
 * @returns Promise<boolean> - Whether seats were successfully held
 */
export const holdSeatsInShuttle = async (
  shuttleId: number,
  numberOfPersons: number
): Promise<boolean> => {
  try {
    console.log(`=== HOLDING SEATS IN SHUTTLE ===`);
    console.log(`Shuttle ID: ${shuttleId}, Persons: ${numberOfPersons}`);

    // Get current shuttle state
    const shuttle = await prisma.shuttle.findUnique({
      where: { id: shuttleId },
    });

    if (!shuttle) {
      console.log(`❌ Shuttle ${shuttleId} not found`);
      return false;
    }

    const availableSeats = shuttle.seats - shuttle.seatsHeld - shuttle.seatsConfirmed;
    
    if (availableSeats < numberOfPersons) {
      console.log(`❌ Not enough available seats in shuttle ${shuttleId}`);
      console.log(`  Available: ${availableSeats}, Required: ${numberOfPersons}`);
      return false;
    }

    // Update shuttle with held seats
    await prisma.shuttle.update({
      where: { id: shuttleId },
      data: {
        seatsHeld: shuttle.seatsHeld + numberOfPersons,
      },
    });

    console.log(`✅ Held ${numberOfPersons} seats in shuttle ${shuttleId}`);
    console.log(`=== END SHUTTLE SEAT HOLDING ===`);
    return true;
  } catch (error) {
    console.error("Error holding seats in shuttle:", error);
    return false;
  }
};

/**
 * Confirm held seats in a shuttle
 * @param shuttleId - The shuttle ID
 * @param numberOfPersons - Number of persons to confirm
 * @returns Promise<boolean> - Whether seats were successfully confirmed
 */
export const confirmSeatsInShuttle = async (
  shuttleId: number,
  numberOfPersons: number
): Promise<boolean> => {
  try {
    console.log(`=== CONFIRMING SEATS IN SHUTTLE ===`);
    console.log(`Shuttle ID: ${shuttleId}, Persons: ${numberOfPersons}`);

    // Get current shuttle state
    const shuttle = await prisma.shuttle.findUnique({
      where: { id: shuttleId },
    });

    if (!shuttle) {
      console.log(`❌ Shuttle ${shuttleId} not found`);
      return false;
    }

    if (shuttle.seatsHeld < numberOfPersons) {
      console.log(`❌ Not enough held seats in shuttle ${shuttleId}`);
      console.log(`  Held: ${shuttle.seatsHeld}, Required: ${numberOfPersons}`);
      return false;
    }

    // Update shuttle: move seats from held to confirmed
    await prisma.shuttle.update({
      where: { id: shuttleId },
      data: {
        seatsHeld: shuttle.seatsHeld - numberOfPersons,
        seatsConfirmed: shuttle.seatsConfirmed + numberOfPersons,
      },
    });

    console.log(`✅ Confirmed ${numberOfPersons} seats in shuttle ${shuttleId}`);
    console.log(`=== END SHUTTLE SEAT CONFIRMATION ===`);
    return true;
  } catch (error) {
    console.error("Error confirming seats in shuttle:", error);
    return false;
  }
};

/**
 * Release held seats in a shuttle
 * @param shuttleId - The shuttle ID
 * @param numberOfPersons - Number of persons to release
 * @returns Promise<boolean> - Whether seats were successfully released
 */
export const releaseSeatsInShuttle = async (
  shuttleId: number,
  numberOfPersons: number
): Promise<boolean> => {
  try {
    console.log(`=== RELEASING SEATS IN SHUTTLE ===`);
    console.log(`Shuttle ID: ${shuttleId}, Persons: ${numberOfPersons}`);

    // Get current shuttle state
    const shuttle = await prisma.shuttle.findUnique({
      where: { id: shuttleId },
    });

    if (!shuttle) {
      console.log(`❌ Shuttle ${shuttleId} not found`);
      return false;
    }

    console.log(`Shuttle ${shuttleId} current state: ${shuttle.seatsHeld} held, ${shuttle.seatsConfirmed} confirmed, ${shuttle.seats} total`);

    // Release the exact number of seats that were held for this booking
    const seatsToRelease = numberOfPersons;

    // Update shuttle: reduce held seats
    const newHeldSeats = Math.max(0, shuttle.seatsHeld - seatsToRelease);
    
    await prisma.shuttle.update({
      where: { id: shuttleId },
      data: {
        seatsHeld: newHeldSeats,
      },
    });

    console.log(`✅ Released ${seatsToRelease} seats in shuttle ${shuttleId} (${shuttle.seatsHeld} -> ${newHeldSeats} held)`);
    console.log(`=== END SHUTTLE SEAT RELEASE ===`);
    return true;
  } catch (error) {
    console.error("Error releasing seats in shuttle:", error);
    return false;
  }
};

/**
 * Get shuttle availability information
 * @param shuttleId - The shuttle ID
 * @returns Promise<object> - Shuttle availability information
 */
export const getShuttleAvailability = async (shuttleId: number) => {
  try {
    const shuttle = await prisma.shuttle.findUnique({
      where: { id: shuttleId },
      select: {
        id: true,
        vehicleNumber: true,
        seats: true,
        seatsHeld: true,
        seatsConfirmed: true,
      },
    });

    if (!shuttle) {
      return null;
    }

    const availableSeats = shuttle.seats - shuttle.seatsHeld - shuttle.seatsConfirmed;

    return {
      shuttleId: shuttle.id,
      vehicleNumber: shuttle.vehicleNumber,
      totalSeats: shuttle.seats,
      seatsHeld: shuttle.seatsHeld,
      seatsConfirmed: shuttle.seatsConfirmed,
      availableSeats,
      utilizationPercentage: ((shuttle.seatsHeld + shuttle.seatsConfirmed) / shuttle.seats) * 100,
    };
  } catch (error) {
    console.error("Error getting shuttle availability:", error);
    return null;
  }
};

/**
 * Clean up expired seat holds across all shuttles
 * This should be called periodically (e.g., via cron job)
 */
export const cleanupExpiredShuttleSeatHolds = async (): Promise<void> => {
  try {
    console.log(`=== CLEANING UP EXPIRED SHUTTLE SEAT HOLDS ===`);

    // Find all bookings with held seats first
    const allHeldBookings = await prisma.booking.findMany({
      where: {
        seatsHeld: true,
      },
      select: {
        id: true,
        seatsHeld: true,
        seatsHeldUntil: true,
        shuttleId: true,
        numberOfPersons: true,
      },
    });

    console.log(`Total bookings with held seats: ${allHeldBookings.length}`);

    // Find bookings with expired seat holds
    const now = new Date();
    console.log(`Current time: ${now.toISOString()}`);
    
    const expiredBookings = await prisma.booking.findMany({
      where: {
        seatsHeld: true,
        seatsHeldUntil: {
          lt: now,
        },
        shuttleId: {
          not: null,
        },
      },
      select: {
        id: true,
        seatsHeld: true,
        seatsHeldUntil: true,
        shuttleId: true,
        numberOfPersons: true,
      },
    });

    console.log(`Found ${expiredBookings.length} expired seat holds`);

    // Log details of expired bookings
    for (const booking of expiredBookings) {
      console.log(`  Expired booking ${booking.id}: ${booking.numberOfPersons} persons, expired at ${booking.seatsHeldUntil}, shuttle: ${booking.shuttleId}`);
    }

    for (const booking of expiredBookings) {
      if (booking.shuttleId) {
        console.log(`Processing expired booking ${booking.id} in shuttle ${booking.shuttleId}`);
        
        // Get shuttle before release
        const shuttleBefore = await prisma.shuttle.findUnique({
          where: { id: booking.shuttleId },
          select: { seatsHeld: true, seatsConfirmed: true, seats: true },
        });
        
        if (shuttleBefore) {
          console.log(`Shuttle ${booking.shuttleId} before release: ${shuttleBefore.seatsHeld} held, ${shuttleBefore.seatsConfirmed} confirmed, ${shuttleBefore.seats} total`);
        } else {
          console.log(`Shuttle ${booking.shuttleId} not found before release`);
        }
        
        await releaseSeatsInShuttle(booking.shuttleId, booking.numberOfPersons);
        
        // Get shuttle after release
        const shuttleAfter = await prisma.shuttle.findUnique({
          where: { id: booking.shuttleId },
          select: { seatsHeld: true, seatsConfirmed: true, seats: true },
        });
        
        if (shuttleAfter) {
          console.log(`Shuttle ${booking.shuttleId} after release: ${shuttleAfter.seatsHeld} held, ${shuttleAfter.seatsConfirmed} confirmed, ${shuttleAfter.seats} total`);
        } else {
          console.log(`Shuttle ${booking.shuttleId} not found after release`);
        }
        
        // Update booking to clear seat hold
        await prisma.booking.update({
          where: { id: booking.id },
          data: {
            seatsHeld: false,
            seatsHeldAt: null,
            seatsHeldUntil: null,
            shuttleId: null, // Remove shuttle assignment
          },
        });

        console.log(`✅ Released expired seats for booking ${booking.id}`);
      }
    }

    console.log(`=== END SHUTTLE SEAT HOLD CLEANUP ===`);
  } catch (error) {
    console.error("Error cleaning up expired shuttle seat holds:", error);
  }
}; 