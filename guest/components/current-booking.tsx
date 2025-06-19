"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MapPin, Clock, QrCode, Navigation, Phone, Users } from "lucide-react"
import { QRCodeDisplay } from "./qr-code-display"

interface CurrentBookingProps {
  booking: any
  onNewBooking: () => void
}

export default function CurrentBooking({ booking, onNewBooking }: CurrentBookingProps) {
  const [eta, setEta] = useState("12 min")
  const [showQR, setShowQR] = useState(false)

  useEffect(() => {
    if (booking) {
      // Debug: Log booking data to understand structure
      console.log("Current booking data:", booking);
      console.log("QR Code Path:", booking.qrCodePath);
      
      // Simulate ETA updates every minute
      const interval = setInterval(() => {
        const minutes = Math.floor(Math.random() * 15) + 5
        setEta(`${minutes} min`)
      }, 60000)

      return () => clearInterval(interval)
    }
  }, [booking])

  if (!booking) {
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
      {/* Main Booking Card */}
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Current Booking</CardTitle>
              <CardDescription>Booking ID: {booking.id}</CardDescription>
            </div>
            <Badge variant={
              booking.isCancelled ? "destructive" : 
              booking.isCompleted ? "default" : 
              booking.isPaid ? "secondary" : "outline"
            } className="text-sm">
              {booking.isCancelled ? "Cancelled" : 
               booking.isCompleted ? "Completed" : 
               booking.isPaid ? "Paid" : "Pending"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <MapPin className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="font-medium">Trip Type</p>
                  <p className="text-sm text-gray-600">
                    {booking.bookingType === "HOTEL_TO_AIRPORT" ? "Hotel to Airport" : "Airport to Hotel"}
                  </p>
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
                    {new Date(booking.preferredTime).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Navigation className="w-5 h-5 text-green-500" />
                <div>
                  <p className="font-medium">ETA</p>
                  <p className="text-sm text-green-600 font-medium">{eta}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            {booking.qrCodePath ? (
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
        </CardHeader>
        <CardContent>
          <div className="bg-gray-100 rounded-lg p-6 text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Navigation className="w-8 h-8 text-blue-600" />
            </div>
            <p className="text-lg font-medium mb-2">Shuttle is on the way</p>
            <p className="text-gray-600">Driver will arrive in approximately {eta}</p>
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
        </CardContent>
      </Card>

      {/* QR Code Modal - Always render, let component handle missing qrCodePath */}
      <QRCodeDisplay
        qrCodePath={booking.qrCodePath || ""}
        bookingId={booking.id}
        isOpen={showQR}
        onClose={() => setShowQR(false)}
      />
    </div>
  )
}
