"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MapPin, DollarSign } from "lucide-react";
import { api } from "@/lib/api";

interface AddPrivateLocationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLocationCreated: () => void;
}

declare global {
  interface Window {
    google: any;
  }
}

// Global variable to track if Google Maps script is loaded
let googleMapsLoaded = false;
let googleMapsLoading = false;

export function AddPrivateLocationModal({
  open,
  onOpenChange,
  onLocationCreated,
}: AddPrivateLocationModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    latitude: "",
    longitude: "",
    address: "",
    price: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [mapLoaded, setMapLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  useEffect(() => {
    if (open && !mapLoaded) {
      loadGoogleMaps();
    }
  }, [open, mapLoaded]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (markerRef.current) {
        markerRef.current.setMap(null);
        markerRef.current = null;
      }
    };
  }, []);

  const loadGoogleMaps = async () => {
    if (window.google && googleMapsLoaded) {
      setMapLoaded(true);
      setTimeout(() => initializeMap(), 100);
      return;
    }

    if (googleMapsLoading) {
      const checkLoaded = setInterval(() => {
        if (googleMapsLoaded && window.google) {
          clearInterval(checkLoaded);
          setMapLoaded(true);
          setTimeout(() => initializeMap(), 100);
        }
      }, 100);
      return;
    }

    googleMapsLoading = true;

    try {
      const existingScript = document.querySelector(
        'script[src*="maps.googleapis.com"]'
      );
      if (existingScript) {
        existingScript.remove();
      }

      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`;
      script.async = true;
      script.defer = true;

      script.onload = () => {
        googleMapsLoaded = true;
        googleMapsLoading = false;
        setMapLoaded(true);
        setTimeout(() => initializeMap(), 100);
      };

      script.onerror = () => {
        googleMapsLoading = false;
        setError("Failed to load Google Maps. Please check your API key.");
      };

      document.head.appendChild(script);
    } catch (error) {
      googleMapsLoading = false;
      setError("Failed to load Google Maps");
    }
  };

  const initializeMap = () => {
    if (!mapRef.current || !window.google) return;

    try {
      const map = new window.google.maps.Map(mapRef.current, {
        center: { lat: 40.7128, lng: -74.006 }, // Default to NYC
        zoom: 10,
      });

      mapInstanceRef.current = map;

      // Add click listener to place marker and get coordinates
      map.addListener("click", (event: any) => {
        const lat = event.latLng.lat();
        const lng = event.latLng.lng();

        // Update form data
        setFormData((prev) => ({
          ...prev,
          latitude: lat.toFixed(6),
          longitude: lng.toFixed(6),
        }));

        // Clear existing marker
        if (markerRef.current) {
          markerRef.current.setMap(null);
        }

        // Place new marker
        markerRef.current = new window.google.maps.Marker({
          position: { lat, lng },
          map: map,
          title: "Selected Location",
        });
      });
    } catch (error) {
      setError("Failed to initialize map");
    }
  };

  // Perform search using Google Maps Geocoding API
  const performSearch = async (query: string) => {
    if (!mapLoaded || !mapInstanceRef.current) {
      return;
    }

    setSearching(true);
    try {
      const geocoder = new window.google.maps.Geocoder();

      geocoder.geocode({ address: query }, (results: any, status: any) => {
        if (
          status === window.google.maps.GeocoderStatus.OK &&
          results &&
          results.length > 0
        ) {
          const result = results[0];
          const location = result.geometry.location;
          const lat = location.lat();
          const lng = location.lng();

          // Update form data with new coordinates
          setFormData((prev) => ({
            ...prev,
            latitude: lat.toFixed(6),
            longitude: lng.toFixed(6),
            address: result.formatted_address || prev.address,
          }));

          // Update map marker
          if (markerRef.current) {
            markerRef.current.setMap(null);
          }

          markerRef.current = new window.google.maps.Marker({
            position: { lat, lng },
            map: mapInstanceRef.current,
            draggable: true,
          });

          // Center map on searched location
          mapInstanceRef.current.setCenter({ lat, lng });
          mapInstanceRef.current.setZoom(15);

          // Add drag listener to update form when marker is dragged
          markerRef.current.addListener("dragend", (e: any) => {
            const newLat = e.latLng.lat();
            const newLng = e.latLng.lng();
            setFormData((prev) => ({
              ...prev,
              latitude: newLat.toFixed(6),
              longitude: newLng.toFixed(6),
            }));
          });

          // Show success message
          setError("");
        } else {
          setError(`No location found: ${status}`);
        }
        setSearching(false);
      });
    } catch (error) {
      setError("Failed to search for location");
      setSearching(false);
    }
  };

  // Handle search button click
  const handleSearchClick = () => {
    if (searchQuery.trim()) {
      performSearch(searchQuery.trim());
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear error when user starts typing
    if (error) setError("");

    // Update marker if coordinates are manually entered
    if (
      (name === "latitude" || name === "longitude") &&
      mapInstanceRef.current
    ) {
      const lat = parseFloat(name === "latitude" ? value : formData.latitude);
      const lng = parseFloat(name === "longitude" ? value : formData.longitude);

      if (
        !isNaN(lat) &&
        !isNaN(lng) &&
        lat >= -90 &&
        lat <= 90 &&
        lng >= -180 &&
        lng <= 180
      ) {
        // Clear existing marker
        if (markerRef.current) {
          markerRef.current.setMap(null);
        }

        // Place new marker
        markerRef.current = new window.google.maps.Marker({
          position: { lat, lng },
          map: mapInstanceRef.current,
          title: "Selected Location",
        });

        // Center map on the marker
        mapInstanceRef.current.setCenter({ lat, lng });
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const latitude = parseFloat(formData.latitude);
      const longitude = parseFloat(formData.longitude);
      const price = parseFloat(formData.price);

      if (isNaN(latitude) || isNaN(longitude)) {
        setError(
          "Please provide valid latitude and longitude. Use the search or click on the map to set coordinates."
        );
        setIsLoading(false);
        return;
      }

      if (isNaN(price) || price <= 0) {
        setError("Please provide a valid price greater than 0.");
        setIsLoading(false);
        return;
      }

      if (latitude === 0 && longitude === 0) {
        setError(
          "Please set coordinates by searching for a location or clicking on the map."
        );
        setIsLoading(false);
        return;
      }

      const response = await api.post("/admin/add/private-location", {
        name: formData.name,
        latitude: formData.latitude,
        longitude: formData.longitude,
        address: formData.address,
        price: formData.price,
      });

      // Reset form
      setFormData({
        name: "",
        latitude: "",
        longitude: "",
        address: "",
        price: "",
      });
      if (markerRef.current) {
        markerRef.current.setMap(null);
        markerRef.current = null;
      }
      onLocationCreated();
      onOpenChange(false);
    } catch (error: any) {
      setError(error.message || "Failed to create location");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      name: "",
      latitude: "",
      longitude: "",
      address: "",
      price: "",
    });
    setSearchQuery("");
    setSearching(false);
    setError("");
    setMapLoaded(false);
    if (markerRef.current) {
      markerRef.current.setMap(null);
      markerRef.current = null;
    }
    if (mapInstanceRef.current) {
      mapInstanceRef.current = null;
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Private Location</DialogTitle>
          <DialogDescription>
            Create a new private location for your hotel with pricing.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Location Name */}
          <div className="space-y-1">
            <Label htmlFor="name">Location Name</Label>
            <Input
              id="name"
              name="name"
              type="text"
              placeholder="Enter location name"
              value={formData.name}
              onChange={handleInputChange}
              required
              disabled={isLoading}
            />
          </div>

          {/* Price Field */}
          <div className="space-y-1">
            <Label htmlFor="price" className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Price per Person
            </Label>
            <Input
              id="price"
              name="price"
              type="number"
              step="0.01"
              min="0"
              placeholder="Enter price per person"
              value={formData.price}
              onChange={handleInputChange}
              required
              disabled={isLoading}
            />
          </div>

          {/* Address Field */}
          <div className="space-y-1">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              name="address"
              type="text"
              placeholder="Enter full address"
              value={formData.address}
              onChange={handleInputChange}
              disabled={isLoading}
            />
          </div>

          {/* Google Map - Big Size */}
          <div className="space-y-1">
            <Label>Select Location on Map</Label>
            <div
              ref={mapRef}
              className="w-full h-[300px] rounded-lg border border-gray-200"
              style={{ minHeight: "300px" }}
            >
              {!mapLoaded && (
                <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-lg">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-2"></div>
                    <p className="text-sm text-gray-600">Loading Map...</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Search Field */}
          <div className="space-y-1">
            <Label htmlFor="search" className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Search Location
              {!mapLoaded && (
                <span className="text-xs text-amber-600">
                  (Loading Google Maps...)
                </span>
              )}
            </Label>
            <div className="flex gap-2">
              <Input
                id="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for a location, address, or place..."
                disabled={isLoading || !mapLoaded || searching}
                className="flex-1"
              />
              <Button
                type="button"
                onClick={handleSearchClick}
                disabled={
                  isLoading || !mapLoaded || searching || !searchQuery.trim()
                }
                className="px-4"
              >
                {searching ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  "Search"
                )}
              </Button>
            </div>
            <p className="text-xs text-slate-500">
              Search for a location to center the map and update coordinates.
            </p>
          </div>

          {/* Current Coordinates Display */}
          <div className="p-2 bg-blue-50 rounded-lg">
            <p className="text-xs font-medium text-blue-800 mb-1">
              Current Coordinates:
            </p>
            <div className="grid grid-cols-2 gap-1 text-xs">
              <div>
                <span className="text-blue-600">Lat:</span>{" "}
                <span className="font-mono">
                  {formData.latitude || "Not set"}
                </span>
              </div>
              <div>
                <span className="text-blue-600">Lng:</span>{" "}
                <span className="font-mono">
                  {formData.longitude || "Not set"}
                </span>
              </div>
            </div>
            {(!formData.latitude ||
              !formData.longitude ||
              formData.latitude === "0" ||
              formData.longitude === "0") && (
              <p className="text-xs text-amber-600 mt-1">
                ⚠️ Use search or click map to set coordinates
              </p>
            )}
          </div>

          {/* Hidden Coordinates Fields */}
          <input type="hidden" name="latitude" value={formData.latitude} />
          <input type="hidden" name="longitude" value={formData.longitude} />

          {/* Instructions */}
          <div className="p-2 bg-blue-50 rounded-lg">
            <div className="flex items-start gap-2">
              <MapPin className="h-3 w-3 text-blue-600 mt-0.5" />
              <div className="text-xs text-blue-700">
                <p className="font-medium">How to select coordinates:</p>
                <ul className="mt-1 list-disc list-inside text-xs">
                  <li>Search for a location using the search field above</li>
                  <li>Click anywhere on the map to place a marker</li>
                  <li>Drag the marker to fine-tune the location</li>
                  <li>Or manually enter latitude and longitude</li>
                </ul>
              </div>
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Adding...
                </>
              ) : (
                "Add Private Location"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
