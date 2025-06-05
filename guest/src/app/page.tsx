"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { redirect } from "next/navigation"
import {
  Plane,
  Bus,
  Clock,
  Users,
  Luggage,
  MapPin,
  CreditCard,
  Smartphone,
  Banknote,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
} from "lucide-react"

interface BookingData {
  confirmationNumber?: string
  firstName?: string
  lastName?: string
  arrivalDate?: string
  pickupLocation?: string
  destination?: string
  persons?: number
  bags?: number
  pickupTime?: string
  selectedShuttle?: any
  paymentMethod?: string
}

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

export default function HomePage() {
  redirect("/login")
}

function ShuttleBooking() {
  const [currentStep, setCurrentStep] = useState(1)
  const [bookingData, setBookingData] = useState<BookingData>({
    persons: 1,
    bags: 1,
  })
  const [showShuttles, setShowShuttles] = useState(false)

  const updateBookingData = (field: keyof BookingData, value: any) => {
    setBookingData((prev) => ({ ...prev, [field]: value }))
  }

  const handleContinueStep1 = () => {
    if (bookingData.confirmationNumber || (bookingData.firstName && bookingData.lastName && bookingData.arrivalDate)) {
      setCurrentStep(2)
    }
  }

  const handleShowShuttles = () => {
    if (bookingData.pickupLocation && bookingData.destination && bookingData.pickupTime) {
      setShowShuttles(true)
    }
  }

  const selectShuttle = (shuttle: any) => {
    updateBookingData("selectedShuttle", shuttle)
    setCurrentStep(3)
  }

  const confirmBooking = () => {
    // Handle booking confirmation
    alert("Booking confirmed! You will receive a confirmation email shortly.")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Bus className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Airport Shuttle</h1>
              <p className="text-sm text-gray-600">Book your ride to the hotel</p>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Indicator */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center justify-center gap-4 mb-8">
          {[1, 2, 3].map((step) => (
            <div key={step} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStep >= step ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-600"
                }`}
              >
                {currentStep > step ? <CheckCircle className="h-4 w-4" /> : step}
              </div>
              {step < 3 && <div className={`w-12 h-0.5 mx-2 ${currentStep > step ? "bg-blue-600" : "bg-gray-200"}`} />}
            </div>
          ))}
        </div>

        {/* Step 1: Login/Confirmation */}
        {currentStep === 1 && (
          <Card className="max-w-md mx-auto">
            <CardHeader className="text-center">
              <div className="mx-auto bg-blue-100 p-3 rounded-full w-fit mb-4">
                <Plane className="h-8 w-8 text-blue-600" />
              </div>
              <CardTitle className="text-2xl">Welcome Back</CardTitle>
              <CardDescription>Enter your confirmation details or personal information to continue</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="confirmation">Confirmation Number</Label>
                <Input
                  id="confirmation"
                  placeholder="Enter confirmation number"
                  value={bookingData.confirmationNumber || ""}
                  onChange={(e) => updateBookingData("confirmationNumber", e.target.value)}
                />
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-muted-foreground">Or</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    placeholder="John"
                    value={bookingData.firstName || ""}
                    onChange={(e) => updateBookingData("firstName", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    placeholder="Doe"
                    value={bookingData.lastName || ""}
                    onChange={(e) => updateBookingData("lastName", e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="arrivalDate">Date of Arrival</Label>
                <Input
                  id="arrivalDate"
                  type="date"
                  value={bookingData.arrivalDate || ""}
                  onChange={(e) => updateBookingData("arrivalDate", e.target.value)}
                />
              </div>

              <Button onClick={handleContinueStep1} className="w-full bg-blue-600 hover:bg-blue-700" size="lg">
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>

              <p className="text-center text-sm text-gray-600">
                Can't find your confirmation?{" "}
                <a href="#" className="text-blue-600 hover:underline">
                  Contact support
                </a>
              </p>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Booking Details */}
        {currentStep === 2 && (
          <div className="max-w-2xl mx-auto space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 p-2 rounded-lg">
                    <Bus className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle>Shuttle Booking Details</CardTitle>
                    <CardDescription>Fill in your travel preferences</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="pickup">Pickup Location</Label>
                    <Select onValueChange={(value) => updateBookingData("pickupLocation", value)}>
                      <SelectTrigger>
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
                    <Label htmlFor="destination">Destination</Label>
                    <Select onValueChange={(value) => updateBookingData("destination", value)}>
                      <SelectTrigger>
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

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Number of Persons</Label>
                    <div className="flex items-center gap-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateBookingData("persons", Math.max(1, (bookingData.persons || 1) - 1))}
                      >
                        -
                      </Button>
                      <div className="flex items-center gap-2 px-4 py-2 border rounded-md">
                        <Users className="h-4 w-4 text-gray-500" />
                        <span className="font-medium">{bookingData.persons || 1}</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateBookingData("persons", (bookingData.persons || 1) + 1)}
                      >
                        +
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Number of Bags</Label>
                    <div className="flex items-center gap-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateBookingData("bags", Math.max(0, (bookingData.bags || 1) - 1))}
                      >
                        -
                      </Button>
                      <div className="flex items-center gap-2 px-4 py-2 border rounded-md">
                        <Luggage className="h-4 w-4 text-gray-500" />
                        <span className="font-medium">{bookingData.bags || 1}</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateBookingData("bags", (bookingData.bags || 1) + 1)}
                      >
                        +
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pickupTime">Preferred Pickup Time</Label>
                  <Input
                    id="pickupTime"
                    type="time"
                    value={bookingData.pickupTime || ""}
                    onChange={(e) => updateBookingData("pickupTime", e.target.value)}
                  />
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setCurrentStep(1)}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  <Button onClick={handleShowShuttles} className="flex-1 bg-blue-600 hover:bg-blue-700" size="lg">
                    Show Available Shuttles
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Available Shuttles */}
            {showShuttles && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Available Shuttles</h3>
                <div className="grid gap-4">
                  {shuttleOptions.map((shuttle) => (
                    <Card key={shuttle.id} className="hover:shadow-md transition-shadow cursor-pointer">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="space-y-2">
                            <h4 className="font-semibold text-lg">{shuttle.name}</h4>
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              <div className="flex items-center gap-1">
                                <MapPin className="h-4 w-4" />
                                <span>{bookingData.pickupLocation}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                <span>{shuttle.pickupTime}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-4 text-sm">
                              <Badge variant="secondary">Arrives: {shuttle.estimatedArrival}</Badge>
                              <Badge variant="outline">{shuttle.availableSeats} seats available</Badge>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-blue-600">${shuttle.price}</div>
                            <Button onClick={() => selectShuttle(shuttle)} className="mt-2">
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
        )}

        {/* Step 3: Payment Method */}
        {currentStep === 3 && (
          <Card className="max-w-md mx-auto">
            <CardHeader className="text-center">
              <div className="mx-auto bg-green-100 p-3 rounded-full w-fit mb-4">
                <CreditCard className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle className="text-2xl">Payment Method</CardTitle>
              <CardDescription>Choose how you'd like to pay for your shuttle</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Booking Summary */}
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <h4 className="font-semibold">Booking Summary</h4>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span>Shuttle:</span>
                    <span>{bookingData.selectedShuttle?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Passengers:</span>
                    <span>{bookingData.persons}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pickup Time:</span>
                    <span>{bookingData.selectedShuttle?.pickupTime}</span>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex justify-between font-semibold">
                    <span>Total:</span>
                    <span>${bookingData.selectedShuttle?.price}</span>
                  </div>
                </div>
              </div>

              {/* Payment Options */}
              <div className="space-y-3">
                <Button
                  variant={bookingData.paymentMethod === "app" ? "default" : "outline"}
                  className="w-full h-16 justify-start gap-4"
                  onClick={() => updateBookingData("paymentMethod", "app")}
                >
                  <div className="bg-blue-100 p-2 rounded-lg">
                    <Smartphone className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold">Pay via App</div>
                    <div className="text-sm text-gray-600">Secure mobile payment</div>
                  </div>
                </Button>

                <Button
                  variant={bookingData.paymentMethod === "cash" ? "default" : "outline"}
                  className="w-full h-16 justify-start gap-4"
                  onClick={() => updateBookingData("paymentMethod", "cash")}
                >
                  <div className="bg-green-100 p-2 rounded-lg">
                    <Banknote className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold">Cash at Front Desk</div>
                    <div className="text-sm text-gray-600">Pay when you arrive</div>
                  </div>
                </Button>

                <Button
                  variant={bookingData.paymentMethod === "deposit" ? "default" : "outline"}
                  className="w-full h-16 justify-start gap-4"
                  onClick={() => updateBookingData("paymentMethod", "deposit")}
                >
                  <div className="bg-purple-100 p-2 rounded-lg">
                    <CreditCard className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold">Deduct from Deposit</div>
                    <div className="text-sm text-gray-600">Use existing hotel deposit</div>
                  </div>
                </Button>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setCurrentStep(2)}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button
                  onClick={confirmBooking}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  size="lg"
                  disabled={!bookingData.paymentMethod}
                >
                  Confirm Booking
                  <CheckCircle className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
