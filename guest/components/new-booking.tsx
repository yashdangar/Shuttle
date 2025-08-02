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
    destination: "",
    createdAt: currentDate,
    preferredTime: currentTime,
    notes: "",
    paymentMethod: "frontdesk",
    numberOfBags: 0,
    numberOfPersons: 0,
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
  const [pricing, setPricing] = useState<{
    pricePerPerson: number;
    totalPrice: number;
    locationName: string;
  } | null>(null);
  const [isLoadingPricing, setIsLoadingPricing] = useState(false);

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

  const fetchPricing = async () => {
    try {
      // Determine which location to use for pricing based on trip direction
      let locationId = null;
      let locationName = "";

      if (tripDirection === "hotel-to-airport") {
        // For hotel to airport, use destination (airport) for pricing
        const selectedLocation = locations.find(
          (loc) => loc.name === formData.destination
        );
        if (selectedLocation) {
          locationId = selectedLocation.id;
          locationName = selectedLocation.name;
        }
      } else if (tripDirection === "airport-to-hotel") {
        // For airport to hotel, use pickup (airport) for pricing
        const selectedLocation = locations.find(
          (loc) => loc.name === formData.pickup
        );
        if (selectedLocation) {
          locationId = selectedLocation.id;
          locationName = selectedLocation.name;
        }
      } else if (tripDirection === "park-sleep-fly") {
        // For park sleep fly, use the appropriate location based on trip type
        if (formData.tripType === "HOTEL_TO_AIRPORT") {
          const selectedLocation = locations.find(
            (loc) => loc.name === formData.destination
          );
          if (selectedLocation) {
            locationId = selectedLocation.id;
            locationName = selectedLocation.name;
          }
        } else if (formData.tripType === "AIRPORT_TO_HOTEL") {
          const selectedLocation = locations.find(
            (loc) => loc.name === formData.pickup
          );
          if (selectedLocation) {
            locationId = selectedLocation.id;
            locationName = selectedLocation.name;
          }
        }
      }

      if (locationId && formData.numberOfPersons > 0) {
        setIsLoadingPricing(true);
        setPricing(null); // Clear previous pricing while loading
        
        const response = await api.get(
          `/guest/get-pricing?locationId=${locationId}&numberOfPersons=${formData.numberOfPersons}`
        );
        if (response.pricing) {
          setPricing({
            pricePerPerson: response.pricing.pricePerPerson,
            totalPrice: response.pricing.totalPrice,
            locationName,
          });
        }
      } else {
        setPricing(null);
      }
    } catch (error) {
      console.error("Error fetching pricing:", error);
      setPricing(null);
    } finally {
      setIsLoadingPricing(false);
    }
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  // Fetch pricing when location or number of persons changes
  useEffect(() => {
    if (locations.length > 0) {
      fetchPricing();
    }
  }, [
    locations,
    formData.destination,
    formData.pickup,
    formData.numberOfPersons,
    formData.tripType,
    tripDirection,
  ]);

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

    // Validation: For Park Sleep Fly, trip type must be selected
    if (tripDirection === "park-sleep-fly" && !formData.tripType) {
      toast.error(
        "Please select a trip direction for your Park, Sleep & Fly package"
      );
      return;
    }

    // Validation: For Park Sleep Fly, ensure pickup and destination are set based on trip type
    if (tripDirection === "park-sleep-fly") {
      if (formData.tripType === "HOTEL_TO_AIRPORT" && !formData.destination) {
        toast.error("Please select your airport destination");
        return;
      }
      if (formData.tripType === "AIRPORT_TO_HOTEL" && !formData.pickup) {
        toast.error("Please select your airport pickup location");
        return;
      }
    }

    // Validation: numberOfPersons must be > 0
    if (formData.numberOfPersons < 1) {
      toast.error("Number of persons must be at least 1");
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
          tripDirection === "park-sleep-fly"
            ? formData.tripType
            : tripDirection === "hotel-to-airport"
            ? "HOTEL_TO_AIRPORT"
            : "AIRPORT_TO_HOTEL",
        // Set pickup and dropoff based on trip direction
        ...(tripDirection === "park-sleep-fly"
          ? formData.tripType === "HOTEL_TO_AIRPORT"
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
              }
          : tripDirection === "hotel-to-airport"
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

          // QR code will be generated after frontdesk verification
          // No QR code display here - it will be shown after verification
        }

        setIsSubmitting(false);
      } catch (error: any) {
        console.error("Error creating trip:", error);
        // Display error message to user
        const errorMessage = error.response?.data?.error || "Failed to create booking. Please try again.";
        toast.error(errorMessage);
      }
    } catch (error: any) {
      console.error("Error creating trip:", error);
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Function to handle trip direction change
  const handleTripDirectionChange = (value: string) => {
    setTripDirection(
      value as "hotel-to-airport" | "airport-to-hotel" | "park-sleep-fly"
    );

    // For Park Sleep Fly, don't auto-set trip type - let user choose
    if (value === "park-sleep-fly") {
      setFormData({
        ...formData,
        isParkSleepFly: true,
        // Don't auto-set trip type - let user choose
        tripType: "",
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
          <CardTitle className="text-xl sm:text-2xl">Book a Shuttle</CardTitle>
          <CardDescription>
            Fill in the details below to book your shuttle ride
          </CardDescription>
          <div className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded p-2">
            All times will be in your local timezone: <b>{getUserTimeZone()}</b>
          </div>
        </CardHeader>
        <CardContent>
                    {/* Custom Mobile-Friendly Tabs */}
          <div className="mb-6">
            {/* Mobile: Vertical Stack */}
            <div className="block sm:hidden space-y-2">
              <button
                onClick={() => handleTripDirectionChange("hotel-to-airport")}
                className={`w-full p-3 text-left rounded-lg border-2 transition-all ${
                  tripDirection === "hotel-to-airport"
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                }`}
              >
                <div className="font-medium">Hotel → Airport</div>
              </button>
              <button
                onClick={() => handleTripDirectionChange("airport-to-hotel")}
                className={`w-full p-3 text-left rounded-lg border-2 transition-all ${
                  tripDirection === "airport-to-hotel"
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                }`}
              >
                <div className="font-medium">Airport → Hotel</div>
              </button>
              <button
                onClick={() => handleTripDirectionChange("park-sleep-fly")}
                className={`w-full p-3 text-left rounded-lg border-2 transition-all ${
                  tripDirection === "park-sleep-fly"
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                }`}
              >
                <div className="font-medium">Park, Sleep & Fly</div>
              </button>
            </div>

            {/* Desktop: Horizontal Tabs */}
            <div className="hidden sm:block">
              <Tabs
                defaultValue="hotel-to-airport"
                value={tripDirection}
                onValueChange={handleTripDirectionChange}
              >
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="hotel-to-airport">
                    Hotel to Airport 
                  </TabsTrigger>
                  <TabsTrigger value="airport-to-hotel">
                    Airport to Hotel 
                  </TabsTrigger>
                  <TabsTrigger value="park-sleep-fly">
                    Park, Sleep & Fly
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
          
          {/* Content Tabs */}
          <Tabs
            defaultValue="hotel-to-airport"
            value={tripDirection}
            onValueChange={handleTripDirectionChange}
          >
            <TabsContent value="hotel-to-airport">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Guest Information Section */}
                <div className="space-y-4">
                  <h3 className="text-base sm:text-lg font-semibold">Guest Information</h3>
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
                      min="1"
                      value={formData.numberOfPersons.toString()}
                      onChange={(e) => {
                        const value = parseInt(e.target.value);
                        if (!isNaN(value) && value >= 1) {
                          setFormData({
                            ...formData,
                            numberOfPersons: value,
                          });
                        } else if (e.target.value === "") {
                          setFormData({
                            ...formData,
                            numberOfPersons: 1,
                          });
                        }
                      }}
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
                      min="0"
                      value={formData.numberOfBags.toString()}
                      onChange={(e) => {
                        const value = parseInt(e.target.value);
                        if (!isNaN(value) && value >= 0) {
                          setFormData({
                            ...formData,
                            numberOfBags: value,
                          });
                        } else if (e.target.value === "") {
                          setFormData({
                            ...formData,
                            numberOfBags: 0,
                          });
                        }
                      }}
                    />
                  </div>
                </div>

                {/* Pricing Information */}
                {(pricing || isLoadingPricing) && (
                  <div className="space-y-2">
                    <Label>Pricing</Label>
                    <div className={`p-4 border rounded-lg transition-all duration-300 ${
                      isLoadingPricing 
                        ? "bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700" 
                        : "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800"
                    }`}>
                      {isLoadingPricing ? (
                        <div className="flex items-center justify-center py-4">
                          <div className="flex items-center space-x-2">
                            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              Calculating pricing...
                            </span>
                          </div>
                        </div>
                      ) : pricing ? (
                        <>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {pricing.locationName} - {formData.numberOfPersons}{" "}
                              person(s)
                            </span>
                            <span className="text-sm font-medium text-green-700 dark:text-green-300">
                              ${pricing.pricePerPerson.toFixed(2)} per person
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                              Total Price
                            </span>
                            <span className="text-xl font-bold text-green-700 dark:text-green-300">
                              ${pricing.totalPrice.toFixed(2)}
                            </span>
                          </div>
                        </>
                      ) : null}
                    </div>
                  </div>
                )}

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
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Guest Information Section */}
                <div className="space-y-4">
                  <h3 className="text-base sm:text-lg font-semibold">Guest Information</h3>
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
                      min="1"
                      value={formData.numberOfPersons.toString()}
                      onChange={(e) => {
                        const value = parseInt(e.target.value);
                        if (!isNaN(value) && value >= 1) {
                          setFormData({
                            ...formData,
                            numberOfPersons: value,
                          });
                        } else if (e.target.value === "") {
                          setFormData({
                            ...formData,
                            numberOfPersons: 1,
                          });
                        }
                      }}
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
                      min="0"
                      value={formData.numberOfBags.toString()}
                      onChange={(e) => {
                        const value = parseInt(e.target.value);
                        if (!isNaN(value) && value >= 0) {
                          setFormData({
                            ...formData,
                            numberOfBags: value,
                          });
                        } else if (e.target.value === "") {
                          setFormData({
                            ...formData,
                            numberOfBags: 0,
                          });
                        }
                      }}
                    />
                  </div>
                </div>

                {/* Pricing Information */}
                {(pricing || isLoadingPricing) && (
                  <div className="space-y-2">
                    <Label>Pricing</Label>
                    <div className={`p-4 border rounded-lg transition-all duration-300 ${
                      isLoadingPricing 
                        ? "bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700" 
                        : "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800"
                    }`}>
                      {isLoadingPricing ? (
                        <div className="flex items-center justify-center py-4">
                          <div className="flex items-center space-x-2">
                            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              Calculating pricing...
                            </span>
                          </div>
                        </div>
                      ) : pricing ? (
                        <>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {pricing.locationName} - {formData.numberOfPersons}{" "}
                              person(s)
                            </span>
                            <span className="text-sm font-medium text-green-700 dark:text-green-300">
                              ${pricing.pricePerPerson.toFixed(2)} per person
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                              Total Price
                            </span>
                            <span className="text-xl font-bold text-green-700 dark:text-green-300">
                              ${pricing.totalPrice.toFixed(2)}
                            </span>
                          </div>
                        </>
                      ) : null}
                    </div>
                  </div>
                )}

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
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Guest Information Section */}
                <div className="space-y-4">
                  <h3 className="text-base sm:text-lg font-semibold">Guest Information</h3>
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

                {/* Trip Type Selection for Park Sleep Fly */}
                <div className="space-y-2">
                  <Label htmlFor="tripType">Trip Direction *</Label>
                  <Select
                    value={formData.tripType}
                    onValueChange={(value) =>
                      setFormData({ ...formData, tripType: value })
                    }
                    required
                  >
                    <SelectTrigger>
                      <div className="flex items-center">
                        <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                        <SelectValue placeholder="Select trip direction" />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="HOTEL_TO_AIRPORT">
                        Hotel to Airport 
                      </SelectItem>
                      <SelectItem value="AIRPORT_TO_HOTEL">
                        Airport to Hotel
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Pickup Location for Park Sleep Fly */}
                <div className="space-y-2">
                  <Label htmlFor="pickup">Pickup Location *</Label>
                  {formData.tripType === "HOTEL_TO_AIRPORT" ? (
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                      <Input
                        id="pickup"
                        value={hotel.name}
                        className="pl-10 bg-gray-100"
                        disabled
                      />
                    </div>
                  ) : (
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
                  )}
                  <p className="text-sm text-blue-600">
                    {formData.tripType === "HOTEL_TO_AIRPORT"
                      ? "Pickup will be from the hotel lobby."
                      : ""}
                  </p>
                </div>

                {/* Destination */}
                <div className="space-y-2">
                  <Label htmlFor="destination">Destination</Label>
                  {formData.tripType === "AIRPORT_TO_HOTEL" ? (
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                      <Input
                        id="destination"
                        value={hotel.name}
                        className="pl-10 bg-gray-100"
                        disabled
                      />
                    </div>
                  ) : (
                    <Select
                      value={formData.destination}
                      onValueChange={(value) =>
                        setFormData({ ...formData, destination: value })
                      }
                      required
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
                  )}
                  <p className="text-sm text-blue-600">
                    {formData.tripType === "AIRPORT_TO_HOTEL"
                      ? "Destination will be the hotel lobby."
                      : "Please select your airport terminal destination."}
                  </p>
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
                      min="1"
                      value={formData.numberOfPersons.toString()}
                      onChange={(e) => {
                        const value = parseInt(e.target.value);
                        if (!isNaN(value) && value >= 1) {
                          setFormData({
                            ...formData,
                            numberOfPersons: value,
                          });
                        } else if (e.target.value === "") {
                          setFormData({
                            ...formData,
                            numberOfPersons: 1,
                          });
                        }
                      }}
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
                      min="0"
                      value={formData.numberOfBags.toString()}
                      onChange={(e) => {
                        const value = parseInt(e.target.value);
                        if (!isNaN(value) && value >= 0) {
                          setFormData({
                            ...formData,
                            numberOfBags: value,
                          });
                        } else if (e.target.value === "") {
                          setFormData({
                            ...formData,
                            numberOfBags: 0,
                          });
                        }
                      }}
                    />
                  </div>
                </div>

                {/* Pricing Information */}
                {(pricing || isLoadingPricing) && (
                  <div className="space-y-2">
                    <Label>Pricing</Label>
                    <div className={`p-4 border rounded-lg transition-all duration-300 ${
                      isLoadingPricing 
                        ? "bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700" 
                        : "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800"
                    }`}>
                      {isLoadingPricing ? (
                        <div className="flex items-center justify-center py-4">
                          <div className="flex items-center space-x-2">
                            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              Calculating pricing...
                            </span>
                          </div>
                        </div>
                      ) : pricing ? (
                        <>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {pricing.locationName} - {formData.numberOfPersons}{" "}
                              person(s)
                            </span>
                            <span className="text-sm font-medium text-green-700 dark:text-green-300">
                              ${pricing.pricePerPerson.toFixed(2)} per person
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                              Total Price
                            </span>
                            <span className="text-xl font-bold text-green-700 dark:text-green-300">
                              ${pricing.totalPrice.toFixed(2)}
                            </span>
                          </div>
                        </>
                      ) : null}
                    </div>
                  </div>
                )}

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

      {/* QR Code will be displayed after frontdesk verification */}
    </div>
  );
}
