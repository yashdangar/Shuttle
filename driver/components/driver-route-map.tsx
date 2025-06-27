"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Navigation, Users, CheckCircle, Clock, Plane } from "lucide-react";
import { useJsApiLoader, GoogleMap, Marker, InfoWindow, Polyline, Polygon } from "@react-google-maps/api";
import { api } from "@/lib/api";
import { 
  isDriverInAirportBoundary, 
  getDriverTerminalArea, 
  getAirportBoundaryForMap, 
  getTerminalAreasForMap,
  isDriverApproachingAirport 
} from "@/lib/airportBoundary";
import { toast } from "sonner";

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
  pickupLocation?: {
    latitude: number;
    longitude: number;
    name: string;
  };
  dropoffLocation?: {
    latitude: number;
    longitude: number;
    name: string;
  };
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
  lat: 19.0896, // Airport center (Terminal 1)
  lng: 72.8656,
};

export default function DriverRouteMap({ 
  passengers, 
  currentTrip, 
  height = "400px" 
}: DriverRouteMapProps) {
  const [driverLocation, setDriverLocation] = useState<Location | null>(null);
  const [pickupLocations, setPickupLocations] = useState<Array<Location & { passenger: Passenger }>>([]);
  const [dropoffLocations, setDropoffLocations] = useState<Array<Location & { passenger: Passenger }>>([]);
  const [hotelLocation, setHotelLocation] = useState<Location | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPassenger, setSelectedPassenger] = useState<Passenger | null>(null);
  const [activeInfoWindow, setActiveInfoWindow] = useState<string | null>(null);
  const [isInAirportBoundary, setIsInAirportBoundary] = useState(false);
  const [terminalArea, setTerminalArea] = useState<string | null>(null);
  const [isApproachingAirport, setIsApproachingAirport] = useState(false);
  const [lastBoundaryCheck, setLastBoundaryCheck] = useState<Date | null>(null);
  const [userInteractedWithMap, setUserInteractedWithMap] = useState(false);
  const [lastUserInteraction, setLastUserInteraction] = useState<Date | null>(null);
  const [autoFollowDriver, setAutoFollowDriver] = useState(true);
  const mapRef = useRef<google.maps.Map | null>(null);
  const locationCheckInterval = useRef<NodeJS.Timeout | null>(null);

  // Load Google Maps JS API
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
  });

  console.log('Google Maps API Status:', { isLoaded, loadError, apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? 'Set' : 'Not Set' });

  // Function to check airport boundary and handle trip transitions
  const checkAirportBoundary = async (location: Location) => {
    const driverCoords = { lat: location.latitude, lng: location.longitude };
    const wasInAirport = isInAirportBoundary;
    const isNowInAirport = isDriverInAirportBoundary(driverCoords);
    const currentTerminalArea = getDriverTerminalArea(driverCoords);
    const approaching = isDriverApproachingAirport(driverCoords);

    setIsInAirportBoundary(isNowInAirport);
    setTerminalArea(currentTerminalArea);
    setIsApproachingAirport(approaching);

    // Only trigger transitions if we have a current trip and enough time has passed since last check
    if (currentTrip && (!lastBoundaryCheck || Date.now() - lastBoundaryCheck.getTime() > 10000)) {
      setLastBoundaryCheck(new Date());

      if (isNowInAirport && !wasInAirport) {
        // Driver entered airport boundary
        console.log('🚁 Driver entered airport boundary');
        
        if (currentTrip.direction === 'HOTEL_TO_AIRPORT' && currentTrip.phase === 'OUTBOUND') {
          // Automatically transition to RETURN phase
          try {
            console.log('🔄 Automatically transitioning to RETURN phase');
            await api.post(`/trips/${currentTrip.id}/transition`, { phase: 'RETURN' });
            
            toast.success("Outbound trip completed!", {
              description: "Return trip has started automatically",
            });
            
            // Refresh trip data
            setTimeout(() => {
              window.location.reload();
            }, 2000);
          } catch (error) {
            console.error('Error transitioning trip phase:', error);
            toast.error("Failed to transition trip phase", {
              description: "Please manually end the outbound trip",
            });
          }
        }
      } else if (!isNowInAirport && wasInAirport) {
        // Driver left airport boundary
        console.log('🚗 Driver left airport boundary');
        
        if (currentTrip.direction === 'AIRPORT_TO_HOTEL' && currentTrip.phase === 'OUTBOUND') {
          // For airport to hotel trips, we don't auto-transition when leaving airport
          // The driver should manually end the trip when they reach the hotel
          console.log('📍 Driver left airport - outbound trip continues to hotel');
        }
      }
    }
  };

  // Fetch driver location and setup locations based on trip direction
  const fetchMapData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get driver's current location
      const driverResponse = await api.get('/driver/current-location');
      if (driverResponse.location) {
        const newDriverLocation = {
          latitude: driverResponse.location.latitude,
          longitude: driverResponse.location.longitude,
          name: "Driver Location"
        };
        setDriverLocation(newDriverLocation);
        
        // Check airport boundary immediately
        await checkAirportBoundary(newDriverLocation);
      }

      // Get current trip data with hotel information
      const tripResponse = await api.get('/trips/current');
      if (tripResponse.currentTrip) {
        const trip = tripResponse.currentTrip;
        const direction = trip.direction;
        
        console.log('Trip direction:', direction);
        console.log('Passengers with locations:', passengers);
        
        // Get hotel location if available
        let currentHotelLocation = null;
        if (trip.shuttle?.hotelId) {
          try {
            const hotelResponse = await api.get(`/driver/hotel-location/${trip.shuttle.hotelId}`);
            if (hotelResponse.hotel && hotelResponse.hotel.latitude && hotelResponse.hotel.longitude) {
              currentHotelLocation = {
                latitude: hotelResponse.hotel.latitude,
                longitude: hotelResponse.hotel.longitude,
                name: hotelResponse.hotel.name || 'Hotel'
              };
              setHotelLocation(currentHotelLocation);
              console.log('Hotel location found:', currentHotelLocation);
            }
          } catch (hotelErr) {
            console.error('Error fetching hotel location:', hotelErr);
          }
        }

        // Setup locations based on trip direction using actual booking data
        const pickupLocs: Array<Location & { passenger: Passenger }> = [];
        const dropoffLocs: Array<Location & { passenger: Passenger }> = [];

        if (direction === 'HOTEL_TO_AIRPORT') {
          console.log('Setting up HOTEL_TO_AIRPORT locations');
          
          // Pickup: Hotel location (use hotel location for all passengers)
          if (currentHotelLocation) {
            passengers.forEach((passenger) => {
              pickupLocs.push({
                latitude: currentHotelLocation.latitude,
                longitude: currentHotelLocation.longitude,
                name: currentHotelLocation.name,
                passenger
              });
            });
          } else {
            // Fallback hotel location (Mumbai area)
            passengers.forEach((passenger) => {
              pickupLocs.push({
                latitude: 19.0760 + (Math.random() * 0.01),
                longitude: 72.8777 + (Math.random() * 0.01),
                name: 'Hotel',
                passenger
              });
            });
          }

          // Dropoff: Use actual dropoff locations from booking data
          passengers.forEach((passenger) => {
            if (passenger.dropoffLocation && passenger.dropoffLocation.latitude && passenger.dropoffLocation.longitude) {
              console.log(`Using actual dropoff location for ${passenger.name}:`, passenger.dropoffLocation);
              dropoffLocs.push({
                latitude: passenger.dropoffLocation.latitude,
                longitude: passenger.dropoffLocation.longitude,
                name: passenger.dropoffLocation.name,
                passenger
              });
            } else {
              // Fallback to airport area if no specific location
              console.log(`No dropoff location for ${passenger.name}, using fallback`);
              dropoffLocs.push({
                latitude: 19.0896 + (Math.random() * 0.01),
                longitude: 72.8656 + (Math.random() * 0.01),
                name: passenger.dropoff || 'Airport',
                passenger
              });
            }
          });
        } else if (direction === 'AIRPORT_TO_HOTEL') {
          console.log('Setting up AIRPORT_TO_HOTEL locations');
          
          // Pickup: Use actual pickup locations from booking data
          passengers.forEach((passenger) => {
            if (passenger.pickupLocation && passenger.pickupLocation.latitude && passenger.pickupLocation.longitude) {
              console.log(`Using actual pickup location for ${passenger.name}:`, passenger.pickupLocation);
              pickupLocs.push({
                latitude: passenger.pickupLocation.latitude,
                longitude: passenger.pickupLocation.longitude,
                name: passenger.pickupLocation.name,
                passenger
              });
            } else {
              // Fallback to airport area if no specific location
              console.log(`No pickup location for ${passenger.name}, using fallback`);
              pickupLocs.push({
                latitude: 19.0896 + (Math.random() * 0.01),
                longitude: 72.8656 + (Math.random() * 0.01),
                name: passenger.pickup || 'Airport',
                passenger
              });
            }
          });

          // Dropoff: Hotel location (use hotel location for all passengers)
          if (currentHotelLocation) {
            passengers.forEach((passenger) => {
              dropoffLocs.push({
                latitude: currentHotelLocation.latitude,
                longitude: currentHotelLocation.longitude,
                name: currentHotelLocation.name,
                passenger
              });
            });
          } else {
            // Fallback hotel location
            passengers.forEach((passenger) => {
              dropoffLocs.push({
                latitude: 19.0760 + (Math.random() * 0.01),
                longitude: 72.8777 + (Math.random() * 0.01),
                name: 'Hotel',
                passenger
              });
            });
          }
        }

        console.log('Pickup locations:', pickupLocs);
        console.log('Dropoff locations:', dropoffLocs);

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

  // Set up periodic location checking for airport boundary detection
  useEffect(() => {
    if (currentTrip && driverLocation) {
      // Check location every 30 seconds for boundary detection
      locationCheckInterval.current = setInterval(async () => {
        try {
          const driverResponse = await api.get('/driver/current-location');
          if (driverResponse.location) {
            const newLocation = {
              latitude: driverResponse.location.latitude,
              longitude: driverResponse.location.longitude,
              name: "Driver Location"
            };
            setDriverLocation(newLocation);
            await checkAirportBoundary(newLocation);
            
            // Only auto-follow driver if user hasn't interacted with map recently
            // and auto-follow is enabled
            if (autoFollowDriver && (!lastUserInteraction || Date.now() - lastUserInteraction.getTime() > 60000)) {
              if (mapRef.current) {
                mapRef.current.panTo({ lat: newLocation.latitude, lng: newLocation.longitude });
              }
            }
          }
        } catch (error) {
          console.error('Error updating driver location:', error);
        }
      }, 30000); // 30 seconds
    }

    return () => {
      if (locationCheckInterval.current) {
        clearInterval(locationCheckInterval.current);
      }
    };
  }, [currentTrip, driverLocation, autoFollowDriver, lastUserInteraction]);

  useEffect(() => {
    if (passengers && passengers.length > 0 && currentTrip) {
      fetchMapData();
    }
  }, [passengers, currentTrip]);

  // Center map on driver or first pickup location
  const center = driverLocation
    ? { lat: driverLocation.latitude, lng: driverLocation.longitude }
    : pickupLocations && pickupLocations.length > 0
    ? { lat: pickupLocations[0].latitude, lng: pickupLocations[0].longitude }
    : defaultCenter;

  const onLoad = (map: google.maps.Map) => {
    mapRef.current = map;
    
    // Add event listeners for user interaction
    map.addListener('dragstart', () => {
      setUserInteractedWithMap(true);
      setLastUserInteraction(new Date());
      console.log('User started dragging map');
    });
    
    map.addListener('zoom_changed', () => {
      setUserInteractedWithMap(true);
      setLastUserInteraction(new Date());
      console.log('User changed zoom level');
    });
    
    map.addListener('click', () => {
      setUserInteractedWithMap(true);
      setLastUserInteraction(new Date());
      console.log('User clicked on map');
    });
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
    } else if (type === 'dropoff') {
      // Use a more visible icon for dropoff locations
      return `${baseUrl}ltblue-pushpin.png`;
    }
    
    return `${baseUrl}red-dot.png`;
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

  if (!passengers || passengers.length === 0) {
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
          {currentTrip?.direction && (
            <Badge variant="secondary" className="ml-2">
              {currentTrip.direction === 'HOTEL_TO_AIRPORT' ? 'Hotel → Airport' : 'Airport → Hotel'}
            </Badge>
          )}
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
            <div className="w-3 h-3 bg-cyan-500 rounded-full mr-1"></div>
            Dropoff
          </Badge>
          <Badge variant="outline" className="text-xs">
            <div className="w-3 h-3 bg-purple-500 rounded-full mr-1"></div>
            Airport
          </Badge>
        </div>
        
        {/* Airport Boundary Status */}
        {(isInAirportBoundary || isApproachingAirport) && (
          <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-950 rounded-lg">
            <div className="flex items-center gap-2">
              <Plane className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                {isInAirportBoundary 
                  ? `In Airport Boundary${terminalArea ? ` (${terminalArea})` : ''}`
                  : 'Approaching Airport'
                }
              </span>
            </div>
          </div>
        )}
        
        {/* Auto-follow Status */}
        <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Navigation className={`h-4 w-4 ${autoFollowDriver ? 'text-green-600' : 'text-gray-400'}`} />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Auto-follow: {autoFollowDriver ? 'ON' : 'OFF'}
              </span>
            </div>
            {userInteractedWithMap && (
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <span className="text-xs text-gray-500">Manual control</span>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <GoogleMap
            mapContainerStyle={containerStyle}
            center={center}
            zoom={15}
            onLoad={onLoad}
            onUnmount={onUnmount}
            options={{
              zoomControl: true,
              streetViewControl: false,
              mapTypeControl: true,
              fullscreenControl: true,
            }}
          >
            {/* Airport Boundary Polygon */}
            <Polygon
              paths={getAirportBoundaryForMap()}
              options={{
                fillColor: "#3B82F6",
                fillOpacity: 0.3,
                strokeColor: "#1D4ED8",
                strokeOpacity: 1.0,
                strokeWeight: 3,
              }}
            />

            {/* Terminal Areas */}
            {getTerminalAreasForMap().terminal1 && (
              <Polygon
                paths={getTerminalAreasForMap().terminal1}
                options={{
                  fillColor: "#10B981",
                  fillOpacity: 0.4,
                  strokeColor: "#059669",
                  strokeOpacity: 1.0,
                  strokeWeight: 2,
                }}
              />
            )}

            {getTerminalAreasForMap().terminal2 && (
              <Polygon
                paths={getTerminalAreasForMap().terminal2}
                options={{
                  fillColor: "#F59E0B",
                  fillOpacity: 0.4,
                  strokeColor: "#D97706",
                  strokeOpacity: 1.0,
                  strokeWeight: 2,
                }}
              />
            )}

            {/* Airport Center Marker for reference */}
            <Marker
              position={{ lat: 19.0896, lng: 72.8656 }}
              title="Airport Center (Terminal 1)"
              icon="https://maps.google.com/mapfiles/ms/icons/airport.png"
            />

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
              console.log(`Rendering pickup marker for ${location.passenger.name} at:`, location.latitude, location.longitude);
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
            {dropoffLocations.map((location, index) => {
              const markerId = `dropoff-${location.passenger.id}`;
              console.log(`Rendering dropoff marker for ${location.passenger.name} at:`, location.latitude, location.longitude);
              
              // Add validation to ensure coordinates are valid
              if (!location.latitude || !location.longitude || 
                  isNaN(location.latitude) || isNaN(location.longitude)) {
                console.error(`Invalid coordinates for dropoff marker ${location.passenger.name}:`, location);
                return null;
              }
              
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

            {/* Test marker to verify map is working */}
            {process.env.NODE_ENV === 'development' && (
              <Marker
                position={{ lat: 19.0760, lng: 72.8777 }}
                title="Test Marker - Mumbai"
                icon="https://maps.google.com/mapfiles/ms/icons/red-dot.png"
              />
            )}

            {/* Info Windows */}
            {activeInfoWindow === 'driver' && driverLocation && (
              <InfoWindow
                position={{ lat: driverLocation.latitude, lng: driverLocation.longitude }}
                onCloseClick={() => setActiveInfoWindow(null)}
              >
                <div className="p-2">
                  <h3 className="font-bold text-blue-600">🚗 Driver Location</h3>
                  <p className="text-sm">Current position</p>
                  {isInAirportBoundary && (
                    <p className="text-sm text-green-600 mt-1">
                      ✓ In Airport Boundary{terminalArea ? ` (${terminalArea})` : ''}
                    </p>
                  )}
                  {isApproachingAirport && !isInAirportBoundary && (
                    <p className="text-sm text-yellow-600 mt-1">
                      ⚠ Approaching Airport
                    </p>
                  )}
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
          </GoogleMap>

          {/* Map Controls */}
          <div className="absolute top-4 right-4 space-y-2">
            <Button
              size="sm"
              variant={autoFollowDriver ? "default" : "secondary"}
              className={`shadow-lg ${autoFollowDriver ? 'bg-blue-500 text-white' : 'bg-white'}`}
              onClick={() => {
                setAutoFollowDriver(!autoFollowDriver);
                if (!autoFollowDriver) {
                  // When enabling auto-follow, immediately follow driver
                  if (driverLocation && mapRef.current) {
                    mapRef.current.panTo({ lat: driverLocation.latitude, lng: driverLocation.longitude });
                    mapRef.current.setZoom(15);
                  }
                }
                toast.info(autoFollowDriver ? "Auto-follow disabled" : "Auto-follow enabled", {
                  description: autoFollowDriver ? "Map will stay in place" : "Map will follow your location"
                });
              }}
            >
              <Navigation className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="bg-white shadow-lg"
              onClick={() => {
                if (driverLocation && mapRef.current) {
                  mapRef.current.panTo({ lat: driverLocation.latitude, lng: driverLocation.longitude });
                  mapRef.current.setZoom(15);
                  setLastUserInteraction(null); // Reset user interaction to allow auto-follow
                }
              }}
            >
              <div className="h-4 w-4">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
              </div>
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="bg-white shadow-lg"
              onClick={() => {
                if (mapRef.current) {
                  mapRef.current.panTo({ lat: 19.0896, lng: 72.8656 });
                  mapRef.current.setZoom(16);
                  setLastUserInteraction(new Date()); // Mark as user interaction
                }
              }}
            >
              <Plane className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="bg-white shadow-lg"
              onClick={() => {
                if (pickupLocations && pickupLocations.length > 0 && mapRef.current) {
                  const bounds = new window.google.maps.LatLngBounds();
                  pickupLocations.forEach(loc => {
                    bounds.extend({ lat: loc.latitude, lng: loc.longitude });
                  });
                  if (dropoffLocations) {
                    dropoffLocations.forEach(loc => {
                      bounds.extend({ lat: loc.latitude, lng: loc.longitude });
                    });
                  }
                  if (driverLocation) {
                    bounds.extend({ lat: driverLocation.latitude, lng: driverLocation.longitude });
                  }
                  mapRef.current.fitBounds(bounds);
                  setLastUserInteraction(new Date()); // Mark as user interaction
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
            {process.env.NODE_ENV === 'development' && (
              <Button
                size="sm"
                variant="destructive"
                className="bg-white shadow-lg"
                onClick={() => {
                  console.log('Current state:', {
                    pickupLocations,
                    dropoffLocations,
                    driverLocation,
                    hotelLocation,
                    currentTrip,
                    isInAirportBoundary,
                    terminalArea,
                    isApproachingAirport,
                    airportBoundary: getAirportBoundaryForMap(),
                    terminalAreas: getTerminalAreasForMap(),
                    autoFollowDriver,
                    userInteractedWithMap,
                    lastUserInteraction
                  });
                }}
              >
                Debug
              </Button>
            )}
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

        {/* Debug Info */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg text-xs">
            <h4 className="font-bold mb-2">Debug Info:</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p><strong>Pickup Locations:</strong> {pickupLocations.length}</p>
                <p><strong>Dropoff Locations:</strong> {dropoffLocations.length}</p>
                <p><strong>Driver Location:</strong> {driverLocation ? 'Yes' : 'No'}</p>
                <p><strong>Hotel Location:</strong> {hotelLocation ? 'Yes' : 'No'}</p>
              </div>
              <div>
                <p><strong>Trip Direction:</strong> {currentTrip?.direction || 'None'}</p>
                <p><strong>Passengers:</strong> {passengers?.length || 0}</p>
                <p><strong>Loading:</strong> {loading ? 'Yes' : 'No'}</p>
                <p><strong>Error:</strong> {error || 'None'}</p>
              </div>
            </div>
            <div className="mt-2">
              <p><strong>Airport Boundary:</strong> {isInAirportBoundary ? 'Yes' : 'No'}</p>
              <p><strong>Terminal Area:</strong> {terminalArea || 'None'}</p>
              <p><strong>Approaching Airport:</strong> {isApproachingAirport ? 'Yes' : 'No'}</p>
            </div>
            <div className="mt-2">
              <p><strong>Auto-follow:</strong> {autoFollowDriver ? 'ON' : 'OFF'}</p>
              <p><strong>User Interacted:</strong> {userInteractedWithMap ? 'Yes' : 'No'}</p>
              <p><strong>Last Interaction:</strong> {lastUserInteraction ? lastUserInteraction.toLocaleTimeString() : 'None'}</p>
            </div>
            <div className="mt-2">
              <p><strong>Airport Boundary Coordinates:</strong></p>
              <p className="ml-2 text-xs font-mono">
                {getAirportBoundaryForMap().map((coord, i) => 
                  `${i}: ${coord.lat.toFixed(4)}, ${coord.lng.toFixed(4)}`
                ).join(', ')}
              </p>
            </div>
            {pickupLocations.length > 0 && (
              <div className="mt-2">
                <p><strong>Pickup Coords:</strong></p>
                {pickupLocations.map((loc, i) => (
                  <p key={i} className="ml-2">
                    {loc.passenger.name}: {loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)} ({loc.name})
                  </p>
                ))}
              </div>
            )}
            {dropoffLocations.length > 0 && (
              <div className="mt-2">
                <p><strong>Dropoff Coords:</strong></p>
                {dropoffLocations.map((loc, i) => (
                  <p key={i} className="ml-2">
                    {loc.passenger.name}: {loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)} ({loc.name})
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 