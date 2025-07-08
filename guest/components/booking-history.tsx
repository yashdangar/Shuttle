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
import { useWebSocket } from "@/context/WebSocketContext"
import { formatDateTimeForDisplay, getUserTimeZone } from "@/lib/utils"

export default function BookingHistory() {
  const [bookings, setBookings] = useState<any[]>([])
  const [showQR, setShowQR] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showReschedule, setShowReschedule] = useState(false)
  const [rescheduleBooking, setRescheduleBooking] = useState<any>(null)
  const { onBookingUpdate } = useWebSocket()

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

  // Listen for real-time booking updates via WebSocket
  useEffect(() => {
    if (!onBookingUpdate) return

    const cleanup = onBookingUpdate((updatedBooking) => {
      console.log("Received booking update in history:", updatedBooking)
      setBookings(prevBookings => 
        prevBookings.map(booking => 
          booking.id === updatedBooking.id 
            ? { ...booking, ...updatedBooking }
            : booking
        )
      )
    })

    return cleanup
  }, [onBookingUpdate])

  const getStatusColor = (booking: any) => {
    if (booking.isCancelled) return "bg-red-100 text-red-800"
    if (booking.isCompleted) return "bg-green-100 text-green-800"
    if (booking.needsFrontdeskVerification) return "bg-orange-100 text-orange-800"
    if (!booking.needsFrontdeskVerification && !booking.isVerified) return "bg-blue-100 text-blue-800"
    if (booking.isVerified) return "bg-green-100 text-green-800"
    if (booking.isPaid) return "bg-blue-100 text-blue-800"
    return "bg-yellow-100 text-yellow-800"
  }

  const getStatusText = (booking: any) => {
    if (booking.isCancelled) return "Cancelled"
    if (booking.isCompleted) return "Completed"
    if (booking.needsFrontdeskVerification) return "Pending Verification"
    if (!booking.needsFrontdeskVerification && !booking.isVerified) return "Frontdesk Verified"
    if (booking.isVerified) return "Driver Checked In"
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
    return formatDateTimeForDisplay(dateString)
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
          <Skeleton className="h-6 sm:h-8 w-32 sm:w-48" />
          <Skeleton className="h-3 sm:h-4 w-24 sm:w-32" />
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
        <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Clock className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400" />
        </div>
        <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">No Booking History</h3>
        <p className="text-sm sm:text-base text-gray-600">Your completed bookings will appear here.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Timezone Info */}
      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-blue-900 text-xs sm:text-sm">
        All times shown in your local timezone: <b>{getUserTimeZone()}</b>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Booking History</h2>
        <p className="text-sm sm:text-base text-gray-600">{bookings.length} total bookings</p>
      </div>

      {bookings.map((booking) => (
        <Card key={booking.id}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base sm:text-lg">Booking {booking.id.slice(0, 8)}...</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Created: {formatDateTime(booking.createdAt)}
                </CardDescription>
              </div>
              <div className="flex items-center space-x-2">
                <Badge className={`${getStatusColor(booking)} text-xs sm:text-sm`}>
                  {getStatusText(booking)}
                </Badge>
                {booking.qrCodePath && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleShowQR(booking)}
                    className="text-xs sm:text-sm"
                  >
                    <QrCode className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
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
                      <p className="text-xs sm:text-sm font-semibold text-red-800">
                        {getCancelledByText(booking.cancelledBy)}
                      </p>
                      {booking.cancellationReason && (
                        <p className="text-xs sm:text-sm text-red-700 mt-1">
                          <strong>Reason:</strong> {booking.cancellationReason}
                        </p>
                      )}
                    </div>
                  </div>
              </div>
            )}
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4 text-xs sm:text-sm">
              <div className="flex items-center space-x-3">
                <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                <div>
                  <p className="text-sm sm:text-base font-medium">Trip Type</p>
                  <div className="flex items-center gap-2">
                    <p className="text-xs sm:text-sm text-gray-600">
                      {getBookingTypeText(booking.bookingType)}
                    </p>
                    {booking.isParkSleepFly && (
                      <Badge className="bg-blue-100 text-blue-800 text-xs">
                        🏨✈️ PSF
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
                <div>
                  <p className="text-sm sm:text-base font-medium">Preferred Time</p>
                  <p className="text-xs sm:text-sm text-gray-600">{formatDateTime(booking.preferredTime)}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Users className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
                <div>
                  <p className="text-sm sm:text-base font-medium">Passengers & Bags</p>
                  <p className="text-xs sm:text-sm text-gray-600">{booking.numberOfPersons} person(s), {booking.numberOfBags} bag(s)</p>
                </div>
              </div>
            </div>
            
            {booking.isParkSleepFly && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <span className="text-base sm:text-lg">🏨✈️</span>
                  <p className="text-xs sm:text-sm text-blue-800 font-medium">
                    Park, Sleep & Fly Package
                  </p>
                </div>
                <p className="text-xs text-blue-700 mt-1">
                  This booking was part of your Park, Sleep & Fly package with pre-paid accommodation and shuttle service.
                </p>
              </div>
            )}
            
            <div className="grid md:grid-cols-2 gap-4 text-xs sm:text-sm mt-4">
              <div className="flex items-center space-x-2">
                <div>
                  <p className="text-sm sm:text-base font-medium">Payment Method</p>
                  <p className="text-xs sm:text-sm text-gray-600">{booking.paymentMethod}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div>
                  <p className="text-sm sm:text-base font-medium">Last Updated</p>
                  <p className="text-xs sm:text-sm text-gray-600">
                    {formatDateTime(booking.updatedAt)}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Notes Section */}
            {booking.notes && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg border">
                <p className="text-xs sm:text-sm font-medium text-gray-700 mb-1">Notes:</p>
                <p className="text-xs sm:text-sm text-gray-600 whitespace-pre-wrap">{booking.notes}</p>
              </div>
            )}
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

