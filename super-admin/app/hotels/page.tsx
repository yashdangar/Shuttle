"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { authApi, hotelsApi } from "@/lib/api";
import withAuth from "@/components/withAuth";
import { HotelDetailsModal } from "@/components/hotel-details-modal";
import {
  Building2,
  Users,
  Car,
  UserCheck,
  Eye,
  MapPin,
  Mail,
  Phone,
  Calendar,
  Shield,
  Search,
  ArrowLeft,
} from "lucide-react";

interface Hotel {
  id: number;
  name: string;
  address: string | null;
  phoneNumber: string | null;
  email: string | null;
  status: string;
  createdAt: string;
  admins: Array<{
    id: number;
    name: string;
    email: string;
    createdAt: string;
  }>;
  frontDesks: Array<{
    id: number;
    name: string;
    email: string;
    phoneNumber: string;
    createdAt: string;
  }>;
  drivers: Array<{
    id: number;
    name: string;
    email: string;
    phoneNumber: string;
    createdAt: string;
  }>;
  shuttles: Array<{
    id: number;
    vehicleNumber: string;
    seats: number;
    createdAt: string;
  }>;
  _count: {
    admins: number;
    frontDesks: number;
    drivers: number;
    guests: number;
    shuttles: number;
  };
}

function HotelsPage() {
  const router = useRouter();
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(null);
  const [hotelModalOpen, setHotelModalOpen] = useState(false);
  const [hotelSearch, setHotelSearch] = useState("");

  useEffect(() => {
    fetchHotels();
  }, []);

  const fetchHotels = async () => {
    try {
      setLoading(true);
      const response = await hotelsApi.getAll();
      if (response.success && response.data) {
        setHotels(response.data as Hotel[]);
      }
    } catch (error) {
      console.error("Error fetching hotels:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    authApi.logout();
    router.push("/login");
  };

  const handleViewHotelDetails = (hotel: Hotel) => {
    setSelectedHotel(hotel);
    setHotelModalOpen(true);
  };

  const filteredHotels = hotels.filter((hotel) => {
    const searchTerm = hotelSearch.toLowerCase();
    return (
      hotel.name.toLowerCase().includes(searchTerm) ||
      (hotel.address && hotel.address.toLowerCase().includes(searchTerm)) ||
      (hotel.email && hotel.email.toLowerCase().includes(searchTerm)) ||
      (hotel.phoneNumber &&
        hotel.phoneNumber.toLowerCase().includes(searchTerm)) ||
      hotel.status.toLowerCase().includes(searchTerm) ||
      hotel.id.toString().includes(searchTerm)
    );
  });

  const HotelTableSkeleton = () => (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="flex items-center space-x-4 p-4">
          <Skeleton className="h-4 w-[200px]" />
          <Skeleton className="h-4 w-[150px]" />
          <Skeleton className="h-4 w-[100px]" />
          <Skeleton className="h-4 w-[100px]" />
          <Skeleton className="h-4 w-[100px]" />
          <Skeleton className="h-4 w-[120px]" />
          <Skeleton className="h-4 w-[80px]" />
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => router.push("/")}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                <Building2 className="h-8 w-8" />
                Hotels Management
              </h1>
              <p className="text-gray-600 mt-2">
                View and manage all hotels in the system
              </p>
            </div>
          </div>
          <Button onClick={handleLogout} variant="outline">
            Logout
          </Button>
        </div>

        {/* Hotel Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search hotels by name, address, email, phone, status, or ID..."
            value={hotelSearch}
            onChange={(e) => setHotelSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <HotelTableSkeleton />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Hotel Name</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Admins</TableHead>
                    <TableHead>Staff</TableHead>
                    <TableHead>Shuttles</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredHotels.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600">No hotels found</p>
                        <p className="text-sm text-gray-500 mt-1">
                          No hotels are registered in the system yet
                        </p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredHotels.map((hotel) => (
                      <TableRow key={hotel.id} className="hover:bg-gray-50">
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-blue-600" />
                            <div>
                              <p className="font-semibold">{hotel.name}</p>
                              <p className="text-xs text-gray-500">
                                ID: {hotel.id}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {hotel.address && (
                              <div className="flex items-center gap-1 text-sm">
                                <MapPin className="h-3 w-3 text-gray-400" />
                                <span className="truncate max-w-[150px]">
                                  {hotel.address}
                                </span>
                              </div>
                            )}
                            {!hotel.address && (
                              <span className="text-gray-400 text-sm">
                                No address
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {hotel.email && (
                              <div className="flex items-center gap-1 text-sm">
                                <Mail className="h-3 w-3 text-gray-400" />
                                <span className="truncate max-w-[120px]">
                                  {hotel.email}
                                </span>
                              </div>
                            )}
                            {hotel.phoneNumber && (
                              <div className="flex items-center gap-1 text-sm">
                                <Phone className="h-3 w-3 text-gray-400" />
                                <span>{hotel.phoneNumber}</span>
                              </div>
                            )}
                            {!hotel.email && !hotel.phoneNumber && (
                              <span className="text-gray-400 text-sm">
                                No contact
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Shield className="h-4 w-4 text-purple-600" />
                            <span className="font-medium">
                              {hotel._count.admins}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 text-sm">
                              <UserCheck className="h-3 w-3 text-green-600" />
                              <span>FD: {hotel._count.frontDesks}</span>
                            </div>
                            <div className="flex items-center gap-1 text-sm">
                              <Users className="h-3 w-3 text-blue-600" />
                              <span>Dr: {hotel._count.drivers}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Car className="h-4 w-4 text-orange-600" />
                            <span className="font-medium">
                              {hotel._count.shuttles}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              hotel.status === "Active"
                                ? "default"
                                : "secondary"
                            }
                          >
                            {hotel.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewHotelDetails(hotel)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modals */}
      <HotelDetailsModal
        open={hotelModalOpen}
        onOpenChange={setHotelModalOpen}
        hotel={selectedHotel}
      />
    </div>
  );
}

export default withAuth(HotelsPage);
