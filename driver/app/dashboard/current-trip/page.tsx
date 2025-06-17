"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { MapPin, Users, CreditCard, QrCode, ExternalLink, CheckCircle, Clock, Navigation } from "lucide-react"
import { QRScannerModal } from "@/components/qr-scanner-modal"
import { useToast } from "@/hooks/use-toast"

const passengers = [
  {
    id: 1,
    name: "Sarah Johnson",
    persons: 2,
    bags: 3,
    pickup: "Hilton Downtown Hotel",
    dropoff: "Terminal A - Gate 12",
    paymentMethod: "Credit Card",
    status: "next",
    seatNumber: null,
  },
  {
    id: 2,
    name: "Mike Chen",
    persons: 1,
    bags: 1,
    pickup: "Marriott City Center",
    dropoff: "Terminal B - Gate 8",
    paymentMethod: "Cash",
    status: "checked-in",
    seatNumber: "A1",
  },
  {
    id: 3,
    name: "Emily Davis",
    persons: 3,
    bags: 4,
    pickup: "Grand Hotel",
    dropoff: "Terminal A - Gate 15",
    paymentMethod: "Credit Card",
    status: "checked-in",
    seatNumber: "B1-B3",
  },
  {
    id: 4,
    name: "Robert Wilson",
    persons: 1,
    bags: 2,
    pickup: "Holiday Inn Express",
    dropoff: "Terminal C - Gate 5",
    paymentMethod: "Mobile Pay",
    status: "pending",
    seatNumber: null,
  },
]

export default function CurrentTripPage() {
  const [showQRScanner, setShowQRScanner] = useState(false)
  const [passengerList, setPassengerList] = useState(passengers)
  const { toast } = useToast()

  const checkedInCount = passengerList.filter((p) => p.status === "checked-in").length
  const totalPassengers = passengerList.reduce((sum, p) => sum + p.persons, 0)
  const occupancyPercentage = (checkedInCount / passengerList.length) * 100

  const nextPassenger = passengerList.find((p) => p.status === "next")

  const handleQRScanSuccess = (passengerData: any) => {
    setPassengerList((prev) =>
      prev.map((p) =>
        p.id === passengerData.id ? { ...p, status: "checked-in", seatNumber: passengerData.seatNumber } : p,
      ),
    )
    toast({
      title: "✅ Check-in successful!",
      description: `${passengerData.name} checked in. Seat ${passengerData.seatNumber} assigned.`,
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Current Trip</h1>
        <Button
          onClick={() => {
            setShowQRScanner(true)
            toast({
              title: "📱 QR Scanner",
              description: "Opening camera scanner...",
            })
          }}
          className="h-11 shadow-lg"
        >
          <QrCode className="h-5 w-5 mr-2" />
          Scan QR
        </Button>
      </div>

      {/* Trip Overview */}
      <Card className="shadow-lg border-l-4 border-l-blue-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 bg-blue-500 rounded-lg">
              <Users className="h-5 w-5 text-white" />
            </div>
            Trip Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Shuttle Occupancy</span>
            <span className="font-bold text-lg">
              {checkedInCount} / {passengerList.length} passengers
            </span>
          </div>
          <Progress value={occupancyPercentage} className="h-3" />
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Total persons: {totalPassengers} | Checked in: {checkedInCount}
          </div>
        </CardContent>
      </Card>

      {/* Next Passenger Highlight */}
      {nextPassenger && (
        <Card className="border-2 border-blue-500 shadow-xl bg-blue-50 dark:bg-blue-950">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
              <div className="p-2 bg-blue-500 rounded-lg animate-pulse">
                <Navigation className="h-5 w-5 text-white" />
              </div>
              Next Pickup - Priority
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="font-bold text-xl text-blue-800 dark:text-blue-200">{nextPassenger.name}</p>
              <p className="text-blue-600 dark:text-blue-400 font-medium">{nextPassenger.pickup}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {nextPassenger.persons} passengers • {nextPassenger.bags} bags
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                size="sm"
                className="bg-blue-500 hover:bg-blue-600"
                onClick={() =>
                  toast({
                    title: "🗺️ Opening map",
                    description: "Loading pickup location...",
                  })
                }
              >
                <MapPin className="h-4 w-4 mr-2" />
                View Map
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  toast({
                    title: "🚗 Opening navigation",
                    description: "Launching Google Maps...",
                  })
                }
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Navigate
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Google Maps Embed */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-green-600" />
            Route Map
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="aspect-video bg-muted rounded-xl flex items-center justify-center">
            <div className="text-center">
              <MapPin className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium">Google Maps Integration</p>
              <p className="text-sm text-muted-foreground">Showing pickup locations and route</p>
            </div>
          </div>
          <Button
            className="w-full mt-4 bg-green-500 hover:bg-green-600"
            onClick={() =>
              toast({
                title: "🗺️ Full map",
                description: "Opening detailed route map...",
              })
            }
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Open Full Map
          </Button>
        </CardContent>
      </Card>

      {/* Passenger List */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Passengers ({passengerList.length})</h2>
        <div className="grid gap-3">
          {passengerList.map((passenger) => (
            <Card
              key={passenger.id}
              className={`shadow-md hover:shadow-lg transition-all ${
                passenger.status === "next" ? "ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950" : ""
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="font-bold text-lg">{passenger.name}</h3>
                      <Badge
                        variant={
                          passenger.status === "checked-in"
                            ? "default"
                            : passenger.status === "next"
                              ? "secondary"
                              : "outline"
                        }
                        className={
                          passenger.status === "checked-in"
                            ? "bg-green-500 hover:bg-green-600"
                            : passenger.status === "next"
                              ? "bg-blue-500 hover:bg-blue-600 text-white"
                              : ""
                        }
                      >
                        {passenger.status === "checked-in"
                          ? "✓ Checked In"
                          : passenger.status === "next"
                            ? "→ Next Pickup"
                            : "⏳ Pending"}
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
                      {passenger.seatNumber && (
                        <div className="flex items-center gap-2 text-green-600">
                          <CheckCircle className="h-4 w-4" />
                          <span className="font-medium">Seat: {passenger.seatNumber}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    {passenger.status === "checked-in" && <CheckCircle className="h-8 w-8 text-green-500" />}
                    {passenger.status === "next" && <Clock className="h-8 w-8 text-blue-500 animate-pulse" />}
                  </div>
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

      {showQRScanner && (
        <QRScannerModal
          onClose={() => setShowQRScanner(false)}
          onSuccess={handleQRScanSuccess}
          passengerList={passengerList}
        />
      )}
    </div>
  )
}
