"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Check, Trash2, Bell, AlertCircle, Info } from "lucide-react"

const notifications = [
  {
    id: 1,
    title: "New Booking Request",
    message: "Sarah Johnson has requested a shuttle booking for tomorrow at 3:15 PM",
    createdAt: "2024-01-15 10:30",
    isRead: false,
    type: "booking",
  },
  {
    id: 2,
    title: "Driver Check-in",
    message: "John Doe has checked in for his shift on Shuttle SH-001",
    createdAt: "2024-01-15 09:15",
    isRead: false,
    type: "info",
  },
  {
    id: 3,
    title: "Maintenance Alert",
    message: "Shuttle SH-003 is due for scheduled maintenance next week",
    createdAt: "2024-01-15 08:45",
    isRead: true,
    type: "alert",
  },
  {
    id: 4,
    title: "Payment Confirmation",
    message: "Payment received for booking #1234 - Mike Davis",
    createdAt: "2024-01-14 16:20",
    isRead: true,
    type: "info",
  },
  {
    id: 5,
    title: "Trip Completed",
    message: "Trip to Airport Terminal 1 completed successfully",
    createdAt: "2024-01-14 14:30",
    isRead: true,
    type: "info",
  },
]

export default function NotificationsPage() {
  const [notificationList, setNotificationList] = useState(notifications)
  const { toast } = useToast()

  const markAsRead = (id: number) => {
    setNotificationList((prev) =>
      prev.map((notification) => (notification.id === id ? { ...notification, isRead: true } : notification)),
    )
    toast({
      title: "Marked as read",
      description: "Notification has been marked as read.",
    })
  }

  const deleteNotification = (id: number) => {
    setNotificationList((prev) => prev.filter((notification) => notification.id !== id))
    toast({
      title: "Notification deleted",
      description: "Notification has been removed.",
    })
  }

  const getIcon = (type: string) => {
    switch (type) {
      case "booking":
        return <Bell className="h-5 w-5 text-blue-600" />
      case "alert":
        return <AlertCircle className="h-5 w-5 text-orange-600" />
      default:
        return <Info className="h-5 w-5 text-gray-600" />
    }
  }

  const unreadCount = notificationList.filter((n) => !n.isRead).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-600">
            Stay updated with your shuttle operations
            {unreadCount > 0 && (
              <Badge className="ml-2" variant="secondary">
                {unreadCount} unread
              </Badge>
            )}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {notificationList.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Bell className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications</h3>
              <p className="text-gray-600 text-center">You're all caught up! New notifications will appear here.</p>
            </CardContent>
          </Card>
        ) : (
          notificationList.map((notification) => (
            <Card
              key={notification.id}
              className={`transition-all hover:shadow-md ${
                !notification.isRead ? "border-l-4 border-l-blue-500 bg-blue-50/30" : ""
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 mt-1">{getIcon(notification.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className={`font-medium ${!notification.isRead ? "text-gray-900" : "text-gray-700"}`}>
                          {notification.title}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                        <p className="text-xs text-gray-500 mt-2">
                          {new Date(notification.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {!notification.isRead && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => markAsRead(notification.id)}
                            title="Mark as read"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteNotification(notification.id)}
                          title="Delete notification"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
