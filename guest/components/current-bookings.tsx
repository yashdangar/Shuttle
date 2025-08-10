"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MapPin, Clock, QrCode, Navigation, Phone, Users, CheckCircle, Plus, ChevronDown, ChevronUp, Info, XCircle } from "lucide-react"
import { QRCodeDisplay } from "./qr-code-display"
import { api } from "@/lib/api"
import GuestRouteMap from "./guest-route-map"
import { useWebSocket } from "@/context/WebSocketContext"
import { formatDateTimeForDisplay, getUserTimeZone } from "@/lib/utils"
import { CurrentBookingsSkeleton } from "@/components/ui/skeleton"
import { useJsApiLoader } from "@react-google-maps/api"
import { motion, AnimatePresence } from "framer-motion"

interface CurrentBookingsProps {
  bookings: any[]
  onNewBooking: () => void
  isLoading?: boolean
  onViewHistory?: () => void
}

export default function CurrentBookings({ bookings, onNewBooking, isLoading = false, onViewHistory }: CurrentBookingsProps) {
  const [showQR, setShowQR] = useState<number | null>(null)
  const [currentBookings, setCurrentBookings] = useState(bookings)
  const [realTimeEtas, setRealTimeEtas] = useState<{[key: string]: {eta: string, distance: string}}>({})
  const [driverLocations, setDriverLocations] = useState<{[key: string]: any}>({})
  const [pickupLocations, setPickupLocations] = useState<{[key: string]: any}>({})
  const [collapsedBookingIds, setCollapsedBookingIds] = useState<Record<string, boolean>>({})
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
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="px-6 py-12 sm:px-8 text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-gray-50 ring-1 ring-gray-200 flex items-center justify-center">
            <QrCode className="h-5 w-5 text-gray-500" />
          </div>
          <h3 className="text-xl sm:text-2xl font-semibold tracking-tight text-gray-900">No active bookings</h3>
          <p className="mt-2 text-sm text-gray-600">Create a booking to receive pickup details and QR check‑in.</p>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs text-gray-700">
              <Navigation className="h-3.5 w-3.5 text-gray-500" /> Live ETA
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs text-gray-700">
              <QrCode className="h-3.5 w-3.5 text-gray-500" /> QR check‑in
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs text-gray-700">
              <Clock className="h-3.5 w-3.5 text-gray-500" /> Pickup window
            </span>
          </div>

          <div className="mt-6 border-t border-gray-100 pt-6 flex items-center justify-center gap-3">
            <Button onClick={onNewBooking} size="sm" className="shadow-sm">
              <Plus className="h-4 w-4 mr-2" />
              New booking
            </Button>
            <Button variant="outline" size="sm" onClick={() => onViewHistory?.()}>View past bookings</Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with booking count */}
      <motion.div
        className="flex items-center justify-between"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 ">Current Bookings</h2>
          <p className="text-sm sm:text-base text-gray-600">You have {currentBookings.length} active booking{currentBookings.length > 1 ? 's' : ''}</p>
        </div>
        <Button onClick={onNewBooking} size="sm" className="text-xs sm:text-sm px-3 sm:px-4 py-2 sm:py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow hover:shadow-md">
          <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
          New Booking
        </Button>
      </motion.div>

      {/* Timezone Info */}
      <motion.div
        className="mb-4 p-3 rounded-xl border bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100 text-blue-900 text-xs sm:text-sm flex items-center gap-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25, delay: 0.05 }}
      >
        <Info className="w-4 h-4 text-blue-600" />
        <span>All times shown in your local timezone: <b>{getUserTimeZone()}</b></span>
      </motion.div>

      {/* Multiple Booking Cards */}
      <AnimatePresence initial={false}>
        {currentBookings.map((booking, index) => (
          <motion.div
            key={booking.id}
            layout
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ type: "spring", stiffness: 300, damping: 30, mass: 0.5 }}
          >
            <Card
              className="relative overflow-hidden group border border-gray-100/70 shadow-sm hover:shadow-lg transition-all duration-300 rounded-xl bg-white/70 supports-[backdrop-filter]:bg-white/50 hover:border-blue-200"
            >
              <div className="pointer-events-none absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-blue-500 to-indigo-500" />
              <CardHeader className="pb-3">
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
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const id = String(booking.id)
                          setCollapsedBookingIds(prev => ({ ...prev, [id]: !prev[id] }))
                        }}
                        className="h-8 text-xs sm:text-sm px-3"
                      >
                        {collapsedBookingIds[String(booking.id)] ? (
                          <>
                            <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5" /> Expand
                          </>
                        ) : (
                          <>
                            <ChevronUp className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5" /> Collapse
                          </>
                        )}
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
                      className={`text-xs sm:text-sm self-start sm:self-auto px-2.5 py-1 rounded-full border ${
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
                <AnimatePresence initial={false} mode="wait">
                  {collapsedBookingIds[String(booking.id)] ? (
                    <motion.div
                      key="collapsed"
                      layout
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="flex flex-col gap-3"
                    >
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2 text-gray-700">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          <span className="text-xs sm:text-sm">
                            {booking.bookingType === "HOTEL_TO_AIRPORT" ? "Hotel → Airport" : "Airport → Hotel"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-700">
                          <Clock className="w-4 h-4 text-gray-400" />
                          <span className="text-xs sm:text-sm">{formatDateTimeForDisplay(booking.preferredTime)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Navigation className="w-4 h-4 text-emerald-600" />
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
                            {realTimeEtas[booking.id]?.eta || "Calculating..."}
                          </span>
                        </div>
                      </div>
                      {booking.notes && (
                        <p className="text-xs text-gray-500 line-clamp-2">{booking.notes}</p>
                      )}
                    </motion.div>
                  ) : (
                    <motion.div
                      key="expanded"
                      layout
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                    >
                      {/* Cancellation banner */}
                      {booking.isCancelled && (
                        <div className="mb-4 p-3 rounded-lg border border-red-200 bg-red-50 flex items-start gap-2">
                          <XCircle className="w-4 h-4 text-red-600 mt-0.5" />
                          <div>
                            <p className="text-xs sm:text-sm text-red-800 font-medium">This booking has been cancelled.</p>
                          </div>
                        </div>
                      )}
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

                      {/* Progress steps */}
                      {(() => {
                        const stepIndex = booking.isCancelled
                          ? -1
                          : booking.isCompleted
                          ? 3
                          : booking.isVerified
                          ? 2
                          : !booking.needsFrontdeskVerification
                          ? 1
                          : 0
                        const steps = ["Requested", "Verified", "Checked-in", "Completed"]
                        return (
                          <div className="mb-4">
                            <div className="flex items-center">
                              {steps.map((label: string, idx: number) => (
                                <div key={label} className="flex items-center flex-1">
                                  <div
                                    className={
                                      `relative flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-semibold ` +
                                      (idx <= stepIndex ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white" : "bg-gray-200 text-gray-500")
                                    }
                                  >
                                    {idx + 1}
                                  </div>
                                  <div className="ml-2 mr-3 text-[11px] sm:text-xs text-gray-600 whitespace-nowrap">{label}</div>
                                  {idx < steps.length - 1 && (
                                    <div className={`h-[2px] flex-1 ${idx < stepIndex ? "bg-gradient-to-r from-blue-600 to-indigo-600" : "bg-gray-200"}`} />
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      })()}

                      {/* Seat Hold Status */}
                      {booking.seatsHeld && !booking.seatsConfirmed && (
                        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <div className="flex items-center space-x-2">
                            <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-600" />
                            <p className="text-xs sm:text-sm text-yellow-800 font-medium">
                              🪑 Seats Temporarily Held
                            </p>
                          </div>
                          <p className="text-xs text-yellow-700 mt-1">
                            {booking.seatsHeldUntil ? (
                              `Your seats are held until ${new Date(booking.seatsHeldUntil).toLocaleTimeString()}. 
                              Please wait for frontdesk verification to confirm your booking.`
                            ) : (
                              "Your seats are temporarily held. Please wait for frontdesk verification to confirm your booking."
                            )}
                          </p>
                          {booking.shuttle && (
                            <p className="text-xs text-yellow-700 mt-1">
                              🚐 Assigned to shuttle: {booking.shuttle.vehicleNumber}
                            </p>
                          )}
                        </div>
                      )}

                      {booking.seatsConfirmed && (
                        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex items-center space-x-2">
                            <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
                            <p className="text-xs sm:text-sm text-green-800 font-medium">
                              🪑 Seats Confirmed
                            </p>
                          </div>
                          <p className="text-xs text-green-700 mt-1">
                            Your seats have been confirmed by the frontdesk. Your booking is ready for travel.
                          </p>
                          {booking.shuttle && (
                            <p className="text-xs text-green-700 mt-1">
                              🚐 Confirmed on shuttle: {booking.shuttle.vehicleNumber}
                            </p>
                          )}
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
                            <div className="flex items-center space-x-3 p-3 rounded-lg border border-emerald-100 bg-emerald-50/60">
                              <span className="w-6 h-6 flex items-center justify-center text-emerald-600 font-bold text-base sm:text-lg">$</span>
                              <div>
                                <p className="text-sm sm:text-base font-medium">Price</p>
                                <p className="text-xs sm:text-sm text-gray-700">
                                  ${booking.pricing.pricePerPerson.toFixed(2)} per person<br/>
                                  <span className="font-semibold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">Total: ${booking.pricing.totalPrice.toFixed(2)}</span>
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
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
                                      {realTimeEtas[booking.id].eta}
                                    </span>
                                    {realTimeEtas[booking.id].distance && realTimeEtas[booking.id].distance !== 'Calculating...' && (
                                      <p className="text-xs text-gray-500">{realTimeEtas[booking.id].distance}</p>
                                    )}
                                  </>
                                ) : (
                                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                                    Calculating...
                                  </span>
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
                        <div className="mt-6 border-t pt-4 border-gray-100">
                          <GuestRouteMap booking={booking} />
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>

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