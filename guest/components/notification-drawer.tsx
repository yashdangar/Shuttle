"use client"

import { useState, useEffect } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
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
  ExternalLink
} from "lucide-react"
import { api } from "@/lib/api"
import { useWebSocket } from "@/context/WebSocketContext"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

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
      <SheetTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className={`relative transition-all duration-200 hover:bg-blue-50 dark:hover:bg-blue-950 ${
            hasNewNotifications ? 'notification-pulse notification-button-glow' : ''
          }`}
        >
          <Bell 
            className={`w-5 h-5 transition-all duration-200 ${
              hasNewNotifications 
                ? 'text-blue-600 bell-shake' 
                : 'text-gray-600'
            }`}
          />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className={`absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs font-bold transition-all duration-200 ${
                hasNewNotifications 
                  ? 'notification-badge-glow' 
                  : ''
              }`}
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-96 sm:w-[400px]">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Bell className="w-5 h-5" />
              <span>Notifications</span>
              {unreadCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {unreadCount} new
                </Badge>
              )}
            </div>
            {unreadCount > 0 && (
              <Button
                onClick={markAllAsRead}
                disabled={isMarkingAllRead}
                variant="ghost"
                size="sm"
                className="h-8 px-2"
              >
                {isMarkingAllRead ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCheck className="w-4 h-4" />
                )}
              </Button>
            )}
          </SheetTitle>
        </SheetHeader>
        
        <ScrollArea className="h-[calc(100vh-120px)] mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
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
            <div className="space-y-2">
              {displayNotifications.slice(0, 5).map((notification, index) => (
                <div key={notification.id}>
                  <div className={`p-4 rounded-lg transition-all duration-200 ${
                    !notification.isRead 
                      ? 'bg-blue-50 border-l-4 border-l-blue-500' 
                      : 'bg-gray-50'
                  }`}>
                    <div className="flex items-start space-x-3">
                      {getNotificationIcon(notification.title)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-sm text-gray-900 mb-1">
                              {notification.title}
                            </h4>
                            <p className="text-xs text-gray-600 mb-2">
                              {notification.message}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatTimeAgo(notification.createdAt)}
                            </p>
                          </div>
                          <div className="flex items-center space-x-1 ml-2">
                            {!notification.isRead && (
                              <Button
                                onClick={() => markAsRead(notification.id)}
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                              >
                                <Check className="w-3 h-3" />
                              </Button>
                            )}
                            <Button
                              onClick={() => deleteNotification(notification.id)}
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  {index < Math.min(displayNotifications.length, 5) - 1 && (
                    <Separator className="my-2" />
                  )}
                </div>
              ))}
              
              {/* View All Notifications Button */}
              {displayNotifications.length > 0 && (
                <div className="pt-4 border-t border-gray-200">
                  <Button
                    variant="outline"
                    className="w-full bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700"
                    onClick={handleViewAllNotifications}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View All Notifications ({displayNotifications.length})
                  </Button>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
} 