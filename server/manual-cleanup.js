const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function manualCleanup() {
  try {
    console.log('=== MANUAL CLEANUP TEST ===');
    
    // Check current state
    const heldBookings = await prisma.booking.findMany({
      where: { seatsHeld: true },
      select: {
        id: true,
        seatsHeld: true,
        seatsHeldUntil: true,
        shuttleId: true,
        numberOfPersons: true,
      },
    });
    
    console.log(`Found ${heldBookings.length} bookings with held seats`);
    
    const now = new Date();
    console.log(`Current time: ${now.toISOString()}`);
    
    for (const booking of heldBookings) {
      const isExpired = booking.seatsHeldUntil ? now > booking.seatsHeldUntil : false;
      console.log(`Booking ${booking.id}: ${booking.numberOfPersons} persons, expires at ${booking.seatsHeldUntil}, expired: ${isExpired}`);
    }
    
    // Find expired bookings
    const expiredBookings = await prisma.booking.findMany({
      where: {
        seatsHeld: true,
        seatsHeldUntil: { lt: now },
        shuttleId: { not: null },
      },
      select: {
        id: true,
        seatsHeld: true,
        seatsHeldUntil: true,
        shuttleId: true,
        numberOfPersons: true,
      },
    });
    
    console.log(`Found ${expiredBookings.length} expired bookings`);
    
    // Manually clean up each expired booking
    for (const booking of expiredBookings) {
      console.log(`\nCleaning up booking ${booking.id}`);
      
      // Get shuttle before cleanup
      const shuttleBefore = await prisma.shuttle.findUnique({
        where: { id: booking.shuttleId },
        select: { seatsHeld: true, seatsConfirmed: true, seats: true },
      });
      
      console.log(`Shuttle ${booking.shuttleId} before: ${shuttleBefore.seatsHeld} held`);
      
      // Release seats
      const newHeldSeats = Math.max(0, shuttleBefore.seatsHeld - booking.numberOfPersons);
      
      await prisma.shuttle.update({
        where: { id: booking.shuttleId },
        data: { seatsHeld: newHeldSeats },
      });
      
      // Clear booking
      await prisma.booking.update({
        where: { id: booking.id },
        data: {
          seatsHeld: false,
          seatsHeldAt: null,
          seatsHeldUntil: null,
          shuttleId: null,
        },
      });
      
      console.log(`✅ Cleaned up booking ${booking.id}: released ${booking.numberOfPersons} seats`);
    }
    
    console.log('\n=== CLEANUP COMPLETED ===');
    
  } catch (error) {
    console.error('Error in manual cleanup:', error);
  } finally {
    await prisma.$disconnect();
  }
}

manualCleanup(); 