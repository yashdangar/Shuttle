"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Bell, MapPin, Users, Clock, Car, TrendingUp } from "lucide-react"
import { NotificationDropdown } from "@/components/notification-dropdown"
import { useToast } from "@/hooks/use-toast"

export default function DashboardPage() {
  const [driverName, setDriverName] = useState("")
  const [showNotifications, setShowNotifications] = useState(false)
  const [notificationCount, setNotificationCount] = useState(3)
  const { toast } = useToast()

  useEffect(() => {
    const name = localStorage.getItem("driverName") || "Driver"
    setDriverName(name)

    // Welcome toast
    toast({
      title: "🚗 Welcome back!",
      description: "Your dashboard is ready",
    })
  }, [toast])

  const currentTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })

  const handleCardClick = (cardName: string) => {
    toast({
      title: `📊 ${cardName}`,
      description: "Loading detailed information...",
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Welcome back,</h1>
          <p className="text-xl font-semibold text-primary">{driverName}</p>
        </div>
        <div className="relative">
          <Button
            variant="outline"
            size="icon"
            className="h-11 w-11 shadow-lg"
            onClick={() => {
              setShowNotifications(!showNotifications)
              toast({
                title: "🔔 Notifications",
                description: showNotifications ? "Closing notifications" : "Opening notifications",
              })
            }}
          >
            <Bell className="h-5 w-5" />
            {notificationCount > 0 && (
              <Badge className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 flex items-center justify-center text-xs bg-destructive">
                {notificationCount}
              </Badge>
            )}
          </Button>
          {showNotifications && <NotificationDropdown onClose={() => setShowNotifications(false)} />}
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Current Trip Status */}
        <Card
          className="shadow-lg hover:shadow-xl transition-all cursor-pointer border-l-4 border-l-green-500"
          onClick={() => handleCardClick("Current Trip Status")}
        >
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="p-2 bg-green-500 rounded-lg">
                <Car className="h-5 w-5 text-white" />
              </div>
              Current Trip Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-2xl font-bold text-green-600">Active</p>
            <p className="text-sm text-muted-foreground">Terminal A → Downtown Hotels</p>
            <p className="text-sm text-muted-foreground">Started: {currentTime}</p>
          </CardContent>
        </Card>

        {/* Next Trip */}
        <Card
          className="shadow-lg hover:shadow-xl transition-all cursor-pointer border-l-4 border-l-blue-500"
          onClick={() => handleCardClick("Next Trip")}
        >
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="p-2 bg-blue-500 rounded-lg">
                <Clock className="h-5 w-5 text-white" />
              </div>
              Next Trip
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-2xl font-bold text-blue-600">2:30 PM</p>
            <p className="text-sm text-muted-foreground">Downtown → Terminal B</p>
            <p className="text-sm text-muted-foreground">8 passengers scheduled</p>
          </CardContent>
        </Card>

        {/* Total Passengers */}
        <Card
          className="shadow-lg hover:shadow-xl transition-all cursor-pointer border-l-4 border-l-orange-500"
          onClick={() => handleCardClick("Current Trip Passengers")}
        >
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="p-2 bg-orange-500 rounded-lg">
                <Users className="h-5 w-5 text-white" />
              </div>
              Current Passengers
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-2xl font-bold text-orange-600">6 / 12</p>
            <p className="text-sm text-muted-foreground">4 checked in, 2 pending</p>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-orange-500 h-2 rounded-full transition-all duration-500"
                style={{ width: "50%" }}
              ></div>
            </div>
          </CardContent>
        </Card>

        {/* Next Passenger */}
        <Card
          className="shadow-lg hover:shadow-xl transition-all cursor-pointer border-l-4 border-l-purple-500"
          onClick={() => handleCardClick("Next Passenger")}
        >
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="p-2 bg-purple-500 rounded-lg">
                <MapPin className="h-5 w-5 text-white" />
              </div>
              Next Passenger
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="font-semibold text-purple-600">Sarah Johnson</p>
              <p className="text-sm text-muted-foreground">Hilton Downtown Hotel</p>
              <p className="text-sm text-muted-foreground">2 passengers, 3 bags</p>
            </div>
            <Button
              size="sm"
              className="w-full bg-purple-500 hover:bg-purple-600"
              onClick={(e) => {
                e.stopPropagation()
                toast({
                  title: "🗺️ Opening map",
                  description: "Loading passenger location...",
                })
              }}
            >
              <MapPin className="h-4 w-4 mr-2" />
              View on Map
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Performance Stats */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            Today's Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">12</p>
              <p className="text-sm text-muted-foreground">Trips Completed</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">48</p>
              <p className="text-sm text-muted-foreground">Passengers Served</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">4.9</p>
              <p className="text-sm text-muted-foreground">Rating</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
