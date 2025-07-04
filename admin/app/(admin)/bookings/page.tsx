"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { withAuth } from "@/components/withAuth";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { BookingsSkeleton } from "@/components/booking-skeleton";
import { BookingDetailsModal } from "@/components/booking-details-modal";
import { formatDateTimeForDisplay, getUserTimeZone } from "@/lib/utils";
import { 
  Search, 
  Filter, 
  Calendar, 
  User, 
  MapPin, 
  CreditCard, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock
} from "lucide-react";

interface Driver {
  id: string;
  name: string;
  phoneNumber: string;
  email: string;
}

interface Booking {
  id: string;
  guest: {
    firstName?: string;
    lastName?: string;
    email: string;
    isNonResident: boolean;
  };
  numberOfPersons: number;
  numberOfBags: number;
  pickupLocation?: {
    name: string;
  };
  dropoffLocation?: {
    name: string;
  };
  preferredTime: string;
  paymentMethod: string;
  bookingType: string;
  isCompleted: boolean;
  isPaid: boolean;
  isCancelled: boolean;
  isWaived: boolean;
  waiverReason?: string;
  waivedBy?: number;
  waivedAt?: string;
  waiverUser?: {
    name: string;
  };
  createdAt: string;
  updatedAt: string;
  notes?: string;
  isParkSleepFly?: boolean;
  shuttle?: {
    schedules: {
      driver: Driver;
    }[];
  };
  trip?: {
    driver: Driver;
  };
}

