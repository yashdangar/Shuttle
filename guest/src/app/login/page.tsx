"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Plane, Bus } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const [confirmationNumber, setConfirmationNumber] = useState("")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [arrivalDate, setArrivalDate] = useState("")

  const handleContinue = () => {
    // Store user data in localStorage for access across pages
    const userData = {
      confirmationNumber,
      firstName,
      lastName,
      arrivalDate,
      timestamp: Date.now(),
    }
    localStorage.setItem("shuttleBookingData", JSON.stringify(userData))

    // Navigate to booking page
    router.push("/booking")
  }

  const isFormValid = confirmationNumber || (firstName && lastName && arrivalDate)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-3 rounded-xl">
              <Bus className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Airport Shuttle</h1>
              <p className="text-gray-600">Confirm Your Shuttle Booking</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-md mx-auto px-4 py-12">
        <Card className="shadow-lg">
          <CardHeader className="text-center pb-6">
            <div className="mx-auto bg-blue-100 p-4 rounded-full w-fit mb-6">
              <Plane className="h-10 w-10 text-blue-600" />
            </div>
            <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
            <CardDescription className="text-base">
              Enter your confirmation details or personal information to continue
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Option 1: Confirmation Number */}
            <div className="space-y-3">
              <Label htmlFor="confirmation" className="text-base font-medium">
                Confirmation Number
              </Label>
              <Input
                id="confirmation"
                placeholder="Enter your confirmation number"
                value={confirmationNumber}
                onChange={(e) => setConfirmationNumber(e.target.value)}
                className="h-12 text-base"
              />
            </div>

            {/* Divider */}
            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm uppercase">
                <span className="bg-white px-4 text-gray-500 font-medium">Or</span>
              </div>
            </div>

            {/* Option 2: Personal Details */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="text-base font-medium">
                    First Name
                  </Label>
                  <Input
                    id="firstName"
                    placeholder="John"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="h-12 text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName" className="text-base font-medium">
                    Last Name
                  </Label>
                  <Input
                    id="lastName"
                    placeholder="Doe"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="h-12 text-base"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="arrivalDate" className="text-base font-medium">
                  Date of Arrival
                </Label>
                <Input
                  id="arrivalDate"
                  type="date"
                  value={arrivalDate}
                  onChange={(e) => setArrivalDate(e.target.value)}
                  className="h-12 text-base"
                />
              </div>
            </div>

            {/* Continue Button */}
            <Button
              onClick={handleContinue}
              disabled={!isFormValid}
              className="w-full h-14 text-lg font-semibold bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              Continue
            </Button>

            {/* Support Link */}
            <div className="text-center pt-4">
              <p className="text-sm text-gray-600">
                Can't find your confirmation?{" "}
                <a href="#" className="text-blue-600 hover:text-blue-700 font-medium hover:underline">
                  Contact support
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
