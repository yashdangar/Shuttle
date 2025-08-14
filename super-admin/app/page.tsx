"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { authApi, hotelsApi, adminsApi, locationsApi } from "@/lib/api";
import withAuth from "@/components/withAuth";
import { AddAdminModal } from "@/components/add-admin-modal";
import { AddLocationModal } from "@/components/add-location-modal";
import { EditLocationModal } from "@/components/edit-location-modal";
import { HotelDetailsModal } from "@/components/hotel-details-modal";
import { toast } from "sonner";
import {
  Building2,
  Users,
  Car,
  Shield,
  MapPin,
  Mail,
  Phone,
  UserCheck,
  Eye,
  Trash2,
  Plus,
  Search,
  Calendar,
} from "lucide-react";

interface Hotel {
  id: number;
  name: string;
  address: string | null;
  phoneNumber: string | null;
  email: string | null;
  status: string;
  createdAt: string;
  admins: Array<{ id: number; name: string; email: string; createdAt: string }>;
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

interface AdminHotelRef {
  id: number;
  name: string;
}

interface Admin {
  id: number;
  name: string;
  email: string;
  hotel?: AdminHotelRef | null;
  createdAt: string;
}

interface Location {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  address?: string | null;
  isPrivate?: boolean;
  createdAt: string;
  createdByAdmin?: {
    id: number;
    name: string;
    email: string;
  } | null;
}

function HomePage() {
  const router = useRouter();
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("hotels");

  // Search state
  const [hotelSearch, setHotelSearch] = useState("");
  const [adminSearch, setAdminSearch] = useState("");
  const [locationSearch, setLocationSearch] = useState("");

  // Modals state
  const [hotelModalOpen, setHotelModalOpen] = useState(false);
  const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(null);
  const [addAdminModalOpen, setAddAdminModalOpen] = useState(false);
  const [addLocationModalOpen, setAddLocationModalOpen] = useState(false);
  const [editLocationModalOpen, setEditLocationModalOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(
    null
  );

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      // Use Promise.all to fetch all data simultaneously
      const [hotelsResponse, adminsResponse, locationsResponse] =
        await Promise.all([
          hotelsApi.getAll(),
          adminsApi.getAll(),
          locationsApi.getAll(),
        ]);

      if (hotelsResponse.success && hotelsResponse.data) {
        setHotels(hotelsResponse.data as Hotel[]);
      }

      if (adminsResponse.success && adminsResponse.data) {
        setAdmins(adminsResponse.data as Admin[]);
      }

      if (locationsResponse.success && locationsResponse.data) {
        setLocations(locationsResponse.data as Location[]);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
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

  const handleDeleteAdmin = async (adminId: number) => {
    if (!confirm("Are you sure you want to delete this admin?")) return;

    try {
      const response = await adminsApi.delete(adminId);
      if (response.success) {
        setAdmins(admins.filter((admin) => admin.id !== adminId));
      }
    } catch (error) {
      console.error("Error deleting admin:", error);
    }
  };

  const handleDeleteLocation = async (locationId: number) => {
    if (!confirm("Are you sure you want to delete this location?")) return;

    try {
      // Check if location is private
      const location = locations.find((loc) => loc.id === locationId);
      if (location?.isPrivate) {
        toast.error("Cannot delete private locations created by admins");
        return;
      }

      const response = await locationsApi.delete(locationId);
      if (response.success) {
        setLocations(
          locations.filter((location) => location.id !== locationId)
        );
        toast.success("Location deleted successfully");
      } else {
        toast.error(response.error || "Failed to delete location");
      }
    } catch (error) {
      console.error("Error deleting location:", error);
      toast.error("Failed to delete location");
    }
  };

  const handleEditLocation = (location: Location) => {
    setSelectedLocation(location);
    setEditLocationModalOpen(true);
  };

  // Filter functions for search
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

  const filteredAdmins = admins.filter((admin) => {
    const searchTerm = adminSearch.toLowerCase();
    return (
      admin.name.toLowerCase().includes(searchTerm) ||
      admin.email.toLowerCase().includes(searchTerm) ||
      (admin.hotel && admin.hotel.name.toLowerCase().includes(searchTerm)) ||
      admin.id.toString().includes(searchTerm)
    );
  });

  const filteredLocations = locations.filter((location) => {
    const searchTerm = locationSearch.toLowerCase();
    return (
      location.name.toLowerCase().includes(searchTerm) ||
      (location.address &&
        location.address.toLowerCase().includes(searchTerm)) ||
      location.latitude.toString().includes(searchTerm) ||
      location.longitude.toString().includes(searchTerm) ||
      location.id.toString().includes(searchTerm)
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

  const AdminTableSkeleton = () => (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="flex items-center space-x-4 p-4">
          <Skeleton className="h-4 w-[200px]" />
          <Skeleton className="h-4 w-[250px]" />
          <Skeleton className="h-4 w-[150px]" />
          <Skeleton className="h-4 w-[120px]" />
          <Skeleton className="h-4 w-[80px]" />
        </div>
      ))}
    </div>
  );

  const LocationTableSkeleton = () => (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="flex items-center space-x-4 p-4">
          <Skeleton className="h-4 w-[200px]" />
          <Skeleton className="h-4 w-[120px]" />
          <Skeleton className="h-4 w-[120px]" />
          <Skeleton className="h-4 w-[120px]" />
          <Skeleton className="h-4 w-[80px]" />
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full border-b bg-white">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Building2 className="h-7 w-7 text-blue-600" />
            <div>
              <h1 className="text-xl md:text-2xl font-semibold">Super Admin</h1>
              <p className="text-xs md:text-sm text-gray-500">
                Manage hotels, admins, locations
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/hotels">
              <Button variant="ghost">Hotels</Button>
            </Link>
            <Link href="/admins">
              <Button variant="ghost">Admins</Button>
            </Link>
            <Link href="/locations">
              <Button variant="ghost">Locations</Button>
            </Link>
            <Button onClick={handleLogout} variant="outline">
              Logout
            </Button>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Total Hotels
                  </p>
                  <p className="text-2xl font-bold">
                    {loading ? "..." : hotels.length}
                  </p>
                </div>
                <Building2 className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Total Admins
                  </p>
                  <p className="text-2xl font-bold">
                    {loading ? "..." : admins.length}
                  </p>
                </div>
                <Shield className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Total Locations
                  </p>
                  <p className="text-2xl font-bold">
                    {loading ? "..." : locations.length}
                  </p>
                </div>
                <MapPin className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Total Shuttles
                  </p>
                  <p className="text-2xl font-bold">
                    {loading
                      ? "..."
                      : hotels.reduce(
                          (total, hotel) => total + hotel._count.shuttles,
                          0
                        )}
                  </p>
                </div>
                <Car className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="hotels">Hotels</TabsTrigger>
            <TabsTrigger value="admins">Admins</TabsTrigger>
            <TabsTrigger value="locations">Locations</TabsTrigger>
          </TabsList>

          {/* Hotels Tab */}
          <TabsContent value="hotels" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Hotels</h2>
            </div>

            {/* Hotel Search */}
            <div className="relative">
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
          </TabsContent>

          {/* Admins Tab */}
          <TabsContent value="admins" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">
                System Admins
              </h2>
              <Button onClick={() => setAddAdminModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Admin
              </Button>
            </div>

            {/* Admin Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search admins by name, email, hotel assignment, or ID..."
                value={adminSearch}
                onChange={(e) => setAdminSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            <Card>
              <CardContent className="p-0">
                {loading ? (
                  <AdminTableSkeleton />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Hotel Assignment</TableHead>
                        <TableHead>Created Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAdmins.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8">
                            <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-600">No admins found</p>
                            <p className="text-sm text-gray-500 mt-1">
                              Create your first admin to get started
                            </p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredAdmins.map((admin) => (
                          <TableRow key={admin.id}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <Shield className="h-4 w-4 text-purple-600" />
                                {admin.name}
                              </div>
                            </TableCell>
                            <TableCell>{admin.email}</TableCell>
                            <TableCell>
                              {admin.hotel ? (
                                <Badge variant="secondary">
                                  {admin.hotel.name}
                                </Badge>
                              ) : (
                                <Badge variant="outline">
                                  No Hotel Assigned
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 text-sm text-gray-500">
                                <Calendar className="h-3 w-3" />
                                {new Date(admin.createdAt).toLocaleDateString()}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteAdmin(admin.id)}
                                className="text-red-600 hover:text-red-800"
                              >
                                <Trash2 className="h-4 w-4" />
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
          </TabsContent>

          {/* Locations Tab */}
          <TabsContent value="locations" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">
                System Locations
              </h2>
              <Button onClick={() => setAddLocationModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Location
              </Button>
            </div>

            {/* Location Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search locations by name, address, coordinates, or ID..."
                value={locationSearch}
                onChange={(e) => setLocationSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            <Card>
              <CardContent className="p-0">
                {loading ? (
                  <LocationTableSkeleton />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Latitude</TableHead>
                        <TableHead>Longitude</TableHead>
                        <TableHead>Address</TableHead>
                        <TableHead>Created Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLocations.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8">
                            <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-600">No locations found</p>
                            <p className="text-sm text-gray-500 mt-1">
                              Create your first location to get started
                            </p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredLocations.map((location) => (
                          <TableRow key={location.id}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-green-600" />
                                <span>{location.name}</span>
                                {location.isPrivate && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                    Private
                                  </span>
                                )}
                              </div>
                              {location.createdByAdmin && (
                                <div className="text-xs text-gray-500 mt-1">
                                  Created by: {location.createdByAdmin.name}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                                {location.latitude.toFixed(6)}
                              </code>
                            </TableCell>
                            <TableCell>
                              <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                                {location.longitude.toFixed(6)}
                              </code>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                {location.address && (
                                  <div className="flex items-center gap-1 text-sm">
                                    <MapPin className="h-3 w-3 text-gray-400" />
                                    <span className="truncate max-w-[150px]">
                                      {location.address}
                                    </span>
                                  </div>
                                )}
                                {!location.address && (
                                  <span className="text-gray-400 text-sm">
                                    No address
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 text-sm text-gray-500">
                                <Calendar className="h-3 w-3" />
                                {new Date(
                                  location.createdAt
                                ).toLocaleDateString()}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditLocation(location)}
                                className="text-blue-600 hover:text-blue-800 mr-2"
                                disabled={location.isPrivate}
                              >
                                Edit
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  handleDeleteLocation(location.id)
                                }
                                className="text-red-600 hover:text-red-800"
                                disabled={location.isPrivate}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                              {location.isPrivate && (
                                <div className="text-xs text-gray-500 mt-1">
                                  Private locations cannot be edited
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Modals */}
      <HotelDetailsModal
        open={hotelModalOpen}
        onOpenChange={setHotelModalOpen}
        hotel={selectedHotel}
      />

      <AddAdminModal
        open={addAdminModalOpen}
        onOpenChange={setAddAdminModalOpen}
        onAdminCreated={fetchAllData}
      />

      <AddLocationModal
        open={addLocationModalOpen}
        onOpenChange={setAddLocationModalOpen}
        onLocationCreated={fetchAllData}
      />

      <EditLocationModal
        open={editLocationModalOpen}
        onOpenChange={setEditLocationModalOpen}
        location={
          selectedLocation
            ? {
                id: selectedLocation.id,
                name: selectedLocation.name,
                latitude: selectedLocation.latitude,
                longitude: selectedLocation.longitude,
                address: selectedLocation.address ?? undefined,
              }
            : null
        }
        onLocationUpdated={fetchAllData}
      />
    </div>
  );
}

export default withAuth(HomePage);
