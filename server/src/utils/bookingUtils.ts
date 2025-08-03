import prisma from '../db/prisma';

export interface CompleteBookingData {
  id: string;
  guest: {
    id: number;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    phoneNumber: string | null;
    isNonResident: boolean;
  } | null;
  pickupLocation: any;
  dropoffLocation: any;
  shuttle: any;
  [key: string]: any;
}

/**
 * Safely fetch complete booking data with retry logic
 * @param bookingId - The booking ID to fetch
 * @param maxRetries - Maximum number of retries (default: 3)
 * @returns Complete booking data or null if failed
 */
export async function fetchCompleteBookingData(
  bookingId: string,
  maxRetries: number = 3
): Promise<CompleteBookingData | null> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
          guest: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phoneNumber: true,
              isNonResident: true,
            },
          },
          pickupLocation: true,
          dropoffLocation: true,
          shuttle: true,
        },
      });
      
      return booking;
    } catch (error) {
      lastError = error as Error;
      console.error(`Attempt ${attempt} failed to fetch booking ${bookingId}:`, error);
      
      // If this is the last attempt, don't wait
      if (attempt < maxRetries) {
        // Wait before retrying (exponential backoff)
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  console.error(`Failed to fetch booking ${bookingId} after ${maxRetries} attempts:`, lastError);
  return null;
}

/**
 * Get booking data for WebSocket events with fallback
 * @param bookingId - The booking ID to fetch
 * @param fallbackData - Fallback data to use if fetch fails
 * @returns Complete booking data or fallback data
 */
export async function getBookingDataForWebSocket(
  bookingId: string,
  fallbackData: any
): Promise<any> {
  const completeData = await fetchCompleteBookingData(bookingId);
  
  if (completeData) {
    // Add pricing information to the booking data
    try {
      // Get the hotel ID from the guest
      const guest = await prisma.guest.findUnique({
        where: { id: completeData.guestId },
        select: { hotelId: true }
      });

      if (guest?.hotelId) {
        let pricePerPerson = 0;
        let totalPrice = 0;
        let pricingLocationId = null;

        // Determine which location to use for pricing based on booking type
        if (completeData.bookingType === "HOTEL_TO_AIRPORT") {
          // For hotel to airport, use dropoff location (airport) for pricing
          pricingLocationId = completeData.dropoffLocationId;
        } else if (completeData.bookingType === "AIRPORT_TO_HOTEL") {
          // For airport to hotel, use pickup location (airport) for pricing
          pricingLocationId = completeData.pickupLocationId;
        }

        if (pricingLocationId) {
          // Get the hotel location price for this location
          const hotelLocation = await prisma.hotelLocation.findUnique({
            where: {
              hotelId_locationId: {
                hotelId: guest.hotelId,
                locationId: pricingLocationId,
              },
            },
          });

          if (hotelLocation) {
            pricePerPerson = hotelLocation.price;
            totalPrice = hotelLocation.price * completeData.numberOfPersons;
          }
        }

        // Add pricing to the booking data
        completeData.pricing = {
          pricePerPerson,
          totalPrice,
          numberOfPersons: completeData.numberOfPersons,
        };
      }
    } catch (error) {
      console.error("Error calculating pricing for WebSocket booking data:", error);
      // Continue without pricing if calculation fails
    }
  }
  
  return completeData || fallbackData;
}

// Intelligent booking assignment based on current trip status
export const assignBookingToTrip = async (bookingId: string, shuttleId: number, hotelId: number) => {
  try {
    console.log(`=== ASSIGNING BOOKING TO TRIP ===`);
    console.log(`Booking ID: ${bookingId}, Shuttle ID: ${shuttleId}, Hotel ID: ${hotelId}`);
    
    // Get the booking details first
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      console.log(`❌ Booking ${bookingId} not found`);
      return { assigned: false, reason: "Booking not found" };
    }

    console.log(`Booking found: ${booking.numberOfPersons} persons, Type: ${booking.bookingType}`);

    // Check shuttle capacity before assignment
    console.log(`Checking capacity before assignment...`);
    const hasCapacity = await checkShuttleCapacity(shuttleId, booking.numberOfPersons);
    if (!hasCapacity) {
      console.log(`❌ Shuttle ${shuttleId} is at capacity, cannot assign booking`);
      return { assigned: false, reason: "Shuttle is at capacity", shuttleAssigned: false };
    }

    console.log(`✅ Shuttle ${shuttleId} has capacity, proceeding with assignment`);

    // Find the driver for this shuttle
    // Get current date in Indian Standard Time (IST)
    const { istTime, startOfDay, endOfDay } = getISTDateRange();

    console.log(`Looking for active schedule for shuttle ${shuttleId}...`);
    console.log(`Current IST time: ${istTime.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);

    const schedules = await prisma.schedule.findMany({
      where: {
        shuttleId,
        startTime: {
          lte: new Date(), // Schedules that have started
        },
        endTime: {
          gte: new Date(), // Schedules that haven't ended
        },
      },
      include: {
        driver: true,
      },
    });

    console.log(`Found ${schedules.length} active schedules for shuttle ${shuttleId}`);
    console.log(`Shuttle ID being searched: ${shuttleId}`);
    
    // Log all schedules found
    schedules.forEach((schedule, index) => {
      console.log(`Schedule ${index + 1}: ID=${schedule.id}, Start=${schedule.startTime.toISOString()}, End=${schedule.endTime.toISOString()}, Driver=${schedule.driver.name}`);
    });

    // Find the currently active schedule
    let currentSchedule = null;
    for (const schedule of schedules) {
      // The schedule times are stored as UTC, so we need to compare with current UTC time
      const scheduleStartTime = new Date(schedule.startTime);
      const scheduleEndTime = new Date(schedule.endTime);
      const currentTime = new Date(); // Current time in server timezone (IST)
      
      // Current time is already UTC-based in Node.js
      const currentTimeUTC = new Date();
      
      console.log(`Schedule ${schedule.id}:`);
      console.log(`  Start time (UTC): ${scheduleStartTime.toISOString()}`);
      console.log(`  End time (UTC): ${scheduleEndTime.toISOString()}`);
      console.log(`  Current time (UTC): ${currentTimeUTC.toISOString()}`);
      console.log(`  Current time (IST): ${currentTime.toLocaleString()}`);
      
      if (currentTimeUTC >= scheduleStartTime && currentTimeUTC <= scheduleEndTime) {
        console.log(`✅ Schedule ${schedule.id} is currently active`);
        currentSchedule = schedule;
        break;
      } else {
        console.log(`❌ Schedule ${schedule.id} is not active`);
      }
    }

    if (!currentSchedule) {
      console.log(`shuttle ${shuttleId}`);
      // No active trip, assign to shuttle only (will be picked up by next trip start)
      await prisma.booking.update({
        where: { id: bookingId },
        data: { shuttleId },
      });
      console.log(`✅ Booking ${bookingId} assigned to shuttle ${shuttleId} only (no active schedule)`);
      return { assigned: false, reason: "No active schedule", shuttleAssigned: true };
    }

    console.log(`✅ Found active schedule: Driver ${currentSchedule.driver.name}`);

    const driverId = currentSchedule.driverId;

    // Check if there's an active trip for this driver
    console.log(`Looking for active trip for driver ${driverId}...`);
    const activeTrip = await prisma.trip.findFirst({
      where: {
        driverId,
        status: "ACTIVE",
      },
      include: {
        bookings: {
          where: {
            isCompleted: false,
            isCancelled: false,
          },
        },
      },
    });

    if (!activeTrip) {
      console.log(`❌ No active trip found for driver ${driverId}`);
      // No active trip, assign to shuttle only (will be picked up by next trip start)
      await prisma.booking.update({
        where: { id: bookingId },
        data: { shuttleId },
      });
      console.log(`✅ Booking ${bookingId} assigned to shuttle ${shuttleId} only (no active trip)`);
      return { assigned: false, reason: "No active trip", shuttleAssigned: true };
    }

    console.log(`✅ Found active trip: ${activeTrip.id} (${activeTrip.phase} phase)`);

    // Check if booking should be assigned to current trip based on direction and phase
    const shouldAssignToCurrentTrip = shouldAssignBookingToCurrentTrip(
      booking.bookingType,
      activeTrip.phase,
      activeTrip.direction
    );

    console.log(`Should assign to current trip: ${shouldAssignToCurrentTrip}`);

    if (shouldAssignToCurrentTrip) {
      // Assign to current active trip
      console.log(`Assigning booking ${bookingId} to active trip ${activeTrip.id}...`);
      await prisma.booking.update({
        where: { id: bookingId },
        data: { 
          shuttleId,
          tripId: activeTrip.id 
        },
      });

      console.log(`✅ Booking ${bookingId} assigned to active trip ${activeTrip.id} (${activeTrip.phase} phase)`);
      
      return { 
        assigned: true, 
        tripId: activeTrip.id, 
        phase: activeTrip.phase,
        reason: `Assigned to active ${activeTrip.phase.toLowerCase()} trip`
      };
    } else {
      // Assign to shuttle only (will be picked up by next trip start)
      console.log(`Assigning booking ${bookingId} to shuttle only...`);
      await prisma.booking.update({
        where: { id: bookingId },
        data: { shuttleId },
      });
      
      console.log(`✅ Booking ${bookingId} assigned to shuttle only (will be picked up by next trip)`);
      
      return { 
        assigned: false, 
        reason: `Will be picked up by next trip (current trip is in ${activeTrip.phase.toLowerCase()} phase)`,
        shuttleAssigned: true 
      };
    }
  } catch (error) {
    console.error("❌ Error in assignBookingToTrip:", error);
    throw error;
  }
};

// Helper function to determine if booking should be assigned to current trip
const shouldAssignBookingToCurrentTrip = (
  bookingType: string,
  tripPhase: string,
  tripDirection: string
): boolean => {
  // If trip is in OUTBOUND phase (hotel to airport)
  if (tripPhase === "OUTBOUND") {
    // During outbound, assign airport-to-hotel bookings to current trip
    // These will be handled during the return phase
    return bookingType === "AIRPORT_TO_HOTEL";
  }
  
  // If trip is in RETURN phase (airport to hotel)
  if (tripPhase === "RETURN") {
    // During return, don't assign new airport-to-hotel bookings to current trip
    // They should go to a new trip
    return false;
  }
  
  // For any other phase, don't assign to current trip
  return false;
};

// Helper function to check if shuttle has available capacity
export const checkShuttleCapacity = async (
  shuttleId: number, 
  numberOfPersons: number, 
  direction?: 'AIRPORT_TO_HOTEL' | 'HOTEL_TO_AIRPORT'
): Promise<boolean> => {
  try {
    console.log(`=== CHECKING SHUTTLE CAPACITY ===`);
    console.log(`Shuttle ID: ${shuttleId}, New passengers: ${numberOfPersons}`);
    
    // Get shuttle details
    const shuttle = await prisma.shuttle.findUnique({
      where: { id: shuttleId },
      include: {
        bookings: {
          where: {
            isCompleted: false,
            isCancelled: false,
            // Include all bookings assigned to this shuttle, whether they have a tripId or not
          },
        },
      },
    });

    if (!shuttle) {
      console.log(`Shuttle ${shuttleId} not found`);
      return false;
    }

    console.log(`Shuttle found: ${shuttle.vehicleNumber} with ${shuttle.seats} seats`);
    console.log(`Total bookings found: ${shuttle.bookings.length}`);

    // Log each booking being counted
    let currentPassengers = 0;
    shuttle.bookings.forEach((booking, index) => {
      console.log(`Booking ${index + 1}: ID=${booking.id}, Persons=${booking.numberOfPersons}, TripID=${booking.tripId}, Completed=${booking.isCompleted}, Cancelled=${booking.isCancelled}`);
      currentPassengers += booking.numberOfPersons;
    });

    // Use direction-specific capacity if provided, otherwise fall back to general seats
    let capacity = shuttle.seats;
    if (direction === 'AIRPORT_TO_HOTEL' && shuttle.airportToHotelCapacity && shuttle.airportToHotelCapacity > 0) {
      capacity = shuttle.airportToHotelCapacity;
    } else if (direction === 'HOTEL_TO_AIRPORT' && shuttle.hotelToAirportCapacity && shuttle.hotelToAirportCapacity > 0) {
      capacity = shuttle.hotelToAirportCapacity;
    }
    
    // Include held and confirmed seats in capacity calculation
    const totalOccupiedSeats = currentPassengers + shuttle.seatsHeld + shuttle.seatsConfirmed;
    const availableSeats = capacity - totalOccupiedSeats;
    const hasCapacity = availableSeats >= numberOfPersons;
    
    console.log(`Capacity check for shuttle ${shuttleId} (${shuttle.vehicleNumber}):`);
    console.log(`  - Direction: ${direction || 'Not specified'}`);
    console.log(`  - Total seats: ${shuttle.seats}`);
    console.log(`  - Airport to Hotel capacity: ${shuttle.airportToHotelCapacity}`);
    console.log(`  - Hotel to Airport capacity: ${shuttle.hotelToAirportCapacity}`);
    console.log(`  - Used capacity: ${capacity} (${direction === 'AIRPORT_TO_HOTEL' ? 'Airport to Hotel' : direction === 'HOTEL_TO_AIRPORT' ? 'Hotel to Airport' : 'General'})`);
    console.log(`  - Current passengers (confirmed bookings): ${currentPassengers}`);
    console.log(`  - Seats held: ${shuttle.seatsHeld}`);
    console.log(`  - Seats confirmed: ${shuttle.seatsConfirmed}`);
    console.log(`  - Total occupied seats: ${totalOccupiedSeats}`);
    console.log(`  - Available seats: ${availableSeats}`);
    console.log(`  - New passengers: ${numberOfPersons}`);
    console.log(`  - Has capacity: ${hasCapacity}`);
    console.log(`  - Bookings count: ${shuttle.bookings.length}`);
    console.log(`=== END CAPACITY CHECK ===`);

    return hasCapacity;
  } catch (error) {
    console.error("Error checking shuttle capacity:", error);
    return false;
  }
};

// Enhanced function to find available shuttle with capacity
export const findAvailableShuttleWithCapacity = async (
  hotelId: number, 
  numberOfPersons: number, 
  direction?: 'AIRPORT_TO_HOTEL' | 'HOTEL_TO_AIRPORT'
): Promise<any> => {
  try {
    console.log(`=== FINDING AVAILABLE SHUTTLE ===`);
    console.log(`Hotel ID: ${hotelId}, Passengers needed: ${numberOfPersons}`);
    
    // Get current date in Indian Standard Time (IST)
    const { istTime, startOfDay, endOfDay } = getISTDateRange();

    console.log(`Current IST time: ${istTime.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
    console.log(`Date range (IST): ${startOfDay.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} to ${endOfDay.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
    console.log(`Current time in IST: ${istTime.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })}`);

    // Get all shuttles for this hotel with schedules for today
    const availableShuttles = await prisma.shuttle.findMany({
      where: {
        hotelId: hotelId,
        schedules: {
          some: {
            startTime: {
              lte: new Date(), // Schedules that have started
            },
            endTime: {
              gte: new Date(), // Schedules that haven't ended
            },
          },
        },
      },
      include: {
        schedules: {
          where: {
            startTime: {
              lte: new Date(), // Schedules that have started
            },
            endTime: {
              gte: new Date(), // Schedules that haven't ended
            },
          },
          include: {
            driver: true,
          },
        },
        bookings: {
          where: {
            isCompleted: false,
            isCancelled: false,
            // Include all bookings assigned to this shuttle, whether they have a tripId or not
          },
        },
      },
      orderBy: {
        id: 'asc', // Consistent ordering
      },
    });

    console.log(`Found ${availableShuttles.length} shuttles with schedules for today`);

    // Find the first shuttle with available capacity and active schedule
    for (const shuttle of availableShuttles) {
      console.log(`\n--- Checking shuttle ${shuttle.id} (${shuttle.vehicleNumber}) ---`);
      console.log(`Direction: ${direction || 'Not specified'}`);
      console.log(`Total seats: ${shuttle.seats}`);
      console.log(`Airport to Hotel capacity: ${shuttle.airportToHotelCapacity}`);
      console.log(`Hotel to Airport capacity: ${shuttle.hotelToAirportCapacity}`);
      console.log(`Total bookings: ${shuttle.bookings.length}`);
      
      // Check if any schedule is currently active
      let hasActiveSchedule = false;
      for (const schedule of shuttle.schedules) {
        // The schedule times are stored as UTC, so we need to compare with current UTC time
        const scheduleStartTime = new Date(schedule.startTime);
        const scheduleEndTime = new Date(schedule.endTime);
        const currentTime = new Date(); // Current time in server timezone (IST)
        
        // Current time is already UTC-based in Node.js
        const currentTimeUTC = new Date();
        
        console.log(`Schedule ${schedule.id}:`);
        console.log(`  Start time (UTC): ${scheduleStartTime.toISOString()}`);
        console.log(`  End time (UTC): ${scheduleEndTime.toISOString()}`);
        console.log(`  Current time (UTC): ${currentTimeUTC.toISOString()}`);
        console.log(`  Current time (IST): ${currentTime.toLocaleString()}`);
        
        if (currentTimeUTC >= scheduleStartTime && currentTimeUTC <= scheduleEndTime) {
          console.log(`✅ Schedule ${schedule.id} is currently active`);
          hasActiveSchedule = true;
          break;
        } else {
          console.log(`❌ Schedule ${schedule.id} is not active`);
        }
      }
      
      if (!hasActiveSchedule) {
        console.log(`❌ No active schedule found for shuttle ${shuttle.id}`);
        continue;
      }

      const currentPassengers = shuttle.bookings.reduce((sum: number, booking: any) => {
        console.log(
          `  Booking ${booking.id}: ${booking.numberOfPersons} persons (TripID: ${booking.tripId})`
        );
        return sum + booking.numberOfPersons;
      }, 0);

      // Use direction-specific capacity if provided, otherwise fall back to general seats
      let capacity = shuttle.seats;
      if (direction === 'AIRPORT_TO_HOTEL' && shuttle.airportToHotelCapacity && shuttle.airportToHotelCapacity > 0) {
        capacity = shuttle.airportToHotelCapacity;
      } else if (direction === 'HOTEL_TO_AIRPORT' && shuttle.hotelToAirportCapacity && shuttle.hotelToAirportCapacity > 0) {
        capacity = shuttle.hotelToAirportCapacity;
      }
      
      // Include held and confirmed seats in capacity calculation
      const totalOccupiedSeats = currentPassengers + shuttle.seatsHeld + shuttle.seatsConfirmed;
      const availableSeats = capacity - totalOccupiedSeats;

      console.log(`Checking shuttle ${shuttle.id} (${shuttle.vehicleNumber}):`);
      console.log(`  - Total seats: ${shuttle.seats}`);
      console.log(`  - Current passengers (confirmed bookings): ${currentPassengers}`);
      console.log(`  - Seats held: ${shuttle.seatsHeld}`);
      console.log(`  - Seats confirmed: ${shuttle.seatsConfirmed}`);
      console.log(`  - Total occupied seats: ${totalOccupiedSeats}`);
      console.log(`  - Available seats: ${availableSeats}`);
      console.log(`  - Can accommodate ${numberOfPersons} passengers: ${availableSeats >= numberOfPersons}`);

      if (availableSeats >= numberOfPersons) {
        console.log(`✅ Selected shuttle ${shuttle.id} (${shuttle.vehicleNumber}) for booking`);
        console.log(`✅ This shuttle has active schedule and sufficient capacity`);
        console.log(`✅ Shuttle ID: ${shuttle.id}, Vehicle: ${shuttle.vehicleNumber}`);
        console.log(`✅ Active schedules for this shuttle: ${shuttle.schedules.filter((s: any) => {
          const scheduleStartTime = new Date(s.startTime);
          const scheduleEndTime = new Date(s.endTime);
          const currentTime = new Date();
          const currentTimeUTC = new Date();
          return currentTimeUTC >= scheduleStartTime && currentTimeUTC <= scheduleEndTime;
        }).length}`);
        console.log(`=== END SHUTTLE SEARCH - FOUND ===`);
        return shuttle;
      } else {
        console.log(`❌ Shuttle ${shuttle.id} (${shuttle.vehicleNumber}) cannot accommodate ${numberOfPersons} passengers`);
      }
    }

    console.log(`❌ No shuttle found with capacity for ${numberOfPersons} passengers`);
    console.log(`=== END SHUTTLE SEARCH - NOT FOUND ===`);
    return null; // No shuttle with available capacity
  } catch (error) {
    console.error("Error finding available shuttle with capacity:", error);
    return null;
  }
};

// Utility function to get current time in Indian Standard Time (IST)
export const getISTTime = () => {
  // Server is already running in IST timezone (Asia/Calcutta)
  const now = new Date();
  
  console.log(`=== IST TIME CALCULATION ===`);
  console.log(`Server time (IST): ${now.toLocaleString()}`);
  console.log(`Server timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`);
  console.log(`=== END IST TIME CALCULATION ===`);
  
  return now;
};

// Utility function to get IST date range for today
export const getISTDateRange = () => {
  const istTime = getISTTime();
  const today = new Date(istTime);
  const startOfDay = new Date(today);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(today);
  endOfDay.setHours(23, 59, 59, 999);
  
  return {
    istTime,
    startOfDay,
    endOfDay
  };
}; 