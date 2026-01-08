"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "convex/react";
import {
  Copy,
  Loader2,
  MapPin,
  Navigation,
  RefreshCcw,
  Search,
} from "lucide-react";

import { api } from "@/convex/_generated/api";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useMapInstance } from "@/hooks/maps/use-map-instance";
import { usePlacesAutocomplete } from "@/hooks/maps/use-places-autocomplete";
import { useMarker } from "@/hooks/maps/use-marker";
import { LatLngLiteral } from "@/types/maps";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const coordinateSchema = z
  .string()
  .min(1, "Coordinate is required")
  .refine((value) => !Number.isNaN(Number(value)), {
    message: "Enter a valid number",
  });

const locationTypeOptions = [
  { value: "airport", label: "Airport" },
  { value: "hotel", label: "Hotel" },
  { value: "other", label: "Other" },
];

const formSchema = z.object({
  name: z.string().min(1, "Location name is required").max(200),
  address: z.string().min(1, "Address is required"),
  latitude: coordinateSchema,
  longitude: coordinateSchema,
  locationType: z.enum(["airport", "hotel", "other"]),
});

type FormValues = z.infer<typeof formSchema>;

const DEFAULT_CENTER: LatLngLiteral = { lat: 19.076, lng: 72.8777 };

export function AddLocationForm() {
  const router = useRouter();
  const { user } = useAuthSession();
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedLocation, setSelectedLocation] =
    useState<LatLngLiteral>(DEFAULT_CENTER);
  const [selectedAddress, setSelectedAddress] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);

  const createLocation = useAction(api.locations.index.createLocation);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      address: "",
      latitude: DEFAULT_CENTER.lat.toFixed(6),
      longitude: DEFAULT_CENTER.lng.toFixed(6),
      locationType: "airport",
    },
  });

  useEffect(() => {
    form.setValue("latitude", selectedLocation.lat.toFixed(6));
    form.setValue("longitude", selectedLocation.lng.toFixed(6));
  }, [form, selectedLocation]);

  const handleMapClick = (coords: LatLngLiteral) => {
    setSelectedLocation(coords);
    setSelectedAddress(`${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`);
  };

  const {
    containerRef,
    map,
    isLoaded: isMapReady,
    isLoading: isMapLoading,
    error: mapError,
  } = useMapInstance({
    center: selectedLocation,
    zoom: 13,
    onClick: handleMapClick,
  });

  useMarker(map, selectedLocation, { title: "Selected location" });

  usePlacesAutocomplete({
    inputRef: searchInputRef,
    onPlaceChanged: (place) => {
      const geometry = place?.geometry?.location;
      if (!geometry) return;

      const lat = geometry.lat();
      const lng = geometry.lng();
      setSelectedLocation({ lat, lng });
      setSelectedAddress(
        place?.formatted_address ??
          place?.name ??
          `${lat.toFixed(5)}, ${lng.toFixed(5)}`
      );
    },
  });

  const handleUseCurrentLocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setRequestError("Geolocation is not supported in this browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setSelectedLocation(coords);
        setSelectedAddress("Current location");
        setRequestError(null);
      },
      (error) => {
        setRequestError(error.message || "Unable to fetch current location.");
      }
    );
  };

  const handleResetLocation = () => {
    setSelectedLocation(DEFAULT_CENTER);
    setSelectedAddress("");
  };

  const handleCopyAddress = async () => {
    if (!selectedAddress) return;
    form.setValue("address", selectedAddress, { shouldDirty: true });

    if (typeof navigator === "undefined" || !navigator.clipboard) {
      return;
    }

    try {
      await navigator.clipboard.writeText(selectedAddress);
    } catch {
      // no-op
    }
  };

  const handleSubmit = async (values: FormValues) => {
    if (!user?.id) {
      setRequestError("You must be signed in to create a location.");
      return;
    }

    try {
      setIsSubmitting(true);
      setRequestError(null);
      await createLocation({
        currentUserId: user.id as any,
        name: values.name.trim(),
        address: values.address.trim(),
        latitude: parseFloat(values.latitude),
        longitude: parseFloat(values.longitude),
        locationType: values.locationType,
      });
      router.push("/super-admin/locations");
    } catch (error: any) {
      setRequestError(error.message || "Failed to create location.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto mb-10 max-w-5xl space-y-10">
      <Form {...form}>
        <form className="space-y-8" onSubmit={form.handleSubmit(handleSubmit)}>
          <section className="grid gap-6 md:grid-cols-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location name</FormLabel>
                  <FormControl>
                    <Input placeholder="Arrivals Lobby Gate 4" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="123 Main Street, Queens, NY 11430"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </section>

          <FormField
            control={form.control}
            name="locationType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Location type</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select location type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {locationTypeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <section className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Search on Google Maps
              </label>
              <InputGroup>
                <InputGroupInput
                  ref={searchInputRef}
                  placeholder="Search any place to drop a pin"
                  autoComplete="off"
                  onKeyDown={(e) => {
                    // Prevent form submission on Enter key
                    if (e.key === "Enter") {
                      e.preventDefault();
                    }
                  }}
                />
                <InputGroupAddon>
                  <Search className="h-4 w-4" />
                </InputGroupAddon>
                <InputGroupAddon align="inline-end">
                  {selectedAddress ? "Pinned" : "Search"}
                </InputGroupAddon>
              </InputGroup>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopyAddress}
                disabled={!selectedAddress}
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy as address
              </Button>
              <p className="text-xs text-muted-foreground">
                {selectedAddress
                  ? `Pinned: ${selectedAddress}`
                  : "To store coordinates, select a point on the map."}
              </p>
            </div>
            <div className="relative h-[420px] overflow-hidden rounded-xl border">
              {!isMapReady || isMapLoading ? (
                <Skeleton className="absolute inset-0 h-full w-full rounded-none" />
              ) : null}
              <div ref={containerRef} className="h-full w-full rounded-xl" />
              {mapError && (
                <div className="absolute left-4 top-4 rounded-md bg-destructive/90 px-3 py-2 text-sm text-white shadow-lg">
                  {mapError.message}
                </div>
              )}
            </div>
          </section>

          <section className="rounded-md border p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">Coordinates</p>
                <p className="text-xs text-muted-foreground">
                  Lat/Lng live here so we don’t show them at the top or in the
                  table.
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleUseCurrentLocation}
                >
                  <Navigation className="mr-2 h-4 w-4" />
                  Use my location
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleResetLocation}
                >
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  Reset
                </Button>
              </div>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="latitude"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" />
                      Latitude
                    </FormLabel>
                    <FormControl>
                      <Input readOnly {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="longitude"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" />
                      Longitude
                    </FormLabel>
                    <FormControl>
                      <Input readOnly {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </section>

          {requestError && (
            <p className="text-sm text-destructive" role="alert">
              {requestError}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.push("/super-admin/locations")}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save location"
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
