"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Navigation, Users, CheckCircle, Clock, Wifi, WifiOff } from "lucide-react";
import { useJsApiLoader, GoogleMap, Marker, InfoWindow, Polyline, Polygon, Circle } from "@react-google-maps/api";
import { api } from "@/lib/api";
import { useWebSocket } from "@/context/WebSocketContext";
import { useIsMobile } from "@/hooks/use-mobile";

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
  const [userInteractedWithMap, setUserInteractedWithMap] = useState(false);
  const [lastUserInteraction, setLastUserInteraction] = useState<Date | null>(null);
  const [autoFollowDriver, setAutoFollowDriver] = useState(true);
  const [circleCenter, setCircleCenter] = useState<google.maps.LatLng | null>(null);
  const [isInCircleBoundary, setIsInCircleBoundary] = useState(false);
  const [lastCircleBoundaryCheck, setLastCircleBoundaryCheck] = useState<Date | null>(null);
  const [hasAttemptedTransition, setHasAttemptedTransition] = useState(false);
  const [isRealTimeTracking, setIsRealTimeTracking] = useState(false);
  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);
  const [locationSpeed, setLocationSpeed] = useState<number | null>(null);
  const [locationHeading, setLocationHeading] = useState<number | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const locationCheckInterval = useRef<NodeJS.Timeout | null>(null);
  const realTimeWatchId = useRef<number | null>(null);
  const { socket, isConnected } = useWebSocket();
  const isMobile = useIsMobile();

  // Load Google Maps JS API
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
  });

  console.log('Google Maps API Status:', { isLoaded, loadError, apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? 'Set' : 'Not Set' });

  // Function to calculate distance between two coordinates in meters
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lng2 - lng1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  // Test function to simulate driver movement for testing circle boundary
  const testCircleBoundary = async () => {
    if (!circleCenter) {
      toast.error("Circle center not available.");
      return;
    }

    // Simulate driver starting inside the circle
    const insideLocation: Location = {
      latitude: circleCenter.lat(),
      longitude: circleCenter.lng(),
      name: "Test Location Inside Circle"
    };
    
    console.log('🧪 Testing: Driver inside circle');
    await checkCircleBoundary(insideLocation);
    
    // Wait 2 seconds, then simulate driver moving outside the circle
    setTimeout(async () => {
      const outsideLocation: Location = {
        latitude: circleCenter.lat() + 0.01, // Move about 1km north
        longitude: circleCenter.lng() + 0.01, // Move about 1km east
        name: "Test Location Outside Circle"
      };
      
      console.log('🧪 Testing: Driver outside circle');
      await checkCircleBoundary(outsideLocation);
    }, 2000);
  };

  // Continuous simulation function that moves driver around and eventually out of circle
  const startContinuousSimulation = () => {
    if (!circleCenter) {
      toast.error("Circle center not available.");
      return;
    }

    let simulationActive = true;
    let step = 0;
    const totalSteps = 20; // Total simulation steps
    const stepInterval = 3000; // 3 seconds between each movement

    toast.info("Starting continuous simulation", {
      description: "Driver will move around and eventually exit the circle"
    });

    const simulationLoop = () => {
      if (!simulationActive) return;

      step++;
      console.log(`🧪 Simulation step ${step}/${totalSteps}`);

      // Calculate new position based on step
      const progress = step / totalSteps;
      const angle = progress * 2 * Math.PI; // Full circle
      const radius = 0.005 + (progress * 0.015); // Start close, move further out

      const newLat = circleCenter.lat() + (radius * Math.cos(angle));
      const newLng = circleCenter.lng() + (radius * Math.sin(angle));

      const newLocation: Location = {
        latitude: newLat,
        longitude: newLng,
        name: `Simulation Step ${step}`
      };

      // Update driver location
      setDriverLocation(newLocation);
      
      // Check circle boundary
      checkCircleBoundary(newLocation);

      // Calculate distance from circle center
      const distance = calculateDistance(
        newLat, 
        newLng, 
        circleCenter.lat(), 
        circleCenter.lng()
      );

      console.log(`📍 Driver at: ${newLat.toFixed(6)}, ${newLng.toFixed(6)}`);
      console.log(`📏 Distance from center: ${distance.toFixed(0)}m`);
      console.log(`🎯 Inside circle: ${distance <= 800 ? 'Yes' : 'No'}`);

      // Continue simulation if not finished
      if (step < totalSteps) {
        setTimeout(simulationLoop, stepInterval);
      } else {
        console.log('🏁 Simulation completed');
        toast.success("Simulation completed", {
          description: "Driver has moved through the entire path"
        });
      }
    };

    // Start the simulation
    simulationLoop();

    // Return function to stop simulation
    return () => {
      simulationActive = false;
      console.log('⏹️ Simulation stopped');
    };
  };

  // Start real-time location tracking
  const startRealTimeTracking = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by this browser");
      return;
    }

    if (realTimeWatchId.current) {
      // Already tracking
      return;
    }

    console.log('🚀 Starting real-time location tracking...');
    
    realTimeWatchId.current = navigator.geolocation.watchPosition(
      (position) => {
        const newLocation: Location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          name: "Driver Location (Real-time)"
        };

        console.log('📍 Real-time location update:', {
          lat: position.coords.latitude.toFixed(6),
          lng: position.coords.longitude.toFixed(6),
          accuracy: position.coords.accuracy,
          speed: position.coords.speed,
          heading: position.coords.heading
        });

        // Update location state
        setDriverLocation(newLocation);
        setLocationAccuracy(position.coords.accuracy);
        setLocationSpeed(position.coords.speed || null);
        setLocationHeading(position.coords.heading || null);

        // Check circle boundary
        checkCircleBoundary(newLocation);

        // Auto-follow driver if enabled and user hasn't interacted recently
        if (autoFollowDriver && (!lastUserInteraction || Date.now() - lastUserInteraction.getTime() > 30000)) {
          if (mapRef.current) {
            mapRef.current.panTo({ lat: newLocation.latitude, lng: newLocation.longitude });
          }
        }

        // Send location to server via WebSocket if connected
        if (socket && isConnected) {
          socket.emit('driver_location_update', {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            speed: position.coords.speed,
            heading: position.coords.heading,
            timestamp: new Date().toISOString()
          });
        }

        // Also send via API for backup
        api.post('/driver/update-location', {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          speed: position.coords.speed,
          heading: position.coords.heading
        }).catch(error => {
          console.log('API location update failed (this is normal if WebSocket is working):', error);
        });
      },
      (error) => {
        console.error('Real-time location tracking error:', error);
        let errorMessage = 'Location tracking error';
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
        toast.error(errorMessage);
        setIsRealTimeTracking(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000, // Accept cached positions up to 5 seconds old
      }
    );

    setIsRealTimeTracking(true);
    toast.success("Real-time location tracking started", {
      description: "Your location will update continuously"
    });
  };

  // Stop real-time location tracking
  const stopRealTimeTracking = () => {
    if (realTimeWatchId.current) {
      navigator.geolocation.clearWatch(realTimeWatchId.current);
      realTimeWatchId.current = null;
      setIsRealTimeTracking(false);
      toast.info("Real-time location tracking stopped");
    }
  };

  // Function to check if driver is within circle boundary
  const checkCircleBoundary = async (location: Location) => {
    if (!circleCenter) return;

    const driverCoords = { lat: location.latitude, lng: location.longitude };
    const circleRadius = 800; // 800 meters radius
    const distance = calculateDistance(
      driverCoords.lat, 
      driverCoords.lng, 
      circleCenter.lat(), 
      circleCenter.lng()
    );

    const wasInCircle = isInCircleBoundary;
    const isNowInCircle = distance <= circleRadius;

    console.log(`📍 Circle boundary check: Driver at ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`);
    console.log(`📏 Distance from center: ${distance.toFixed(0)}m, Inside circle: ${isNowInCircle}`);
    console.log(`🔄 State change: ${wasInCircle ? 'Inside' : 'Outside'} → ${isNowInCircle ? 'Inside' : 'Outside'}`);

    setIsInCircleBoundary(isNowInCircle);

    // Check if driver left circle boundary and trigger transition
    if (currentTrip && !isNowInCircle && wasInCircle) {
      // Driver left circle boundary
      console.log('🚗 Driver left circle boundary');
      console.log('Current trip direction:', currentTrip.direction);
      console.log('Current trip phase:', currentTrip.phase);
      console.log('Has attempted transition:', hasAttemptedTransition);
      
      // Only attempt transition if we haven't already tried for this circle exit
      if (!hasAttemptedTransition && currentTrip.phase === 'OUTBOUND') {
        setHasAttemptedTransition(true); // Mark that we've attempted transition
        
        // Automatically transition to RETURN phase
        try {
          console.log('🔄 Automatically transitioning to RETURN phase (circle exit)');
          await api.post(`/trips/${currentTrip.id}/transition`, { phase: 'RETURN' });
          
          toast.success("Outbound trip completed!", {
            description: "Return trip has started automatically (driver left circle boundary)",
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
          // Reset the flag so we can try again
          setHasAttemptedTransition(false);
        }
      } else if (hasAttemptedTransition) {
        console.log('⚠️ Already attempted transition for this circle exit');
      } else {
        console.log('⚠️ Trip is not in OUTBOUND phase, cannot transition automatically');
        console.log('Current phase:', currentTrip.phase);
      }
    } else if (currentTrip && isNowInCircle && !wasInCircle) {
      // Driver entered circle boundary - reset transition flag
      console.log('📍 Driver entered circle boundary');
      setHasAttemptedTransition(false); // Reset flag when entering circle
    }
  };



  // Fetch driver location and setup locations based on trip direction
  const fetchMapData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get driver's current location
      try {
        const driverResponse = await api.get('/driver/current-location');
        if (driverResponse.location) {
          const newDriverLocation = {
            latitude: driverResponse.location.latitude,
            longitude: driverResponse.location.longitude,
            name: "Driver Location"
          };
          setDriverLocation(newDriverLocation);
          
          // Check circle boundary immediately
          await checkCircleBoundary(newDriverLocation);
        }
      } catch (locationError) {
        console.log('Driver location not available yet:', locationError);
        // Don't set error for missing location - this is normal when driver hasn't started tracking
        // Set a default location for map display
        // For testing: Set driver location outside the circle
        const defaultLocation = {
          latitude: 21.2269956 + 0.01, // Outside the circle (about 1km north)
          longitude: 72.825646 + 0.01, // Outside the circle (about 1km east)
          name: "Test Location Outside Circle"
        };
        setDriverLocation(defaultLocation);
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

  // Set up periodic location checking for airport boundary detection (fallback)
  useEffect(() => {
    if (currentTrip && !isRealTimeTracking) {
      // Only use periodic checking if real-time tracking is not active
      // Check location every 10 seconds for boundary detection
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
            await checkCircleBoundary(newLocation);
            
            // Only auto-follow driver if user hasn't interacted with map recently
            // and auto-follow is enabled
            if (autoFollowDriver && (!lastUserInteraction || Date.now() - lastUserInteraction.getTime() > 60000)) {
              if (mapRef.current) {
                mapRef.current.panTo({ lat: newLocation.latitude, lng: newLocation.longitude });
              }
            }
          }
        } catch (error) {
          console.log('Driver location not available during periodic check:', error);
          // Don't treat this as an error - it's normal when driver hasn't started tracking
        }
      }, 10000); // 10 seconds (faster fallback)
    }

    return () => {
      if (locationCheckInterval.current) {
        clearInterval(locationCheckInterval.current);
      }
    };
  }, [currentTrip, autoFollowDriver, lastUserInteraction, isRealTimeTracking]);

  // Cleanup real-time tracking on unmount
  useEffect(() => {
    return () => {
      if (realTimeWatchId.current) {
        navigator.geolocation.clearWatch(realTimeWatchId.current);
      }
    };
  }, []);

  useEffect(() => {
    if (passengers && passengers.length > 0 && currentTrip) {
      fetchMapData();
    }
  }, [passengers, currentTrip]);

  // Check for initial circle boundary state when driver location is set
  useEffect(() => {
    if (driverLocation && currentTrip && !hasAttemptedTransition && currentTrip.phase === 'OUTBOUND') {
      // Check if driver is already outside circle boundary on initial load
      const distance = calculateDistance(
        driverLocation.latitude,
        driverLocation.longitude,
        circleCenter?.lat() || 0,
        circleCenter?.lng() || 0
      );
      
      const isOutsideCircle = distance > 800; // 800m radius
      
      console.log('🔍 Initial circle boundary check:');
      console.log(`📍 Driver at: ${driverLocation.latitude.toFixed(6)}, ${driverLocation.longitude.toFixed(6)}`);
      console.log(`📏 Distance from center: ${distance.toFixed(0)}m`);
      console.log(`🎯 Outside circle: ${isOutsideCircle}`);
      console.log(`🔄 Current boundary state: ${isInCircleBoundary ? 'Inside' : 'Outside'}`);
      
      if (isOutsideCircle && !isInCircleBoundary) {
        console.log('🚗 Driver already outside circle boundary on initial load');
        console.log('Current trip direction:', currentTrip.direction);
        console.log('Current trip phase:', currentTrip.phase);
        console.log('Has attempted transition:', hasAttemptedTransition);
        
        // Trigger transition immediately
        setHasAttemptedTransition(true);
        
        (async () => {
          try {
            console.log('🔄 Automatically transitioning to RETURN phase (initial circle exit)');
            await api.post(`/trips/${currentTrip.id}/transition`, { phase: 'RETURN' });
            
            toast.success("Outbound trip completed!", {
              description: "Return trip has started automatically (driver outside circle boundary)",
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
            // Reset the flag so we can try again
            setHasAttemptedTransition(false);
          }
        })();
      }
    }
  }, [driverLocation, currentTrip, hasAttemptedTransition, circleCenter, isInCircleBoundary]);

  // Center map on driver or first pickup location
  const center = driverLocation
    ? { lat: driverLocation.latitude, lng: driverLocation.longitude }
    : pickupLocations && pickupLocations.length > 0
    ? { lat: pickupLocations[0].latitude, lng: pickupLocations[0].longitude }
    : defaultCenter;

  const onLoad = (map: google.maps.Map) => {
    mapRef.current = map;
    
    // Initialize circle center with specified coordinates
    setCircleCenter(new google.maps.LatLng(21.2269956, 72.825646));
    
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
    
    map.addListener('click', (ev: google.maps.MapMouseEvent) => {
      setUserInteractedWithMap(true);
      setLastUserInteraction(new Date());
      console.log('User clicked on map at:', ev.latLng);
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
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
            Route Map
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="aspect-video bg-muted rounded-xl flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-sm sm:text-base font-medium text-gray-600">Loading Google Maps...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loadError) {
    return (
      <Card className="shadow-lg">
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
            Route Map
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="aspect-video bg-muted rounded-xl flex items-center justify-center">
            <div className="text-center">
              <MapPin className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-4 text-red-500" />
              <p className="text-base sm:text-lg font-medium text-red-600">Google Maps Error</p>
              <p className="text-xs sm:text-sm text-gray-600 mt-2">Failed to load Google Maps API</p>
              <p className="text-xs text-gray-500 mt-1">Please check your API key configuration</p>
              <Button 
                onClick={() => window.location.reload()}
                className="mt-4 text-xs sm:text-sm"
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

  if (loading) {
    return (
      <Card className="shadow-lg">
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
            Route Map
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="aspect-video bg-muted rounded-xl flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-sm sm:text-base font-medium text-gray-600">Loading map...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="shadow-lg">
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
            Route Map
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="aspect-video bg-muted rounded-xl flex items-center justify-center">
            <div className="text-center">
              <MapPin className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-4 text-red-500" />
              <p className="text-base sm:text-lg font-medium text-red-600">Error Loading Map</p>
              <p className="text-xs sm:text-sm text-gray-600">{error}</p>
              <Button 
                onClick={fetchMapData}
                className="mt-4 text-xs sm:text-sm"
                variant="outline"
                size={isMobile ? "sm" : "default"}
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
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600" />
            Route Map
          </CardTitle>
          <div className="flex flex-wrap gap-2 mt-2">
            <Badge variant="outline" className="text-xs">
              <div className="w-2 h-2 sm:w-3 sm:h-3 bg-blue-500 rounded-full mr-1"></div>
              Boundary Circle (800m)
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <GoogleMap
              mapContainerStyle={{ ...containerStyle, height }}
              center={{ lat: 21.2269956, lng: 72.825646 }}
              zoom={15}
              onLoad={onLoad}
              onUnmount={onUnmount}
              options={{
                zoomControl: true,
                streetViewControl: false,
                mapTypeControl: !isMobile,
                fullscreenControl: !isMobile,
              }}
            >
              {/* Boundary Circle - shows 800m radius around specified coordinates */}
              {circleCenter && (
                <Circle
                  center={circleCenter}
                  radius={800}
                  options={{
                    fillColor: "#3b82f6",
                    fillOpacity: 0.3,
                    strokeColor: "#0c4cb3",
                    strokeOpacity: 1,
                    strokeWeight: 3,
                  }}
                />
              )}
            </GoogleMap>
          </div>
          <div className="mt-4 p-3 sm:p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div className="text-center">
              <MapPin className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2 text-gray-400" />
              <p className="text-xs sm:text-sm font-medium text-gray-600">No Active Bookings</p>
              <p className="text-xs text-gray-500 mt-1">No passengers to display on the map</p>
            </div>
          </div>
          
          {/* Circle Boundary Status for No Bookings */}
          {circleCenter && (
            <div className="mt-2 p-2 bg-green-50 dark:bg-green-950 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 sm:w-3 sm:h-3 bg-blue-500 rounded-full"></div>
                <span className="text-xs sm:text-sm font-medium text-green-800 dark:text-green-200">
                  {isInCircleBoundary 
                    ? `In Circle Boundary (800m radius)`
                    : 'Outside Circle Boundary (800m radius)'
                  }
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg">
      <CardHeader className="pb-3 sm:pb-6">
        <CardTitle className="flex flex-col sm:flex-row sm:items-center gap-2 text-base sm:text-lg">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
            Route Map
          </div>
          {currentTrip?.direction && (
            <Badge variant="secondary" className="self-start sm:ml-2 text-xs">
              {currentTrip.direction === 'HOTEL_TO_AIRPORT' ? 'Hotel → Airport' : 'Airport → Hotel'}
            </Badge>
          )}
        </CardTitle>
        <div className="flex flex-wrap gap-1 sm:gap-2 mt-2">
          <Badge variant="outline" className="text-xs">
            <div className="w-2 h-2 sm:w-3 sm:h-3 bg-blue-500 rounded-full mr-1"></div>
            Driver
          </Badge>
          <Badge variant="outline" className="text-xs">
            <div className="w-2 h-2 sm:w-3 sm:h-3 bg-yellow-500 rounded-full mr-1"></div>
            Next Pickup
          </Badge>
          <Badge variant="outline" className="text-xs">
            <div className="w-2 h-2 sm:w-3 sm:h-3 bg-green-500 rounded-full mr-1"></div>
            Checked In
          </Badge>
          <Badge variant="outline" className="text-xs">
            <div className="w-2 h-2 sm:w-3 sm:h-3 bg-red-500 rounded-full mr-1"></div>
            Pending
          </Badge>
          <Badge variant="outline" className="text-xs">
            <div className="w-2 h-2 sm:w-3 sm:h-3 bg-cyan-500 rounded-full mr-1"></div>
            Dropoff
          </Badge>
          <Badge variant="outline" className="text-xs">
            <div className="w-2 h-2 sm:w-3 sm:h-3 bg-purple-500 rounded-full mr-1"></div>
            Airport
          </Badge>
          <Badge variant="outline" className="text-xs">
            <div className="w-2 h-2 sm:w-3 sm:h-3 bg-blue-500 rounded-full mr-1"></div>
            Boundary Circle (800m)
          </Badge>
        </div>
        
        {/* Circle Boundary Status */}
        {circleCenter && (
          <div className="mt-2 p-2 bg-green-50 dark:bg-green-950 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 sm:w-3 sm:h-3 bg-blue-500 rounded-full"></div>
              <span className="text-xs sm:text-sm font-medium text-green-800 dark:text-green-200">
                {isInCircleBoundary 
                  ? `In Circle Boundary (800m radius)`
                  : 'Outside Circle Boundary (800m radius)'
                }
              </span>
            </div>
          </div>
        )}
        
        {/* Real-time Tracking Status */}
        <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isRealTimeTracking ? (
                <Wifi className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
              ) : (
                <WifiOff className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
              )}
              <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                Real-time Tracking: {isRealTimeTracking ? 'ON' : 'OFF'}
              </span>
            </div>
            {isRealTimeTracking && locationAccuracy && (
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-xs text-gray-500">±{locationAccuracy.toFixed(0)}m</span>
              </div>
            )}
          </div>
        </div>

        {/* Auto-follow Status */}
        <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Navigation className={`h-3 w-3 sm:h-4 sm:w-4 ${autoFollowDriver ? 'text-green-600' : 'text-gray-400'}`} />
              <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                Auto-follow: {autoFollowDriver ? 'ON' : 'OFF'}
              </span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <GoogleMap
            mapContainerStyle={{ ...containerStyle, height }}
            center={driverLocation ? { lat: driverLocation.latitude, lng: driverLocation.longitude } : defaultCenter}
            zoom={15}
            onLoad={onLoad}
            onUnmount={onUnmount}
            onDragStart={() => {
              setUserInteractedWithMap(true);
              setLastUserInteraction(new Date());
              if (autoFollowDriver) {
                setAutoFollowDriver(false);
              }
            }}
            onZoomChanged={() => {
              setUserInteractedWithMap(true);
              setLastUserInteraction(new Date());
              if (autoFollowDriver) {
                setAutoFollowDriver(false);
              }
            }}
            options={{
              zoomControl: true,
              streetViewControl: false,
              mapTypeControl: !isMobile,
              fullscreenControl: !isMobile,
            }}
          >
            {/* Boundary Circle */}
            {circleCenter && (
              <Circle
                center={circleCenter}
                radius={800}
                options={{
                  fillColor: "#3b82f6",
                  fillOpacity: 0.3,
                  strokeColor: "#0c4cb3",
                  strokeOpacity: 1,
                  strokeWeight: 3,
                }}
              />
            )}

            {/* Driver Marker */}
            {driverLocation && (
              <Marker
                position={{ lat: driverLocation.latitude, lng: driverLocation.longitude }}
                icon={getMarkerIcon('driver')}
                title={getMarkerTitle('driver')}
                onClick={() => setSelectedPassenger(null)}
              />
            )}

            {/* Pickup Location Markers */}
            {pickupLocations.map((location, index) => {
              const isNextPickup = index === 0;
              const isVerified = location.passenger.isVerified;
              
              return (
                <Marker
                  key={`pickup-${location.passenger.id}`}
                  position={{ lat: location.latitude, lng: location.longitude }}
                  icon={getMarkerIcon('pickup', isVerified, isNextPickup)}
                  title={getMarkerTitle('pickup', location.passenger)}
                  onClick={() => {
                    setSelectedPassenger(location.passenger);
                    setActiveInfoWindow(`pickup-${location.passenger.id}`);
                  }}
                />
              );
            })}

            {/* Dropoff Location Markers */}
            {dropoffLocations.map((location) => {
              const isVerified = location.passenger.isVerified;
              
              return (
                <Marker
                  key={`dropoff-${location.passenger.id}`}
                  position={{ lat: location.latitude, lng: location.longitude }}
                  icon={getMarkerIcon('dropoff', isVerified)}
                  title={getMarkerTitle('dropoff', location.passenger)}
                  onClick={() => {
                    setSelectedPassenger(location.passenger);
                    setActiveInfoWindow(`dropoff-${location.passenger.id}`);
                  }}
                />
              );
            })}

            {/* Info Windows */}
            {pickupLocations.map((location, index) => {
              const isNextPickup = index === 0;
              const isVerified = location.passenger.isVerified;
              
              if (activeInfoWindow === `pickup-${location.passenger.id}`) {
                return (
                  <InfoWindow
                    key={`info-pickup-${location.passenger.id}`}
                    position={{ lat: location.latitude, lng: location.longitude }}
                    onCloseClick={() => setActiveInfoWindow(null)}
                    options={{
                      pixelOffset: new window.google.maps.Size(0, -40),
                    }}
                  >
                    <div className="p-2">
                      <h3 className="font-bold text-sm">{location.passenger.name}</h3>
                      <p className="text-xs text-gray-600">{location.name}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs">
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

            {dropoffLocations.map((location) => {
              const isVerified = location.passenger.isVerified;
              
              if (activeInfoWindow === `dropoff-${location.passenger.id}`) {
                return (
                  <InfoWindow
                    key={`info-dropoff-${location.passenger.id}`}
                    position={{ lat: location.latitude, lng: location.longitude }}
                    onCloseClick={() => setActiveInfoWindow(null)}
                    options={{
                      pixelOffset: new window.google.maps.Size(0, -40),
                    }}
                  >
                    <div className="p-2">
                      <h3 className="font-bold text-sm">{location.passenger.name}</h3>
                      <p className="text-xs text-gray-600">{location.name}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs">
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
          <div className="absolute top-2 sm:top-4 right-2 sm:right-4 space-y-1 sm:space-y-2">
            {/* Real-time tracking toggle */}
            <Button
              size={isMobile ? "sm" : "default"}
              variant={isRealTimeTracking ? "default" : "secondary"}
              className={`shadow-lg ${isRealTimeTracking ? 'bg-green-500 text-white' : 'bg-white'} text-xs`}
              onClick={() => {
                if (isRealTimeTracking) {
                  stopRealTimeTracking();
                } else {
                  startRealTimeTracking();
                }
              }}
              title={isRealTimeTracking ? "Stop real-time tracking" : "Start real-time tracking"}
            >
              {isRealTimeTracking ? <Wifi className="h-3 w-3 sm:h-4 sm:w-4" /> : <WifiOff className="h-3 w-3 sm:h-4 sm:w-4" />}
            </Button>

            {/* Auto-follow toggle */}
            <Button
              size={isMobile ? "sm" : "default"}
              variant={autoFollowDriver ? "default" : "secondary"}
              className={`shadow-lg ${autoFollowDriver ? 'bg-blue-500 text-white' : 'bg-white'} text-xs`}
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
              <Navigation className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>

            {/* Simulation button (development only) */}
            {circleCenter && process.env.NODE_ENV === 'development' && (
              <Button
                size={isMobile ? "sm" : "default"}
                variant="outline"
                className="bg-white shadow-lg text-xs"
                onClick={startContinuousSimulation}
                title="Start continuous simulation (moves driver around and out of circle)"
              >
                <div className="h-3 w-3 sm:h-4 sm:w-4">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2v20M2 12h20"/>
                    <path d="M12 2v20M2 12h20" transform="rotate(90 12 12)"/>
                  </svg>
                </div>
              </Button>
            )}

            {/* Manual transition button (development only) */}
            {currentTrip && process.env.NODE_ENV === 'development' && (
              <Button
                size={isMobile ? "sm" : "default"}
                variant="outline"
                className="bg-white shadow-lg text-xs"
                onClick={async () => {
                  try {
                    console.log('🔄 Manual transition to RETURN phase');
                    await api.post(`/trips/${currentTrip.id}/transition`, { phase: 'RETURN' });
                    toast.success("Manual transition to RETURN phase successful");
                    setTimeout(() => {
                      window.location.reload();
                    }, 2000);
                  } catch (error) {
                    console.error('Error in manual transition:', error);
                    toast.error("Manual transition failed");
                  }
                }}
                title="Manually transition to RETURN phase"
              >
                <div className="h-3 w-3 sm:h-4 sm:w-4">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 12l2 2 4-4"/>
                    <path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z"/>
                  </svg>
                </div>
              </Button>
            )}

            {/* Force initial check button (development only) */}
            {currentTrip && process.env.NODE_ENV === 'development' && (
              <Button
                size={isMobile ? "sm" : "default"}
                variant="outline"
                className="bg-white shadow-lg text-xs"
                onClick={() => {
                  console.log('🔍 Force initial circle boundary check');
                  setHasAttemptedTransition(false); // Reset flag
                  // Force a re-render to trigger the useEffect
                  window.location.reload();
                }}
                title="Force initial circle boundary check"
              >
                <div className="h-3 w-3 sm:h-4 sm:w-4">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2v20M2 12h20"/>
                    <path d="M12 2v20M2 12h20" transform="rotate(45 12 12)"/>
                  </svg>
                </div>
              </Button>
            )}
          </div>
        </div>

        {/* Selected Passenger Info */}
        {selectedPassenger && (
          <div className="mt-4 p-3 sm:p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="font-bold text-base sm:text-lg">{selectedPassenger.name}</h3>
                <p className="text-xs sm:text-sm text-gray-600">
                  {selectedPassenger.pickup} → {selectedPassenger.dropoff}
                </p>
                <p className="text-xs sm:text-sm text-gray-500">
                  {selectedPassenger.persons} passengers • {selectedPassenger.bags} bags
                </p>
              </div>
              <Button
                size={isMobile ? "sm" : "default"}
                variant="outline"
                onClick={() => setSelectedPassenger(null)}
                className="text-xs sm:text-sm self-start sm:self-center"
              >
                Close
              </Button>
            </div>
          </div>
        )}

        {/* Debug Info */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-4 p-3 sm:p-4 bg-gray-50 dark:bg-gray-900 rounded-lg text-xs">
            <h4 className="font-bold mb-2">Debug Info:</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <p><strong>Auto-follow:</strong> {autoFollowDriver ? 'ON' : 'OFF'}</p>
              <p><strong>User Interacted:</strong> {userInteractedWithMap ? 'Yes' : 'No'}</p>
              <p><strong>Last Interaction:</strong> {lastUserInteraction ? lastUserInteraction.toLocaleTimeString() : 'None'}</p>
              <p><strong>Circle Center:</strong> {circleCenter ? `${circleCenter.lat().toFixed(4)}, ${circleCenter.lng().toFixed(4)}` : 'None'}</p>
              <p><strong>Current Trip Direction:</strong> {currentTrip?.direction || 'None'}</p>
              <p><strong>Current Trip Phase:</strong> {currentTrip?.phase || 'None'}</p>
              <p><strong>Circle Boundary Status:</strong> {isInCircleBoundary ? 'Inside' : 'Outside'}</p>
              <p><strong>Last Circle Check:</strong> {lastCircleBoundaryCheck ? lastCircleBoundaryCheck.toLocaleTimeString() : 'None'}</p>
              <p><strong>Can Auto-Transition:</strong> {currentTrip?.phase === 'OUTBOUND' ? 'Yes' : 'No'}</p>
              <p><strong>Time Since Last Check:</strong> {lastCircleBoundaryCheck ? `${Math.round((Date.now() - lastCircleBoundaryCheck.getTime()) / 1000)}s` : 'N/A'}</p>
              <p><strong>Has Attempted Transition:</strong> {hasAttemptedTransition ? 'Yes' : 'No'}</p>
              <p><strong>Real-time Tracking:</strong> {isRealTimeTracking ? 'ON' : 'OFF'}</p>
              <p><strong>WebSocket Connected:</strong> {isConnected ? 'Yes' : 'No'}</p>
              <p><strong>Location Accuracy:</strong> {locationAccuracy ? `${locationAccuracy.toFixed(1)}m` : 'N/A'}</p>
              <p><strong>Location Speed:</strong> {locationSpeed ? `${(locationSpeed * 3.6).toFixed(1)} km/h` : 'N/A'}</p>
              <p><strong>Location Heading:</strong> {locationHeading ? `${locationHeading.toFixed(0)}°` : 'N/A'}</p>
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