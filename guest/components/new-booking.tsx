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
import {
  MapPin,
  Clock,
  Users,
  CreditCard,
  Briefcase,
  User,
  Hash,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api";
import { QRCodeDisplay } from "@/components/qr-code-display";
import { toast } from "sonner";
import { toUtcIso, getUserTimeZone } from "@/lib/utils";

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
    "hotel-to-airport" | "airport-to-hotel" | "park-sleep-fly"
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
    isParkSleepFly: false,
    // New fields for guest information
    firstName: "",
    lastName: "",
    confirmationNum: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [locations, setLocations] = useState<Location[]>([]);
  const [showQRCode, setShowQRCode] = useState(false);
  const [bookingQRCode, setBookingQRCode] = useState<string>("");
  const [bookingId, setBookingId] = useState<string | null>(null);

  // Validation state
  const hasName = formData.firstName.trim() && formData.lastName.trim();
  const hasConfirmation = formData.confirmationNum.trim();
  const isValid = hasName || hasConfirmation;

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

    // Validation: Either both firstName and lastName OR confirmationNum must be provided
    if (!isValid) {
      toast.error(
        "Please provide either your first name and last name, or your confirmation number"
      );
      return;
    }

    setIsSubmitting(true);

    try {
      // Create trip data based on direction
      const tripData = {
        numberOfPersons: formData.numberOfPersons,
        numberOfBags: formData.numberOfBags,
        preferredTime: toUtcIso(formData.createdAt, formData.preferredTime),
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
        // Add guest information
        firstName: formData.firstName,
        lastName: formData.lastName,
        confirmationNum: formData.confirmationNum,
        notes: formData.notes,
        isParkSleepFly: tripDirection === "park-sleep-fly", // Add Park Sleep Fly flag
      };

      // Send request to backend
      try {
        const response = await api.post("/guest/create-trip", tripData);
        console.log("API Response:", response);
        console.log("Trip data:", response.trip);

        if (response.trip) {
          onBookingCreated(response.trip);

          // Show QR code if available
          if (response.trip.qrCodePath) {
            setBookingQRCode(response.trip.qrCodePath);
            setBookingId(response.trip.id);
            setShowQRCode(true);
          }
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

  // Function to handle trip direction change
  const handleTripDirectionChange = (value: string) => {
    setTripDirection(
      value as "hotel-to-airport" | "airport-to-hotel" | "park-sleep-fly"
    );

    // Auto-set trip type for Park Sleep Fly
    if (value === "park-sleep-fly") {
      setFormData({
        ...formData,
        tripType: "AIRPORT_TO_HOTEL",
        isParkSleepFly: true,
      });
    } else {
      setFormData({
        ...formData,
        isParkSleepFly: false,
      });
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
          <div className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded p-2">
            All times will be in your local timezone: <b>{getUserTimeZone()}</b>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs
            defaultValue="hotel-to-airport"
            value={tripDirection}
            onValueChange={handleTripDirectionChange}
          >
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="hotel-to-airport">
                Hotel to Airport (Outbound)
              </TabsTrigger>
              <TabsTrigger value="airport-to-hotel">
                Airport to Hotel (Return)
              </TabsTrigger>
              <TabsTrigger value="park-sleep-fly">
                Park, Sleep & Fly
              </TabsTrigger>
            </TabsList>
            <TabsContent value="hotel-to-airport">
              <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  <strong>Round Trip:</strong> This booking will be part of a
                  round trip that includes both outbound and return journeys.
                </p>
              </div>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Guest Information Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Guest Information</h3>
                  <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      <strong>Required:</strong> Please provide either your
                      first name and last name, or your confirmation number
                    </p>
                  </div>

                  {/* First Name and Last Name */}
                  <div
                    className={`grid md:grid-cols-2 gap-4 p-4 rounded-lg border-2 transition-colors ${
                      hasName
                        ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950"
                        : "border-gray-200 dark:border-gray-700"
                    }`}
                  >
                    <div className="space-y-2">
                      <Label
                        htmlFor="firstName"
                        className={
                          hasName ? "text-green-700 dark:text-green-300" : ""
                        }
                      >
                        First Name{" "}
                        {hasName && <span className="text-green-600">✓</span>}
                      </Label>
                      <div className="relative">
                        <User className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                        <Input
                          id="firstName"
                          value={formData.firstName}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              firstName: e.target.value,
                            })
                          }
                          className="pl-10"
                          placeholder="Enter your first name"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor="lastName"
                        className={
                          hasName ? "text-green-700 dark:text-green-300" : ""
                        }
                      >
                        Last Name{" "}
                        {hasName && <span className="text-green-600">✓</span>}
                      </Label>
                      <div className="relative">
                        <User className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                        <Input
                          id="lastName"
                          value={formData.lastName}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              lastName: e.target.value,
                            })
                          }
                          className="pl-10"
                          placeholder="Enter your last name"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="text-center">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      OR
                    </span>
                  </div>

                  {/* Confirmation Number */}
                  <div
                    className={`space-y-2 p-4 rounded-lg border-2 transition-colors ${
                      hasConfirmation
                        ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950"
                        : "border-gray-200 dark:border-gray-700"
                    }`}
                  >
                    <Label
                      htmlFor="confirmationNum"
                      className={
                        hasConfirmation
                          ? "text-green-700 dark:text-green-300"
                          : ""
                      }
                    >
                      Confirmation Number{" "}
                      {hasConfirmation && (
                        <span className="text-green-600">✓</span>
                      )}
                    </Label>
                    <div className="relative">
                      <Hash className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                      <Input
                        id="confirmationNum"
                        value={formData.confirmationNum}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            confirmationNum: e.target.value,
                          })
                        }
                        className="pl-10"
                        placeholder="Enter your hotel confirmation number"
                      />
                    </div>
                  </div>
                </div>

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
                        <SelectValue placeholder="Select destination" />
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

                {/* Notes Section */}
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Add any special instructions, requests, or notes for this booking..."
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    className="min-h-[100px]"
                  />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Add any special requirements, accessibility needs, or other
                    important information for the driver.
                  </p>
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
              <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  <strong>Round Trip:</strong> This booking will be part of a
                  round trip that includes both outbound and return journeys.
                </p>
              </div>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Guest Information Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Guest Information</h3>
                  <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      <strong>Required:</strong> Please provide either your
                      first name and last name, or your confirmation number
                    </p>
                  </div>

                  {/* First Name and Last Name */}
                  <div
                    className={`grid md:grid-cols-2 gap-4 p-4 rounded-lg border-2 transition-colors ${
                      hasName
                        ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950"
                        : "border-gray-200 dark:border-gray-700"
                    }`}
                  >
                    <div className="space-y-2">
                      <Label
                        htmlFor="firstName"
                        className={
                          hasName ? "text-green-700 dark:text-green-300" : ""
                        }
                      >
                        First Name{" "}
                        {hasName && <span className="text-green-600">✓</span>}
                      </Label>
                      <div className="relative">
                        <User className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                        <Input
                          id="firstName"
                          value={formData.firstName}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              firstName: e.target.value,
                            })
                          }
                          className="pl-10"
                          placeholder="Enter your first name"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor="lastName"
                        className={
                          hasName ? "text-green-700 dark:text-green-300" : ""
                        }
                      >
                        Last Name{" "}
                        {hasName && <span className="text-green-600">✓</span>}
                      </Label>
                      <div className="relative">
                        <User className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                        <Input
                          id="lastName"
                          value={formData.lastName}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              lastName: e.target.value,
                            })
                          }
                          className="pl-10"
                          placeholder="Enter your last name"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="text-center">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      OR
                    </span>
                  </div>

                  {/* Confirmation Number */}
                  <div
                    className={`space-y-2 p-4 rounded-lg border-2 transition-colors ${
                      hasConfirmation
                        ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950"
                        : "border-gray-200 dark:border-gray-700"
                    }`}
                  >
                    <Label
                      htmlFor="confirmationNum"
                      className={
                        hasConfirmation
                          ? "text-green-700 dark:text-green-300"
                          : ""
                      }
                    >
                      Confirmation Number{" "}
                      {hasConfirmation && (
                        <span className="text-green-600">✓</span>
                      )}
                    </Label>
                    <div className="relative">
                      <Hash className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                      <Input
                        id="confirmationNum"
                        value={formData.confirmationNum}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            confirmationNum: e.target.value,
                          })
                        }
                        className="pl-10"
                        placeholder="Enter your hotel confirmation number"
                      />
                    </div>
                  </div>
                </div>

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
                        <SelectValue placeholder="Select pickup location" />
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

                {/* Notes Section */}
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Add any special instructions, requests, or notes for this booking..."
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    className="min-h-[100px]"
                  />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Add any special requirements, accessibility needs, or other
                    important information for the driver.
                  </p>
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
            <TabsContent value="park-sleep-fly">
              <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  <strong>Park, Sleep & Fly Package:</strong> This booking is
                  for guests who have purchased our Park, Sleep & Fly package.
                  Trip direction is automatically set to Airport to Hotel.
                </p>
              </div>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Guest Information Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Guest Information</h3>
                  <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      <strong>Required:</strong> Please provide either your
                      first name and last name, or your confirmation number
                    </p>
                  </div>

                  {/* First Name and Last Name */}
                  <div
                    className={`grid md:grid-cols-2 gap-4 p-4 rounded-lg border-2 transition-colors ${
                      hasName
                        ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950"
                        : "border-gray-200 dark:border-gray-700"
                    }`}
                  >
                    <div className="space-y-2">
                      <Label
                        htmlFor="firstName"
                        className={
                          hasName ? "text-green-700 dark:text-green-300" : ""
                        }
                      >
                        First Name{" "}
                        {hasName && <span className="text-green-600">✓</span>}
                      </Label>
                      <div className="relative">
                        <User className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                        <Input
                          id="firstName"
                          value={formData.firstName}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              firstName: e.target.value,
                            })
                          }
                          className="pl-10"
                          placeholder="Enter your first name"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor="lastName"
                        className={
                          hasName ? "text-green-700 dark:text-green-300" : ""
                        }
                      >
                        Last Name{" "}
                        {hasName && <span className="text-green-600">✓</span>}
                      </Label>
                      <div className="relative">
                        <User className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                        <Input
                          id="lastName"
                          value={formData.lastName}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              lastName: e.target.value,
                            })
                          }
                          className="pl-10"
                          placeholder="Enter your last name"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="text-center">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      OR
                    </span>
                  </div>

                  {/* Confirmation Number */}
                  <div
                    className={`space-y-2 p-4 rounded-lg border-2 transition-colors ${
                      hasConfirmation
                        ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950"
                        : "border-gray-200 dark:border-gray-700"
                    }`}
                  >
                    <Label
                      htmlFor="confirmationNum"
                      className={
                        hasConfirmation
                          ? "text-green-700 dark:text-green-300"
                          : ""
                      }
                    >
                      Confirmation Number{" "}
                      {hasConfirmation && (
                        <span className="text-green-600">✓</span>
                      )}
                    </Label>
                    <div className="relative">
                      <Hash className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                      <Input
                        id="confirmationNum"
                        value={formData.confirmationNum}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            confirmationNum: e.target.value,
                          })
                        }
                        className="pl-10"
                        placeholder="Enter your hotel confirmation number"
                      />
                    </div>
                  </div>
                </div>

                {/* Pickup Location for Park Sleep Fly */}
                <div className="space-y-2">
                  <Label htmlFor="pickup">Pickup Location *</Label>
                  <Select
                    value={formData.pickup}
                    onValueChange={(value) =>
                      setFormData({ ...formData, pickup: value })
                    }
                    required
                  >
                    <SelectTrigger>
                      <div className="flex items-center">
                        <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                        <SelectValue placeholder="Select pickup location" />
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
                  <p className="text-sm text-blue-600">
                    Please select your airport terminal or pickup location for
                    the Park, Sleep & Fly package.
                  </p>
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

                {/* Notes Section */}
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Add any special instructions, requests, or notes for this booking..."
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    className="min-h-[100px]"
                  />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Add any special requirements, accessibility needs, or other
                    important information for the driver.
                  </p>
                </div>

                {/* Payment Method for Park Sleep Fly */}
                <div className="space-y-3">
                  <Label>Payment Method</Label>
                  <RadioGroup
                    value={formData.paymentMethod}
                    onValueChange={(value) =>
                      setFormData({ ...formData, paymentMethod: value })
                    }
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem
                        value="frontdesk"
                        id="frontdesk-park-sleep-fly"
                      />
                      <Label
                        htmlFor="frontdesk-park-sleep-fly"
                        className="flex items-center space-x-2"
                      >
                        <CreditCard className="w-4 h-4" />
                        <span>Pay at Front Desk</span>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

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
                    "Confirm Park, Sleep & Fly Booking"
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Add QR Code Display */}
      {bookingId && (
        <QRCodeDisplay
          qrCodePath={bookingQRCode}
          bookingId={bookingId}
          isOpen={showQRCode}
          onClose={() => setShowQRCode(false)}
        />
      )}
    </div>
  );
}
