"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, MapPin, Users, CreditCard, Navigation } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

const nextTripData = {
  time: "2:30 PM",
  route: "Downtown Hotels → Terminal B",
  totalPassengers: 8,
  estimatedDuration: "45 minutes",
}

const nextTripPassengers = [
  {
    id: 1,
    name: "David Thompson",
    persons: 1,
    bags: 2,
    pickup: "Sheraton Downtown",
    dropoff: "Terminal B - Gate 3",
    paymentMethod: "Credit Card",
  },
  {
    id: 2,
    name: "Lisa Rodriguez",
    persons: 2,
    bags: 3,
    pickup: "Hyatt Regency",
    dropoff: "Terminal B - Gate 7",
    paymentMethod: "Mobile Pay",
  },
  {
    id: 3,
    name: "James Park",
    persons: 1,
    bags: 1,
    pickup: "Four Seasons Hotel",
    dropoff: "Terminal B - Gate 12",
    paymentMethod: "Cash",
  },
  {
    id: 4,
    name: "Maria Santos",
    persons: 3,
    bags: 4,
    pickup: "Renaissance Hotel",
    dropoff: "Terminal B - Gate 15",
    paymentMethod: "Credit Card",
  },
  {
    id: 5,
    name: "Kevin Liu",
    persons: 1,
    bags: 1,
    pickup: "Westin Downtown",
    dropoff: "Terminal B - Gate 9",
    paymentMethod: "Mobile Pay",
  },
]

export default function NextTripPage() {
  const { toast } = useToast()

  const handleCardClick = (passengerName: string) => {
    toast({
      title: `👤 ${passengerName}`,
      description: "Viewing passenger details...",
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Next Trip</h1>

      {/* Trip Details */}
      <Card className="shadow-lg border-l-4 border-l-blue-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 bg-blue-500 rounded-lg">
              <Clock className="h-5 w-5 text-white" />
            </div>
            Trip Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Departure Time</p>
              <p className="text-3xl font-bold text-blue-600">{nextTripData.time}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Duration</p>
              <p className="text-xl font-semibold text-gray-900 dark:text-white">{nextTripData.estimatedDuration}</p>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Route</p>
            <p className="font-bold text-lg text-gray-900 dark:text-white">{nextTripData.route}</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              <span className="text-sm font-medium">{nextTripData.totalPassengers} passengers</span>
            </div>
            <Badge className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white">Scheduled</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Route Map Preview */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Navigation className="h-5 w-5 text-green-600" />
            Route Preview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="aspect-video bg-muted rounded-xl flex items-center justify-center">
            <div className="text-center">
              <MapPin className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium">Route Map Preview</p>
              <p className="text-sm text-muted-foreground">Downtown Hotels to Terminal B</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Passenger List */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Passengers ({nextTripPassengers.length})</h2>
        <div className="grid gap-3">
          {nextTripPassengers.map((passenger) => (
            <Card
              key={passenger.id}
              className="shadow-md hover:shadow-lg transition-all cursor-pointer"
              onClick={() => handleCardClick(passenger.name)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="font-bold text-lg text-gray-900 dark:text-white">{passenger.name}</h3>
                      <Badge variant="outline" className="border-blue-500 text-blue-600">
                        Scheduled
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 gap-2 text-sm">
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                        <MapPin className="h-4 w-4" />
                        <span className="font-medium">{passenger.pickup}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                        <Users className="h-4 w-4" />
                        <span>
                          {passenger.persons} passengers • {passenger.bags} bags
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                        <CreditCard className="h-4 w-4" />
                        <span>{passenger.paymentMethod}</span>
                      </div>
                    </div>
                  </div>

                  <Clock className="h-6 w-6 text-blue-500" />
                </div>

                <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Drop-off:</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{passenger.dropoff}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
