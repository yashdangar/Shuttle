"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Bus, Clock, Users, Luggage, MapPin, ArrowLeft } from "lucide-react"

const shuttleOptions = [
  {
    id: 1,
    name: "Express Airport Shuttle",
    pickupTime: "14:30",
    estimatedArrival: "15:15",
    availableSeats: 8,
    price: 25,
  },
  {
    id: 2,
    name: "Comfort Plus Transport",
    pickupTime: "15:00",
    estimatedArrival: "15:50",
    availableSeats: 12,
    price: 35,
  },
  {
    id: 3,
    name: "Premium Hotel Shuttle",
    pickupTime: "15:30",
    estimatedArrival: "16:20",
    availableSeats: 6,
    price: 45,
  },
]

export default function BookingPage() {
  const router = useRouter()
  const [pickupLocation, setPickupLocation] = useState("")
  const [destination, setDestination] = useState("")
  const [persons, setPersons] = useState(1)
  const [bags, setBags] = useState(1)
  const [pickupTime, setPickupTime] = useState("")
  const [showShuttles, setShowShuttles] = useState(false)

  useEffect(() => {
    // Check if user came from login page
    const bookingData = localStorage.getItem("shuttleBookingData")
    if (!bookingData) {
      router.push("/login")
    }
  }, [router])

  const handleShowShuttles = () => {
    if (pickupLocation && destination && pickupTime) {
      setShowShuttles(true)
    }
  }

  const selectShuttle = (shuttle: any) => {
    // Store booking details
    const existingData = JSON.parse(localStorage.getItem("shuttleBookingData") || "{}")
    const updatedData = {
      ...existingData,
      pickupLocation,
      destination,
      persons,
      bags,
      pickupTime,
      selectedShuttle: shuttle,
    }
    localStorage.setItem("shuttleBookingData", JSON.stringify(updatedData))

    // Navigate to payment page
    router.push("/payment")
  }

  const isFormValid = pickupLocation && destination && pickupTime

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-3 rounded-xl">
                <Bus className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Booking Details</h1>
                <p className="text-gray-600">Enter your travel preferences</p>
              </div>
            </div>
            <Button variant="outline" onClick={() => router.push("/login")} className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        {/* Booking Form */}
        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-3 rounded-lg">
                <Bus className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-xl">Travel Information</CardTitle>
                <CardDescription>Fill in your shuttle booking details</CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Location Fields */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="pickup" className="text-base font-medium">
                  Pickup Location
                </Label>
                <Select onValueChange={setPickupLocation}>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Select pickup location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="terminal-1">Terminal 1 - Arrivals</SelectItem>
                    <SelectItem value="terminal-2">Terminal 2 - Arrivals</SelectItem>
                    <SelectItem value="terminal-3">Terminal 3 - Arrivals</SelectItem>
                    <SelectItem value="hotel-lobby">Hotel Lobby</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="destination" className="text-base font-medium">
                  Destination
                </Label>
                <Select onValueChange={setDestination}>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Select destination" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="grand-hotel">Grand Hotel Downtown</SelectItem>
                    <SelectItem value="airport-inn">Airport Inn & Suites</SelectItem>
                    <SelectItem value="business-center">Business Center Hotel</SelectItem>
                    <SelectItem value="resort-spa">Resort & Spa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Number Steppers */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label className="text-base font-medium">Number of Persons</Label>
                <div className="flex items-center gap-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPersons(Math.max(1, persons - 1))}
                    className="h-10 w-10 p-0"
                  >
                    -
                  </Button>
                  <div className="flex items-center gap-3 px-4 py-2 border rounded-lg bg-white min-w-[100px] justify-center">
                    <Users className="h-5 w-5 text-gray-500" />
                    <span className="font-semibold text-lg">{persons}</span>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setPersons(persons + 1)} className="h-10 w-10 p-0">
                    +
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-base font-medium">Number of Bags</Label>
                <div className="flex items-center gap-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setBags(Math.max(0, bags - 1))}
                    className="h-10 w-10 p-0"
                  >
                    -
                  </Button>
                  <div className="flex items-center gap-3 px-4 py-2 border rounded-lg bg-white min-w-[100px] justify-center">
                    <Luggage className="h-5 w-5 text-gray-500" />
                    <span className="font-semibold text-lg">{bags}</span>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setBags(bags + 1)} className="h-10 w-10 p-0">
                    +
                  </Button>
                </div>
              </div>
            </div>

            {/* Time Picker */}
            <div className="space-y-2">
              <Label htmlFor="pickupTime" className="text-base font-medium">
                Preferred Pickup Time
              </Label>
              <Input
                id="pickupTime"
                type="time"
                value={pickupTime}
                onChange={(e) => setPickupTime(e.target.value)}
                className="h-12 text-base"
              />
            </div>

            {/* Show Shuttles Button */}
            <Button
              onClick={handleShowShuttles}
              disabled={!isFormValid}
              className="w-full h-14 text-lg font-semibold bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              Show Available Shuttles
            </Button>
          </CardContent>
        </Card>

        {/* Available Shuttles */}
        {showShuttles && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Available Shuttles</h2>
              <p className="text-gray-600">Choose your preferred shuttle service</p>
            </div>

            <div className="grid gap-4">
              {shuttleOptions.map((shuttle) => (
                <Card
                  key={shuttle.id}
                  className="hover:shadow-lg transition-all duration-200 cursor-pointer border-2 hover:border-blue-200"
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-3 flex-1">
                        <h3 className="font-bold text-xl text-gray-900">{shuttle.name}</h3>

                        <div className="flex items-center gap-6 text-gray-600">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            <span className="text-sm">{pickupLocation}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <span className="text-sm">{shuttle.pickupTime}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <Badge variant="secondary" className="text-sm">
                            Arrives: {shuttle.estimatedArrival}
                          </Badge>
                          <Badge variant="outline" className="text-sm">
                            {shuttle.availableSeats} seats available
                          </Badge>
                        </div>
                      </div>

                      <div className="text-right ml-6">
                        <div className="text-3xl font-bold text-blue-600 mb-3">${shuttle.price}</div>
                        <Button
                          onClick={() => selectShuttle(shuttle)}
                          className="bg-blue-600 hover:bg-blue-700 px-6 py-2"
                        >
                          Select This Shuttle
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
