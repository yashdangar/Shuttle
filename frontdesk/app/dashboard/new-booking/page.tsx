"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useToast } from "@/hooks/use-toast"

const locations = [
  "Hotel Lobby",
  "Airport Terminal 1",
  "Airport Terminal 2",
  "Airport Terminal 3",
  "Downtown Station",
  "Conference Center",
]

const paymentMethods = [
  { value: "APP", label: "Mobile App" },
  { value: "FRONTDESK", label: "Front Desk" },
  { value: "DEPOSIT", label: "Deposit" },
]

export default function NewBookingPage() {
  const [guestType, setGuestType] = useState<"resident" | "non-resident">("resident")
  const [formData, setFormData] = useState({
    numberOfPersons: "",
    numberOfBags: "",
    pickupLocation: "",
    dropoffLocation: "",
    preferredTime: "",
    tripType: "",
    paymentMethod: "",
    guestName: "",
    guestPhone: "",
    confirmationNumber: "",
  })
  const { toast } = useToast()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    toast({
      title: "Booking Created",
      description: "New trip booking has been successfully created.",
    })
    // Reset form
    setFormData({
      numberOfPersons: "",
      numberOfBags: "",
      pickupLocation: "",
      dropoffLocation: "",
      preferredTime: "",
      tripType: "",
      paymentMethod: "",
      guestName: "",
      guestPhone: "",
      confirmationNumber: "",
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">New Trip Booking</h1>
        <p className="text-gray-600">Create a new shuttle booking for guests</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Booking Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Guest Type Selection */}
            <div className="space-y-3">
              <Label>Guest Type</Label>
              <RadioGroup
                value={guestType}
                onValueChange={(value) => setGuestType(value as "resident" | "non-resident")}
                className="flex gap-6"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="resident" id="resident" />
                  <Label htmlFor="resident">Hotel Resident</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="non-resident" id="non-resident" />
                  <Label htmlFor="non-resident">Non-Resident</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Guest Information */}
            {guestType === "non-resident" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="guestName">Guest Name *</Label>
                  <Input
                    id="guestName"
                    value={formData.guestName}
                    onChange={(e) => setFormData({ ...formData, guestName: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="guestPhone">Phone Number *</Label>
                  <Input
                    id="guestPhone"
                    type="tel"
                    value={formData.guestPhone}
                    onChange={(e) => setFormData({ ...formData, guestPhone: e.target.value })}
                    required
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="confirmationNumber">Search by Name or Confirmation Number</Label>
                <Input
                  id="confirmationNumber"
                  placeholder="Enter guest name or confirmation number"
                  value={formData.confirmationNumber}
                  onChange={(e) => setFormData({ ...formData, confirmationNumber: e.target.value })}
                />
              </div>
            )}

            {/* Trip Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="numberOfPersons">Number of Persons *</Label>
                <Input
                  id="numberOfPersons"
                  type="number"
                  min="1"
                  value={formData.numberOfPersons}
                  onChange={(e) => setFormData({ ...formData, numberOfPersons: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="numberOfBags">Number of Bags</Label>
                <Input
                  id="numberOfBags"
                  type="number"
                  min="0"
                  value={formData.numberOfBags}
                  onChange={(e) => setFormData({ ...formData, numberOfBags: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Pickup Location *</Label>
                <Select
                  value={formData.pickupLocation}
                  onValueChange={(value) => setFormData({ ...formData, pickupLocation: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select pickup location" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((location) => (
                      <SelectItem key={location} value={location}>
                        {location}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Dropoff Location *</Label>
                <Select
                  value={formData.dropoffLocation}
                  onValueChange={(value) => setFormData({ ...formData, dropoffLocation: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select dropoff location" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((location) => (
                      <SelectItem key={location} value={location}>
                        {location}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="preferredTime">Preferred Time *</Label>
                <Input
                  id="preferredTime"
                  type="datetime-local"
                  value={formData.preferredTime}
                  onChange={(e) => setFormData({ ...formData, preferredTime: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Trip Type *</Label>
                <Select
                  value={formData.tripType}
                  onValueChange={(value) => setFormData({ ...formData, tripType: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select trip type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hotel-to-airport">Hotel to Airport</SelectItem>
                    <SelectItem value="airport-to-hotel">Airport to Hotel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Payment Method *</Label>
              <Select
                value={formData.paymentMethod}
                onValueChange={(value) => setFormData({ ...formData, paymentMethod: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((method) => (
                    <SelectItem key={method.value} value={method.value}>
                      {method.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" className="w-full">
              Create Booking
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
