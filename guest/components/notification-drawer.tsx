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
  Loader2
} from "lucide-react"
import { api } from "@/lib/api"
import { useWebSocket } from "@/context/WebSocketContext"
import { toast } from "sonner"

interface Notification {
  id: number
  title: string
  message: string
  isRead: boolean
  createdAt: string
}

interface NotificationResponse {
  notifications: Notification[]
  unreadCount: number
}

export function NotificationDrawer() {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false)
  const [hasNewNotifications, setHasNewNotifications] = useState(false)
  const { onBookingUpdate, onNotificationUpdate } = useWebSocket()

  const fetchNotifications = async () => {
    try {
      setIsLoading(true)
      const response: NotificationResponse = await api.get("/guest/notifications?page=1&limit=10")
      setNotifications(response.notifications)
      setUnreadCount(response.unreadCount)
      
      // Check if there are new unread notifications
      if (response.unreadCount > 0) {
        setHasNewNotifications(true)
        // Stop the animation after 5 seconds
        setTimeout(() => setHasNewNotifications(false), 5000)
      }
    } catch (error) {
      console.error("Error fetching notifications:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      fetchNotifications()
    }
  }, [isOpen])

  // Listen for real-time booking updates
  useEffect(() => {
    if (!onBookingUpdate) return

    const cleanup = onBookingUpdate((updatedBooking) => {
      // Refresh notifications when booking status changes
      if (isOpen) {
        fetchNotifications()
      }
    })

    return cleanup
  }, [onBookingUpdate, isOpen])

  // Listen for notification updates
  useEffect(() => {
    if (!onNotificationUpdate) return

    const cleanup = onNotificationUpdate(() => {
      // Trigger animation for new notifications
      setHasNewNotifications(true)
      setTimeout(() => setHasNewNotifications(false), 5000)
      
      // Refresh notifications if drawer is open
      if (isOpen) {
        fetchNotifications()
      }
    })

    return cleanup
  }, [onNotificationUpdate, isOpen])

  const markAsRead = async (notificationId: number) => {
    try {
      await api.put(`/guest/notifications/${notificationId}/read`, {
        headers: {
          "Content-Type": "application/json",
        },
      })
      
      // Update local state
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, isRead: true }
            : notification
        )
      )
      
      // Update unread count
      setUnreadCount(prev => Math.max(0, prev - 1))
      
      toast.success("Notification marked as read")
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
      
      // Update local state
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, isRead: true }))
      )
      
      setUnreadCount(0)
      setHasNewNotifications(false)
      toast.success("All notifications marked as read")
    } catch (error) {
      console.error("Error marking all notifications as read:", error)
    } finally {
      setIsMarkingAllRead(false)
    }
  }

  const deleteNotification = async (notificationId: number) => {
    try {
      await api.delete(`/guest/notifications/${notificationId}`)
      
      // Update local state
      setNotifications(prev => 
        prev.filter(notification => notification.id !== notificationId)
      )
      
      // Update unread count if notification was unread
      const notification = notifications.find(n => n.id === notificationId)
      if (notification && !notification.isRead) {
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
      
      toast.success("Notification deleted")
    } catch (error) {
      console.error("Error deleting notification:", error)
    }
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
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Bell className="w-12 h-12 text-gray-300 mb-4" />
              <h3 className="font-semibold text-gray-900 mb-2">No notifications</h3>
              <p className="text-sm text-gray-600">
                You're all caught up!
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.map((notification, index) => (
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
                  {index < notifications.length - 1 && (
                    <Separator className="my-2" />
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
} 