"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MapPin, Clock, QrCode, Navigation, Phone, Users, CheckCircle, Plus } from "lucide-react"
import { QRCodeDisplay } from "./qr-code-display"
import { api } from "@/lib/api"
import GuestRouteMap from "./guest-route-map"
import { useWebSocket } from "@/context/WebSocketContext"
import { formatDateTimeForDisplay, getUserTimeZone } from "@/lib/utils"
import { CurrentBookingsSkeleton } from "@/components/ui/skeleton"
import { useJsApiLoader } from "@react-google-maps/api"

interface CurrentBookingsProps {
  bookings: any[]
  onNewBooking: () => void
  isLoading?: boolean
}

export default function CurrentBookings({ bookings, onNewBooking, isLoading = false }: CurrentBookingsProps) {
  const [showQR, setShowQR] = useState<number | null>(null)
  const [currentBookings, setCurrentBookings] = useState(bookings)
  const [realTimeEtas, setRealTimeEtas] = useState<{[key: string]: {eta: string, distance: string}}>({})
  const [driverLocations, setDriverLocations] = useState<{[key: string]: any}>({})
  const [pickupLocations, setPickupLocations] = useState<{[key: string]: any}>({})
  const directionsServiceRef = useRef<google.maps.DirectionsService | null>(null)
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const { onBookingUpdate } = useWebSocket()

  // Load Google Maps API
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
  })

  // Calculate real-time ETA using Google Maps Directions API for a specific booking
  const calculateRealTimeETA = useCallback(async (bookingId: string) => {
    const driverLocation = driverLocations[bookingId];
    const pickupLocation = pickupLocations[bookingId];
    
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
          setRealTimeEtas(prev => ({
            ...prev,
            [bookingId]: {
              eta: leg.duration?.text || 'Calculating...',
              distance: leg.distance?.text || 'Calculating...'
            }
          }));
        }
      }
    } catch (error) {
      console.error('Error calculating real-time ETA for booking', bookingId, ':', error);
      setRealTimeEtas(prev => ({
        ...prev,
        [bookingId]: {
          eta: 'Error calculating ETA',
          distance: 'Error calculating distance'
        }
      }));
    }
  }, [driverLocations, pickupLocations]);

  // Fetch booking location data for ETA calculation
  const fetchLocationData = async (booking: any) => {
    if (!booking?.id) return;

    try {
      // Get booking tracking data
      const trackingResponse = await api.get(`/guest/booking/${booking.id}/tracking`);
      const tracking = trackingResponse.tracking;

      // Set driver location if available
      if (tracking.driverLocation) {
        setDriverLocations(prev => ({
          ...prev,
          [booking.id]: {
            latitude: tracking.driverLocation.latitude,
            longitude: tracking.driverLocation.longitude,
            name: "Driver Location"
          }
        }));
      }

      // Set pickup location
      if (tracking.pickupLocation) {
        setPickupLocations(prev => ({
          ...prev,
          [booking.id]: {
            latitude: tracking.pickupLocation.latitude,
            longitude: tracking.pickupLocation.longitude,
            name: booking.pickup
          }
        }));
      } else {
        // If no pickup location, get hotel location
        try {
          const guestResponse = await api.get('/guest/profile');
          if (guestResponse.guest?.hotel?.latitude && guestResponse.guest?.hotel?.longitude) {
            setPickupLocations(prev => ({
              ...prev,
              [booking.id]: {
                latitude: guestResponse.guest.hotel.latitude,
                longitude: guestResponse.guest.hotel.longitude,
                name: `${guestResponse.guest.hotel.name} (Hotel)`
              }
            }));
          }
        } catch (err) {
          console.error('Error fetching hotel location:', err);
        }
      }
    } catch (err) {
      console.error('Error fetching location data for booking', booking.id, ':', err);
    }
  };

  // Update local bookings state when prop changes
  useEffect(() => {
    setCurrentBookings(bookings)
    // Debug: Log booking data to understand structure
    console.log("CurrentBookings - All bookings data:", bookings);
    bookings.forEach((booking, index) => {
      console.log(`Booking ${index + 1} pricing:`, booking.pricing);
    });
  }, [bookings])

  // Initialize Google Maps Directions Service when Google Maps API is loaded
  useEffect(() => {
    if (isLoaded && !directionsServiceRef.current) {
      directionsServiceRef.current = new window.google.maps.DirectionsService();
      console.log('Google Maps Directions Service initialized');
    }
  }, [isLoaded]);

  // Fetch location data for all bookings when bookings change
  useEffect(() => {
    if (currentBookings.length > 0) {
      currentBookings.forEach(booking => {
        fetchLocationData(booking);
      });
    }
  }, [currentBookings]);

  // Set up automatic refresh for real-time ETA calculation
  useEffect(() => {
    if (Object.keys(driverLocations).length > 0 && Object.keys(pickupLocations).length > 0 && directionsServiceRef.current) {
      // Calculate ETA for all bookings with available location data
      Object.keys(driverLocations).forEach(bookingId => {
        if (pickupLocations[bookingId]) {
          calculateRealTimeETA(bookingId);
        }
      });
      
      // Set up interval for periodic updates (every 30 seconds)
      refreshIntervalRef.current = setInterval(() => {
        Object.keys(driverLocations).forEach(bookingId => {
          if (pickupLocations[bookingId]) {
            calculateRealTimeETA(bookingId);
          }
        });
      }, 30000);
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [driverLocations, pickupLocations, calculateRealTimeETA]);

  // Listen for real-time booking updates via WebSocket
  useEffect(() => {
    if (!onBookingUpdate) return

    const cleanup = onBookingUpdate((updatedBooking) => {
      console.log("Received booking update via WebSocket:", updatedBooking)
      setCurrentBookings(prev => 
        prev.map(booking => 
          booking.id === updatedBooking.id ? { ...booking, ...updatedBooking } : booking
        )
      )
    })

    return cleanup
  }, [onBookingUpdate])

  // Show skeleton while loading
  if (isLoading) {
    return <CurrentBookingsSkeleton />
  }

  // Show error if Google Maps API fails to load
  if (loadError) {
    console.error('Google Maps API failed to load:', loadError);
  }

  if (!currentBookings || currentBookings.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <QrCode className="w-12 h-12 text-gray-400" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">No Active Bookings</h3>
        <p className="text-gray-600 mb-6">You don't have any active shuttle bookings at the moment.</p>
        <Button onClick={onNewBooking}>
          <Plus className="w-4 h-4 mr-2" />
          Book a Shuttle
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with booking count */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Current Bookings</h2>
          <p className="text-sm sm:text-base text-gray-600">You have {currentBookings.length} active booking{currentBookings.length > 1 ? 's' : ''}</p>
        </div>
        <Button onClick={onNewBooking} size="sm" className="text-xs sm:text-sm px-3 sm:px-4 py-2 sm:py-2">
          <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
          New Booking
        </Button>
      </div>

      {/* Timezone Info */}
      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-blue-900 text-xs sm:text-sm">
        All times shown in your local timezone: <b>{getUserTimeZone()}</b>
      </div>

      {/* Multiple Booking Cards */}
      {currentBookings.map((booking, index) => (
        <Card key={booking.id} className="border-l-4 border-l-blue-500">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="text-lg sm:text-xl">Booking #{index + 1}</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Booking ID: {booking.id}</CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                <div className="flex gap-2">
                  {booking.qrCodePath ? (
                    <Button 
                      onClick={() => setShowQR(booking.id)} 
                      size="sm"
                      className="h-8 text-xs sm:text-sm px-3 flex-1 sm:flex-none"
                    >
                      <QrCode className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5" />
                      QR Code
                    </Button>
                  ) : (
                    <Button 
                      disabled 
                      size="sm"
                      className="h-8 text-sm px-3 flex-1 sm:flex-none" 
                      title="QR Code not available"
                    >
                      <QrCode className="w-4 h-4 mr-1.5" />
                      QR Code
                    </Button>
                  )}
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="h-8 text-xs sm:text-sm px-3 flex-1 sm:flex-none"
                  >
                    <Phone className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5" />
                    Contact
                  </Button>
                </div>
                <Badge 
                  variant={
                    booking.isCancelled ? "destructive" : 
                    booking.isCompleted ? "default" : 
                    booking.needsFrontdeskVerification ? "secondary" :
                    !booking.needsFrontdeskVerification && !booking.isVerified ? "default" :
                    booking.isVerified ? "default" :
                    booking.isPaid ? "secondary" : "outline"
                  } 
                  className={`text-xs sm:text-sm self-start sm:self-auto ${
                    !booking.needsFrontdeskVerification && !booking.isVerified 
                      ? "bg-green-100 text-green-800 border-green-200" 
                      : ""
                  }`}
                >
                  {booking.isCancelled ? "Cancelled" : 
                   booking.isCompleted ? "Completed" : 
                   booking.needsFrontdeskVerification ? "Pending Verification" :
                   !booking.needsFrontdeskVerification && !booking.isVerified ? "Verified" :
                   booking.isVerified ? "Driver Checked In" :
                   booking.isPaid ? "Paid" : "Pending"}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {booking.needsFrontdeskVerification && (
              <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-orange-600" />
                  <p className="text-xs sm:text-sm text-orange-800 font-medium">
                    Waiting for frontdesk verification
                  </p>
                </div>
                <p className="text-xs text-orange-700 mt-1">
                  Your booking is being reviewed by the hotel frontdesk. You'll be notified once it's verified.
                </p>
              </div>
            )}
            
            {!booking.needsFrontdeskVerification && !booking.isVerified && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" />
                  <p className="text-xs sm:text-sm text-blue-800 font-medium">
                    Frontdesk verified - waiting for driver
                  </p>
                </div>
                <p className="text-xs text-blue-700 mt-1">
                  Your booking has been verified by the frontdesk and assigned to a shuttle. The driver will check you in when they arrive.
                </p>
              </div>
            )}
            
            {booking.isParkSleepFly && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <span className="text-base sm:text-lg">🏨✈️</span>
                  <p className="text-xs sm:text-sm text-blue-800 font-medium">
                    Park, Sleep & Fly Package
                  </p>
                </div>
                <p className="text-xs text-blue-700 mt-1">
                  This is part of your Park, Sleep & Fly package. Your accommodation and shuttle service are pre-paid.
                </p>
              </div>
            )}
            
            {booking.isVerified && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
                  <p className="text-xs sm:text-sm text-green-800 font-medium">
                    ✅ Check-in Confirmed!
                  </p>
                </div>
                <p className="text-xs text-green-700 mt-1">
                  You have been successfully checked in by the driver. Your shuttle is ready to depart. Have a great journey!
                </p>
              </div>
            )}
            
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                  <div>
                    <p className="text-sm sm:text-base font-medium">Trip Type</p>
                    <div className="flex items-center gap-2">
                      <p className="text-xs sm:text-sm text-gray-600">
                        {booking.bookingType === "HOTEL_TO_AIRPORT" ? "Hotel to Airport" : "Airport to Hotel"}
                      </p>
                      {booking.isParkSleepFly && (
                        <Badge className="bg-blue-100 text-blue-800 text-xs">
                          🏨✈️ PSF
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Users className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                  <div>
                    <p className="text-sm sm:text-base font-medium">Passengers & Bags</p>
                    <p className="text-xs sm:text-sm text-gray-600">
                      {booking.numberOfPersons} person(s), {booking.numberOfBags} bag(s)
                    </p>
                  </div>
                </div>
                {/* Price Section */}
                {booking.pricing && (
                  <div className="flex items-center space-x-3">
                    <span className="w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center text-green-500 font-bold text-base sm:text-lg">$</span>
                    <div>
                      <p className="text-sm sm:text-base font-medium">Price</p>
                      <p className="text-xs sm:text-sm text-gray-600">
                        ${booking.pricing.pricePerPerson.toFixed(2)} per person<br/>
                        <span className="font-semibold text-green-700">Total: ${booking.pricing.totalPrice.toFixed(2)}</span>
                      </p>
                    </div>
                  </div>
                )}
              </div>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                  <div>
                    <p className="text-sm sm:text-base font-medium">Preferred Time</p>
                    <p className="text-xs sm:text-sm text-gray-600">
                      {formatDateTimeForDisplay(booking.preferredTime)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Navigation className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
                  <div>
                    <p className="text-sm sm:text-base font-medium">ETA</p>
                    <div className="space-y-1">
                      {realTimeEtas[booking.id] && realTimeEtas[booking.id].eta !== 'Calculating...' && realTimeEtas[booking.id].eta !== 'Error calculating ETA' ? (
                        <>
                          <p className="text-sm text-green-600 font-semibold">{realTimeEtas[booking.id].eta}</p>
                          {realTimeEtas[booking.id].distance && realTimeEtas[booking.id].distance !== 'Calculating...' && (
                            <p className="text-xs text-gray-500">{realTimeEtas[booking.id].distance}</p>
                          )}
                        </>
                      ) : (
                        <p className="text-sm text-gray-500">Calculating...</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes Section */}
            {booking.notes && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm font-medium text-blue-800 mb-1">Notes:</p>
                <p className="text-sm text-blue-700 whitespace-pre-wrap">{booking.notes}</p>
              </div>
            )}



            {/* Live Google Map for this booking */}
            {booking.id && (
              <div className="mt-6">
                {/* <h4 className="text-lg font-medium mb-3">Live Tracking</h4> */}
                
                
                
                {/* Real-time ETA display */}
                {/* {realTimeEtas[booking.id] && realTimeEtas[booking.id].eta !== 'Calculating...' && realTimeEtas[booking.id].eta !== 'Error calculating ETA' && (
                  <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                          <Navigation className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <h5 className="font-semibold text-gray-900">Real-time ETA</h5>
                          <p className="text-sm text-gray-600">Based on current traffic conditions</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-green-600">{realTimeEtas[booking.id].eta}</p>
                        {realTimeEtas[booking.id].distance && realTimeEtas[booking.id].distance !== 'Calculating...' && (
                          <p className="text-sm text-gray-500">{realTimeEtas[booking.id].distance}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                 */}
                <GuestRouteMap booking={booking} />
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {/* QR Code Modals for each booking */}
      {currentBookings.map((booking) => (
        <QRCodeDisplay
          key={`qr-${booking.id}`}
          qrCodePath={booking.qrCodePath || ""}
          bookingId={booking.id}
          isOpen={showQR === booking.id}
          onClose={() => setShowQR(null)}
        />
      ))}
    </div>
  )
} 