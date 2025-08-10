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
import { Separator } from "@/components/ui/separator"
import { MapPin, Clock, Users, MoreHorizontal, QrCode, X, Calendar, UserX, Building, AlertCircle, CreditCard } from "lucide-react"
import { api } from "@/lib/api"
import { QRCodeDisplay } from "./qr-code-display"
// Reschedule removed
import { toast } from "sonner"
import { useWebSocket } from "@/context/WebSocketContext"
import { formatDateTimeForDisplay, getUserTimeZone } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"

export default function BookingHistory() {
  const [bookings, setBookings] = useState<any[]>([])
  const [showQR, setShowQR] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  // Reschedule removed
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

  // Motion variants
  const containerVariants = {
    hidden: {},
    visible: {
      transition: { staggerChildren: 0.07, delayChildren: 0.04 },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 12, filter: "blur(4px)" },
    visible: { opacity: 1, y: 0, filter: "blur(0px)" },
    exit: { opacity: 0, y: 8, filter: "blur(2px)" },
  }

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

  const getAccent = (booking: any) => {
    if (booking.isCancelled) return {
      ring: "ring-red-200 dark:ring-red-900/30",
      strip: "before:bg-gradient-to-r before:from-red-500/40 before:via-red-400/30 before:to-red-300/20",
    }
    if (booking.isCompleted || booking.isVerified) return {
      ring: "ring-green-200 dark:ring-green-900/30",
      strip: "before:bg-gradient-to-r before:from-green-500/40 before:via-emerald-400/30 before:to-teal-300/20",
    }
    if (booking.needsFrontdeskVerification) return {
      ring: "ring-orange-200 dark:ring-orange-900/30",
      strip: "before:bg-gradient-to-r before:from-orange-500/40 before:via-amber-400/30 before:to-yellow-300/20",
    }
    if (booking.seatsHeld && !booking.seatsConfirmed) return {
      ring: "ring-yellow-200 dark:ring-yellow-900/30",
      strip: "before:bg-gradient-to-r before:from-yellow-500/40 before:via-amber-400/30 before:to-orange-300/20",
    }
    return {
      ring: "ring-blue-200 dark:ring-blue-900/30",
      strip: "before:bg-gradient-to-r before:from-blue-500/40 before:via-purple-500/30 before:to-cyan-300/20",
    }
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

  // Reschedule removed

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
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 sm:h-8 w-32 sm:w-48" />
          <Skeleton className="h-3 sm:h-4 w-24 sm:w-32" />
        </div>
        
        {[1, 2, 3].map((i) => (
          <Card key={i} className="relative overflow-hidden rounded-xl border bg-white/60 shadow-sm transition-all hover:shadow-md dark:bg-neutral-900/60 before:absolute before:inset-x-0 before:top-0 before:h-0.5 before:bg-gradient-to-r before:from-blue-500/40 before:via-purple-500/40 before:to-cyan-500/40">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-6 w-40" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <div className="flex items-center space-x-2">
                  <Skeleton className="h-6 w-16 rounded-full" />
                  <Skeleton className="h-8 w-20 rounded-full" />
                  <Skeleton className="h-8 w-8 rounded-full" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-5">
                <div className="flex items-center space-x-3">
                  <Skeleton className="w-5 h-5 rounded" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-3 w-28" />
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Skeleton className="w-5 h-5 rounded" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Skeleton className="w-5 h-5 rounded" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4 mt-5">
                <div className="space-y-1">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <div className="space-y-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-28" />
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
      <motion.div
        className="text-center py-12"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
          <Clock className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400" />
        </div>
        <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">No Booking History</h3>
        <p className="text-sm sm:text-base text-gray-600">Your completed bookings will appear here.</p>
      </motion.div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Timezone Info */}
      <motion.div
        className="mb-2 p-3 rounded-lg border bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-900 text-xs sm:text-sm ring-1 ring-blue-100"
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
      >
        All times shown in your local timezone: <b>{getUserTimeZone()}</b>
      </motion.div>

      <div className="flex items-center justify-between">
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900">Booking History</h2>
        <p className="text-sm sm:text-base text-gray-600">{bookings.length} total bookings</p>
      </div>

      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-5">
      {bookings.map((booking) => (
        <motion.div key={booking.id} variants={itemVariants} whileHover={{ y: -2 }} transition={{ duration: 0.25, ease: "easeOut" }}>
        <Card className="group relative overflow-hidden rounded-xl border bg-white/60 text-gray-900 shadow-sm transition-all hover:shadow-md dark:bg-neutral-900/60 before:absolute before:inset-x-0 before:top-0 before:h-0.5 before:bg-gradient-to-r before:from-blue-500/40 before:via-purple-500/40 before:to-cyan-500/40">
          <CardHeader className="pb-3 sm:pb-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <CardTitle className="text-base sm:text-lg"><span className="text-gray-500">Booking</span> <span className="font-mono text-gray-900">{booking.id.slice(0, 8)}...</span></CardTitle>
                <CardDescription className="mt-0.5 text-xs sm:text-sm">
                  Created: {formatDateTime(booking.createdAt)}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={`${getStatusColor(booking)} rounded-full px-2.5 py-1 text-xs sm:text-sm shadow-sm ring-1 ring-black/5`}>
                  {getStatusText(booking)}
                </Badge>
                {booking.qrCodePath && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleShowQR(booking)}
                    className="text-xs sm:text-sm rounded-full"
                    aria-label="View QR Code"
                  >
                    <QrCode className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                    QR Code
                  </Button>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="rounded-full">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {canModifyBooking(booking) && (
                      <>
                        {/* Reschedule removed */}
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
            <AnimatePresence initial={false}>
              {booking.isCancelled && (
                <motion.div
                  className="bg-red-50/80 border-t border-red-200 px-6 py-3 mt-4"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                >
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
                </motion.div>
              )}
            </AnimatePresence>

            {/* Seat Hold Status */}
            <AnimatePresence initial={false}>
              {booking.seatsHeld && !booking.seatsConfirmed && (
                <motion.div
                  className="bg-yellow-50/80 border-t border-yellow-200 px-6 py-3 mt-4"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <Clock className="w-4 h-4 text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm font-semibold text-yellow-800">
                        🪑 Seats Temporarily Held
                      </p>
                      <p className="text-xs sm:text-sm text-yellow-700 mt-1">
                        {booking.seatsHeldUntil ? (
                          `Your seats are held until ${new Date(booking.seatsHeldUntil).toLocaleTimeString()}. 
                          Please wait for frontdesk verification to confirm your booking.`
                        ) : (
                          "Your seats are temporarily held. Please wait for frontdesk verification to confirm your booking."
                        )}
                      </p>
                      {booking.shuttle && (
                        <p className="text-xs sm:text-sm text-yellow-700 mt-1">
                          🚐 Assigned to shuttle: {booking.shuttle.vehicleNumber}
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence initial={false}>
              {booking.seatsConfirmed && (
                <motion.div
                  className="bg-green-50/80 border-t border-green-200 px-6 py-3 mt-4"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <AlertCircle className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm font-semibold text-green-800">
                        ✅ Seats Confirmed
                      </p>
                      <p className="text-xs sm:text-sm text-green-700 mt-1">
                        Your seats have been confirmed by the frontdesk.
                        {booking.seatsConfirmedAt && (
                          ` Confirmed at ${new Date(booking.seatsConfirmedAt).toLocaleTimeString()}.`
                        )}
                      </p>
                      {booking.shuttle && (
                        <p className="text-xs sm:text-sm text-green-700 mt-1">
                          🚐 Confirmed on shuttle: {booking.shuttle.vehicleNumber}
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-5 text-xs sm:text-sm">
              <div className="flex items-center space-x-3">
                <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                <div>
                  <p className="text-sm sm:text-base font-medium">Trip Type</p>
                  <div className="mt-0.5 flex items-center gap-2">
                    <p className="text-xs sm:text-sm text-gray-600">
                      {getBookingTypeText(booking.bookingType)}
                    </p>
                    {booking.isParkSleepFly && (
                      <Badge className="bg-blue-100 text-blue-800 text-xs rounded-full">
                        🏨✈️ PSF
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                <div>
                  <p className="text-sm sm:text-base font-medium">Preferred Time</p>
                  <p className="mt-0.5 text-xs sm:text-sm text-gray-600">{formatDateTime(booking.preferredTime)}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Users className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                <div>
                  <p className="text-sm sm:text-base font-medium">Passengers & Bags</p>
                  <p className="mt-0.5 text-xs sm:text-sm text-gray-600">{booking.numberOfPersons} person(s), {booking.numberOfBags} bag(s)</p>
                </div>
              </div>
            </div>
            
            {booking.isParkSleepFly && (
              <div className="mt-4 p-3 rounded-lg border bg-blue-50/80 ring-1 ring-blue-100">
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
            
            <div className="grid md:grid-cols-2 gap-5 text-xs sm:text-sm mt-4">
              <div className="flex items-center space-x-3">
                <div>
                  <p className="text-sm sm:text-base font-medium">Payment Method</p>
                  <p className="mt-0.5 text-xs sm:text-sm text-gray-600">{booking.paymentMethod}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div>
                  <p className="text-sm sm:text-base font-medium">Last Updated</p>
                  <p className="mt-0.5 text-xs sm:text-sm text-gray-600">
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
        </motion.div>
      ))}
      </motion.div>

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

      {/* Reschedule removed */}
    </div>
  )
}

