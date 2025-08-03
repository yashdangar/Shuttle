import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface SeatHoldStatus {
  hasHeldSeats: boolean;
  hasConfirmedSeats: boolean;
  isExpired: boolean;
  timeRemaining: number | null;
  numberOfPersons: number;
  heldAt: string | null;
  heldUntil: string | null;
  confirmedAt: string | null;
  shuttleId: number | null;
  shuttle: {
    id: number;
    vehicleNumber: string;
    seats: number;
  } | null;
  shuttleAvailability: {
    shuttleId: number;
    vehicleNumber: string;
    totalSeats: number;
    seatsHeld: number;
    seatsConfirmed: number;
    availableSeats: number;
    utilizationPercentage: number;
  } | null;
}

export const useSeatHold = (bookingId: string) => {
  const [seatHoldStatus, setSeatHoldStatus] = useState<SeatHoldStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSeatHoldStatus = async () => {
    if (!bookingId) return;

    try {
      setIsLoading(true);
      setError(null);
      
      const response = await api.get(`/guest/bookings/${bookingId}/seat-hold-status`);
      setSeatHoldStatus(response.seatHoldStatus);
    } catch (err: any) {
      console.error('Error fetching seat hold status:', err);
      setError(err.message || 'Failed to fetch seat hold status');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSeatHoldStatus();
  }, [bookingId]);

  const refreshSeatHoldStatus = () => {
    fetchSeatHoldStatus();
  };

  return {
    seatHoldStatus,
    isLoading,
    error,
    refreshSeatHoldStatus,
  };
}; 