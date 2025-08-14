"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { authApi, locationsApi } from "@/lib/api";
import withAuth from "@/components/withAuth";
import { AddLocationModal } from "@/components/add-location-modal";
import { EditLocationModal } from "@/components/edit-location-modal";
import {
  MapPin,
  Plus,
  Trash2,
  Calendar,
  Search,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";

interface Location {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  address?: string;
  createdAt: string;
  isPrivate?: boolean;
  createdByAdmin?: {
    id: number;
    name: string;
    email: string;
  } | null;
}

function LocationsPage() {
  const router = useRouter();
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [addLocationModalOpen, setAddLocationModalOpen] = useState(false);
  const [editLocationModalOpen, setEditLocationModalOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(
    null
  );
  const [locationSearch, setLocationSearch] = useState("");

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      setLoading(true);
      const response = await locationsApi.getAll();
      if (response.success && response.data) {
        setLocations(response.data as Location[]);
      }
    } catch (error) {
      console.error("Error fetching locations:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    authApi.logout();
    router.push("/login");
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
                <MapPin className="h-8 w-8" />
                System Locations
              </h1>
              <p className="text-gray-600 mt-2">
                Manage pickup and drop-off locations across the system
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => setAddLocationModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Location
            </Button>
            <Button onClick={handleLogout} variant="outline">
              Logout
            </Button>
          </div>
        </div>

        {/* Location Search */}
        <div className="relative mb-6">
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
                            {new Date(location.createdAt).toLocaleDateString()}
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
                            onClick={() => handleDeleteLocation(location.id)}
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
      </div>

      {/* Modals */}
      <AddLocationModal
        open={addLocationModalOpen}
        onOpenChange={setAddLocationModalOpen}
        onLocationCreated={fetchLocations}
      />

      <EditLocationModal
        open={editLocationModalOpen}
        onOpenChange={setEditLocationModalOpen}
        location={selectedLocation}
        onLocationUpdated={fetchLocations}
      />
    </div>
  );
}

export default withAuth(LocationsPage);
