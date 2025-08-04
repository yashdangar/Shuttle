const { releaseHeldSeats, getSeatHoldStatus } = require('./src/utils/seatHoldingUtils');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testSeatRelease() {
  try {
    console.log('=== TESTING SEAT HOLD RELEASE FUNCTION ===');
    
    // Find a booking with held seats
    const bookingWithHeldSeats = await prisma.booking.findFirst({
      where: {
        seatsHeld: true,
        isCancelled: false,
      },
      select: {
        id: true,
        seatsHeld: true,
        seatsHeldAt: true,
        seatsHeldUntil: true,
        shuttleId: true,
        numberOfPersons: true,
      }
    });

    if (!bookingWithHeldSeats) {
      console.log('No bookings with held seats found for testing');
      return;
    }

    console.log('Found booking with held seats:', bookingWithHeldSeats);

    // Get seat hold status before release
    const statusBefore = await getSeatHoldStatus(bookingWithHeldSeats.id);
    console.log('Seat hold status before release:', statusBefore);

    // Test seat release
    const releaseResult = await releaseHeldSeats(bookingWithHeldSeats.id);
    console.log('Seat release result:', releaseResult);

    // Get seat hold status after release
    const statusAfter = await getSeatHoldStatus(bookingWithHeldSeats.id);
    console.log('Seat hold status after release:', statusAfter);

    // Verify the booking was updated
    const updatedBooking = await prisma.booking.findUnique({
      where: { id: bookingWithHeldSeats.id },
      select: {
        id: true,
        seatsHeld: true,
        seatsHeldAt: true,
        seatsHeldUntil: true,
        shuttleId: true,
      }
    });

    console.log('Updated booking:', updatedBooking);

    console.log('=== SEAT RELEASE TEST COMPLETED ===');
  } catch (error) {
    console.error('Error during seat release test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testSeatRelease(); 