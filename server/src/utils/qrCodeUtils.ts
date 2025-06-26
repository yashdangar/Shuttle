import QRCode from 'qrcode';
import crypto from 'crypto';
import { uploadToS3 } from './s3Utils';
import prisma from '../db/prisma';

interface QRVerificationData {
  token: string;
  expiresAt: string;
}

interface BookingQRData {
  bookingId: string;
  guestId: number;
  preferredTime: string;
  encryptionKey: string;
}

export const generateEncryptionKey = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

export const generateVerificationToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

export const generateQRCode = async (bookingData: BookingQRData): Promise<string> => {
  try {
    // Generate a secure verification token
    const token = generateVerificationToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
    
    // Create verification token in database
    await prisma.qRVerificationToken.create({
      data: {
        token,
        bookingId: bookingData.bookingId,
        expiresAt,
      },
    });
    
    // Create QR data with only the token (no sensitive information)
    const qrData: QRVerificationData = {
      token,
      expiresAt: expiresAt.toISOString(),
    };
    
    // Convert QR data to string
    const qrDataString = JSON.stringify(qrData);
    
    // Generate QR code as buffer
    const qrCodeBuffer = await QRCode.toBuffer(qrDataString, {
      errorCorrectionLevel: 'H',
      margin: 1,
      width: 300,
    });
    
    // Upload to S3 and return the path
    const s3Path = `shuttle/${bookingData.bookingId}/qr.png`;
    await uploadToS3(qrCodeBuffer, s3Path);
    
    return s3Path;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw new Error('Failed to generate QR code');
  }
};

export const verifyQRCode = (qrData: string): QRVerificationData => {
  try {
    const verificationData = JSON.parse(qrData) as QRVerificationData;
    
    // Validate required fields
    if (!verificationData.token || !verificationData.expiresAt) {
      throw new Error('Invalid QR code data');
    }
    
    // Check if token has expired
    const expiresAt = new Date(verificationData.expiresAt);
    if (expiresAt < new Date()) {
      throw new Error('QR code has expired');
    }
    
    return verificationData;
  } catch (error) {
    console.error('Error verifying QR code:', error);
    throw new Error('Invalid QR code');
  }
};

export const validateVerificationToken = async (token: string, driverId: number): Promise<any> => {
  try {
    // Find the verification token
    const verificationToken = await prisma.qRVerificationToken.findUnique({
      where: { token },
      include: {
        booking: {
          include: {
            guest: {
              include: {
                hotel: true,
              },
            },
            pickupLocation: true,
            dropoffLocation: true,
            shuttle: true,
          },
        },
      },
    });

    if (!verificationToken) {
      throw new Error('Invalid verification token');
    }

    // Check if token has expired
    if (verificationToken.expiresAt < new Date()) {
      throw new Error('Verification token has expired');
    }

    // Check if token has already been used
    if (verificationToken.isUsed) {
      throw new Error('Verification token has already been used');
    }

    // Get driver information
    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
      include: { hotel: true },
    });

    if (!driver) {
      throw new Error('Driver not found');
    }

    // Check if driver can verify this booking (same hotel)
    if (driver.hotelId !== verificationToken.booking.guest.hotelId) {
      throw new Error('Driver not authorized to verify this booking');
    }

    // Check if driver has an active trip and verify route direction
    const activeTrip = await prisma.trip.findFirst({
      where: {
        driverId,
        status: 'ACTIVE',
      },
    });

    if (!activeTrip) {
      throw new Error('Driver must be on an active trip to verify bookings');
    }

    // Check if booking direction matches trip direction
    if (verificationToken.booking.bookingType !== activeTrip.direction) {
      const tripDirectionText = activeTrip.direction === 'HOTEL_TO_AIRPORT' ? 'Hotel to Airport' : 'Airport to Hotel';
      const bookingDirectionText = verificationToken.booking.bookingType === 'HOTEL_TO_AIRPORT' ? 'Hotel to Airport' : 'Airport to Hotel';
      throw new Error(`Route mismatch: Driver is currently on a ${tripDirectionText} trip, but this booking is for ${bookingDirectionText}. Please ensure you're on the correct route before scanning QR codes.`);
    }

    // Check if booking is assigned to the current trip
    if (verificationToken.booking.tripId !== activeTrip.id) {
      throw new Error('This booking is not assigned to your current trip. Please contact the frontdesk for assistance.');
    }

    // Check if booking is valid
    if (verificationToken.booking.isCancelled) {
      throw new Error('Booking is cancelled');
    }

    if (verificationToken.booking.isCompleted) {
      throw new Error('Booking is already completed');
    }

    if (verificationToken.booking.isVerified) {
      throw new Error('Booking is already verified');
    }

    return {
      verificationToken,
      booking: verificationToken.booking,
      driver,
    };
  } catch (error) {
    console.error('Error validating verification token:', error);
    throw error;
  }
};

export const markTokenAsUsed = async (token: string, driverId: number, success: boolean, message?: string): Promise<void> => {
  try {
    const verificationToken = await prisma.qRVerificationToken.findUnique({
      where: { token },
      include: { booking: true },
    });

    if (!verificationToken) {
      throw new Error('Verification token not found');
    }

    // Mark token as used
    await prisma.qRVerificationToken.update({
      where: { token },
      data: { isUsed: true },
    });

    // If verification was successful, update booking
    if (success) {
      await prisma.booking.update({
        where: { id: verificationToken.bookingId },
        data: {
          isVerified: true,
          verifiedAt: new Date(),
          verifiedBy: driverId,
        },
      });
    }

    // Log the verification attempt
    await prisma.qRVerificationLog.create({
      data: {
        bookingId: verificationToken.bookingId,
        driverId,
        token,
        success,
        message,
      },
    });
  } catch (error) {
    console.error('Error marking token as used:', error);
    throw error;
  }
}; 