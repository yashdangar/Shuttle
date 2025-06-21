"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MapPin, Clock, Users, MoreHorizontal, QrCode, X, Calendar, UserX, Building, AlertCircle } from "lucide-react"
import { api } from "@/lib/api"
import { QRCodeDisplay } from "./qr-code-display"
import { RescheduleModal } from "./reschedule-modal"
import { toast } from "sonner"

export default function BookingHistory() {
  const [bookings, setBookings] = useState<any[]>([])
  const [showQR, setShowQR] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showReschedule, setShowReschedule] = useState(false)
  const [rescheduleBooking, setRescheduleBooking] = useState<any>(null)

  useEffect(() => {
    const getHistory = async () => {
      try {
        setIsLoading(true)
        const response = await api.get("/guest/get-trips")
        setBookings(response.trips)
      } catch (error) {
        console.error("Error fetching booking history:", error)
      } finally {
        setIsLoading(false)
      }
    }
    getHistory()
  }, [])

  const getStatusColor = (booking: any) => {
    if (booking.isCancelled) return "bg-red-100 text-red-800"
    if (booking.isCompleted) return "bg-green-100 text-green-800"
    if (booking.isPaid) return "bg-blue-100 text-blue-800"
    return "bg-yellow-100 text-yellow-800"
  }

  const getStatusText = (booking: any) => {
    if (booking.isCancelled) return "Cancelled"
    if (booking.isCompleted) return "Completed"
    if (booking.isPaid) return "Paid"
    return "Pending"
  }

  const getBookingTypeText = (bookingType: string) => {
    switch (bookingType) {
      case "HOTEL_TO_AIRPORT":
        return "Hotel to Airport"
      case "AIRPORT_TO_HOTEL":
        return "Airport to Hotel"
      default:
        return bookingType
    }
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const handleShowQR = (booking: any) => {
    setSelectedBooking(booking)
    setShowQR(true)
  }

  const handleCancelBooking = async (bookingId: string) => {
    try {
      await api.put(`/guest/bookings/${bookingId}/cancel`, {})
      toast.success("Booking cancelled successfully")
      // Refresh the bookings list
      const response = await api.get("/guest/get-trips")
      setBookings(response.trips)
    } catch (error: any) {
      console.error("Error cancelling booking:", error)
      toast.error(error.message || "Failed to cancel booking")
    }
  }

  const handleRescheduleBooking = (booking: any) => {
    setRescheduleBooking(booking)
    setShowReschedule(true)
  }

  const handleRescheduleSuccess = async () => {
    // Refresh the bookings list
    try {
      const response = await api.get("/guest/get-trips")
      setBookings(response.trips)
    } catch (error) {
      console.error("Error refreshing bookings:", error)
    }
  }

  const canModifyBooking = (booking: any) => {
    return !booking.isCompleted && !booking.isCancelled
  }

  const getCancelledByText = (actor: string) => {
    switch (actor) {
      case "GUEST": return "Cancelled by You";
      case "DRIVER": return "Cancelled by Driver";
      case "FRONTDESK": return "Cancelled by Frontdesk";
      case "SYSTEM": return "Cancelled by System";
      default: return `Cancelled by ${actor}`;
    }
  }

  const getCancelledByIcon = (actor: string) => {
    switch (actor) {
      case "GUEST": return <UserX className="w-4 h-4 text-red-500" />;
      case "DRIVER": return <UserX className="w-4 h-4 text-red-500" />;
      case "FRONTDESK": return <Building className="w-4 h-4 text-red-500" />;
      case "SYSTEM": return <AlertCircle className="w-4 h-4 text-red-500" />;
      default: return <UserX className="w-4 h-4 text-red-500" />;
    }
  }

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-6 w-40" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <div className="flex items-center space-x-2">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="h-8 w-8" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="flex items-center space-x-2">
                  <Skeleton className="w-4 h-4 rounded" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Skeleton className="w-4 h-4 rounded" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-3 w-28" />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Skeleton className="w-4 h-4 rounded" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4 mt-4">
                <div className="space-y-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <div className="space-y-1">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
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
                <CardTitle className="text-lg">Booking {booking.id.slice(0, 8)}...</CardTitle>
                <CardDescription>
                  Created: {formatDateTime(booking.createdAt)}
                </CardDescription>
              </div>
              <div className="flex items-center space-x-2">
                <Badge className={getStatusColor(booking)}>
                  {getStatusText(booking)}
                </Badge>
                {booking.qrCodePath && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleShowQR(booking)}
                  >
                    <QrCode className="w-4 h-4 mr-1" />
                    QR Code
                  </Button>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {canModifyBooking(booking) && (
                      <>
                        <DropdownMenuItem 
                          onClick={() => handleRescheduleBooking(booking)}
                          className="cursor-pointer"
                        >
                          <Calendar className="w-4 h-4 mr-2" />
                          Reschedule
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleCancelBooking(booking.id)}
                          className="cursor-pointer text-red-600"
                        >
                          <X className="w-4 h-4 mr-2" />
                          Cancel Booking
                        </DropdownMenuItem>
                      </>
                    )}
                    {!canModifyBooking(booking) && (
                      <DropdownMenuItem disabled>
                        No actions available
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            {booking.isCancelled && (
              <div className="bg-red-50 border-t border-red-200 px-6 py-3 mt-4">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    {getCancelledByIcon(booking.cancelledBy)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-red-800">
                      {getCancelledByText(booking.cancelledBy)}
                    </p>
                    {booking.cancellationReason && (
                      <p className="text-sm text-red-700 mt-1">
                        <strong>Reason:</strong> {booking.cancellationReason}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="font-medium">Trip Type</p>
                  <p className="text-gray-600">
                    {getBookingTypeText(booking.bookingType)}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="font-medium">Preferred Time</p>
                  <p className="text-gray-600">
                    {formatDateTime(booking.preferredTime)}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="font-medium">Passengers & Bags</p>
                  <p className="text-gray-600">
                    {booking.numberOfPersons} person(s), {booking.numberOfBags} bag(s)
                  </p>
                </div>
              </div>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4 text-sm mt-4">
              <div className="flex items-center space-x-2">
                <div>
                  <p className="font-medium">Payment Method</p>
                  <p className="text-gray-600">{booking.paymentMethod}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div>
                  <p className="font-medium">Last Updated</p>
                  <p className="text-gray-600">
                    {formatDateTime(booking.updatedAt)}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* QR Code Modal */}
      {selectedBooking && (
        <QRCodeDisplay
          qrCodePath={selectedBooking.qrCodePath || ""}
          bookingId={selectedBooking.id}
          isOpen={showQR}
          onClose={() => {
            setShowQR(false)
            setSelectedBooking(null)
          }}
        />
      )}

      {/* Reschedule Modal */}
      {rescheduleBooking && (
        <RescheduleModal
          isOpen={showReschedule}
          onClose={() => {
            setShowReschedule(false)
            setRescheduleBooking(null)
          }}
          bookingId={rescheduleBooking.id}
          currentTime={rescheduleBooking.preferredTime}
          onSuccess={handleRescheduleSuccess}
        />
      )}
    </div>
  )
}
