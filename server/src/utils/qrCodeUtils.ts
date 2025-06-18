import QRCode from 'qrcode';
import crypto from 'crypto';
import { uploadToS3 } from './s3Utils';

interface BookingQRData {
  bookingId: string;
  guestId: number;
  preferredTime: string;
  encryptionKey: string;
}

export const generateEncryptionKey = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

export const generateQRCode = async (bookingData: BookingQRData): Promise<string> => {
  try {
    // Convert booking data to string
    const qrData = JSON.stringify(bookingData);
    
    // Generate QR code as buffer
    const qrCodeBuffer = await QRCode.toBuffer(qrData, {
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

export const verifyQRCode = (qrData: string): BookingQRData => {
  try {
    const bookingData = JSON.parse(qrData) as BookingQRData;
    
    // Validate required fields
    if (!bookingData.bookingId || !bookingData.guestId || !bookingData.encryptionKey) {
      throw new Error('Invalid QR code data');
    }
    
    return bookingData;
  } catch (error) {
    console.error('Error verifying QR code:', error);
    throw new Error('Invalid QR code');
  }
}; 