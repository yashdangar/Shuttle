"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { MapPin, Clock, Users, CreditCard } from "lucide-react"

interface NewBookingProps {
  hotel: any
  onBookingCreated: (booking: any) => void
}

export default function NewBooking({ hotel, onBookingCreated }: NewBookingProps) {
  const [formData, setFormData] = useState({
    pickup: "",
    destination: hotel.name,
    date: "",
    time: "",
    passengers: "1",
    notes: "",
    paymentMethod: "frontdesk",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    // Simulate booking creation
    setTimeout(() => {
      const booking = {
        id: `BK${Date.now()}`,
        pickup: formData.pickup,
        destination: formData.destination,
        scheduledTime: `${formData.date} ${formData.time}`,
        passengers: formData.passengers,
        status: "confirmed",
        paymentMethod: formData.paymentMethod,
        notes: formData.notes,
        createdAt: new Date().toISOString(),
      }

      localStorage.setItem("currentBooking", JSON.stringify(booking))

      // Add to booking history
      const history = JSON.parse(localStorage.getItem("bookingHistory") || "[]")
      history.unshift(booking)
      localStorage.setItem("bookingHistory", JSON.stringify(history))

      onBookingCreated(booking)
      setIsSubmitting(false)
    }, 2000)
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Book a Shuttle</CardTitle>
          <CardDescription>Fill in the details below to book your shuttle ride</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Pickup Location */}
            <div className="space-y-2">
              <Label htmlFor="pickup">Pickup Location</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <Input
                  id="pickup"
                  placeholder="Enter pickup address"
                  value={formData.pickup}
                  onChange={(e) => setFormData({ ...formData, pickup: e.target.value })}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            {/* Destination */}
            <div className="space-y-2">
              <Label htmlFor="destination">Destination</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <Input
                  id="destination"
                  value={formData.destination}
                  onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            {/* Date and Time */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  min={new Date().toISOString().split("T")[0]}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time">Time</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <Input
                    id="time"
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Number of Passengers */}
            <div className="space-y-2">
              <Label htmlFor="passengers">Number of Passengers</Label>
              <Select
                value={formData.passengers}
                onValueChange={(value) => setFormData({ ...formData, passengers: value })}
              >
                <SelectTrigger>
                  <div className="flex items-center">
                    <Users className="w-4 h-4 mr-2 text-gray-400" />
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6].map((num) => (
                    <SelectItem key={num} value={num.toString()}>
                      {num} {num === 1 ? "Passenger" : "Passengers"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Payment Method */}
            <div className="space-y-3">
              <Label>Payment Method</Label>
              <RadioGroup
                value={formData.paymentMethod}
                onValueChange={(value) => setFormData({ ...formData, paymentMethod: value })}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="frontdesk" id="frontdesk" />
                  <Label htmlFor="frontdesk" className="flex items-center space-x-2">
                    <CreditCard className="w-4 h-4" />
                    <span>Pay at Front Desk</span>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Special Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Special Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Any special requirements or notes for the driver"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>

            {/* Submit Button */}
            <Button type="submit" disabled={isSubmitting} className="w-full" size="lg">
              {isSubmitting ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Creating Booking...</span>
                </div>
              ) : (
                "Confirm Booking"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
