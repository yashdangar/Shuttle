"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Navigation, Users, CheckCircle, Clock } from "lucide-react";
import { useJsApiLoader, GoogleMap, Marker, InfoWindow, Polyline } from "@react-google-maps/api";
import { api } from "@/lib/api";

interface Location {
  latitude: number;
  longitude: number;
  name: string;
}

interface Passenger {
  id: string;
  name: string;
  pickup: string;
  dropoff: string;
  persons: number;
  bags: number;
  isVerified: boolean;
  seatNumber?: string;
}

interface DriverRouteMapProps {
  passengers: Passenger[];
  currentTrip: any;
  height?: string;
}

const containerStyle = {
  width: "100%",
  height: "400px",
};

const defaultCenter = {
  lat: 19.0760, // Mumbai as fallback
  lng: 72.8777,
};

export default function DriverRouteMap({ 
  passengers, 
  currentTrip, 
  height = "400px" 
}: DriverRouteMapProps) {
  const [driverLocation, setDriverLocation] = useState<Location | null>(null);
  const [pickupLocations, setPickupLocations] = useState<Array<Location & { passenger: Passenger }>>([]);
  const [dropoffLocations, setDropoffLocations] = useState<Array<Location & { passenger: Passenger }>>([]);
  const [directionsPath, setDirectionsPath] = useState<Array<{ lat: number; lng: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPassenger, setSelectedPassenger] = useState<Passenger | null>(null);
  const [activeInfoWindow, setActiveInfoWindow] = useState<string | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);

  // Load Google Maps JS API
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
  });

  console.log('Google Maps API Status:', { isLoaded, loadError, apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? 'Set' : 'Not Set' });

  // Fetch driver location and booking locations
  const fetchMapData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get driver's current location
      const driverResponse = await api.get('/driver/current-location');
      if (driverResponse.location) {
        setDriverLocation({
          latitude: driverResponse.location.latitude,
          longitude: driverResponse.location.longitude,
          name: "Driver Location"
        });
      }

      // Get booking details with location information
      const bookingResponse = await api.get('/driver/current-trip');
      if (bookingResponse.currentTrip?.passengers) {
        const pickupLocs: Array<Location & { passenger: Passenger }> = [];
        const dropoffLocs: Array<Location & { passenger: Passenger }> = [];

        // Process each passenger's booking to get real locations
        for (const passenger of bookingResponse.currentTrip.passengers) {
          try {
            // Get booking details with location information
            const bookingDetails = await api.get(`/driver/booking/${passenger.id}/tracking`);
            
            // Handle pickup location
            if (bookingDetails.tracking?.pickupLocation) {
              pickupLocs.push({
                latitude: bookingDetails.tracking.pickupLocation.latitude,
                longitude: bookingDetails.tracking.pickupLocation.longitude,
                name: passenger.pickup,
                passenger
              });
            } else {
              // If no pickup location, use hotel location
              const hotelLocation = await api.get(`/driver/hotel-location/${bookingResponse.currentTrip?.schedule?.shuttle?.hotelId}`);
              if (hotelLocation.hotel) {
                pickupLocs.push({
                  latitude: hotelLocation.hotel.latitude,
                  longitude: hotelLocation.hotel.longitude,
                  name: `${hotelLocation.hotel.name} (Hotel)`,
                  passenger
                });
              }
            }

            // Handle dropoff location
            if (bookingDetails.tracking?.dropoffLocation) {
              dropoffLocs.push({
                latitude: bookingDetails.tracking.dropoffLocation.latitude,
                longitude: bookingDetails.tracking.dropoffLocation.longitude,
                name: passenger.dropoff,
                passenger
              });
            } else {
              // If no dropoff location, use hotel location
              const hotelLocation = await api.get(`/driver/hotel-location/${bookingResponse.currentTrip?.schedule?.shuttle?.hotelId}`);
              if (hotelLocation.hotel) {
                dropoffLocs.push({
                  latitude: hotelLocation.hotel.latitude,
                  longitude: hotelLocation.hotel.longitude,
                  name: `${hotelLocation.hotel.name} (Hotel)`,
                  passenger
                });
              }
            }
          } catch (err) {
            console.error(`Error fetching location for passenger ${passenger.id}:`, err);
            // Fallback to placeholder coordinates if location fetch fails
            const baseLat = 19.0760 + (Math.random() * 0.01);
            const baseLng = 72.8777 + (Math.random() * 0.01);
            
            pickupLocs.push({
              latitude: baseLat,
              longitude: baseLng,
              name: passenger.pickup,
              passenger
            });

            dropoffLocs.push({
              latitude: baseLat + 0.005,
              longitude: baseLng + 0.005,
              name: passenger.dropoff,
              passenger
            });
          }
        }

        setPickupLocations(pickupLocs);
        setDropoffLocations(dropoffLocs);
      }

    } catch (err) {
      setError("Could not load map data");
      console.error("Error fetching map data:", err);
      
      // Fallback to placeholder coordinates
      const pickupLocs: Array<Location & { passenger: Passenger }> = [];
      const dropoffLocs: Array<Location & { passenger: Passenger }> = [];

      passengers.forEach((passenger, index) => {
        const baseLat = 19.0760 + (index * 0.01);
        const baseLng = 72.8777 + (index * 0.01);

        pickupLocs.push({
          latitude: baseLat,
          longitude: baseLng,
          name: passenger.pickup,
          passenger
        });

        dropoffLocs.push({
          latitude: baseLat + 0.005,
          longitude: baseLng + 0.005,
          name: passenger.dropoff,
          passenger
        });
      });

      setPickupLocations(pickupLocs);
      setDropoffLocations(dropoffLocs);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (passengers.length > 0) {
      fetchMapData();
    }
  }, [passengers]);

  // Center map on driver or first pickup location
  const center = driverLocation
    ? { lat: driverLocation.latitude, lng: driverLocation.longitude }
    : pickupLocations.length > 0
    ? { lat: pickupLocations[0].latitude, lng: pickupLocations[0].longitude }
    : defaultCenter;

  const onLoad = (map: google.maps.Map) => {
    mapRef.current = map;
  };

  const onUnmount = () => {
    mapRef.current = null;
  };

  const getMarkerIcon = (type: 'driver' | 'pickup' | 'dropoff', isVerified?: boolean, isNext?: boolean) => {
    const baseUrl = 'https://maps.google.com/mapfiles/ms/icons/';
    
    if (type === 'driver') {
      return `${baseUrl}blue-dot.png`;
    } else if (type === 'pickup') {
      if (isNext) return `${baseUrl}yellow-dot.png`;
      if (isVerified) return `${baseUrl}green-dot.png`;
      return `${baseUrl}red-dot.png`;
    } else {
      return `${baseUrl}purple-dot.png`;
    }
  };

  const getMarkerTitle = (type: 'driver' | 'pickup' | 'dropoff', passenger?: Passenger) => {
    if (type === 'driver') return 'Driver Location';
    if (type === 'pickup') return `Pickup: ${passenger?.name} - ${passenger?.pickup}`;
    return `Dropoff: ${passenger?.name} - ${passenger?.dropoff}`;
  };

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
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

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

  if (passengers.length === 0) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-gray-600" />
            Route Map
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="aspect-video bg-muted rounded-xl flex items-center justify-center">
            <div className="text-center">
              <MapPin className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium text-gray-600">No Active Bookings</p>
              <p className="text-sm text-gray-500 mt-2">No passengers to display on the map</p>
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
          Route Map
        </CardTitle>
        <div className="flex flex-wrap gap-2 mt-2">
          <Badge variant="outline" className="text-xs">
            <div className="w-3 h-3 bg-blue-500 rounded-full mr-1"></div>
            Driver
          </Badge>
          <Badge variant="outline" className="text-xs">
            <div className="w-3 h-3 bg-yellow-500 rounded-full mr-1"></div>
            Next Pickup
          </Badge>
          <Badge variant="outline" className="text-xs">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-1"></div>
            Checked In
          </Badge>
          <Badge variant="outline" className="text-xs">
            <div className="w-3 h-3 bg-red-500 rounded-full mr-1"></div>
            Pending
          </Badge>
          <Badge variant="outline" className="text-xs">
            <div className="w-3 h-3 bg-purple-500 rounded-full mr-1"></div>
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
              <Marker
                position={{ lat: driverLocation.latitude, lng: driverLocation.longitude }}
                icon={getMarkerIcon('driver')}
                title={getMarkerTitle('driver')}
                onClick={() => setActiveInfoWindow('driver')}
              />
            )}

            {/* Pickup Location Markers */}
            {pickupLocations.map((location, index) => {
              const isNext = index === 0 && !location.passenger.isVerified;
              const markerId = `pickup-${location.passenger.id}`;
              return (
                <Marker
                  key={markerId}
                  position={{ lat: location.latitude, lng: location.longitude }}
                  icon={getMarkerIcon('pickup', location.passenger.isVerified, isNext)}
                  title={getMarkerTitle('pickup', location.passenger)}
                  onClick={() => {
                    setActiveInfoWindow(markerId);
                    setSelectedPassenger(location.passenger);
                  }}
                />
              );
            })}

            {/* Dropoff Location Markers */}
            {dropoffLocations.map((location) => {
              const markerId = `dropoff-${location.passenger.id}`;
              return (
                <Marker
                  key={markerId}
                  position={{ lat: location.latitude, lng: location.longitude }}
                  icon={getMarkerIcon('dropoff')}
                  title={getMarkerTitle('dropoff', location.passenger)}
                  onClick={() => {
                    setActiveInfoWindow(markerId);
                    setSelectedPassenger(location.passenger);
                  }}
                />
              );
            })}

            {/* Info Windows */}
            {activeInfoWindow === 'driver' && driverLocation && (
              <InfoWindow
                position={{ lat: driverLocation.latitude, lng: driverLocation.longitude }}
                onCloseClick={() => setActiveInfoWindow(null)}
              >
                <div className="p-2">
                  <h3 className="font-bold text-blue-600">🚗 Driver Location</h3>
                  <p className="text-sm">Current position</p>
                </div>
              </InfoWindow>
            )}

            {pickupLocations.map((location, index) => {
              const isNext = index === 0 && !location.passenger.isVerified;
              const markerId = `pickup-${location.passenger.id}`;
              
              if (activeInfoWindow === markerId) {
                return (
                  <InfoWindow
                    key={markerId}
                    position={{ lat: location.latitude, lng: location.longitude }}
                    onCloseClick={() => setActiveInfoWindow(null)}
                  >
                    <div className="p-2 max-w-xs">
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin className="h-4 w-4 text-red-500" />
                        <h3 className="font-bold text-red-600">Pickup</h3>
                        {isNext && <Badge className="bg-yellow-500 text-white text-xs">NEXT</Badge>}
                        {location.passenger.isVerified && <CheckCircle className="h-4 w-4 text-green-500" />}
                      </div>
                      <p className="font-semibold">{location.passenger.name}</p>
                      <p className="text-sm text-gray-600">{location.name}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {location.passenger.persons}
                        </span>
                        <span>•</span>
                        <span>{location.passenger.bags} bags</span>
                        {location.passenger.seatNumber && (
                          <>
                            <span>•</span>
                            <span>Seat {location.passenger.seatNumber}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </InfoWindow>
                );
              }
              return null;
            })}

            {dropoffLocations.map((location) => {
              const markerId = `dropoff-${location.passenger.id}`;
              
              if (activeInfoWindow === markerId) {
                return (
                  <InfoWindow
                    key={markerId}
                    position={{ lat: location.latitude, lng: location.longitude }}
                    onCloseClick={() => setActiveInfoWindow(null)}
                  >
                    <div className="p-2 max-w-xs">
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin className="h-4 w-4 text-purple-500" />
                        <h3 className="font-bold text-purple-600">Dropoff</h3>
                      </div>
                      <p className="font-semibold">{location.passenger.name}</p>
                      <p className="text-sm text-gray-600">{location.name}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {location.passenger.persons}
                        </span>
                        <span>•</span>
                        <span>{location.passenger.bags} bags</span>
                      </div>
                    </div>
                  </InfoWindow>
                );
              }
              return null;
            })}

            {/* Route Polyline (if we have directions) */}
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
              <Navigation className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="bg-white shadow-lg"
              onClick={() => {
                if (pickupLocations.length > 0 && mapRef.current) {
                  const bounds = new window.google.maps.LatLngBounds();
                  pickupLocations.forEach(loc => {
                    bounds.extend({ lat: loc.latitude, lng: loc.longitude });
                  });
                  dropoffLocations.forEach(loc => {
                    bounds.extend({ lat: loc.latitude, lng: loc.longitude });
                  });
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
              onClick={fetchMapData}
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

        {/* Selected Passenger Info */}
        {selectedPassenger && (
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg">{selectedPassenger.name}</h3>
                <p className="text-sm text-gray-600">
                  {selectedPassenger.pickup} → {selectedPassenger.dropoff}
                </p>
                <p className="text-sm text-gray-500">
                  {selectedPassenger.persons} passengers • {selectedPassenger.bags} bags
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedPassenger(null)}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 