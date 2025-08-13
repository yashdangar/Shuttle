"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Navigation, Users, CheckCircle, Clock, Car } from "lucide-react";
import { useJsApiLoader, GoogleMap, Marker, InfoWindow, Polyline } from "@react-google-maps/api";
import { api } from "@/lib/api";
import { useWebSocket } from "@/context/WebSocketContext";

interface Location {
  latitude: number;
  longitude: number;
  name: string;
}

interface Booking {
  id: string;
  pickup: string;
  dropoff: string;
  persons: number;
  bags: number;
  status: string;
  eta?: string;
  driverLocation?: Location;
}

interface GuestRouteMapProps {
  booking: Booking;
  height?: string;
}

const defaultCenter = {
  lat: 19.0760, // Mumbai as fallback
  lng: 72.8777,
};

export default function GuestRouteMap({ 
  booking, 
  height = "400px" 
}: GuestRouteMapProps) {
  const [driverLocation, setDriverLocation] = useState<Location | null>(null);
  const [pickupLocation, setPickupLocation] = useState<Location | null>(null);
  const [dropoffLocation, setDropoffLocation] = useState<Location | null>(null);
  const [directionsPath, setDirectionsPath] = useState<Array<{ lat: number; lng: number }>>([]);
  const [activeInfoWindow, setActiveInfoWindow] = useState<'driver' | 'pickup' | 'dropoff' | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [realTimeEta, setRealTimeEta] = useState<string | null>(null);
  const [etaDistance, setEtaDistance] = useState<string | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const directionsServiceRef = useRef<google.maps.DirectionsService | null>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const { onDriverLocationUpdate, onBookingUpdate } = useWebSocket();

  const containerStyle = {
    width: '100%',
    height: height,
    borderRadius: '8px',
  };

  // Load Google Maps JS API
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
  });



  // Fetch real-time ETA from server (preferred method)
  const fetchServerETA = useCallback(async () => {
    try {
      const response = await api.get(`/guest/booking/${booking.id}/eta`);
      if (response.eta && response.distance) {
        setRealTimeEta(response.eta);
        setEtaDistance(response.distance);
        return true; // Successfully fetched from server
      }
    } catch (error) {
      console.error('Error fetching server ETA:', error);
    }
    return false; // Failed to fetch from server
  }, [booking.id]);

  // Calculate real-time ETA using Google Maps Directions API as fallback
  const calculateClientETA = useCallback(async () => {
    if (!driverLocation || !pickupLocation || !directionsServiceRef.current) {
      return;
    }

    try {
      const request: google.maps.DirectionsRequest = {
        origin: { lat: driverLocation.latitude, lng: driverLocation.longitude },
        destination: { lat: pickupLocation.latitude, lng: pickupLocation.longitude },
        travelMode: google.maps.TravelMode.DRIVING,
      };

      const result = await directionsServiceRef.current.route(request);
      
      if (result.routes && result.routes.length > 0) {
        const route = result.routes[0];
        const leg = route.legs[0];
        
        if (leg) {
          setRealTimeEta(leg.duration?.text || 'Calculating...');
          setEtaDistance(leg.distance?.text || 'Calculating...');
          
          // Update directions path
          const path: Array<{ lat: number; lng: number }> = [];
          if (leg.steps) {
            leg.steps.forEach((step) => {
              path.push({ lat: step.start_location.lat(), lng: step.start_location.lng() });
              path.push({ lat: step.end_location.lat(), lng: step.end_location.lng() });
            });
          }
          setDirectionsPath(path);
        }
      }
    } catch (error) {
      console.error('Error calculating client ETA:', error);
      setRealTimeEta('Error calculating ETA');
      setEtaDistance('Error calculating distance');
    }
  }, [driverLocation, pickupLocation]);

  // Combined ETA calculation: try server first, fall back to client
  const calculateRealTimeETA = useCallback(async () => {
    // First try to get ETA from server (includes next trip logic)
    const serverSuccess = await fetchServerETA();
    
    // If server ETA failed and we have location data, fall back to client calculation
    if (!serverSuccess && driverLocation && pickupLocation) {
      await calculateClientETA();
    }
  }, [fetchServerETA, calculateClientETA, driverLocation, pickupLocation]);

  // Fetch booking location data
  const fetchMapData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get booking tracking data
      const trackingResponse = await api.get(`/guest/booking/${booking.id}/tracking`);
      const tracking = trackingResponse.tracking;

      // Set driver location if available
      if (tracking.driverLocation) {
        const newDriverLocation = {
          latitude: tracking.driverLocation.latitude,
          longitude: tracking.driverLocation.longitude,
          name: "Driver Location"
        };
        console.log('Driver location set:', newDriverLocation);
        setDriverLocation(newDriverLocation);
      } else {
        console.log('No driver location in tracking response');
      }

      // Set pickup location
      if (tracking.pickupLocation) {
        setPickupLocation({
          latitude: tracking.pickupLocation.latitude,
          longitude: tracking.pickupLocation.longitude,
          name: booking.pickup
        });
      } else {
        // If no pickup location, get hotel location
        try {
          const guestResponse = await api.get('/guest/profile');
          if (guestResponse.guest?.hotel?.latitude && guestResponse.guest?.hotel?.longitude) {
            setPickupLocation({
              latitude: guestResponse.guest.hotel.latitude,
              longitude: guestResponse.guest.hotel.longitude,
              name: `${guestResponse.guest.hotel.name} (Hotel)`
            });
          }
        } catch (err) {
          console.error('Error fetching hotel location:', err);
        }
      }

      // Set dropoff location
      if (tracking.dropoffLocation) {
        const newDropoffLocation = {
          latitude: tracking.dropoffLocation.latitude,
          longitude: tracking.dropoffLocation.longitude,
          name: booking.dropoff
        };
        console.log('Dropoff location set:', newDropoffLocation);
        setDropoffLocation(newDropoffLocation);
      } else {
        // If no dropoff location, get hotel location
        try {
          const guestResponse = await api.get('/guest/profile');
          if (guestResponse.guest?.hotel?.latitude && guestResponse.guest?.hotel?.longitude) {
            const fallbackDropoffLocation = {
              latitude: guestResponse.guest.hotel.latitude,
              longitude: guestResponse.guest.hotel.longitude,
              name: `${guestResponse.guest.hotel.name} (Hotel)`
            };
            console.log('Dropoff location set to hotel fallback:', fallbackDropoffLocation);
            setDropoffLocation(fallbackDropoffLocation);
          }
        } catch (err) {
          console.error('Error fetching hotel location:', err);
        }
      }

      // Parse directions if available
      if (tracking.directions && tracking.directions.routes?.[0]?.legs?.[0]?.steps) {
        const steps = tracking.directions.routes[0].legs[0].steps;
        const path: Array<{ lat: number; lng: number }> = [];
        steps.forEach((step: any) => {
          path.push({ lat: step.start_location.lat, lng: step.start_location.lng });
          path.push({ lat: step.end_location.lat, lng: step.end_location.lng });
        });
        setDirectionsPath(path);
      }

    } catch (err) {
      setError("Could not load map data");
      console.error("Error fetching map data:", err);
      
      // Fallback to placeholder coordinates
      const baseLat = 19.0760;
      const baseLng = 72.8777;
      
      setPickupLocation({
        latitude: baseLat,
        longitude: baseLng,
        name: booking.pickup
      });

      setDropoffLocation({
        latitude: baseLat + 0.01,
        longitude: baseLng + 0.01,
        name: booking.dropoff
      });
    } finally {
      setLoading(false);
    }
  };

  // Set up automatic refresh for ETA calculation
  useEffect(() => {
    if (driverLocation && pickupLocation && isLoaded) {
      // Calculate ETA immediately
      calculateRealTimeETA();
      
      // Set up interval for periodic updates (every 30 seconds)
      refreshIntervalRef.current = setInterval(() => {
        calculateRealTimeETA();
      }, 30000);
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [driverLocation, pickupLocation, isLoaded, calculateRealTimeETA]);

  useEffect(() => {
    if (booking.id) {
      fetchMapData();
    }
  }, [booking.id]);

  // Subscribe to real-time driver location updates for this booking
  useEffect(() => {
    if (!onDriverLocationUpdate) return;
    const cleanup = onDriverLocationUpdate((data: any) => {
      if (data?.bookingId === booking.id && data?.location) {
        setDriverLocation({
          latitude: data.location.latitude,
          longitude: data.location.longitude,
          name: "Driver Location",
        });
        // Recalculate ETA on live updates
        calculateRealTimeETA();
      }
    });
    return cleanup;
  }, [onDriverLocationUpdate, booking.id, calculateRealTimeETA]);

  // Refresh map data when booking is updated (e.g., assigned to a shuttle/driver)
  useEffect(() => {
    if (!onBookingUpdate) return;
    const cleanup = onBookingUpdate((updatedBooking: any) => {
      if (updatedBooking?.id === booking.id) {
        fetchMapData();
      }
    });
    return cleanup;
  }, [onBookingUpdate, booking.id]);

  // Center map on driver or pickup location
  const center = driverLocation
    ? { lat: driverLocation.latitude, lng: driverLocation.longitude }
    : pickupLocation
    ? { lat: pickupLocation.latitude, lng: pickupLocation.longitude }
    : defaultCenter;

  const onLoad = (map: google.maps.Map) => {
    mapRef.current = map;
    directionsServiceRef.current = new window.google.maps.DirectionsService();
  };

  const onUnmount = () => {
    mapRef.current = null;
    directionsServiceRef.current = null;
  };

  const getMarkerIcon = (type: 'driver' | 'pickup' | 'dropoff') => {
    const baseUrl = 'https://maps.google.com/mapfiles/ms/icons/';
    
    if (type === 'driver') {
      // Use a more reliable custom marker for driver
      return {
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
          <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
            <circle cx="16" cy="16" r="12" fill="#22C55E" stroke="#FFFFFF" stroke-width="3"/>
            <circle cx="16" cy="16" r="6" fill="#FFFFFF"/>
          </svg>
        `),
        scaledSize: new google.maps.Size(32, 32),
        anchor: new google.maps.Point(16, 16),
      };
    } else if (type === 'pickup') {
      // Custom SVG for pickup to ensure reliability
      return {
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
          <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
            <circle cx="16" cy="16" r="12" fill="#DC2626" stroke="#FFFFFF" stroke-width="3"/>
            <circle cx="16" cy="16" r="6" fill="#FFFFFF"/>
          </svg>
        `),
        scaledSize: new google.maps.Size(32, 32),
        anchor: new google.maps.Point(16, 16),
      };
    } else {
      // Custom SVG for dropoff to ensure reliability
      return {
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
          <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
            <circle cx="16" cy="16" r="12" fill="#0EA5E9" stroke="#FFFFFF" stroke-width="3"/>
            <circle cx="16" cy="16" r="6" fill="#FFFFFF"/>
          </svg>
        `),
        scaledSize: new google.maps.Size(32, 32),
        anchor: new google.maps.Point(16, 16),
      };
    }
  };

  const getMarkerTitle = (type: 'driver' | 'pickup' | 'dropoff') => {
    if (type === 'driver') return 'Driver Location';
    if (type === 'pickup') return `Pickup: ${booking.pickup}`;
    return `Dropoff: ${booking.dropoff}`;
  };

  if (loadError) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-red-600" />
            Route Map
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="aspect-video bg-muted rounded-xl flex items-center justify-center">
            <div className="text-center">
              <MapPin className="h-16 w-16 mx-auto mb-4 text-red-500" />
              <p className="text-lg font-medium text-red-600">Google Maps Error</p>
              <p className="text-sm text-gray-600 mt-2">Failed to load Google Maps API</p>
              <p className="text-xs text-gray-500 mt-1">Please check your API key configuration</p>
              <Button 
                onClick={() => window.location.reload()}
                className="mt-4"
                variant="outline"
              >
                Retry
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!isLoaded) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-green-600" />
            Route Map
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="aspect-video bg-muted rounded-xl flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
              <p className="text-lg font-medium">Loading Google Maps...</p>
              <p className="text-sm text-gray-500 mt-2">Please ensure you have a valid Google Maps API key</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-red-600" />
            Route Map
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="aspect-video bg-muted rounded-xl flex items-center justify-center">
            <div className="text-center">
              <MapPin className="h-16 w-16 mx-auto mb-4 text-red-500" />
              <p className="text-lg font-medium text-red-600">Error Loading Map</p>
              <p className="text-sm text-gray-600">{error}</p>
              <Button 
                onClick={fetchMapData}
                className="mt-4"
                variant="outline"
              >
                Retry
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-green-600" />
          Your Trip Route
        </CardTitle>
        <div className="flex flex-wrap gap-2 mt-2">
          <Badge variant="outline" className="text-xs">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-1"></div>
            Driver
          </Badge>
          <Badge variant="outline" className="text-xs">
            <div className="w-3 h-3 bg-red-500 rounded-full mr-1"></div>
            Pickup
          </Badge>
          <Badge variant="outline" className="text-xs">
            <div className="w-3 h-3 bg-cyan-500 rounded-full mr-1"></div>
            Dropoff
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <GoogleMap
            mapContainerStyle={containerStyle}
            center={center}
            zoom={13}
            onLoad={onLoad}
            onUnmount={onUnmount}
            options={{
              zoomControl: true,
              streetViewControl: false,
              mapTypeControl: true,
              fullscreenControl: true,
            }}
          >
            {/* Driver Location Marker */}
            {driverLocation && (
              <>
                {console.log('Rendering driver marker at:', driverLocation.latitude, driverLocation.longitude)}
                <Marker
                  position={{ lat: driverLocation.latitude, lng: driverLocation.longitude }}
                  icon={getMarkerIcon('driver')}
                  title={getMarkerTitle('driver')}
                  onClick={() => setActiveInfoWindow('driver')}
                  zIndex={1000} // Make sure driver marker is on top
                />
              </>
            )}

            {/* Pickup Location Marker */}
            {pickupLocation && (
              <Marker
                position={{ lat: pickupLocation.latitude, lng: pickupLocation.longitude }}
                icon={getMarkerIcon('pickup')}
                title={getMarkerTitle('pickup')}
                onClick={() => setActiveInfoWindow('pickup')}
                zIndex={998} // Ensure pickup marker is visible
              />
            )}

            {/* Dropoff Location Marker */}
            {dropoffLocation && (
              <>
                {console.log('Rendering dropoff marker at:', dropoffLocation.latitude, dropoffLocation.longitude)}
                <Marker
                  position={{ lat: dropoffLocation.latitude, lng: dropoffLocation.longitude }}
                  icon={getMarkerIcon('dropoff')}
                  title={getMarkerTitle('dropoff')}
                  onClick={() => setActiveInfoWindow('dropoff')}
                  zIndex={999} // Ensure dropoff marker is visible
                />
              </>
            )}

            {/* Info Windows */}
            {activeInfoWindow === 'driver' && driverLocation && (
              <InfoWindow
                position={{ lat: driverLocation.latitude, lng: driverLocation.longitude }}
                onCloseClick={() => setActiveInfoWindow(null)}
              >
                <div className="p-2">
                  <h3 className="font-bold text-blue-600">🚗 Driver Location</h3>
                  <p className="text-sm">Your driver's current position</p>
                  {realTimeEta && (
                    <div className="mt-2 space-y-1">
                      <p className="text-sm text-green-600 font-medium">
                        <Clock className="h-3 w-3 inline mr-1" />
                        ETA: {realTimeEta}
                      </p>
                      {etaDistance && (
                        <p className="text-sm text-blue-600">
                          <Navigation className="h-3 w-3 inline mr-1" />
                          Distance: {etaDistance}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </InfoWindow>
            )}

            {activeInfoWindow === 'pickup' && pickupLocation && (
              <InfoWindow
                position={{ lat: pickupLocation.latitude, lng: pickupLocation.longitude }}
                onCloseClick={() => setActiveInfoWindow(null)}
              >
                <div className="p-2 max-w-xs">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="h-4 w-4 text-red-500" />
                    <h3 className="font-bold text-red-600">Pickup Location</h3>
                  </div>
                  <p className="font-semibold">{pickupLocation.name}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {booking.persons}
                    </span>
                    <span>•</span>
                    <span>{booking.bags} bags</span>
                  </div>
                  {realTimeEta && (
                    <div className="mt-2 p-2 bg-green-50 rounded">
                      <p className="text-sm text-green-600 font-medium">
                        <Clock className="h-3 w-3 inline mr-1" />
                        Driver ETA: {realTimeEta}
                      </p>
                    </div>
                  )}
                </div>
              </InfoWindow>
            )}

            {activeInfoWindow === 'dropoff' && dropoffLocation && (
              <InfoWindow
                position={{ lat: dropoffLocation.latitude, lng: dropoffLocation.longitude }}
                onCloseClick={() => setActiveInfoWindow(null)}
              >
                <div className="p-2 max-w-xs">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="h-4 w-4 text-green-500" />
                    <h3 className="font-bold text-green-600">Dropoff Location</h3>
                  </div>
                  <p className="font-semibold">{dropoffLocation.name}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {booking.persons}
                    </span>
                    <span>•</span>
                    <span>{booking.bags} bags</span>
                  </div>
                </div>
              </InfoWindow>
            )}

            {/* Route Polyline */}
            {directionsPath.length > 0 && (
              <Polyline
                path={directionsPath}
                options={{
                  strokeColor: "#3B82F6",
                  strokeOpacity: 0.8,
                  strokeWeight: 4,
                }}
              />
            )}
          </GoogleMap>

          {/* Map Controls */}
          <div className="absolute top-4 right-4 space-y-2">
            <Button
              size="sm"
              variant="secondary"
              className="bg-white shadow-lg"
              onClick={() => {
                if (driverLocation && mapRef.current) {
                  mapRef.current.panTo({ lat: driverLocation.latitude, lng: driverLocation.longitude });
                  mapRef.current.setZoom(15);
                }
              }}
            >
              <Car className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="bg-white shadow-lg"
              onClick={() => {
                if (pickupLocation && dropoffLocation && mapRef.current) {
                  const bounds = new window.google.maps.LatLngBounds();
                  bounds.extend({ lat: pickupLocation.latitude, lng: pickupLocation.longitude });
                  bounds.extend({ lat: dropoffLocation.latitude, lng: dropoffLocation.longitude });
                  if (driverLocation) {
                    bounds.extend({ lat: driverLocation.latitude, lng: driverLocation.longitude });
                  }
                  mapRef.current.fitBounds(bounds);
                }
              }}
            >
              <MapPin className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="bg-white shadow-lg"
              onClick={() => {
                fetchMapData();
                calculateRealTimeETA();
              }}
              disabled={loading}
            >
              <div className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16" />
                </svg>
              </div>
            </Button>
          </div>
        </div>


      </CardContent>
    </Card>
  );
} 