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

interface EditLocationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLocationUpdated: () => void;
  location: {
    id: number;
    name: string;
    latitude: number;
    longitude: number;
    address?: string;
  } | null;
}

declare global {
  interface Window {
    google: any;
    initMap: () => void;
  }
}

let googleMapsLoaded = false;
let googleMapsLoading = false;

export function EditLocationModal({
  open,
  onOpenChange,
  onLocationUpdated,
  location,
}: EditLocationModalProps) {
  const [formData, setFormData] = useState({
    name: location?.name || "",
    latitude: location?.latitude?.toString() || "",
    longitude: location?.longitude?.toString() || "",
    address: location?.address || "",
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

  useEffect(() => {
    if (open && location) {
      setFormData({
        name: location.name || "",
        latitude: location.latitude?.toString() || "",
        longitude: location.longitude?.toString() || "",
        address: location.address || "",
      });
    }
  }, [open, location]);

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
      const lat = parseFloat(formData.latitude) || 40.7128;
      const lng = parseFloat(formData.longitude) || -74.006;
      const map = new window.google.maps.Map(mapRef.current, {
        center: { lat, lng },
        zoom: 10,
      });
      mapInstanceRef.current = map;
      // Place marker if coordinates exist
      if (!isNaN(lat) && !isNaN(lng)) {
        markerRef.current = new window.google.maps.Marker({
          position: { lat, lng },
          map: map,
          title: "Selected Location",
        });
      }
      map.addListener("click", (event: any) => {
        const lat = event.latLng.lat();
        const lng = event.latLng.lng();
        setFormData((prev) => ({
          ...prev,
          latitude: lat.toFixed(6),
          longitude: lng.toFixed(6),
        }));
        if (markerRef.current) {
          markerRef.current.setMap(null);
        }
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (error) setError("");
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
        if (markerRef.current) {
          markerRef.current.setMap(null);
        }
        markerRef.current = new window.google.maps.Marker({
          position: { lat, lng },
          map: mapInstanceRef.current,
          title: "Selected Location",
        });
        mapInstanceRef.current.setCenter({ lat, lng });
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      if (!location) return;
      const latitude = parseFloat(formData.latitude);
      const longitude = parseFloat(formData.longitude);
      if (isNaN(latitude) || isNaN(longitude)) {
        setError("Please provide valid latitude and longitude");
        setIsLoading(false);
        return;
      }
      const response = await locationsApi.update(location.id, {
        name: formData.name,
        latitude,
        longitude,
        address: formData.address,
      });
      if (response.success) {
        setFormData({ name: "", latitude: "", longitude: "", address: "" });
        if (markerRef.current) {
          markerRef.current.setMap(null);
          markerRef.current = null;
        }
        onLocationUpdated();
        onOpenChange(false);
      } else {
        setError(response.error || "Failed to update location");
      }
    } catch (error) {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
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
          <DialogTitle>Edit Location</DialogTitle>
          <DialogDescription>
            Update the location details and coordinates on the map.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  Updating...
                </>
              ) : (
                "Update Location"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
