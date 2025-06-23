"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/hooks/use-toast";
import { jwtDecode } from "jwt-decode";
import { fetchWithAuth } from "@/lib/api";
import { QRCodeDisplay } from "@/components/QRCodeDisplay";

interface Location {
  id: number;
  name: string;
}

const paymentMethods = [
  { value: "APP", label: "Mobile App" },
  { value: "FRONTDESK", label: "Front Desk" },
  { value: "DEPOSIT", label: "Deposit" },
];

interface DecodedToken {
  userId: number;
  role: string;
  hotelId: number;
}

export default function NewBookingPage() {
  const [guestType, setGuestType] = useState<"resident" | "non-resident">("resident");
  const [locations, setLocations] = useState<Location[]>([]);
  const [formData, setFormData] = useState({
    numberOfPersons: "",
    numberOfBags: "",
    pickupLocation: "",
    dropoffLocation: "",
    preferredTime: new Date().toISOString().slice(0, 16),
    tripType: "",
    paymentMethod: "",
    email: "",
    firstName: "",
    lastName: "",
    phoneNumber: "",
    isWaived: false,
    waiverReason: "",
  });
  const { toast } = useToast();
  const [showQRCode, setShowQRCode] = useState(false);
  const [bookingQRCode, setBookingQRCode] = useState<string>("");
  const [bookingId, setBookingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const response = await fetchWithAuth("/frontdesk/locations");
        const data = await response.json();
        setLocations(data.locations);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to fetch locations. Please try again.",
          variant: "destructive",
        });
      }
    };

    fetchLocations();
  }, [toast]);

  // Function to handle trip type change
  const handleTripTypeChange = (value: string) => {
    if (value === "hotel-to-airport") {
      setFormData({
        ...formData,
        tripType: value,
        pickupLocation: "Hotel Lobby", // Fixed pickup location
        dropoffLocation: "", // Reset dropoff location
      });
    } else if (value === "airport-to-hotel") {
      setFormData({
        ...formData,
        tripType: value,
        pickupLocation: "", // Reset pickup location
        dropoffLocation: "Hotel Lobby", // Fixed dropoff location
      });
    } else {
      setFormData({
        ...formData,
        tripType: value,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate waiver reason if booking is waived
    if (formData.isWaived && !formData.waiverReason.trim()) {
      toast({
        title: "Error",
        description: "Please provide a reason for waiving the booking fee.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const token = localStorage.getItem("frontdeskToken");
      if (!token) {
        throw new Error("No token found");
      }

      const decoded = jwtDecode<DecodedToken>(token);
      const bookingData = {
        ...formData,
        isNonResident: guestType === "non-resident",
        hotelId: decoded.hotelId,
        pickupLocationId: formData.tripType === "HOTEL_TO_AIRPORT" ? null : parseInt(formData.pickupLocation),
        dropoffLocationId: formData.tripType === "HOTEL_TO_AIRPORT" ? parseInt(formData.dropoffLocation) : null,
      };

      const response = await fetchWithAuth("/frontdesk/bookings", {
        method: "POST",
        body: JSON.stringify(bookingData),
      });

      const data = await response.json();

      toast({
        title: "Booking Created",
        description: formData.isWaived 
          ? "New trip booking has been successfully created with waived fee." 
          : "New trip booking has been successfully created.",
      });

      // Show QR code
      if (data.booking.qrCodePath) {
        setBookingQRCode(data.booking.qrCodePath);
        setBookingId(data.booking.id);
        setShowQRCode(true);
      }

      // Reset form
      setFormData({
        numberOfPersons: "",
        numberOfBags: "",
        pickupLocation: "",
        dropoffLocation: "",
        preferredTime: new Date().toISOString().slice(0, 16),
        tripType: "",
        paymentMethod: "",
        email: "",
        firstName: "",
        lastName: "",
        phoneNumber: "",
        isWaived: false,
        waiverReason: "",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create booking. Please try again.",
        variant: "destructive",
      });
    }
  };

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
            <Tabs value={guestType} onValueChange={(value) => setGuestType(value as "resident" | "non-resident")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="resident">Hotel Resident</TabsTrigger>
                <TabsTrigger value="non-resident">Non-Resident</TabsTrigger>
              </TabsList>

              <TabsContent value="resident" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">
                    Resident Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter resident's email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        email: e.target.value,
                      })
                    }
                    required
                  />
                </div>
              </TabsContent>

              <TabsContent value="non-resident" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) =>
                        setFormData({ ...formData, firstName: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) =>
                        setFormData({ ...formData, lastName: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phoneNumber">Phone Number *</Label>
                    <Input
                      id="phoneNumber"
                      type="tel"
                      value={formData.phoneNumber}
                      onChange={(e) =>
                        setFormData({ ...formData, phoneNumber: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            {/* Trip Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="numberOfPersons">Number of Persons *</Label>
                <Input
                  id="numberOfPersons"
                  type="number"
                  min="1"
                  value={formData.numberOfPersons}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      numberOfPersons: e.target.value,
                    })
                  }
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
                  onChange={(e) =>
                    setFormData({ ...formData, numberOfBags: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="preferredTime">Preferred Time *</Label>
                <Input
                  id="preferredTime"
                  type="datetime-local"
                  value={formData.preferredTime}
                  disabled
                  className="bg-gray-100"
                />
              </div>
              <div className="space-y-2">
                <Label>Trip Type *</Label>
                <Select
                  value={formData.tripType}
                  onValueChange={handleTripTypeChange}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select trip type" />
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
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Pickup Location *</Label>
                <Select
                  value={formData.pickupLocation}
                  onValueChange={(value) =>
                    setFormData({ ...formData, pickupLocation: value })
                  }
                  required
                  disabled={formData.tripType === "HOTEL_TO_AIRPORT"}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select pickup location" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((location) => (
                      <SelectItem key={location.id} value={location.id.toString()}>
                        {location.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Dropoff Location *</Label>
                <Select
                  value={formData.dropoffLocation}
                  onValueChange={(value) =>
                    setFormData({ ...formData, dropoffLocation: value })
                  }
                  required
                  disabled={formData.tripType === "AIRPORT_TO_HOTEL"}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select dropoff location" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((location) => (
                      <SelectItem key={location.id} value={location.id.toString()}>
                        {location.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Payment Method *</Label>
              <Select
                value={formData.paymentMethod}
                onValueChange={(value) =>
                  setFormData({ ...formData, paymentMethod: value })
                }
                required
                disabled={formData.isWaived}
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

            {/* Waiver Section */}
            <div className="space-y-4 p-4 border border-orange-200 rounded-lg bg-orange-50">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isWaived"
                  checked={formData.isWaived}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isWaived: checked as boolean })
                  }
                />
                <Label htmlFor="isWaived" className="text-orange-800 font-medium">
                  Waive Booking Fee
                </Label>
              </div>
              {formData.isWaived && (
                <div className="space-y-2">
                  <Label htmlFor="waiverReason" className="text-orange-800">
                    Reason for Waiver *
                  </Label>
                  <Textarea
                    id="waiverReason"
                    placeholder="Please provide a detailed reason for waiving the booking fee..."
                    value={formData.waiverReason}
                    onChange={(e) =>
                      setFormData({ ...formData, waiverReason: e.target.value })
                    }
                    className="min-h-[100px]"
                    required
                  />
                  <p className="text-sm text-orange-700">
                    Note: This waiver will be visible to admin for review and approval.
                  </p>
                </div>
              )}
            </div>

            <Button type="submit" className="w-full">
              Create Booking
            </Button>
          </form>
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
