import { fetchWithAuth } from './api';

export const getSignedUrl = async (path: string): Promise<string> => {
  try {
    const response = await fetchWithAuth(`/frontdesk/signed-url`, {
      method: 'POST',
      body: JSON.stringify({ path }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to get signed URL');
    }

    const data = await response.json();
    return data.signedUrl;
  } catch (error) {
    throw error;
  }
};

export const getQRCodeUrl = async (bookingId: string): Promise<string> => {
  try {
    const response = await fetchWithAuth(`/frontdesk/bookings/${bookingId}/qr-url`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to get QR code URL');
    }

    const data = await response.json();
    if (!data.signedUrl) {
      throw new Error('No signed URL received');
    }

    return data.signedUrl;
  } catch (error) {
    throw error;
  }
}; 