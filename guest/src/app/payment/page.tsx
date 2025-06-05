"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { CreditCard, Smartphone, Banknote, CheckCircle, ArrowLeft, Bus, Clock, Users, Luggage } from "lucide-react"

export default function PaymentPage() {
  const router = useRouter()
  const [paymentMethod, setPaymentMethod] = useState("")
  const [bookingData, setBookingData] = useState<any>(null)

  useEffect(() => {
    // Get booking data from localStorage
    const data = localStorage.getItem("shuttleBookingData")
    if (!data) {
      router.push("/login")
      return
    }

    const parsedData = JSON.parse(data)
    if (!parsedData.selectedShuttle) {
      router.push("/booking")
      return
    }

    setBookingData(parsedData)
  }, [router])

  const confirmBooking = () => {
    if (!paymentMethod) return

    // Store final booking data
    const finalData = {
      ...bookingData,
      paymentMethod,
      bookingConfirmed: true,
      confirmationId: `SH${Date.now().toString().slice(-6)}`,
    }
    localStorage.setItem("shuttleBookingData", JSON.stringify(finalData))

    // Show success message and redirect
    alert(`Booking confirmed! Your confirmation number is: ${finalData.confirmationId}`)

    // Clear booking data and redirect to login for new booking
    localStorage.removeItem("shuttleBookingData")
    router.push("/login")
  }

  if (!bookingData) {
    return <div>Loading...</div>
  }

  const paymentOptions = [
    {
      id: "app",
      title: "Pay via App",
      description: "Secure mobile payment",
      icon: Smartphone,
      bgColor: "bg-blue-100",
      iconColor: "text-blue-600",
    },
    {
      id: "cash",
      title: "Cash at Front Desk",
      description: "Pay when you arrive",
      icon: Banknote,
      bgColor: "bg-green-100",
      iconColor: "text-green-600",
    },
    {
      id: "deposit",
      title: "Deduct from Deposit",
      description: "Use existing hotel deposit",
      icon: CreditCard,
      bgColor: "bg-purple-100",
      iconColor: "text-purple-600",
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-green-600 p-3 rounded-xl">
                <CreditCard className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Payment Options</h1>
                <p className="text-gray-600">Choose how you'd like to pay</p>
              </div>
            </div>
            <Button variant="outline" onClick={() => router.push("/booking")} className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        {/* Booking Summary */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">Booking Summary</CardTitle>
            <CardDescription>Review your shuttle booking details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-4 p-4 bg-blue-50 rounded-lg">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Bus className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg">{bookingData.selectedShuttle.name}</h3>
                <div className="grid grid-cols-2 gap-4 mt-3 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>Pickup: {bookingData.selectedShuttle.pickupTime}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span>
                      {bookingData.persons} passenger{bookingData.persons > 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>From: {bookingData.pickupLocation}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Luggage className="h-4 w-4" />
                    <span>
                      {bookingData.bags} bag{bookingData.bags > 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            <div className="flex justify-between items-center text-lg">
              <span className="font-semibold">Total Amount:</span>
              <span className="font-bold text-2xl text-blue-600">${bookingData.selectedShuttle.price}</span>
            </div>
          </CardContent>
        </Card>

        {/* Payment Methods */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">Select Payment Method</CardTitle>
            <CardDescription>Choose your preferred payment option</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {paymentOptions.map((option) => {
              const IconComponent = option.icon
              return (
                <Button
                  key={option.id}
                  variant={paymentMethod === option.id ? "default" : "outline"}
                  className={`w-full h-20 justify-start gap-4 text-left ${
                    paymentMethod === option.id ? "bg-blue-600 hover:bg-blue-700 text-white" : "hover:bg-gray-50"
                  }`}
                  onClick={() => setPaymentMethod(option.id)}
                >
                  <div className={`p-3 rounded-lg ${paymentMethod === option.id ? "bg-white/20" : option.bgColor}`}>
                    <IconComponent
                      className={`h-6 w-6 ${paymentMethod === option.id ? "text-white" : option.iconColor}`}
                    />
                  </div>
                  <div>
                    <div className="font-semibold text-base">{option.title}</div>
                    <div className={`text-sm ${paymentMethod === option.id ? "text-white/80" : "text-gray-600"}`}>
                      {option.description}
                    </div>
                  </div>
                  {paymentMethod === option.id && <CheckCircle className="h-5 w-5 text-white ml-auto" />}
                </Button>
              )
            })}
          </CardContent>
        </Card>

        {/* Confirm Booking Button */}
        <Button
          onClick={confirmBooking}
          disabled={!paymentMethod}
          className="w-full h-16 text-lg font-semibold bg-green-600 hover:bg-green-700 disabled:opacity-50"
        >
          <CheckCircle className="mr-3 h-6 w-6" />
          Confirm Booking
        </Button>
      </div>
    </div>
  )
}
