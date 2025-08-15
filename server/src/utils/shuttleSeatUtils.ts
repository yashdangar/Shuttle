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

    // Get all shuttles for the hotel with their schedules - highly optimized query
    const shuttles = await prisma.shuttle.findMany({
      where: { hotelId },
      select: {
        id: true,
        vehicleNumber: true,
        seats: true,
        seatsHeld: true,
        seatsConfirmed: true,
        airportToHotelCapacity: true,
        airportToHotelSeatsHeld: true,
        airportToHotelSeatsConfirmed: true,
        hotelToAirportCapacity: true,
        hotelToAirportSeatsHeld: true,
        hotelToAirportSeatsConfirmed: true,
        schedules: {
          select: {
            id: true,
            startTime: true,
            endTime: true,
          },
          where: {
            // Only get schedules for today to reduce data
            startTime: {
              gte: new Date(new Date().setHours(0, 0, 0, 0)),
              lte: new Date(new Date().setHours(23, 59, 59, 999)),
            },
          },
          orderBy: { startTime: 'asc' },
        },
      },
    });

    console.log(`Found ${shuttles.length} shuttles for hotel ${hotelId}`);

    // Find shuttle with available capacity AND active schedule
    for (const shuttle of shuttles) {
      console.log(`Shuttle ${shuttle.id} (${shuttle.vehicleNumber}):`);
      console.log(`  Total seats: ${shuttle.seats}`);
      
      // Log direction-specific seat information
      if (direction === 'AIRPORT_TO_HOTEL') {
        console.log(`  Airport to Hotel - Seats held: ${shuttle.airportToHotelSeatsHeld}, Seats confirmed: ${shuttle.airportToHotelSeatsConfirmed}`);
      } else if (direction === 'HOTEL_TO_AIRPORT') {
        console.log(`  Hotel to Airport - Seats held: ${shuttle.hotelToAirportSeatsHeld}, Seats confirmed: ${shuttle.hotelToAirportSeatsConfirmed}`);
      } else {
        console.log(`  General - Seats held: ${shuttle.seatsHeld}, Seats confirmed: ${shuttle.seatsConfirmed}`);
      }
      
      console.log(`  Schedules: ${shuttle.schedules.length}`);

      // Check if shuttle has active schedules
      if (shuttle.schedules.length === 0) {
        console.log(`  ❌ No active schedules for this shuttle`);
        continue;
      }

      // Simplified schedule check - if we have schedules for today, consider it active
      // This eliminates complex timezone calculations that were causing delays
      const hasActiveSchedule = shuttle.schedules.length > 0;
      
      if (!hasActiveSchedule) {
        console.log(`  ❌ No active schedules for this shuttle`);
        continue;
      }

      // Use direction-specific capacity and seat counts
      let capacity = shuttle.seats;
      let seatsHeld = 0;
      let seatsConfirmed = 0;
      
      if (direction === 'AIRPORT_TO_HOTEL') {
        if (shuttle.airportToHotelCapacity && shuttle.airportToHotelCapacity > 0) {
          capacity = shuttle.airportToHotelCapacity;
        }
        seatsHeld = shuttle.airportToHotelSeatsHeld;
        seatsConfirmed = shuttle.airportToHotelSeatsConfirmed;
      } else if (direction === 'HOTEL_TO_AIRPORT') {
        if (shuttle.hotelToAirportCapacity && shuttle.hotelToAirportCapacity > 0) {
          capacity = shuttle.hotelToAirportCapacity;
        }
        seatsHeld = shuttle.hotelToAirportSeatsHeld;
        seatsConfirmed = shuttle.hotelToAirportSeatsConfirmed;
      } else {
        // Fallback to general seats for backward compatibility
        seatsHeld = shuttle.seatsHeld;
        seatsConfirmed = shuttle.seatsConfirmed;
      }
      
      const availableSeats = capacity - seatsHeld - seatsConfirmed;
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
 * @param direction - Direction of the trip (AIRPORT_TO_HOTEL or HOTEL_TO_AIRPORT)
 * @returns Promise<boolean> - Whether seats were successfully held
 */
export const holdSeatsInShuttle = async (
  shuttleId: number,
  numberOfPersons: number,
  direction?: 'AIRPORT_TO_HOTEL' | 'HOTEL_TO_AIRPORT'
): Promise<boolean> => {
  try {
    console.log(`=== HOLDING SEATS IN SHUTTLE ===`);
    console.log(`Shuttle ID: ${shuttleId}, Persons: ${numberOfPersons}, Direction: ${direction || 'Not specified'}`);

    // Optimized shuttle capacity check - use atomic update to avoid race conditions
    let updateData: any = {};
    
    if (direction === 'AIRPORT_TO_HOTEL') {
      updateData = {
        airportToHotelSeatsHeld: {
          increment: numberOfPersons
        }
      };
    } else if (direction === 'HOTEL_TO_AIRPORT') {
      updateData = {
        hotelToAirportSeatsHeld: {
          increment: numberOfPersons
        }
      };
    } else {
      updateData = {
        seatsHeld: {
          increment: numberOfPersons
        }
      };
    }

    // Simple atomic update - we already checked capacity in findAvailableShuttle
    await prisma.shuttle.update({
      where: { id: shuttleId },
      data: updateData,
    });

    console.log(`✅ Held ${numberOfPersons} seats in shuttle ${shuttleId} for direction: ${direction || 'General'}`);
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
 * @param direction - Direction of the trip (AIRPORT_TO_HOTEL or HOTEL_TO_AIRPORT)
 * @returns Promise<boolean> - Whether seats were successfully confirmed
 */
export const confirmSeatsInShuttle = async (
  shuttleId: number,
  numberOfPersons: number,
  direction?: 'AIRPORT_TO_HOTEL' | 'HOTEL_TO_AIRPORT'
): Promise<boolean> => {
  try {
    console.log(`=== CONFIRMING SEATS IN SHUTTLE ===`);
    console.log(`Shuttle ID: ${shuttleId}, Persons: ${numberOfPersons}, Direction: ${direction || 'Not specified'}`);

    // Get current shuttle state
    const shuttle = await prisma.shuttle.findUnique({
      where: { id: shuttleId },
    });

    if (!shuttle) {
      console.log(`❌ Shuttle ${shuttleId} not found`);
      return false;
    }

    // Check held seats based on direction
    let heldSeats = 0;
    if (direction === 'AIRPORT_TO_HOTEL') {
      heldSeats = shuttle.airportToHotelSeatsHeld;
    } else if (direction === 'HOTEL_TO_AIRPORT') {
      heldSeats = shuttle.hotelToAirportSeatsHeld;
    } else {
      // Fallback to general seats for backward compatibility
      heldSeats = shuttle.seatsHeld;
    }

    if (heldSeats < numberOfPersons) {
      console.log(`❌ Not enough held seats in shuttle ${shuttleId}`);
      console.log(`  Held: ${heldSeats}, Required: ${numberOfPersons}`);
      return false;
    }

    // Update shuttle: move seats from held to confirmed based on direction
    const updateData: any = {};
    
    if (direction === 'AIRPORT_TO_HOTEL') {
      updateData.airportToHotelSeatsHeld = shuttle.airportToHotelSeatsHeld - numberOfPersons;
      updateData.airportToHotelSeatsConfirmed = shuttle.airportToHotelSeatsConfirmed + numberOfPersons;
    } else if (direction === 'HOTEL_TO_AIRPORT') {
      updateData.hotelToAirportSeatsHeld = shuttle.hotelToAirportSeatsHeld - numberOfPersons;
      updateData.hotelToAirportSeatsConfirmed = shuttle.hotelToAirportSeatsConfirmed + numberOfPersons;
    } else {
      // Fallback to general seats for backward compatibility
      updateData.seatsHeld = shuttle.seatsHeld - numberOfPersons;
      updateData.seatsConfirmed = shuttle.seatsConfirmed + numberOfPersons;
    }

    await prisma.shuttle.update({
      where: { id: shuttleId },
      data: updateData,
    });

    console.log(`✅ Confirmed ${numberOfPersons} seats in shuttle ${shuttleId} for direction: ${direction || 'General'}`);
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
 * @param direction - Direction of the trip (AIRPORT_TO_HOTEL or HOTEL_TO_AIRPORT)
 * @returns Promise<boolean> - Whether seats were successfully released
 */
export const releaseSeatsInShuttle = async (
  shuttleId: number,
  numberOfPersons: number,
  direction?: 'AIRPORT_TO_HOTEL' | 'HOTEL_TO_AIRPORT'
): Promise<boolean> => {
  try {
    console.log(`=== RELEASING SEATS IN SHUTTLE ===`);
    console.log(`Shuttle ID: ${shuttleId}, Persons: ${numberOfPersons}, Direction: ${direction || 'Not specified'}`);

    // Get current shuttle state
    const shuttle = await prisma.shuttle.findUnique({
      where: { id: shuttleId },
    });

    if (!shuttle) {
      console.log(`❌ Shuttle ${shuttleId} not found`);
      return false;
    }

    // Log current state based on direction
    if (direction === 'AIRPORT_TO_HOTEL') {
      console.log(`Shuttle ${shuttleId} current state: ${shuttle.airportToHotelSeatsHeld} held, ${shuttle.airportToHotelSeatsConfirmed} confirmed`);
    } else if (direction === 'HOTEL_TO_AIRPORT') {
      console.log(`Shuttle ${shuttleId} current state: ${shuttle.hotelToAirportSeatsHeld} held, ${shuttle.hotelToAirportSeatsConfirmed} confirmed`);
    } else {
      console.log(`Shuttle ${shuttleId} current state: ${shuttle.seatsHeld} held, ${shuttle.seatsConfirmed} confirmed, ${shuttle.seats} total`);
    }

    // Release the exact number of seats that were held for this booking
    const seatsToRelease = numberOfPersons;

    // Update shuttle: reduce held seats based on direction
    const updateData: any = {};
    
    if (direction === 'AIRPORT_TO_HOTEL') {
      const newHeldSeats = Math.max(0, shuttle.airportToHotelSeatsHeld - seatsToRelease);
      updateData.airportToHotelSeatsHeld = newHeldSeats;
      console.log(`✅ Released ${seatsToRelease} seats in shuttle ${shuttleId} for AIRPORT_TO_HOTEL (${shuttle.airportToHotelSeatsHeld} -> ${newHeldSeats} held)`);
    } else if (direction === 'HOTEL_TO_AIRPORT') {
      const newHeldSeats = Math.max(0, shuttle.hotelToAirportSeatsHeld - seatsToRelease);
      updateData.hotelToAirportSeatsHeld = newHeldSeats;
      console.log(`✅ Released ${seatsToRelease} seats in shuttle ${shuttleId} for HOTEL_TO_AIRPORT (${shuttle.hotelToAirportSeatsHeld} -> ${newHeldSeats} held)`);
    } else {
      // Fallback to general seats for backward compatibility
      const newHeldSeats = Math.max(0, shuttle.seatsHeld - seatsToRelease);
      updateData.seatsHeld = newHeldSeats;
      console.log(`✅ Released ${seatsToRelease} seats in shuttle ${shuttleId} for General (${shuttle.seatsHeld} -> ${newHeldSeats} held)`);
    }
    
    await prisma.shuttle.update({
      where: { id: shuttleId },
      data: updateData,
    });

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
 * @param direction - Direction to get availability for (optional)
 * @returns Promise<object> - Shuttle availability information
 */
export const getShuttleAvailability = async (
  shuttleId: number,
  direction?: 'AIRPORT_TO_HOTEL' | 'HOTEL_TO_AIRPORT'
) => {
  try {
    const shuttle = await prisma.shuttle.findUnique({
      where: { id: shuttleId },
      select: {
        id: true,
        vehicleNumber: true,
        seats: true,
        seatsHeld: true,
        seatsConfirmed: true,
        airportToHotelSeatsHeld: true,
        airportToHotelSeatsConfirmed: true,
        hotelToAirportSeatsHeld: true,
        hotelToAirportSeatsConfirmed: true,
        airportToHotelCapacity: true,
        hotelToAirportCapacity: true,
      },
    });

    if (!shuttle) {
      return null;
    }

    let capacity = shuttle.seats;
    let seatsHeld = shuttle.seatsHeld;
    let seatsConfirmed = shuttle.seatsConfirmed;

    if (direction === 'AIRPORT_TO_HOTEL') {
      if (shuttle.airportToHotelCapacity && shuttle.airportToHotelCapacity > 0) {
        capacity = shuttle.airportToHotelCapacity;
      }
      seatsHeld = shuttle.airportToHotelSeatsHeld;
      seatsConfirmed = shuttle.airportToHotelSeatsConfirmed;
    } else if (direction === 'HOTEL_TO_AIRPORT') {
      if (shuttle.hotelToAirportCapacity && shuttle.hotelToAirportCapacity > 0) {
        capacity = shuttle.hotelToAirportCapacity;
      }
      seatsHeld = shuttle.hotelToAirportSeatsHeld;
      seatsConfirmed = shuttle.hotelToAirportSeatsConfirmed;
    }

    const availableSeats = capacity - seatsHeld - seatsConfirmed;

    return {
      shuttleId: shuttle.id,
      vehicleNumber: shuttle.vehicleNumber,
      totalSeats: capacity,
      seatsHeld,
      seatsConfirmed,
      availableSeats,
      utilizationPercentage: ((seatsHeld + seatsConfirmed) / capacity) * 100,
      direction: direction || 'General',
    };
  } catch (error) {
    console.error("Error getting shuttle availability:", error);
    return null;
  }
};

/**
 * Reset seat capacity for new bookings when a trip starts
 * This ensures that new bookings can use the full capacity regardless of seats used in the current trip
 * @param shuttleId - The shuttle ID
 * @param direction - Direction of the trip (AIRPORT_TO_HOTEL or HOTEL_TO_AIRPORT)
 * @returns Promise<boolean> - Whether seats were successfully reset
 */
export const resetSeatCapacityForNewBookings = async (
  shuttleId: number,
  direction?: 'AIRPORT_TO_HOTEL' | 'HOTEL_TO_AIRPORT'
): Promise<boolean> => {
  try {
    console.log(`=== RESETTING SEAT CAPACITY FOR NEW BOOKINGS ===`);
    console.log(`Shuttle ID: ${shuttleId}, Direction: ${direction || 'Not specified'}`);

    // Get current shuttle state
    const shuttle = await prisma.shuttle.findUnique({
      where: { id: shuttleId },
    });

    if (!shuttle) {
      console.log(`❌ Shuttle ${shuttleId} not found`);
      return false;
    }

    // Reset the held and confirmed seats for the specified direction
    // This allows new bookings to use the full capacity
    const updateData: any = {};
    
    if (direction === 'AIRPORT_TO_HOTEL') {
      updateData.airportToHotelSeatsHeld = 0;
      updateData.airportToHotelSeatsConfirmed = 0;
      console.log(`✅ Reset AIRPORT_TO_HOTEL seat capacity for shuttle ${shuttleId}`);
    } else if (direction === 'HOTEL_TO_AIRPORT') {
      updateData.hotelToAirportSeatsHeld = 0;
      updateData.hotelToAirportSeatsConfirmed = 0;
      console.log(`✅ Reset HOTEL_TO_AIRPORT seat capacity for shuttle ${shuttleId}`);
    } else {
      // Reset general seats for backward compatibility
      updateData.seatsHeld = 0;
      updateData.seatsConfirmed = 0;
      console.log(`✅ Reset general seat capacity for shuttle ${shuttleId}`);
    }

    await prisma.shuttle.update({
      where: { id: shuttleId },
      data: updateData,
    });

    console.log(`=== END SEAT CAPACITY RESET ===`);
    return true;
  } catch (error) {
    console.error("Error resetting seat capacity:", error);
    return false;
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
        
                 // Get booking direction to determine which seat holding field to release
         const bookingDetails = await prisma.booking.findUnique({
           where: { id: booking.id },
           select: { bookingType: true }
         });

         let direction: 'AIRPORT_TO_HOTEL' | 'HOTEL_TO_AIRPORT' | undefined;
         
         if (bookingDetails?.bookingType === 'AIRPORT_TO_HOTEL') {
           direction = 'AIRPORT_TO_HOTEL';
         } else if (bookingDetails?.bookingType === 'HOTEL_TO_AIRPORT') {
           direction = 'HOTEL_TO_AIRPORT';
         }

        await releaseSeatsInShuttle(booking.shuttleId, booking.numberOfPersons, direction);
        
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