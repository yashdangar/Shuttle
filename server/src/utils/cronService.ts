import { CronJob } from 'cron';
import prisma from '../db/prisma';
import { sendToUser, sendToRoleInHotel } from '../ws/index';
import { WsEvents } from '../ws/events';
import { cleanupExpiredSeatHolds } from "./seatHoldingUtils";

// Function to cancel bookings that haven't been verified by frontdesk for 6+ hours
const cancelUnverifiedBookings = async () => {
  try {
    console.log('🕐 Running automatic booking cancellation check...');
    
    // Calculate time 6 hours ago (use UTC to match database timestamps)
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
    
    console.log(`📅 Checking for bookings older than: ${sixHoursAgo.toISOString()}`);
    
    // Find bookings that need frontdesk verification and are older than 6 hours
    const unverifiedBookings = await prisma.booking.findMany({
      where: {
        needsFrontdeskVerification: true,
        isCancelled: false,
        isCompleted: false,
        createdAt: {
          lt: sixHoursAgo
        }
      },
      include: {
        guest: {
          include: {
            hotel: true
          }
        }
      }
    });

    console.log(`Found ${unverifiedBookings.length} bookings that need automatic cancellation`);

    let successCount = 0;
    let errorCount = 0;

    for (const booking of unverifiedBookings) {
      try {
        console.log(`Processing booking ${booking.id} (created at ${booking.createdAt})`);
        
        // Cancel the booking
        const updatedBooking = await prisma.booking.update({
          where: { id: booking.id },
          data: {
            isCancelled: true,
            cancelledBy: 'SYSTEM',
            cancellationReason: 'Frontdesk has not verified this booking within 6 hours, so it has been automatically cancelled.',
            needsFrontdeskVerification: false
          }
        });

        console.log(`✅ Automatically cancelled booking ${booking.id}`);

        // Create notification for the guest
        try {
          await prisma.notification.create({
            data: {
              guestId: booking.guestId,
              title: 'Booking Automatically Cancelled',
              message: `Your booking #${booking.id.substring(0, 8)} has been automatically cancelled because the frontdesk did not verify it within 6 hours. Please contact the hotel frontdesk for assistance.`,
            },
          });
          console.log(`✅ Created notification for guest ${booking.guestId}`);
        } catch (notificationError) {
          console.error(`❌ Error creating notification for guest ${booking.guestId}:`, notificationError);
        }

        // Send WebSocket notification to the guest
        try {
          const guestNotificationPayload = {
            title: 'Booking Automatically Cancelled',
            message: 'Your booking has been automatically cancelled because the frontdesk did not verify it within 6 hours. Please contact the hotel frontdesk for assistance.',
            booking: updatedBooking,
          };
          
          sendToUser(
            booking.guestId,
            'guest',
            WsEvents.BOOKING_CANCELLED,
            guestNotificationPayload
          );
          console.log(`✅ Sent WebSocket notification to guest ${booking.guestId}`);
        } catch (wsError) {
          console.error(`❌ Error sending WebSocket notification to guest ${booking.guestId}:`, wsError);
        }

        // Notify frontdesk users at the hotel
        if (booking.guest.hotelId) {
          try {
            const frontdeskNotificationPayload = {
              title: 'Booking Automatically Cancelled',
              message: `Booking #${booking.id.substring(0, 8)} for ${booking.guest.firstName || 'a guest'} has been automatically cancelled due to lack of verification within 6 hours.`,
              booking: updatedBooking,
            };

            sendToRoleInHotel(
              booking.guest.hotelId,
              'frontdesk',
              WsEvents.BOOKING_CANCELLED,
              frontdeskNotificationPayload
            );
            console.log(`✅ Sent WebSocket notification to frontdesk at hotel ${booking.guest.hotelId}`);
          } catch (wsError) {
            console.error(`❌ Error sending WebSocket notification to frontdesk at hotel ${booking.guest.hotelId}:`, wsError);
          }
        }

        successCount++;

      } catch (error) {
        console.error(`❌ Error cancelling booking ${booking.id}:`, error);
        errorCount++;
      }
    }

    console.log(`✅ Automatic cancellation check completed. Successfully processed ${successCount} bookings, ${errorCount} errors.`);
  } catch (error) {
    console.error('❌ Error in automatic booking cancellation:', error);
  }
};

// Create cron job that runs every hour (use UTC timezone to avoid timezone issues)
const bookingCancellationJob = new CronJob(
  '0 * * * *', // Run every hour at minute 0
  cancelUnverifiedBookings,
  null,
  false, // Don't start automatically
  'UTC' // Use UTC timezone to match database timestamps
);

// Function to start the cron job
export const startBookingCancellationJob = () => {
  try {
    bookingCancellationJob.start();
    console.log('🚀 Automatic booking cancellation job started (runs every hour at UTC)');
    
    // Run initial check
    console.log('🔄 Running initial booking cancellation check...');
    cancelUnverifiedBookings();
  } catch (error) {
    console.error('❌ Error starting booking cancellation job:', error);
  }
};

// Function to stop the cron job
export const stopBookingCancellationJob = () => {
  try {
    bookingCancellationJob.stop();
    console.log('🛑 Automatic booking cancellation job stopped');
  } catch (error) {
    console.error('❌ Error stopping booking cancellation job:', error);
  }
};

// Export the cancellation function for manual testing
export { cancelUnverifiedBookings }; 

// Run cleanup every 5 minutes
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

let cleanupInterval: NodeJS.Timeout | null = null;

export const startSeatHoldCleanup = () => {
  console.log("Starting seat hold cleanup service...");
  
  // Run initial cleanup
  cleanupExpiredSeatHolds();
  
  // Set up periodic cleanup
  cleanupInterval = setInterval(async () => {
    try {
      await cleanupExpiredSeatHolds();
    } catch (error) {
      console.error("Error during seat hold cleanup:", error);
    }
  }, CLEANUP_INTERVAL_MS);
  
  console.log(`Seat hold cleanup service started. Running every ${CLEANUP_INTERVAL_MS / 1000} seconds.`);
};

export const stopSeatHoldCleanup = () => {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
    console.log("Seat hold cleanup service stopped.");
  }
};

// Start cleanup service when this module is imported
console.log("🚀 Starting seat hold cleanup service...");
startSeatHoldCleanup();

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log("Received SIGTERM, stopping services...");
  stopBookingCancellationJob();
  stopSeatHoldCleanup();
});

process.on('SIGINT', () => {
  console.log("Received SIGINT, stopping services...");
  stopBookingCancellationJob();
  stopSeatHoldCleanup();
}); 