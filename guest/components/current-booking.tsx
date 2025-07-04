"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MapPin, Clock, QrCode, Navigation, Phone, Users, CheckCircle } from "lucide-react"
import { QRCodeDisplay } from "./qr-code-display"
import { api } from "@/lib/api"
import GuestRouteMap from "./guest-route-map"
import { useWebSocket } from "@/context/WebSocketContext"
import { formatDateTimeForDisplay, getUserTimeZone } from "@/lib/utils"

interface CurrentBookingProps {
  booking: any
  onNewBooking: () => void
}

export default function CurrentBooking({ booking, onNewBooking }: CurrentBookingProps) {
  const [eta, setEta] = useState(booking?.eta || "Calculating...")
  const [distance, setDistance] = useState(booking?.distance || "Unknown")
  const [showQR, setShowQR] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [currentBooking, setCurrentBooking] = useState(booking)
  const { onBookingUpdate } = useWebSocket()

  // Update local booking state when prop changes
  useEffect(() => {
    setCurrentBooking(booking)
  }, [booking])

  // Listen for real-time booking updates via WebSocket
  useEffect(() => {
    if (!onBookingUpdate) return

    const cleanup = onBookingUpdate((updatedBooking) => {
      console.log("Received booking update via WebSocket:", updatedBooking)
      if (updatedBooking.id === currentBooking?.id) {
        setCurrentBooking(prev => ({ ...prev, ...updatedBooking }))
      }
    })

    return cleanup
  }, [onBookingUpdate, currentBooking?.id])

  useEffect(() => {
    if (currentBooking) {
      // Debug: Log booking data to understand structure
      console.log("Current booking data:", currentBooking);
      console.log("QR Code Path:", currentBooking.qrCodePath);
      
      // Set initial ETA from booking data
      if (currentBooking.eta) {
        setEta(currentBooking.eta);
      }
      if (currentBooking.distance) {
        setDistance(currentBooking.distance);
      }
      
      // Start real-time ETA updates
      const updateETA = async () => {
        if (!currentBooking.id) return;
        
        // Check if guest has a valid token
        const token = localStorage.getItem("guestToken");
        if (!token) {
          console.error("No guest token found. Cannot fetch ETA.");
          setEta("Authentication required");
          return;
        }
        
        try {
          setIsLoading(true);
          console.log(`[ETA DEBUG] Fetching ETA for booking ${currentBooking.id}`);
          const response = await api.get(`/guest/booking/${currentBooking.id}/eta`);
          setEta(response.eta);
          setDistance(response.distance);
          setLastUpdate(new Date());
        } catch (error) {
          console.error("Error updating ETA:", error);
          setEta("Error fetching ETA");
        } finally {
          setIsLoading(false);
        }
      };

      // Update ETA immediately
      updateETA();

      // Update ETA every 30 seconds
      const interval = setInterval(updateETA, 30000);

      return () => clearInterval(interval);
    }
  }, [currentBooking])

  if (!currentBooking) {
    return (
      <div className="text-center py-12">
        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <QrCode className="w-12 h-12 text-gray-400" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">No Active Booking</h3>
        <p className="text-gray-600 mb-6">You don't have any active shuttle bookings at the moment.</p>
        <Button onClick={onNewBooking}>Book a Shuttle</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Timezone Info */}
      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-blue-900 text-sm">
        All times shown in your local timezone: <b>{getUserTimeZone()}</b>
      </div>

      {/* Main Booking Card */}
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Current Booking</CardTitle>
              <CardDescription>Booking ID: {currentBooking.id}</CardDescription>
            </div>
            <Badge variant={
              currentBooking.isCancelled ? "destructive" : 
              currentBooking.isCompleted ? "default" : 
              currentBooking.needsFrontdeskVerification ? "secondary" :
              !currentBooking.needsFrontdeskVerification && !currentBooking.isVerified ? "default" :
              currentBooking.isVerified ? "default" :
              currentBooking.isPaid ? "secondary" : "outline"
            } className="text-sm">
              {currentBooking.isCancelled ? "Cancelled" : 
               currentBooking.isCompleted ? "Completed" : 
               currentBooking.needsFrontdeskVerification ? "Pending Verification" :
               !currentBooking.needsFrontdeskVerification && !currentBooking.isVerified ? "Frontdesk Verified" :
               currentBooking.isVerified ? "Driver Checked In" :
               currentBooking.isPaid ? "Paid" : "Pending"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {currentBooking.needsFrontdeskVerification && (
            <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-orange-600" />
                <p className="text-sm text-orange-800 font-medium">
                  Waiting for frontdesk verification
                </p>
              </div>
              <p className="text-xs text-orange-700 mt-1">
                Your booking is being reviewed by the hotel frontdesk. You'll be notified once it's verified.
              </p>
            </div>
          )}
          
          {!currentBooking.needsFrontdeskVerification && !currentBooking.isVerified && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-blue-600" />
                <p className="text-sm text-blue-800 font-medium">
                  Frontdesk verified - waiting for driver
                </p>
              </div>
              <p className="text-xs text-blue-700 mt-1">
                Your booking has been verified by the frontdesk and assigned to a shuttle. The driver will check you in when they arrive.
              </p>
            </div>
          )}
          
          {currentBooking.isVerified && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <p className="text-sm text-green-800 font-medium">
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
                <MapPin className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="font-medium">Trip Type</p>
                  <p className="text-sm text-gray-600">
                    {currentBooking.bookingType === "HOTEL_TO_AIRPORT" ? "Hotel to Airport" : "Airport to Hotel"}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Users className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="font-medium">Passengers & Bags</p>
                  <p className="text-sm text-gray-600">
                    {currentBooking.numberOfPersons} person(s), {currentBooking.numberOfBags} bag(s)
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Clock className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="font-medium">Preferred Time</p>
                                      <p className="text-sm text-gray-600">
                      {formatDateTimeForDisplay(currentBooking.preferredTime)}
                    </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Navigation className="w-5 h-5 text-green-500" />
                <div>
                  <p className="font-medium">ETA</p>
                  <div className="flex items-center space-x-2">
                    <p className="text-sm text-green-600 font-medium">
                      {isLoading ? "Updating..." : eta}
                    </p>
                    {isLoading && (
                      <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                    )}
                  </div>
                  {distance && distance !== "Unknown" && (
                    <p className="text-xs text-gray-500">{distance}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            {currentBooking.qrCodePath ? (
              <Button onClick={() => setShowQR(true)} className="flex-1">
                <QrCode className="w-4 h-4 mr-2" />
                Show QR Code
              </Button>
            ) : (
              <Button disabled className="flex-1" title="QR Code not available">
                <QrCode className="w-4 h-4 mr-2" />
                QR Code Unavailable
              </Button>
            )}
            <Button variant="outline" className="flex-1">
              <Phone className="w-4 h-4 mr-2" />
              Contact Driver
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Live Tracking */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Live Tracking</CardTitle>
          {lastUpdate && (
            <CardDescription>
              Last updated: {lastUpdate.toLocaleTimeString()} ({getUserTimeZone()})
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <div className="bg-gray-100 rounded-lg p-6 text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Navigation className="w-8 h-8 text-blue-600" />
            </div>
            <p className="text-lg font-medium mb-2">Shuttle is on the way</p>
            <p className="text-gray-600">Driver will arrive in approximately {eta}</p>
            {distance && distance !== "Unknown" && (
              <p className="text-sm text-gray-500 mt-1">Distance: {distance}</p>
            )}
            <div className="mt-4 bg-white rounded-lg p-3">
              <div className="flex items-center justify-between text-sm">
                <span>Progress</span>
                <span>75%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div className="bg-blue-600 h-2 rounded-full" style={{ width: "75%" }}></div>
              </div>
            </div>
          </div>
          {/* Live Google Map */}
          {currentBooking.id && (
            <div className="mt-6">
              <GuestRouteMap booking={currentBooking} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* QR Code Modal - Always render, let component handle missing qrCodePath */}
      <QRCodeDisplay
        qrCodePath={currentBooking.qrCodePath || ""}
        bookingId={currentBooking.id}
        isOpen={showQR}
        onClose={() => setShowQR(false)}
      />
    </div>
  )
}
