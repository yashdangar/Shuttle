"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { MapPin, Clock, Users, CreditCard, Briefcase } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api";

interface NewBookingProps {
  hotel: any;
  onBookingCreated: (booking: any) => void;
}

interface Location {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
}
interface Trip {
  id: string;
  numberOfPersons: number;
  numberOfBags: number;
  pickupLocation?: string;
  pickupLocationId?: string;
  dropoffLocation?: string;
  dropoffLocationId?: string;
  preferredTime: string;
  paymentMethod: string;
  tripType: string;
  isCompleted: boolean;
  isPaid: boolean;
  isCancelled: boolean;
  isRefunded: boolean;
  shuttleId: string;
  shuttle: string;
}
export default function NewBooking({
  hotel,
  onBookingCreated,
}: NewBookingProps) {
  const [tripDirection, setTripDirection] = useState<
    "hotel-to-airport" | "airport-to-hotel"
  >("hotel-to-airport");

  // Get current date and time
  const now = new Date();
  const currentDate = now.toISOString().split("T")[0];
  const currentTime = now.toTimeString().slice(0, 5);

  const [formData, setFormData] = useState({
    pickup: "",
    destination: hotel.name,
    createdAt: currentDate,
    preferredTime: currentTime,
    notes: "",
    paymentMethod: "frontdesk",
    numberOfBags: 0,
    numberOfPersons: 1,
    pickupLocation: "",
    dropoffLocation: "",
    tripType: "",
    isCompleted: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [locations, setLocations] = useState<Location[]>([]);

  const fetchLocations = async () => {
    try {
      const response = await api.get("/guest/get-locations");
      console.log(response.locations);
      setLocations(response.locations);
    } catch (error) {
      console.error("Error fetching locations:", error);
    }
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const newDate = now.toISOString().split("T")[0];
      const newTime = now.toTimeString().slice(0, 5);
      setFormData((prev) => ({
        ...prev,
        createdAt: newDate,
        preferredTime: newTime,
      }));
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Create trip data based on direction
      const tripData = {
        numberOfPersons: formData.numberOfPersons,
        numberOfBags: formData.numberOfBags,
        preferredTime: new Date(
          `${formData.createdAt} ${formData.preferredTime}`
        ),
        paymentMethod: formData.paymentMethod.toUpperCase(),
        tripType:
          tripDirection === "hotel-to-airport"
            ? "HOTEL_TO_AIRPORT"
            : "AIRPORT_TO_HOTEL",
        // Set pickup and dropoff based on trip direction
        ...(tripDirection === "hotel-to-airport"
          ? {
              pickupLocationId: null, // Hotel pickup doesn't need location ID
              dropoffLocationId: locations.find(
                (loc) => loc.name === formData.destination
              )?.id,
            }
          : {
              pickupLocationId: locations.find(
                (loc) => loc.name === formData.pickup
              )?.id,
              dropoffLocationId: null, // Hotel dropoff doesn't need location ID
            }),
      };

      // Send request to backend
      try {
        const response = await api.post("/guest/create-trip", tripData);
        console.log(response);
        
        if (response.trip) {
          onBookingCreated(response.trip);
        }

        setIsSubmitting(false);
      } catch (error) {
        console.error("Error creating trip:", error);
      }
    } catch (error) {
      console.error("Error creating trip:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Book a Shuttle</CardTitle>
          <CardDescription>
            Fill in the details below to book your shuttle ride
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs
            defaultValue="hotel-to-airport"
            value={tripDirection}
            onValueChange={(value) =>
              setTripDirection(value as "hotel-to-airport" | "airport-to-hotel")
            }
          >
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="hotel-to-airport">
                Hotel to Airport
              </TabsTrigger>
              <TabsTrigger value="airport-to-hotel">
                Airport to Hotel
              </TabsTrigger>
            </TabsList>
            <TabsContent value="hotel-to-airport">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Pickup Location */}
                <div className="space-y-2">
                  <Label htmlFor="pickup">Pickup Location</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <Input
                      id="pickup"
                      value={hotel.name}
                      className="pl-10 bg-gray-100"
                      disabled
                    />
                  </div>
                </div>

                {/* Destination */}
                <div className="space-y-2">
                  <Label htmlFor="destination">Destination</Label>
                  <Select
                    value={formData.destination}
                    onValueChange={(value) =>
                      setFormData({ ...formData, destination: value })
                    }
                  >
                    <SelectTrigger>
                      <div className="flex items-center">
                        <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                        <SelectValue placeholder="Select terminal" />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      {locations.map((location) => (
                        <SelectItem key={location.id} value={location.name}>
                          {location.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Date and Time */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date">Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={formData.createdAt}
                      className="bg-gray-100"
                      disabled
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="time">Time</Label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                      <Input
                        id="time"
                        type="time"
                        value={formData.preferredTime}
                        className="pl-10 bg-gray-100"
                        disabled
                      />
                    </div>
                  </div>
                </div>

                {/* Number of Passengers */}
                <div className="space-y-2">
                  <Label htmlFor="passengers">Number of Passengers</Label>
                  <div className="flex items-center space-x-2">
                    <Users className="w-4 h-4 mr-2 text-gray-400" />
                    <Input
                      id="passengers"
                      type="number"
                      value={formData.numberOfPersons.toString()}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          numberOfPersons: parseInt(e.target.value),
                        })
                      }
                    />
                  </div>
                </div>

                {/* Number of Bags */}
                <div className="space-y-2">
                  <Label htmlFor="bags">Number of Bags</Label>
                  <div className="flex items-center space-x-2">
                    <Briefcase className="w-4 h-4 mr-2 text-gray-400" />
                    <Input
                      id="bags"
                      type="number"
                      value={formData.numberOfBags.toString()}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          numberOfBags: parseInt(e.target.value),
                        })
                      }
                    />
                  </div>
                </div>

                {/* Payment Method */}
                <div className="space-y-3">
                  <Label>Payment Method</Label>
                  <RadioGroup
                    value={formData.paymentMethod}
                    onValueChange={(value) =>
                      setFormData({ ...formData, paymentMethod: value })
                    }
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="frontdesk" id="frontdesk" />
                      <Label
                        htmlFor="frontdesk"
                        className="flex items-center space-x-2"
                      >
                        <CreditCard className="w-4 h-4" />
                        <span>Pay at Front Desk</span>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Special Notes */}
                {/* <div className="space-y-2">
                  <Label htmlFor="notes">Special Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Any special requirements or notes for the driver"
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    rows={3}
                  />
                </div> */}

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full"
                  size="lg"
                >
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
            </TabsContent>
            <TabsContent value="airport-to-hotel">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Pickup Location */}
                <div className="space-y-2">
                  <Label htmlFor="pickup">Pickup Location</Label>
                  <Select
                    value={formData.pickup}
                    onValueChange={(value) =>
                      setFormData({ ...formData, pickup: value })
                    }
                  >
                    <SelectTrigger>
                      <div className="flex items-center">
                        <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                        <SelectValue placeholder="Select terminal" />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      {locations.map((location) => (
                        <SelectItem key={location.id} value={location.name}>
                          {location.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Destination */}
                <div className="space-y-2">
                  <Label htmlFor="destination">Destination</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <Input
                      id="destination"
                      value={hotel.name}
                      className="pl-10 bg-gray-100"
                      disabled
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
                      value={formData.createdAt}
                      className="bg-gray-100"
                      disabled
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="time">Time</Label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                      <Input
                        id="time"
                        type="time"
                        value={formData.preferredTime}
                        className="pl-10 bg-gray-100"
                        disabled
                      />
                    </div>
                  </div>
                </div>

                {/* Number of Passengers */}
                <div className="space-y-2">
                  <Label htmlFor="passengers">Number of Passengers</Label>
                  <div className="flex items-center space-x-2">
                    <Users className="w-4 h-4 mr-2 text-gray-400" />
                    <Input
                      id="passengers"
                      type="number"
                      value={formData.numberOfPersons.toString()}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          numberOfPersons: parseInt(e.target.value),
                        })
                      }
                    />
                  </div>
                </div>

                {/* Number of Bags */}
                <div className="space-y-2">
                  <Label htmlFor="bags">Number of Bags</Label>
                  <div className="flex items-center space-x-2">
                    <Briefcase className="w-4 h-4 mr-2 text-gray-400" />
                    <Input
                      id="bags"
                      type="number"
                      value={formData.numberOfBags.toString()}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          numberOfBags: parseInt(e.target.value),
                        })
                      }
                    />
                  </div>
                </div>

                {/* Payment Method */}
                <div className="space-y-3">
                  <Label>Payment Method</Label>
                  <RadioGroup
                    value={formData.paymentMethod}
                    onValueChange={(value) =>
                      setFormData({ ...formData, paymentMethod: value })
                    }
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="frontdesk" id="frontdesk" />
                      <Label
                        htmlFor="frontdesk"
                        className="flex items-center space-x-2"
                      >
                        <CreditCard className="w-4 h-4" />
                        <span>Pay at Front Desk</span>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Special Notes */}
                {/* <div className="space-y-2">
                  <Label htmlFor="notes">Special Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Any special requirements or notes for the driver"
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    rows={3}
                  />
                </div> */}

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full"
                  size="lg"
                >
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
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
