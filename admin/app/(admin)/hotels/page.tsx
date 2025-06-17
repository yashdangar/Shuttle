"use client";

import type React from "react";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Plus,
  Edit,
  Trash2,
  Building2,
  AlertTriangle,
  Eye,
  EyeOff,
} from "lucide-react";
import { api } from "@/lib/api";
import { Loader } from "@/components/ui/loader";
import { TableLoader } from "../../../components/ui/table-loader";
import { EmptyState } from "../../../components/ui/empty-state";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { withAuth } from "@/components/withAuth";

interface Hotel {
  id: string;
  name: string;
  address: string;
  phoneNumber: string;
  email: string;
  createdAt: string;
  updatedAt: string;
  latitude: number;
  longitude: number;
}

declare global {
  interface Window {
    google: any;
    initMap?: () => void;
  }
}

function HotelsPage() {
  const router = useRouter();
  const [hotel, setHotel] = useState<Hotel | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingHotel, setEditingHotel] = useState<Hotel | null>(null);
  const [formData, setFormData] = useState<{
    name: string;
    address: string;
    phoneNumber: string;
    email: string;
    latitude: number;
    longitude: number;
  }>({
    name: "",
    address: "",
    phoneNumber: "",
    email: "",
    latitude: 0.0,
    longitude: 0.0,
  });

  // Delete confirmation dialog state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteFormData, setDeleteFormData] = useState({
    adminPassword: "",
    confirmDelete: false,
  });
  const [deleting, setDeleting] = useState(false);
  const [showDeletePassword, setShowDeletePassword] = useState(false);

  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  // Use environment variable instead of hardcoded key
  const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  const [mapLoading, setMapLoading] = useState(false);
  const [isGoogleMapsLoaded, setIsGoogleMapsLoaded] = useState(false);
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  const fetchHotelData = async () => {
    try {
      const response = await api.get(`/admin/get/hotel`);
      setHotel(response.hotel);
    } catch (error) {
      console.error("Error fetching hotel data:", error);
      toast.error("Failed to fetch hotel data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHotelData();
    // Get user's current location
    getUserLocation();
  }, []);

  const getUserLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by this browser");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLocationError(null);
      },
      (error) => {
        console.error("Error getting user location:", error);
        setLocationError(error.message);
        // Fallback to a default location (you can change this to any default location)
        setUserLocation({
          lat: 21.1702, // Gujarat, India as fallback
          lng: 72.8311,
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 600000, // 10 minutes
      }
    );
  };

  // Load Google Maps script once
  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY) {
      console.error("Google Maps API key is not provided");
      return;
    }

    if (window.google) {
      setIsGoogleMapsLoaded(true);
      return;
    }

    if (document.getElementById("google-maps-script")) {
      return;
    }

    const script = document.createElement("script");
    script.id = "google-maps-script";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`;
    script.async = true;
    script.onload = () => {
      setIsGoogleMapsLoaded(true);
    };
    script.onerror = () => {
      console.error("Failed to load Google Maps script");
    };
    document.head.appendChild(script);
  }, [GOOGLE_MAPS_API_KEY]);

  useEffect(() => {
    if (!isAddDialogOpen || !isGoogleMapsLoaded || !userLocation) {
      return;
    }

    const initializeMap = () => {
      const mapDiv = document.getElementById("map");
      if (!mapDiv || !window.google) {
        return;
      }

      setMapLoading(true);

      try {
        if (mapInstanceRef.current) {
          mapInstanceRef.current = null;
        }

        const defaultCenter =
          formData.latitude && formData.longitude
            ? { lat: formData.latitude, lng: formData.longitude }
            : userLocation;

        const mapOptions = {
          center: defaultCenter,
          zoom: formData.latitude && formData.longitude ? 15 : 12,
          mapTypeControl: true,
          streetViewControl: true,
          fullscreenControl: true,
        };

        mapInstanceRef.current = new window.google.maps.Map(mapDiv, mapOptions);

        // Add existing marker if coordinates exist
        if (formData.latitude && formData.longitude) {
          markerRef.current = new window.google.maps.Marker({
            position: { lat: formData.latitude, lng: formData.longitude },
            map: mapInstanceRef.current,
            draggable: true,
          });

          // Add drag listener to marker
          markerRef.current.addListener("dragend", (e: any) => {
            const lat = e.latLng.lat();
            const lng = e.latLng.lng();
            setFormData((prev) => ({ ...prev, latitude: lat, longitude: lng }));
          });
        }

        mapInstanceRef.current.addListener("click", (e: any) => {
          const lat = e.latLng.lat();
          const lng = e.latLng.lng();

          setFormData((prev) => ({ ...prev, latitude: lat, longitude: lng }));

          if (markerRef.current) {
            markerRef.current.setMap(null);
          }

          markerRef.current = new window.google.maps.Marker({
            position: { lat, lng },
            map: mapInstanceRef.current,
            draggable: true,
          });

          markerRef.current.addListener("dragend", (e: any) => {
            const newLat = e.latLng.lat();
            const newLng = e.latLng.lng();
            setFormData((prev) => ({
              ...prev,
              latitude: newLat,
              longitude: newLng,
            }));
          });
        });

        setMapLoading(false);
      } catch (error) {
        console.error("Error initializing map:", error);
        setMapLoading(false);
      }
    };

    // Small delay to ensure DOM is ready
    const timeoutId = setTimeout(initializeMap, 100);

    return () => {
      clearTimeout(timeoutId);
      // Cleanup marker when dialog closes
      if (markerRef.current) {
        markerRef.current.setMap(null);
        markerRef.current = null;
      }
    };
  }, [
    isAddDialogOpen,
    isGoogleMapsLoaded,
    userLocation,
    formData.latitude,
    formData.longitude,
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingHotel) {
        await api.put(`/admin/edit/hotel/${editingHotel.id}`, {
          name: formData.name,
          address: formData.address,
          phoneNumber: formData.phoneNumber,
          email: formData.email,
          latitude: formData.latitude,
          longitude: formData.longitude,
        });
        toast.success("Hotel updated successfully");
      } else {
        await api.post("/admin/add/hotel", {
          name: formData.name,
          address: formData.address,
          phoneNumber: formData.phoneNumber,
          email: formData.email,
          latitude: formData.latitude,
          longitude: formData.longitude,
        });
        toast.success("Hotel added successfully");
      }
      // Fetch updated data after successful submission
      await fetchHotelData();
      resetForm();
      setIsAddDialogOpen(false);
    } catch (error) {
      console.error("Error submitting hotel data:", error);
      toast.error("Failed to submit hotel data");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (hotel: Hotel) => {
    setEditingHotel(hotel);
    setFormData({
      name: hotel.name,
      address: hotel.address,
      phoneNumber: hotel.phoneNumber,
      email: hotel.email,
      latitude: hotel.latitude,
      longitude: hotel.longitude,
    });
    setIsAddDialogOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!hotel) return;

    // Client-side validation
    if (!deleteFormData.adminPassword.trim()) {
      toast.error("Admin password is required");
      return;
    }

    if (!deleteFormData.confirmDelete) {
      toast.error("Please confirm hotel deletion by checking the checkbox");
      return;
    }

    setDeleting(true);
    try {
      const response = await api.fetch(
        `/admin/delete/hotel/${hotel.id}/confirm`,
        {
          method: "DELETE",
          body: JSON.stringify({
            adminPassword: deleteFormData.adminPassword,
            confirmDelete: deleteFormData.confirmDelete,
          }),
        }
      );

      toast.success("Hotel and all related data deleted successfully");

      // Clear admin token cookie and redirect to login
      document.cookie =
        "adminToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      router.push("/login");
    } catch (error: any) {
      console.error("Delete hotel error:", error);
      const errorMessage =
        error.response?.data?.message || "Failed to delete hotel";
      toast.error(errorMessage);
    } finally {
      setDeleting(false);
      setIsDeleteDialogOpen(false);
      resetDeleteForm();
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      address: "",
      phoneNumber: "",
      email: "",
      latitude: 0.0,
      longitude: 0.0,
    });
    setEditingHotel(null);
    // Clean up map references
    if (markerRef.current) {
      markerRef.current.setMap(null);
      markerRef.current = null;
    }
  };

  const resetDeleteForm = () => {
    setDeleteFormData({
      adminPassword: "",
      confirmDelete: false,
    });
    setShowDeletePassword(false);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Hotels Management
            </h1>
            <p className="text-slate-600">
              Manage hotel partners and their information
            </p>
          </div>
        </div>
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Building2 className="w-5 h-5 text-blue-600" />
              <span>Hotels List</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hotel Name</TableHead>
                  <TableHead>Latitude</TableHead>
                  <TableHead>Longitude</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead>Updated At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableLoader columns={6} />
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Hotels Management
          </h1>
          <p className="text-slate-600">
            Manage hotel partners and their information
          </p>
          {!GOOGLE_MAPS_API_KEY && (
            <p className="text-red-600 text-sm mt-2">
              Warning: Google Maps API key is not configured
            </p>
          )}
        </div>
        {!hotel && (
          <Button
            className="bg-blue-600 hover:bg-blue-700"
            onClick={() => setIsAddDialogOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add New Hotel
          </Button>
        )}
      </div>

      <Dialog
        open={isAddDialogOpen}
        onOpenChange={(open) => {
          setIsAddDialogOpen(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingHotel ? "Edit Hotel" : "Add New Hotel"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Hotel Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Enter hotel name"
                required
                disabled={submitting}
              />
            </div>
            <div>
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                placeholder="Enter address"
                required
                disabled={submitting}
              />
            </div>
            <div>
              <Label htmlFor="phoneNumber">Phone Number</Label>
              <Input
                id="phoneNumber"
                value={formData.phoneNumber}
                onChange={(e) =>
                  setFormData({ ...formData, phoneNumber: e.target.value })
                }
                placeholder="Enter phone number"
                required
                disabled={submitting}
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="Enter email"
                required
                disabled={submitting}
              />
            </div>
            <div>
              <Label>Location (Click on map to select)</Label>
              {locationError && (
                <p className="text-amber-600 text-sm mb-2">
                  Location access: {locationError}. Using default location.
                </p>
              )}
              <div
                style={{
                  width: "100%",
                  height: 300,
                  background: "#e5e7eb",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 8,
                  marginBottom: 8,
                  position: "relative",
                }}
              >
                {(mapLoading || !isGoogleMapsLoaded || !userLocation) && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-70 z-10 rounded">
                    <Loader />
                    <span className="ml-2">
                      {!isGoogleMapsLoaded
                        ? "Loading Google Maps..."
                        : !userLocation
                        ? "Getting your location..."
                        : "Initializing map..."}
                    </span>
                  </div>
                )}
                {!GOOGLE_MAPS_API_KEY && (
                  <div className="absolute inset-0 flex items-center justify-center bg-red-50 z-10 rounded">
                    <span className="text-red-600">
                      Google Maps API key not configured
                    </span>
                  </div>
                )}
                <div
                  id="map"
                  style={{
                    width: "100%",
                    height: "100%",
                    borderRadius: 8,
                    opacity:
                      mapLoading || !isGoogleMapsLoaded || !userLocation
                        ? 0.3
                        : 1,
                  }}
                />
              </div>
              <div className="flex space-x-2">
                <div className="flex-1">
                  <Label htmlFor="latitude">Latitude</Label>
                  <Input
                    id="latitude"
                    type="number"
                    step="any"
                    value={formData.latitude || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        latitude: parseFloat(e.target.value) || 0,
                      })
                    }
                    placeholder="Latitude"
                    required
                    disabled={submitting}
                  />
                </div>
                <div className="flex-1">
                  <Label htmlFor="longitude">Longitude</Label>
                  <Input
                    id="longitude"
                    type="number"
                    step="any"
                    value={formData.longitude || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        longitude: parseFloat(e.target.value) || 0,
                      })
                    }
                    placeholder="Longitude"
                    required
                    disabled={submitting}
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAddDialogOpen(false);
                  resetForm();
                }}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader className="w-4 h-4 mr-2" />
                    {editingHotel ? "Updating..." : "Adding..."}
                  </>
                ) : editingHotel ? (
                  "Update Hotel"
                ) : (
                  "Add Hotel"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Delete Hotel - Critical Action
            </AlertDialogTitle>
            <AlertDialogDescription className="text-left space-y-3">
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="font-semibold text-red-800 mb-2">
                  ⚠️ This action will permanently delete:
                </p>
                <ul className="list-disc list-inside text-red-700 text-sm space-y-1">
                  <li>The hotel and all its information</li>
                  <li>All admin accounts associated with this hotel</li>
                  <li>All front desk staff accounts</li>
                  <li>All driver accounts and credentials</li>
                  <li>All shuttle information</li>
                  <li>All schedules and bookings</li>
                  <li>All guest data and reservations</li>
                  <li>All notifications and related data</li>
                </ul>
              </div>

              <div className="space-y-4">
                <div>
                  <Label
                    htmlFor="deletePassword"
                    className="text-sm font-medium"
                  >
                    Enter your admin password to confirm:
                  </Label>
                  <div className="relative mt-1">
                    <Input
                      id="deletePassword"
                      type={showDeletePassword ? "text" : "password"}
                      value={deleteFormData.adminPassword}
                      onChange={(e) =>
                        setDeleteFormData({
                          ...deleteFormData,
                          adminPassword: e.target.value,
                        })
                      }
                      placeholder="Enter your admin password"
                      className="pr-10"
                      disabled={deleting}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowDeletePassword(!showDeletePassword)}
                      disabled={deleting}
                    >
                      {showDeletePassword ? (
                        <EyeOff className="h-4 w-4 text-gray-500" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-500" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="confirmDelete"
                    checked={deleteFormData.confirmDelete}
                    onCheckedChange={(checked) =>
                      setDeleteFormData({
                        ...deleteFormData,
                        confirmDelete: checked === true,
                      })
                    }
                    disabled={deleting}
                  />
                  <Label
                    htmlFor="confirmDelete"
                    className="text-sm leading-tight cursor-pointer"
                  >
                    I understand that this action is irreversible and will
                    delete ALL data associated with this hotel, including all
                    user credentials.
                  </Label>
                </div>
              </div>

              <p className="text-xs text-gray-600 mt-3">
                After deletion, you will be automatically logged out and
                redirected to the login page.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={resetDeleteForm} disabled={deleting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              disabled={
                deleting ||
                !deleteFormData.adminPassword.trim() ||
                !deleteFormData.confirmDelete
              }
            >
              {deleting ? (
                <>
                  <Loader className="w-4 h-4 mr-2" />
                  Deleting...
                </>
              ) : (
                "Delete Hotel & All Data"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            <span>Hotels List</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!hotel ? (
            <EmptyState
              icon={Building2}
              title="No hotels available"
              description="Add your first hotel to start managing your partners."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hotel Name</TableHead>
                  <TableHead>Latitude</TableHead>
                  <TableHead>Longitude</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead>Updated At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">{hotel.name}</TableCell>
                  <TableCell>{hotel.latitude}</TableCell>
                  <TableCell>{hotel.longitude}</TableCell>
                  <TableCell>
                    {new Date(hotel.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {new Date(hotel.updatedAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(hotel)}
                        disabled={deleting}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteClick(hotel.id)}
                        className="text-red-600 hover:text-red-700"
                        disabled={deleting}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default withAuth(HotelsPage);