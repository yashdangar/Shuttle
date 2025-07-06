import { CronJob } from 'cron';
import prisma from '../db/prisma';
import { sendToUser, sendToRoleInHotel } from '../ws/index';
import { WsEvents } from '../ws/events';

// Function to cancel bookings that haven't been verified by frontdesk for 6+ hours
const cancelUnverifiedBookings = async () => {
  try {
    console.log('🕐 Running automatic booking cancellation check...');
    
    // Calculate time 6 hours ago
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
    
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

    for (const booking of unverifiedBookings) {
      try {
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

        console.log(`✅ Automatically cancelled booking ${booking.id} (created at ${booking.createdAt})`);

        // Create notification for the guest
        await prisma.notification.create({
          data: {
            guestId: booking.guestId,
            title: 'Booking Automatically Cancelled',
            message: `Your booking #${booking.id.substring(0, 8)} has been automatically cancelled because the frontdesk did not verify it within 6 hours. Please contact the hotel frontdesk for assistance.`,
          },
        });

        // Send WebSocket notification to the guest
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

        // Notify frontdesk users at the hotel
        if (booking.guest.hotelId) {
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
        }

      } catch (error) {
        console.error(`❌ Error cancelling booking ${booking.id}:`, error);
      }
    }

    console.log(`✅ Automatic cancellation check completed. Processed ${unverifiedBookings.length} bookings.`);
  } catch (error) {
    console.error('❌ Error in automatic booking cancellation:', error);
  }
};

// Create cron job that runs every hour
const bookingCancellationJob = new CronJob(
  '0 * * * *', // Run every hour at minute 0
  cancelUnverifiedBookings,
  null,
  false, // Don't start automatically
  'Asia/Kolkata' // Use IST timezone
);

// Function to start the cron job
export const startBookingCancellationJob = () => {
  bookingCancellationJob.start();
  console.log('🚀 Automatic booking cancellation job started (runs every hour)');
};

// Function to stop the cron job
export const stopBookingCancellationJob = () => {
  bookingCancellationJob.stop();
  console.log('🛑 Automatic booking cancellation job stopped');
};

// Export the cancellation function for manual testing
export { cancelUnverifiedBookings }; 