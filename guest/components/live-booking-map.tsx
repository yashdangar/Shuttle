"use client";

import { useEffect, useState, useRef } from "react";
import { GoogleMap, Marker, Polyline, useJsApiLoader } from "@react-google-maps/api";
import { api } from "@/lib/api";
import { useWebSocket } from "@/context/WebSocketContext";

interface Location {
  latitude: number;
  longitude: number;
}

interface LiveBookingMapProps {
  bookingId: string;
  height?: string;
  refreshInterval?: number;
}

const containerStyle = {
  width: "100%",
  height: "350px",
};

const defaultCenter = {
  lat: 19.0760, // Mumbai as fallback
  lng: 72.8777,
};

export default function LiveBookingMap({ bookingId, height = "350px", refreshInterval = 30000 }: LiveBookingMapProps) {
  const [driverLocation, setDriverLocation] = useState<Location | null>(null);
  const [pickupLocation, setPickupLocation] = useState<Location | null>(null);
  const [dropoffLocation, setDropoffLocation] = useState<Location | null>(null);
  const [directionsPath, setDirectionsPath] = useState<Array<{ lat: number; lng: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRealTimeTracking, setIsRealTimeTracking] = useState(false);
  const [lastLocationUpdate, setLastLocationUpdate] = useState<Date | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const { onDriverLocationUpdate } = useWebSocket();

  // Load Google Maps JS API
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "", // Set in .env
  });

  // Fetch tracking data
  const fetchTracking = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/guest/booking/${bookingId}/tracking`);
      const tracking = response.tracking;
      if (tracking.driverLocation) {
        setDriverLocation({
          latitude: tracking.driverLocation.latitude,
          longitude: tracking.driverLocation.longitude,
        });
      }
      if (tracking.pickupLocation) {
        setPickupLocation({
          latitude: tracking.pickupLocation.latitude,
          longitude: tracking.pickupLocation.longitude,
        });
      }
      if (tracking.dropoffLocation) {
        setDropoffLocation({
          latitude: tracking.dropoffLocation.latitude,
          longitude: tracking.dropoffLocation.longitude,
        });
      }
      // Parse directions polyline
      if (tracking.directions && tracking.directions.routes?.[0]?.legs?.[0]?.steps) {
        const steps = tracking.directions.routes[0].legs[0].steps;
        const path: Array<{ lat: number; lng: number }> = [];
        steps.forEach((step: any) => {
          path.push({ lat: step.start_location.lat, lng: step.start_location.lng });
          path.push({ lat: step.end_location.lat, lng: step.end_location.lng });
        });
        setDirectionsPath(path);
      } else {
        setDirectionsPath([]);
      }
    } catch (err) {
      setError("Could not load live tracking data");
    } finally {
      setLoading(false);
    }
  };

  // Set up real-time driver location tracking
  useEffect(() => {
    if (!onDriverLocationUpdate || !bookingId) return;

    const cleanup = onDriverLocationUpdate((data) => {
      // Only update if this location update is for our booking
      if (data.bookingId === bookingId) {
        console.log("Real-time driver location update for booking:", bookingId, data.location);
        
        setDriverLocation({
          latitude: data.location.latitude,
          longitude: data.location.longitude,
        });
        
        setIsRealTimeTracking(true);
        setLastLocationUpdate(new Date());
        setLoading(false);
        
        // Auto-follow driver on map
        if (mapRef.current) {
          mapRef.current.panTo({ 
            lat: data.location.latitude, 
            lng: data.location.longitude 
          });
        }
      }
    });

    return cleanup;
  }, [onDriverLocationUpdate, bookingId]);

  // Fallback to periodic updates if real-time is not available
  useEffect(() => {
    if (!bookingId) return;
    
    // Initial fetch
    fetchTracking();
    
    // Set up periodic updates (only if real-time tracking is not active)
    const interval = setInterval(() => {
      if (!isRealTimeTracking) {
        fetchTracking();
      }
    }, refreshInterval);
    
    return () => clearInterval(interval);
  }, [bookingId, isRealTimeTracking, refreshInterval]);

  // Center map on driver or destination
  const center = driverLocation
    ? { lat: driverLocation.latitude, lng: driverLocation.longitude }
    : dropoffLocation
    ? { lat: dropoffLocation.latitude, lng: dropoffLocation.longitude }
    : defaultCenter;

  if (!isLoaded) return <div className="w-full h-[{height}] bg-gray-100 flex items-center justify-center">Loading map...</div>;

  return (
    <div style={{ width: "100%", height }}>
      <GoogleMap
        mapContainerStyle={{ ...containerStyle, height }}
        center={center}
        zoom={14}
        onLoad={map => {
          mapRef.current = map;
        }}
      >
        {/* Driver Marker */}
        {driverLocation && (
          <Marker
            position={{ lat: driverLocation.latitude, lng: driverLocation.longitude }}
            icon={{
              url: isRealTimeTracking 
                ? "https://maps.google.com/mapfiles/ms/icons/blue-dot.png" // Real-time indicator
                : "/placeholder-user.jpg",
              scaledSize: new window.google.maps.Size(40, 40),
            }}
            label={{ 
              text: isRealTimeTracking ? "🚗 Driver (Live)" : "Driver", 
              color: isRealTimeTracking ? "#1976d2" : "#666666", 
              fontWeight: "bold" 
            }}
          />
        )}
        {/* Pickup Marker */}
        {pickupLocation && (
          <Marker
            position={{ lat: pickupLocation.latitude, lng: pickupLocation.longitude }}
            icon={{
              url: "https://maps.google.com/mapfiles/ms/icons/green-dot.png",
              scaledSize: new window.google.maps.Size(32, 32),
            }}
            label={{ text: "Pickup", color: "#388e3c" }}
          />
        )}
        {/* Dropoff Marker */}
        {dropoffLocation && (
          <Marker
            position={{ lat: dropoffLocation.latitude, lng: dropoffLocation.longitude }}
            icon={{
              url: "https://maps.google.com/mapfiles/ms/icons/red-dot.png",
              scaledSize: new window.google.maps.Size(32, 32),
            }}
            label={{ text: "Dropoff", color: "#d32f2f" }}
          />
        )}
        {/* Route Polyline */}
        {directionsPath.length > 1 && (
          <Polyline
            path={directionsPath}
            options={{
              strokeColor: "#1976d2",
              strokeOpacity: 0.8,
              strokeWeight: 5,
            }}
          />
        )}
      </GoogleMap>
      <div className="mt-2 text-center">
        {loading && <div className="text-gray-500">Updating live location...</div>}
        {error && <div className="text-red-500">{error}</div>}
        {isRealTimeTracking && (
          <div className="text-green-600 text-sm font-medium">
            🚗 Live tracking active
            {lastLocationUpdate && (
              <span className="text-gray-500 ml-2">
                Last update: {lastLocationUpdate.toLocaleTimeString()}
              </span>
            )}
          </div>
        )}
        {!isRealTimeTracking && !loading && (
          <div className="text-gray-500 text-sm">
            📡 Checking for driver location...
          </div>
        )}
      </div>
    </div>
  );
} 