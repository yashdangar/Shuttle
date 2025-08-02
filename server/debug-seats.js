const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugSeats() {
  try {
    console.log('=== DEBUGGING SEAT HOLDS ===');
    
    // Check all bookings with held seats
    const heldBookings = await prisma.booking.findMany({
      where: {
        seatsHeld: true,
      },
      select: {
        id: true,
        seatsHeld: true,
        seatsHeldAt: true,
        seatsHeldUntil: true,
        shuttleId: true,
        numberOfPersons: true,
        shuttle: {
          select: {
            id: true,
            vehicleNumber: true,
            seats: true,
            seatsHeld: true,
            seatsConfirmed: true,
          },
        },
      },
    });

    console.log(`Found ${heldBookings.length} bookings with held seats:`);
    
    for (const booking of heldBookings) {
      const now = new Date();
      const isExpired = booking.seatsHeldUntil ? now > booking.seatsHeldUntil : false;
      const timeRemaining = booking.seatsHeldUntil 
        ? Math.max(0, booking.seatsHeldUntil.getTime() - now.getTime())
        : null;
      
      console.log(`\nBooking ${booking.id}:`);
      console.log(`  Persons: ${booking.numberOfPersons}`);
      console.log(`  Held at: ${booking.seatsHeldAt}`);
      console.log(`  Held until: ${booking.seatsHeldUntil}`);
      console.log(`  Is expired: ${isExpired}`);
      console.log(`  Time remaining: ${timeRemaining ? Math.round(timeRemaining / 1000 / 60) + ' minutes' : 'N/A'}`);
      console.log(`  Shuttle: ${booking.shuttle?.vehicleNumber || 'None'} (ID: ${booking.shuttleId})`);
      if (booking.shuttle) {
        console.log(`  Shuttle seats: ${booking.shuttle.seats} total, ${booking.shuttle.seatsHeld} held, ${booking.shuttle.seatsConfirmed} confirmed`);
      }
    }

    // Check expired bookings specifically
    const expiredBookings = await prisma.booking.findMany({
      where: {
        seatsHeld: true,
        seatsHeldUntil: {
          lt: new Date(),
        },
        shuttleId: {
          not: null,
        },
      },
      select: {
        id: true,
        seatsHeld: true,
        seatsHeldAt: true,
        seatsHeldUntil: true,
        shuttleId: true,
        numberOfPersons: true,
      },
    });

    console.log(`\n=== EXPIRED BOOKINGS ===`);
    console.log(`Found ${expiredBookings.length} expired bookings that should be cleaned up:`);
    
    for (const booking of expiredBookings) {
      console.log(`  Booking ${booking.id}: ${booking.numberOfPersons} persons, expired at ${booking.seatsHeldUntil}`);
    }

    // Check shuttle states
    const shuttles = await prisma.shuttle.findMany({
      select: {
        id: true,
        vehicleNumber: true,
        seats: true,
        seatsHeld: true,
        seatsConfirmed: true,
      },
    });

    console.log(`\n=== SHUTTLE STATES ===`);
    for (const shuttle of shuttles) {
      console.log(`Shuttle ${shuttle.vehicleNumber} (ID: ${shuttle.id}):`);
      console.log(`  Total seats: ${shuttle.seats}`);
      console.log(`  Seats held: ${shuttle.seatsHeld}`);
      console.log(`  Seats confirmed: ${shuttle.seatsConfirmed}`);
      console.log(`  Available: ${shuttle.seats - shuttle.seatsHeld - shuttle.seatsConfirmed}`);
    }

  } catch (error) {
    console.error('Error debugging seats:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugSeats(); 