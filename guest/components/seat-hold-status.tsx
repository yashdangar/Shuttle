"use client"

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { useSeatHold } from '@/hooks/use-seat-hold';
import { toast } from 'sonner';

interface SeatHoldStatusProps {
  bookingId: string;
  className?: string;
}

export default function SeatHoldStatus({ bookingId, className = "" }: SeatHoldStatusProps) {
  const { seatHoldStatus, isLoading, error, refreshSeatHoldStatus } = useSeatHold(bookingId);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  // Update time remaining every second
  useEffect(() => {
    if (!seatHoldStatus?.timeRemaining) {
      setTimeRemaining(null);
      return;
    }

    const interval = setInterval(() => {
      const remaining = Math.max(0, seatHoldStatus.timeRemaining - 1000);
      setTimeRemaining(remaining);
      
      if (remaining <= 0) {
        // Refresh status when time expires
        refreshSeatHoldStatus();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [seatHoldStatus?.timeRemaining, refreshSeatHoldStatus]);

  const formatTimeRemaining = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleRefresh = () => {
    refreshSeatHoldStatus();
    toast.success('Seat hold status refreshed');
  };

  if (isLoading) {
    return (
      <Card className={`animate-pulse ${className}`}>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-32"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={`border-red-200 bg-red-50 ${className}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <span className="text-sm text-red-800">Error loading seat status</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              className="text-xs"
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!seatHoldStatus) {
    return null;
  }

  // Show held seats status
  if (seatHoldStatus.hasHeldSeats && !seatHoldStatus.isExpired) {
    return (
      <Card className={`border-yellow-200 bg-yellow-50 ${className}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-yellow-600" />
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-yellow-800">
                    🪑 Seats Temporarily Held
                  </span>
                  {timeRemaining && (
                    <Badge variant="outline" className="text-xs">
                      {formatTimeRemaining(timeRemaining)}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-yellow-700 mt-1">
                  Your seats are held temporarily. Please wait for frontdesk verification.
                </p>
                {seatHoldStatus.shuttle && (
                  <p className="text-xs text-yellow-700 mt-1">
                    🚐 Assigned to shuttle: {seatHoldStatus.shuttle.vehicleNumber}
                  </p>
                )}
              </div>
            </div>
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
        </CardContent>
      </Card>
    );
  }

  // Show confirmed seats status
  if (seatHoldStatus.hasConfirmedSeats) {
    return (
      <Card className={`border-green-200 bg-green-50 ${className}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <div>
                <span className="text-sm font-medium text-green-800">
                  ✅ Seats Confirmed
                </span>
                <p className="text-xs text-green-700 mt-1">
                  Your seats have been confirmed by the frontdesk.
                  {seatHoldStatus.confirmedAt && (
                    ` Confirmed at ${new Date(seatHoldStatus.confirmedAt).toLocaleTimeString()}.`
                  )}
                </p>
                {seatHoldStatus.shuttle && (
                  <p className="text-xs text-green-700 mt-1">
                    🚐 Confirmed on shuttle: {seatHoldStatus.shuttle.vehicleNumber}
                  </p>
                )}
              </div>
            </div>
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
        </CardContent>
      </Card>
    );
  }

  // Show expired status
  if (seatHoldStatus.isExpired) {
    return (
      <Card className={`border-red-200 bg-red-50 ${className}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <div>
                <span className="text-sm font-medium text-red-800">
                  ⏰ Seat Hold Expired
                </span>
                <p className="text-xs text-red-700 mt-1">
                  Your seat hold has expired. Please contact the frontdesk for assistance.
                </p>
              </div>
            </div>
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
        </CardContent>
      </Card>
    );
  }

  return null;
} 