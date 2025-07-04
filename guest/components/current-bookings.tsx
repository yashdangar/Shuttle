"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MapPin, Clock, QrCode, Navigation, Phone, Users, CheckCircle, Plus } from "lucide-react"
import { QRCodeDisplay } from "./qr-code-display"
import { api } from "@/lib/api"
import GuestRouteMap from "./guest-route-map"
import { useWebSocket } from "@/context/WebSocketContext"
import { formatDateTimeForDisplay, getUserTimeZone } from "@/lib/utils"

interface CurrentBookingsProps {
  bookings: any[]
  onNewBooking: () => void
}

export default function CurrentBookings({ bookings, onNewBooking }: CurrentBookingsProps) {
  const [showQR, setShowQR] = useState<number | null>(null)
  const [currentBookings, setCurrentBookings] = useState(bookings)
  const { onBookingUpdate } = useWebSocket()

  // Update local bookings state when prop changes
  useEffect(() => {
    setCurrentBookings(bookings)
  }, [bookings])

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
          <h2 className="text-2xl font-bold text-gray-900">Current Bookings</h2>
          <p className="text-gray-600">You have {currentBookings.length} active booking{currentBookings.length > 1 ? 's' : ''}</p>
        </div>
        <Button onClick={onNewBooking}>
          <Plus className="w-4 h-4 mr-2" />
          New Booking
        </Button>
      </div>

      {/* Timezone Info */}
      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-blue-900 text-sm">
        All times shown in your local timezone: <b>{getUserTimeZone()}</b>
      </div>

      {/* Multiple Booking Cards */}
      {currentBookings.map((booking, index) => (
        <Card key={booking.id} className="border-l-4 border-l-blue-500">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">Booking #{index + 1}</CardTitle>
                <CardDescription>Booking ID: {booking.id}</CardDescription>
              </div>
              <Badge variant={
                booking.isCancelled ? "destructive" : 
                booking.isCompleted ? "default" : 
                booking.needsFrontdeskVerification ? "secondary" :
                !booking.needsFrontdeskVerification && !booking.isVerified ? "default" :
                booking.isVerified ? "default" :
                booking.isPaid ? "secondary" : "outline"
              } className="text-sm">
                {booking.isCancelled ? "Cancelled" : 
                 booking.isCompleted ? "Completed" : 
                 booking.needsFrontdeskVerification ? "Pending Verification" :
                 !booking.needsFrontdeskVerification && !booking.isVerified ? "Frontdesk Verified" :
                 booking.isVerified ? "Driver Checked In" :
                 booking.isPaid ? "Paid" : "Pending"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {booking.needsFrontdeskVerification && (
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
            
            {!booking.needsFrontdeskVerification && !booking.isVerified && (
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
            
            {booking.isParkSleepFly && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">🏨✈️</span>
                  <p className="text-sm text-blue-800 font-medium">
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
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-gray-600">
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
                  <Users className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="font-medium">Passengers & Bags</p>
                    <p className="text-sm text-gray-600">
                      {booking.numberOfPersons} person(s), {booking.numberOfBags} bag(s)
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
                      {formatDateTimeForDisplay(booking.preferredTime)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Navigation className="w-5 h-5 text-green-500" />
                  <div>
                    <p className="font-medium">ETA</p>
                    <p className="text-sm text-green-600 font-medium">
                      {booking.eta || "Calculating..."}
                    </p>
                    {booking.distance && booking.distance !== "Unknown" && (
                      <p className="text-xs text-gray-500">{booking.distance}</p>
                    )}
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

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              {booking.qrCodePath ? (
                <Button 
                  onClick={() => setShowQR(booking.id)} 
                  className="flex-1"
                >
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

            {/* Live Google Map for this booking */}
            {booking.id && (
              <div className="mt-6">
                <h4 className="text-lg font-medium mb-3">Live Tracking</h4>
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