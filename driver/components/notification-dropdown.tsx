"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, AlertTriangle, Info, Clock } from "lucide-react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"

const recentNotifications = [
  {
    id: 1,
    title: "New Passenger Added",
    message: "Sarah Johnson added to current trip",
    time: "2 min ago",
    type: "info",
  },
  {
    id: 2,
    title: "Route Update",
    message: "Traffic detected on Main Street",
    time: "5 min ago",
    type: "warning",
  },
  {
    id: 3,
    title: "Passenger Check-in",
    message: "Mike Chen checked in successfully",
    time: "8 min ago",
    type: "success",
  },
]

interface NotificationDropdownProps {
  onClose: () => void
}

export function NotificationDropdown({ onClose }: NotificationDropdownProps) {
  const { toast } = useToast()

  const getIcon = (type: string) => {
    switch (type) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />
      case "info":
      default:
        return <Info className="h-4 w-4 text-blue-600" />
    }
  }

  return (
    <Card className="absolute right-0 top-14 w-80 max-w-[calc(100vw-2rem)] z-50 shadow-2xl">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Recent Notifications</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {recentNotifications.map((notification) => (
          <div
            key={notification.id}
            className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
            onClick={() => {
              toast({
                title: `📋 ${notification.title}`,
                description: notification.message,
              })
            }}
          >
            <div className="flex-shrink-0 mt-1">{getIcon(notification.type)}</div>
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm">{notification.title}</h4>
              <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">{notification.message}</p>
              <div className="flex items-center gap-1 mt-1">
                <Clock className="h-3 w-3 text-gray-400" />
                <span className="text-xs text-gray-400">{notification.time}</span>
              </div>
            </div>
          </div>
        ))}

        <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
          <Link href="/dashboard/notifications" onClick={onClose}>
            <Button
              variant="outline"
              className="w-full border-2 border-blue-500 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950"
              onClick={() => {
                toast({
                  title: "📋 All notifications",
                  description: "Opening notifications page...",
                })
              }}
            >
              View All Notifications
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