function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [waiverFilter, setWaiverFilter] = useState("all");
  const { toast } = useToast();

  useEffect(() => {
    fetchBookings();
  }, []);

  useEffect(() => {
    filterBookings();
  }, [bookings, searchTerm, statusFilter, waiverFilter]);

  const fetchBookings = async () => {
    try {
      const data = await api.get("/admin/bookings");
      setBookings(data.bookings);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch bookings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterBookings = () => {
    let filtered = bookings;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (booking) =>
          booking.guest.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          booking.guest.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          booking.guest.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          booking.id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      switch (statusFilter) {
        case "completed":
          filtered = filtered.filter((booking) => booking.isCompleted);
          break;
        case "pending":
          filtered = filtered.filter((booking) => !booking.isCompleted && !booking.isCancelled);
          break;
        case "cancelled":
          filtered = filtered.filter((booking) => booking.isCancelled);
          break;
        case "paid":
          filtered = filtered.filter((booking) => booking.isPaid);
          break;
        case "unpaid":
          filtered = filtered.filter((booking) => !booking.isPaid);
          break;
      }
    }

    // Waiver filter
    if (waiverFilter !== "all") {
      switch (waiverFilter) {
        case "waived":
          filtered = filtered.filter((booking) => booking.isWaived);
          break;
        case "not-waived":
          filtered = filtered.filter((booking) => !booking.isWaived);
          break;
      }
    }

    setFilteredBookings(filtered);
  };

  const getStatusBadge = (booking: Booking) => {
    if (booking.isCancelled) {
      return <Badge variant="destructive">Cancelled</Badge>;
    }
    if (booking.isCompleted) {
      return <Badge variant="default" className="bg-green-100 text-green-800">Completed</Badge>;
    }
    if (booking.isWaived) {
      return <Badge variant="default" className="bg-blue-100 text-blue-800">Approved</Badge>;
    }
    return <Badge variant="secondary">Pending</Badge>;
  };

  const getPaymentBadge = (booking: Booking) => {
    if (booking.isWaived) {
      return <Badge variant="outline" className="border-orange-200 text-orange-700 bg-orange-50">Waived</Badge>;
    }
    if (booking.isPaid) {
      return <Badge variant="default" className="bg-green-100 text-green-800">Paid</Badge>;
    }
    return <Badge variant="destructive">Unpaid</Badge>;
  };

  const formatDate = (dateString: string) => {
    return formatDateTimeForDisplay(dateString);
  };

  if (loading) {
    return <BookingsSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Timezone Info */}
      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-blue-900 text-sm">
        All times shown in your local timezone: <b>{getUserTimeZone()}</b>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>
        <p className="text-gray-600">Manage and view all shuttle bookings</p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  id="search"
                  placeholder="Search by guest name, email, or booking ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="waiver">Waiver Status</Label>
              <Select value={waiverFilter} onValueChange={setWaiverFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All bookings" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Bookings</SelectItem>
                  <SelectItem value="waived">Waived</SelectItem>
                  <SelectItem value="not-waived">Not Waived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("all");
                  setWaiverFilter("all");
                }}
                className="w-full"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bookings List */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">
            {filteredBookings.length} booking{filteredBookings.length !== 1 ? 's' : ''} found
          </h2>
        </div>

        {filteredBookings.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center h-32">
              <div className="text-center text-gray-500">
                <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No bookings found</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredBookings.map((booking) => (
              <Card 
                key={booking.id} 
                className={`${
                  booking.isWaived ? 'border-orange-200 bg-orange-50/30' : 
                  booking.isParkSleepFly ? 'border-blue-200 bg-blue-50/30' : ''
                }`}
              >
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <User className="w-5 h-5 text-gray-400" />
                          <div>
                            <p className="font-medium">
                              {booking.guest.firstName && booking.guest.lastName
                                ? `${booking.guest.firstName} ${booking.guest.lastName}`
                                : booking.guest.email}
                              {booking.isParkSleepFly && (
                                <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  Pay, Sleep & Fly
                                </span>
                              )}
                            </p>
                            <p className="text-sm text-gray-500">
                              {booking.guest.email}
                              {booking.guest.isNonResident && (
                                <Badge variant="outline" className="ml-2 text-xs">
                                  Non-Resident
                                </Badge>
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(booking)}
                          {getPaymentBadge(booking)}
                          <BookingDetailsModal booking={booking} />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          <div className="text-sm">
                            <p className="font-medium">Route</p>
                            <p className="text-gray-500">
                              {booking.bookingType === "HOTEL_TO_AIRPORT" 
                                ? "Hotel → Airport" 
                                : "Airport → Hotel"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <div className="text-sm">
                            <p className="font-medium">Preferred Time</p>
                            <p className="text-gray-500">
                              {formatDate(booking.preferredTime)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <div className="text-sm">
                            <p className="font-medium">Passengers</p>
                            <p className="text-gray-500">
                              {booking.numberOfPersons} person{booking.numberOfPersons !== 1 ? 's' : ''}
                              {booking.numberOfBags > 0 && `, ${booking.numberOfBags} bag${booking.numberOfBags !== 1 ? 's' : ''}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-gray-400" />
                          <div className="text-sm">
                            <p className="font-medium">Payment</p>
                            <p className="text-gray-500">
                              {booking.isWaived ? "Waived" : booking.paymentMethod}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Notes Section */}
                      {booking.notes && (
                        <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                          <p className="text-sm font-medium text-gray-700 mb-1">Notes:</p>
                          <p className="text-sm text-gray-600 whitespace-pre-wrap">{booking.notes}</p>
                        </div>
                      )}

                      {/* Pay Sleep Fly Information */}
                      {booking.isParkSleepFly && (
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <p className="text-sm font-medium text-blue-800 mb-1">Pay, Sleep & Fly Package</p>
                          <p className="text-sm text-blue-700">
                            This booking is part of our Pay, Sleep & Fly package. 
                            The guest has pre-paid for their accommodation and shuttle service.
                          </p>
                        </div>
                      )}

                      {/* Waiver Information */}
                      {booking.isWaived && (
                        <div className="mt-4 p-4 bg-orange-100 border border-orange-200 rounded-lg">
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5" />
                            <div className="flex-1">
                              <p className="font-medium text-orange-800 mb-1">
                                Booking Fee Waived
                              </p>
                              <p className="text-sm text-orange-700 mb-2">
                                <strong>Reason:</strong> {booking.waiverReason}
                              </p>
                              <p className="text-xs text-orange-600">
                                Waived by {booking.waiverUser?.name || 'Unknown'} on{' '}
                                {booking.waivedAt ? formatDate(booking.waivedAt) : 'Unknown date'}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t">
                        <p className="text-xs text-gray-500">
                          Booking ID: {booking.id}
                        </p>
                        <p className="text-xs text-gray-500">
                          Created: {formatDate(booking.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default withAuth(BookingsPage); 