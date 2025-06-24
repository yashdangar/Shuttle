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
  return completeData || fallbackData;
} 