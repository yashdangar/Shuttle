"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Navigation, Wifi, WifiOff, Clock } from "lucide-react";
import { api } from "@/lib/api";

interface Location {
  latitude: number;
  longitude: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
}

interface LocationTrackerProps {
  isActive?: boolean;
  onLocationUpdate?: (location: Location) => void;
}

export default function LocationTracker({ 
  isActive = false, 
  onLocationUpdate 
}: LocationTrackerProps) {
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const locationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const watchIdRef = useRef<number | null>(null);

  // Check online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Get current location
  const getCurrentLocation = (): Promise<Location> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser.'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location: Location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            speed: position.coords.speed || undefined,
            heading: position.coords.heading || undefined,
          };
          resolve(location);
        },
        (error) => {
          let errorMessage = 'Unknown error occurred';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location permission denied';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information unavailable';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out';
              break;
          }
          reject(new Error(errorMessage));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 120000,
        }
      );
    });
  };

  // Watch location changes
  const startLocationWatching = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser.');
      return;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const location: Location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          speed: position.coords.speed || undefined,
          heading: position.coords.heading || undefined,
        };
        
        setCurrentLocation(location);
        setLastUpdate(new Date());
        setError(null);
        
        // Call callback if provided
        if (onLocationUpdate) {
          onLocationUpdate(location);
        }
      },
      (error) => {
        let errorMessage = 'Unknown error occurred';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location permission denied';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out';
            break;
        }
        setError(errorMessage);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 120000,
      }
    );
  };

  // Stop location watching
  const stopLocationWatching = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  };

  // Send location to server
  const sendLocationToServer = async (location: Location) => {
    try {
      await api.post('/driver/update-location', location);
      console.log('Location sent to server successfully');
    } catch (error) {
      console.error('Error sending location to server:', error);
      setError('Failed to send location to server');
    }
  };

  // Start tracking
  const startTracking = async () => {
    try {
      setError(null);
      
      // Get initial location
      const location = await getCurrentLocation();
      setCurrentLocation(location);
      setLastUpdate(new Date());
      
      // Send initial location to server
      await sendLocationToServer(location);
      
      // Start watching for location changes
      startLocationWatching();
      
      // Set up interval to send location updates
      locationIntervalRef.current = setInterval(async () => {
        if (currentLocation) {
          await sendLocationToServer(currentLocation);
        }
      }, 120000); // Send location every 2 minutes instead of 30 seconds
      
      setIsTracking(true);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to start tracking');
    }
  };

  // Stop tracking
  const stopTracking = () => {
    stopLocationWatching();
    
    if (locationIntervalRef.current) {
      clearInterval(locationIntervalRef.current);
      locationIntervalRef.current = null;
    }
    
    setIsTracking(false);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopLocationWatching();
      if (locationIntervalRef.current) {
        clearInterval(locationIntervalRef.current);
      }
    };
  }, []);

  // Auto-start tracking if active
  useEffect(() => {
    if (isActive && !isTracking) {
      startTracking();
    } else if (!isActive && isTracking) {
      stopTracking();
    }
  }, [isActive]);

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Navigation className="w-5 h-5" />
            Location Tracking
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={isOnline ? "default" : "destructive"}>
              {isOnline ? (
                <>
                  <Wifi className="w-3 h-3 mr-1" />
                  Online
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3 mr-1" />
                  Offline
                </>
              )}
            </Badge>
            <Badge variant={isTracking ? "default" : "secondary"}>
              {isTracking ? "Active" : "Inactive"}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {currentLocation && (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Latitude</p>
              <p className="font-medium">{currentLocation.latitude.toFixed(6)}</p>
            </div>
            <div>
              <p className="text-gray-500">Longitude</p>
              <p className="font-medium">{currentLocation.longitude.toFixed(6)}</p>
            </div>
            {currentLocation.accuracy && (
              <div>
                <p className="text-gray-500">Accuracy</p>
                <p className="font-medium">±{Math.round(currentLocation.accuracy)}m</p>
              </div>
            )}
            {currentLocation.speed && (
              <div>
                <p className="text-gray-500">Speed</p>
                <p className="font-medium">{Math.round(currentLocation.speed * 3.6)} km/h</p>
              </div>
            )}
          </div>
        )}

        {lastUpdate && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Clock className="w-4 h-4" />
            Last update: {lastUpdate.toLocaleTimeString()}
          </div>
        )}

        <div className="flex gap-2">
          {!isTracking ? (
            <Button 
              onClick={startTracking} 
              className="flex-1"
              disabled={!isOnline}
            >
              <MapPin className="w-4 h-4 mr-2" />
              Start Tracking
            </Button>
          ) : (
            <>
              <Button 
                onClick={async () => {
                  try {
                    const location = await getCurrentLocation();
                    setCurrentLocation(location);
                    setLastUpdate(new Date());
                    await sendLocationToServer(location);
                  } catch (error) {
                    setError(error instanceof Error ? error.message : 'Failed to refresh location');
                  }
                }}
                variant="outline"
                size="sm"
                disabled={!isOnline}
              >
                <div className="w-4 h-4 mr-1">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16" />
                  </svg>
                </div>
                Refresh
              </Button>
              <Button 
                onClick={stopTracking} 
                variant="destructive" 
                className="flex-1"
              >
                Stop Tracking
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 