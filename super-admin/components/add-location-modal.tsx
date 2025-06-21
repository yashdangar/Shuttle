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
import { MapPin } from "lucide-react";
import { locationsApi } from "@/lib/api";

interface AddLocationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLocationCreated: () => void;
}

declare global {
  interface Window {
    google: any;
    initMap: () => void;
  }
}

// Global variable to track if Google Maps script is loaded
let googleMapsLoaded = false;
let googleMapsLoading = false;

export function AddLocationModal({
  open,
  onOpenChange,
  onLocationCreated,
}: AddLocationModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    latitude: "",
    longitude: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [mapLoaded, setMapLoaded] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  useEffect(() => {
    if (open && !mapLoaded) {
      loadGoogleMaps();
    }
  }, [open]);

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
    // If Google Maps is already loaded
    if (window.google && googleMapsLoaded) {
      setMapLoaded(true);
      setTimeout(() => initializeMap(), 100);
      return;
    }

    // If Google Maps is currently loading, wait for it
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

    // Start loading Google Maps
    googleMapsLoading = true;

    try {
      // Check if script already exists
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
      console.error("Error initializing map:", error);
      setError("Failed to initialize map");
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

      if (isNaN(latitude) || isNaN(longitude)) {
        setError("Please provide valid latitude and longitude");
        return;
      }

      const response = await locationsApi.create({
        name: formData.name,
        latitude,
        longitude,
      });

      if (response.success) {
        // Reset form
        setFormData({ name: "", latitude: "", longitude: "" });
        if (markerRef.current) {
          markerRef.current.setMap(null);
          markerRef.current = null;
        }
        onLocationCreated();
        onOpenChange(false);
      } else {
        setError(response.error || "Failed to create location");
      }
    } catch (error) {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({ name: "", latitude: "", longitude: "" });
    setError("");
    if (markerRef.current) {
      markerRef.current.setMap(null);
      markerRef.current = null;
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Add New Location</DialogTitle>
          <DialogDescription>
            Create a new location by entering details and selecting coordinates
            on the map.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Form Fields */}
            <div className="space-y-4">
              <div className="space-y-2">
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

              <div className="space-y-2">
                <Label htmlFor="latitude">Latitude</Label>
                <Input
                  id="latitude"
                  name="latitude"
                  type="number"
                  step="any"
                  placeholder="Enter latitude"
                  value={formData.latitude}
                  onChange={handleInputChange}
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="longitude">Longitude</Label>
                <Input
                  id="longitude"
                  name="longitude"
                  type="number"
                  step="any"
                  placeholder="Enter longitude"
                  value={formData.longitude}
                  onChange={handleInputChange}
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-700">
                    <p className="font-medium">How to select coordinates:</p>
                    <ul className="mt-1 list-disc list-inside text-xs">
                      <li>Click anywhere on the map to place a marker</li>
                      <li>Or manually enter latitude and longitude</li>
                      <li>The marker will update automatically</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Google Map */}
            <div className="space-y-2">
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
                  Creating...
                </>
              ) : (
                "Create Location"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
