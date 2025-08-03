"use client"

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, AlertCircle, CheckCircle, RefreshCw, Users, Shuttle } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface SeatHoldStatusProps {
  booking: any;
  onRefresh?: () => void;
  className?: string;
}

export default function SeatHoldStatus({ booking, onRefresh, className = "" }: SeatHoldStatusProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  // Calculate time remaining if seats are held
  useEffect(() => {
    if (!booking.seatsHeld || !booking.seatsHeldUntil) {
      setTimeRemaining(null);
      return;
    }

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const heldUntil = new Date(booking.seatsHeldUntil).getTime();
      const remaining = Math.max(0, heldUntil - now);
      setTimeRemaining(remaining);
      
      if (remaining <= 0) {
        // Refresh when time expires
        onRefresh?.();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [booking.seatsHeld, booking.seatsHeldUntil, onRefresh]);

  const formatTimeRemaining = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleRefresh = () => {
    onRefresh?.();
    toast.success('Booking status refreshed');
  };

  // Show held seats status
  if (booking.seatsHeld && !booking.seatsConfirmed && !booking.isCancelled) {
    const isExpired = booking.seatsHeldUntil ? new Date() > new Date(booking.seatsHeldUntil) : false;

    return (
      <Card className={`border-yellow-200 bg-yellow-50 ${className}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-yellow-800 flex items-center space-x-2">
              <Clock className="w-4 h-4" />
              <span>🪑 Seats Temporarily Held</span>
              {timeRemaining && !isExpired && (
                <Badge variant="outline" className="text-xs">
                  {formatTimeRemaining(timeRemaining)}
                </Badge>
              )}
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              className="text-xs"
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-yellow-700">Number of Persons:</span>
                <span className="font-medium">{booking.numberOfPersons}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-yellow-700">Booking Type:</span>
                <span className="font-medium">
                  {booking.bookingType === 'HOTEL_TO_AIRPORT' ? 'Hotel to Airport' : 'Airport to Hotel'}
                </span>
              </div>
            </div>
            
            {booking.shuttle && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-yellow-700">Assigned Shuttle:</span>
                <span className="font-medium flex items-center space-x-1">
                  <Shuttle className="w-3 h-3" />
                  {booking.shuttle.vehicleNumber}
                </span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 text-xs">
              {booking.seatsHeldAt && (
                <div className="flex items-center justify-between">
                  <span className="text-yellow-700">Held At:</span>
                  <span className="font-medium">
                    {new Date(booking.seatsHeldAt).toLocaleTimeString()}
                  </span>
                </div>
              )}

              {booking.seatsHeldUntil && (
                <div className="flex items-center justify-between">
                  <span className="text-yellow-700">Held Until:</span>
                  <span className="font-medium">
                    {new Date(booking.seatsHeldUntil).toLocaleTimeString()}
                  </span>
                </div>
              )}
            </div>

            {isExpired ? (
              <div className="bg-red-100 border border-red-200 rounded p-2">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  <span className="text-xs text-red-800 font-medium">
                    ⏰ Seat Hold Expired
                  </span>
                </div>
                <p className="text-xs text-red-700 mt-1">
                  The seat hold has expired. This booking may need attention.
                </p>
              </div>
            ) : (
              <div className="bg-blue-100 border border-blue-200 rounded p-2">
                <div className="flex items-center space-x-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span className="text-xs text-blue-800 font-medium">
                    Pending Frontdesk Verification
                  </span>
                </div>
                <p className="text-xs text-blue-700 mt-1">
                  This booking has temporarily held seats. Waiting for frontdesk verification.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show confirmed seats status
  if (booking.seatsConfirmed && !booking.isCancelled) {
    return (
      <Card className={`border-green-200 bg-green-50 ${className}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-green-800 flex items-center space-x-2">
              <CheckCircle className="w-4 h-4" />
              <span>✅ Seats Confirmed</span>
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              className="text-xs"
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-green-700">Number of Persons:</span>
                <span className="font-medium">{booking.numberOfPersons}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-green-700">Booking Type:</span>
                <span className="font-medium">
                  {booking.bookingType === 'HOTEL_TO_AIRPORT' ? 'Hotel to Airport' : 'Airport to Hotel'}
                </span>
              </div>
            </div>
            
            {booking.shuttle && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-green-700">Confirmed Shuttle:</span>
                <span className="font-medium flex items-center space-x-1">
                  <Shuttle className="w-3 h-3" />
                  {booking.shuttle.vehicleNumber}
                </span>
              </div>
            )}

            {booking.seatsConfirmedAt && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-green-700">Confirmed At:</span>
                <span className="font-medium">
                  {new Date(booking.seatsConfirmedAt).toLocaleTimeString()}
                </span>
              </div>
            )}

            <div className="bg-green-100 border border-green-200 rounded p-2">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-xs text-green-800 font-medium">
                  Seats Successfully Confirmed
                </span>
              </div>
              <p className="text-xs text-green-700 mt-1">
                This booking has been verified and seats are confirmed. Ready for passenger pickup.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
} 