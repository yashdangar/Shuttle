"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MapPin, Clock, Users, MoreHorizontal } from "lucide-react"
import { api } from "@/lib/api"

export default function BookingHistory() {
  const [bookings, setBookings] = useState<any[]>([])

  useEffect(() => {
    const getHistory = async () => {
      const response = await api.get("/guest/get-trips")
      setBookings(response.trips)
    }
    getHistory()
    //  setBookings(history)
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800"
      case "confirmed":
        return "bg-blue-100 text-blue-800"
      case "cancelled":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  if (bookings.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Clock className="w-12 h-12 text-gray-400" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">No Booking History</h3>
        <p className="text-gray-600">Your completed bookings will appear here.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Booking History</h2>
        <p className="text-gray-600">{bookings.length} total bookings</p>
      </div>

      {bookings.map((booking) => (
        <Card key={booking.id}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Booking {booking.id}</CardTitle>
                <CardDescription>{new Date(booking.createdAt).toLocaleDateString()}</CardDescription>
              </div>
              <div className="flex items-center space-x-2">
                <Badge className={getStatusColor(booking.status)}>{booking.status}</Badge>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="font-medium">Route</p>
                  <p className="text-gray-600">
                    {booking.pickup} → {booking.destination}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="font-medium">Scheduled</p>
                  <p className="text-gray-600">{booking.scheduledTime}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="font-medium">Passengers</p>
                  <p className="text-gray-600">{booking.passengers}</p>
                </div>
              </div>
            </div>
            {booking.notes && (
              <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">{booking.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
