"use client"

import { useState, useEffect } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  Bell, 
  Check, 
  Trash2, 
  CheckCheck, 
  Clock, 
  CheckCircle,
  XCircle,
  Info,
  Loader2,
  ExternalLink,
  X
} from "lucide-react"
import { api } from "@/lib/api"
import { useWebSocket } from "@/context/WebSocketContext"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

interface Notification {
  id: number
  title: string
  message: string
  isRead: boolean
  createdAt: string
}

export function NotificationDrawer() {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false)
  const [hasNewNotifications, setHasNewNotifications] = useState(false)
  const { notifications, refreshNotifications, onBookingUpdate, onNotificationUpdate } = useWebSocket()
  const router = useRouter()

  // Use notifications from WebSocket context
  const displayNotifications = notifications as Notification[]
  const unreadCount = displayNotifications.filter((n) => !n.isRead).length

  useEffect(() => {
    if (isOpen) {
      refreshNotifications()
    }
  }, [isOpen, refreshNotifications])

  // Listen for real-time booking updates
  useEffect(() => {
    if (!onBookingUpdate) return

    const cleanup = onBookingUpdate((updatedBooking) => {
      // Refresh notifications when booking status changes
      if (isOpen) {
        refreshNotifications()
      }
    })

    return cleanup
  }, [onBookingUpdate, isOpen, refreshNotifications])

  // Listen for notification updates
  useEffect(() => {
    if (!onNotificationUpdate) return

    const cleanup = onNotificationUpdate(() => {
      // Trigger animation for new notifications
      setHasNewNotifications(true)
      setTimeout(() => setHasNewNotifications(false), 5000)
      
      // Refresh notifications if drawer is open
      if (isOpen) {
        refreshNotifications()
      }
    })

    return cleanup
  }, [onNotificationUpdate, isOpen, refreshNotifications])

  const markAsRead = async (notificationId: number) => {
    try {
      await api.put(`/guest/notifications/${notificationId}/read`, {
        headers: {
          "Content-Type": "application/json",
        },
      })
      
      toast.success("Notification marked as read")
      
      // Refresh notifications to update the list
      await refreshNotifications()
    } catch (error) {
      console.error("Error marking notification as read:", error)
    }
  }

  const markAllAsRead = async () => {
    try {
      setIsMarkingAllRead(true)
      await api.put("/guest/notifications/read-all", {
        headers: {
          "Content-Type": "application/json",
        },
      })
      
      setHasNewNotifications(false)
      toast.success("All notifications marked as read")
      
      // Refresh notifications to update the list
      await refreshNotifications()
    } catch (error) {
      console.error("Error marking all notifications as read:", error)
    } finally {
      setIsMarkingAllRead(false)
    }
  }

  const deleteNotification = async (notificationId: number) => {
    try {
      await api.delete(`/guest/notifications/${notificationId}`)
      
      toast.success("Notification deleted")
      
      // Refresh notifications to update the list
      await refreshNotifications()
    } catch (error) {
      console.error("Error deleting notification:", error)
    }
  }

  const handleViewAllNotifications = () => {
    setIsOpen(false)
    router.push("/notifications")
  }

  const getNotificationIcon = (title: string) => {
    if (title.includes("Completed") || title.includes("Check-in")) {
      return <CheckCircle className="w-4 h-4 text-green-600" />
    }
    if (title.includes("Cancelled") || title.includes("Rejected")) {
      return <XCircle className="w-4 h-4 text-red-600" />
    }
    if (title.includes("Verified") || title.includes("Assigned")) {
      return <CheckCircle className="w-4 h-4 text-blue-600" />
    }
    return <Info className="w-4 h-4 text-gray-600" />
  }

  const formatTimeAgo = (dateString: string) => {
    const now = new Date()
    const date = new Date(dateString)
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) return "Just now"
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`
    return date.toLocaleDateString()
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <TooltipProvider>
        <Tooltip delayDuration={200}>
          <TooltipTrigger asChild>
            <SheetTrigger asChild>
              <Button
                aria-label="Open notifications"
                variant="ghost"
                size="sm"
                className={`relative transition-all duration-200 hover:bg-blue-50 dark:hover:bg-blue-950 ${
                  hasNewNotifications ? 'notification-pulse notification-button-glow' : ''
                }`}
              >
                <Bell
                  className={`w-5 h-5 transition-all duration-200 ${
                    hasNewNotifications ? 'text-blue-600 bell-shake' : 'text-gray-600'
                  }`}
                />
                {unreadCount > 0 && (
                  <Badge
                    variant="destructive"
                    className={`absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs font-bold transition-all duration-200 ${
                      hasNewNotifications ? 'notification-badge-glow' : ''
                    }`}
                  >
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
          </TooltipTrigger>
          <TooltipContent sideOffset={6}>Notifications</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <SheetContent side="right" className="w-[380px] sm:w-[420px] p-0">
        <div className="relative flex h-full flex-col">
          <div className="sticky top-0 z-10 border-b backdrop-blur supports-[backdrop-filter]:bg-white/70 dark:supports-[backdrop-filter]:bg-gray-900/60">
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                  <Bell className="h-4 w-4" />
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Notifications</span>
                  {unreadCount > 0 && (
                    <Badge variant="secondary" className="text-xs">{unreadCount} new</Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <TooltipProvider>
                    <Tooltip delayDuration={200}>
                      <TooltipTrigger asChild>
                        <Button
                          aria-label="Mark all as read"
                          onClick={markAllAsRead}
                          disabled={isMarkingAllRead}
                          variant="ghost"
                          size="sm"
                          className="hidden h-8 px-2 sm:flex"
                        >
                          {isMarkingAllRead ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <CheckCheck className="w-4 h-4" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent sideOffset={6}>Mark all as read</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                <SheetClose asChild>
                  <Button
                    aria-label="Close notifications"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 sm:hidden"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </SheetClose>
              </div>
            </div>
          </div>

          <ScrollArea className="flex-1 px-4 py-4">
          {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="rounded-xl border p-4">
                    <div className="flex items-start gap-3">
                      <Skeleton className="h-4 w-4 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-2/3" />
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-3 w-1/3" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
          ) : displayNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Bell className="w-12 h-12 text-gray-300 mb-4" />
              <h3 className="font-semibold text-gray-900 mb-2">No notifications</h3>
              <p className="text-sm text-gray-600">
                You're all caught up!
              </p>
            </div>
          ) : (
              <div className="space-y-3">
              {displayNotifications.slice(0, 5).map((notification, index) => (
                <div key={notification.id}>
                    <div
                      className={cn(
                        "group relative overflow-hidden rounded-xl border p-4 transition-all",
                        "bg-white/70 dark:bg-gray-900/50 backdrop-blur-sm shadow-sm hover:shadow-md",
                        !notification.isRead
                          ? "border-blue-200 ring-1 ring-blue-100"
                          : "border-gray-200/60"
                      )}
                    >
                      <div
                        className={cn(
                          "absolute left-0 top-0 h-full w-1",
                          !notification.isRead
                            ? "bg-gradient-to-b from-blue-500 to-blue-300"
                            : "bg-gray-200"
                        )}
                      />
                      <div className="flex items-start gap-3">
                        {getNotificationIcon(notification.title)}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="mb-1 line-clamp-1 text-sm font-semibold text-gray-900 dark:text-gray-100">
                                {notification.title}
                              </h4>
                              <p className="mb-2 line-clamp-3 text-xs text-gray-600 dark:text-gray-300">
                                {notification.message}
                              </p>
                              <div className="flex items-center gap-1 text-[11px] text-gray-500">
                                <Clock className="h-3 w-3" />
                                <span>{formatTimeAgo(notification.createdAt)}</span>
                              </div>
                            </div>
                            <div className="ml-2 flex items-center gap-1">
                              {!notification.isRead && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        aria-label="Mark as read"
                                        onClick={() => markAsRead(notification.id)}
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 p-0 hover:bg-blue-50 dark:hover:bg-blue-950"
                                      >
                                        <Check className="h-3.5 w-3.5" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent sideOffset={6}>Mark as read</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      aria-label="Delete notification"
                                      onClick={() => deleteNotification(notification.id)}
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent sideOffset={6}>Delete</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </div>
                        </div>
                        {!notification.isRead && (
                          <span className="ml-1 mt-1 inline-flex h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                        )}
                      </div>
                    </div>
                    {index < Math.min(displayNotifications.length, 5) - 1 && (
                      <Separator className="my-2 opacity-50" />
                    )}
                </div>
              ))}
            </div>
          )}
          </ScrollArea>

          {displayNotifications.length > 0 && (
            <div className="sticky bottom-0 z-10 border-t bg-gradient-to-t from-white/80 to-white/40 px-4 py-3 backdrop-blur dark:from-gray-900/80 dark:to-gray-900/40">
              <Button
                variant="outline"
                className="w-full border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                onClick={handleViewAllNotifications}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                View All Notifications ({displayNotifications.length})
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
} 