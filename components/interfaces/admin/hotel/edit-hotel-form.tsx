"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import timezones from "timezones-list";
import {
  Copy,
  Loader2,
  MapPin,
  Navigation,
  RefreshCcw,
  Search,
  X,
  Image as ImageIcon,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useMapInstance } from "@/hooks/maps/use-map-instance";
import { usePlacesAutocomplete } from "@/hooks/maps/use-places-autocomplete";
import { useMarker } from "@/hooks/maps/use-marker";
import { LatLngLiteral } from "@/types/maps";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";

const formSchema = z.object({
  name: z.string().min(1, "Hotel name is required").max(150),
  slug: z
    .string()
    .min(1, "Slug is required")
    .max(160)
    .regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers, and hyphens only"),
  address: z.string().min(1, "Address is required"),
  phoneNumber: z.string().min(5, "Phone number is required"),
  email: z.string().email("Enter a valid email"),
  timeZone: z.string().min(1, "Time zone is required"),
  latitude: z
    .number()
    .min(-90, "Latitude must be greater than -90")
    .max(90, "Latitude must be less than 90"),
  longitude: z
    .number()
    .min(-180, "Longitude must be greater than -180")
    .max(180, "Longitude must be less than 180"),
});

type FormValues = z.infer<typeof formSchema>;

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const DEFAULT_CENTER: LatLngLiteral = { lat: 19.076, lng: 72.8777 };
const MAX_IMAGES = 10;

export function EditHotelForm() {
  const { user } = useAuthSession();
  const router = useRouter();
  const updateHotel = useAction(api.hotels.index.updateHotel);
  const generateUploadUrl = useMutation(api.files.index.generateUploadUrl);
  const uploadHotelImage = useMutation(api.files.index.uploadHotelImage);
  const removeHotelImage = useMutation(api.files.index.removeHotelImage);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [selectedLocation, setSelectedLocation] =
    useState<LatLngLiteral | null>(null);
  const [selectedAddress, setSelectedAddress] = useState("");
  const [newImages, setNewImages] = useState<File[]>([]);
  const [imagesToRemove, setImagesToRemove] = useState<Id<"files">[]>([]);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  const hotel = useQuery(
    api.hotels.index.getHotelByAdmin,
    user?.role === "admin" && user?.id
      ? { adminId: user.id as Id<"users"> }
      : "skip"
  );

  const existingImageUrls = useQuery(
    api.files.index.getHotelImageUrls,
    hotel && hotel.imageIds.length > 0 ? { fileIds: hotel.imageIds } : "skip"
  );

  const existingImages = useMemo(() => {
    if (!hotel || !existingImageUrls) return [];
    return hotel.imageIds
      .map((fileId, index) => ({
        fileId,
        url: existingImageUrls[index] || null,
      }))
      .filter((img) => !imagesToRemove.includes(img.fileId));
  }, [hotel, existingImageUrls, imagesToRemove]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      slug: "",
      address: "",
      phoneNumber: "",
      email: "",
      timeZone: "",
      latitude: 0,
      longitude: 0,
    },
  });

  const timezoneOptions = useMemo(
    () =>
      timezones.map((tz) => ({
        value: tz.tzCode,
        label: `${tz.tzCode} (${tz.label})`,
      })),
    []
  );

  // Initialize form with hotel data
  useEffect(() => {
    if (hotel && !isInitialized) {
      const coords = { lat: hotel.latitude, lng: hotel.longitude };
      setSelectedLocation(coords);
      setSelectedAddress(hotel.address);

      // Reset form with hotel data - ensure timeZone is included
      const formData = {
        name: hotel.name,
        slug: hotel.slug,
        address: hotel.address,
        phoneNumber: hotel.phoneNumber,
        email: hotel.email,
        timeZone: hotel.timeZone || "",
        latitude: hotel.latitude,
        longitude: hotel.longitude,
      };

      form.reset(formData);
      setIsInitialized(true);

      // Force update timeZone after a brief delay to ensure Select component renders
      if (hotel.timeZone) {
        requestAnimationFrame(() => {
          form.setValue("timeZone", hotel.timeZone, { shouldDirty: false });
        });
      }
    }
  }, [hotel, form, isInitialized]);

  // Update coordinates when map location changes
  useEffect(() => {
    if (selectedLocation && isInitialized) {
      form.setValue("latitude", selectedLocation.lat);
      form.setValue("longitude", selectedLocation.lng);
    }
  }, [form, selectedLocation, isInitialized]);

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
    center: selectedLocation || DEFAULT_CENTER,
    zoom: 13,
    onClick: handleMapClick,
  });

  useMarker(map, selectedLocation, { title: "Hotel location" });

  usePlacesAutocomplete({
    inputRef: searchInputRef,
    onPlaceChanged: (place) => {
      const geometry = place?.geometry?.location;
      if (!geometry) return;
      const lat = geometry.lat();
      const lng = geometry.lng();
      const newLocation = { lat, lng };
      setSelectedLocation(newLocation);
      const address =
        place?.formatted_address ??
        place?.name ??
        `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      setSelectedAddress(address);
      // Update form fields
      form.setValue("address", address, { shouldDirty: true });
      form.setValue("latitude", lat, { shouldDirty: true });
      form.setValue("longitude", lng, { shouldDirty: true });
    },
  });

  // Pan to the selected location when it changes (including from search)
  useEffect(() => {
    if (map && selectedLocation) {
      map.panTo(selectedLocation);
    }
  }, [map, selectedLocation]);

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
    if (!hotel) return;
    const coords = { lat: hotel.latitude, lng: hotel.longitude };
    setSelectedLocation(coords);
    setSelectedAddress(hotel.address);
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

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const imageFiles = files.filter((file) => file.type.startsWith("image/"));

    // Clear previous error
    setImageError(null);

    // Check if user is trying to add more than allowed
    const currentTotal = existingImages.length + newImages.length;
    const totalSelected = currentTotal + imageFiles.length;

    if (totalSelected > MAX_IMAGES) {
      const remainingSlots = MAX_IMAGES - currentTotal;
      if (remainingSlots > 0) {
        // Add what we can and show error
        const toAdd = imageFiles.slice(0, remainingSlots);
        setNewImages((prev) => [...prev, ...toAdd]);
        setImageError(
          `You can only add ${MAX_IMAGES} images total. Added ${toAdd.length} of ${imageFiles.length} selected. ${imageFiles.length - toAdd.length} image(s) were not added.`
        );
      } else {
        // Already at max
        setImageError(
          `Maximum ${MAX_IMAGES} images allowed. Please remove some images before adding new ones.`
        );
      }
    } else {
      // All images can be added
      setNewImages((prev) => [...prev, ...imageFiles]);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveNewImage = (index: number) => {
    setNewImages((prev) => prev.filter((_, i) => i !== index));
    setImageError(null); // Clear error when removing images
  };

  const handleRemoveExistingImage = (fileId: Id<"files">) => {
    setImagesToRemove((prev) => [...prev, fileId]);
    setImageError(null); // Clear error when removing images
  };

  const handleUndoRemoveImage = (fileId: Id<"files">) => {
    setImagesToRemove((prev) => prev.filter((id) => id !== fileId));
  };

  const uploadNewImages = async (): Promise<Id<"files">[]> => {
    if (!user?.id || !hotel || newImages.length === 0) {
      return [];
    }

    setIsUploadingImages(true);
    const fileIds: Id<"files">[] = [];

    try {
      for (const file of newImages) {
        const uploadUrl = await generateUploadUrl();
        const result = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });

        if (!result.ok) {
          throw new Error(`Failed to upload ${file.name}`);
        }

        const { storageId } = await result.json();
        const fileId = await uploadHotelImage({
          storageId,
          hotelId: hotel.id,
          userId: user.id as Id<"users">,
          fileName: file.name,
        });

        fileIds.push(fileId);
      }
    } finally {
      setIsUploadingImages(false);
    }

    return fileIds;
  };

  const watchedName = form.watch("name");

  useEffect(() => {
    if (!slugManuallyEdited && isInitialized) {
      form.setValue("slug", slugify(watchedName || ""));
    }
  }, [watchedName, slugManuallyEdited, form, isInitialized]);

  const handleSubmit = form.handleSubmit(async (values) => {
    if (!user?.id) {
      setRequestError("You must be signed in to update a hotel.");
      return;
    }
    if (!hotel) {
      setRequestError("Hotel not found.");
      return;
    }
    setRequestError(null);
    try {
      // Upload new images first
      const newImageIds = await uploadNewImages();

      // Remove images
      for (const fileId of imagesToRemove) {
        await removeHotelImage({
          hotelId: hotel.id,
          fileId,
        });
      }

      // Update hotel with new image IDs (already added via uploadHotelImage)
      await updateHotel({
        adminId: user.id as Id<"users">,
        hotelId: hotel.id,
        name: values.name,
        slug: values.slug,
        address: values.address,
        phoneNumber: values.phoneNumber,
        email: values.email,
        timeZone: values.timeZone,
        latitude: values.latitude,
        longitude: values.longitude,
        imageIdsToAdd: newImageIds.length > 0 ? newImageIds : undefined,
        imageIdsToRemove:
          imagesToRemove.length > 0 ? imagesToRemove : undefined,
      });
      router.refresh();
      setRequestError(null);
      setNewImages([]);
      setImagesToRemove([]);
    } catch (error: any) {
      setRequestError(error.message ?? "Failed to update hotel");
    }
  });

  if (!hotel) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="mr-2 size-4 animate-spin" />
        Loading hotel information...
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 rounded-xl border bg-card p-4 md:p-8 shadow-sm">
      <div className="space-y-2">
        <h2 className="text-3xl font-semibold tracking-tight">
          Hotel Settings
        </h2>
        <p className="text-sm text-muted-foreground">
          Update your hotel&apos;s information. Changes will be saved
          immediately.
        </p>
      </div>
      <Form {...form}>
        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-xl border bg-background/60 p-4 md:p-6 shadow-sm"
        >
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base font-medium">
                  Hotel Name <span className="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="Sunrise Suites"
                    autoComplete="organization"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="slug"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base font-medium">
                  Slug <span className="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="sunrise-suites"
                    {...field}
                    onChange={(event) => {
                      setSlugManuallyEdited(true);
                      field.onChange(event.target.value);
                    }}
                  />
                </FormControl>
                <p className="text-xs text-muted-foreground">
                  This will be used in URLs like{" "}
                  <span className="font-medium text-foreground">
                    /hotels/sunrise-suites
                  </span>
                </p>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base font-medium">
                  Address <span className="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="123 Ocean Avenue"
                    className="min-h-[100px]"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="phoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-medium">
                    Phone Number
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="tel"
                      placeholder="+1 555 000 0000"
                      className="pl-10"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-medium">Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="info@hotel.com"
                      className="pl-10"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="timeZone"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base font-medium">
                  Time Zone
                </FormLabel>
                <Select
                  value={field.value || ""}
                  onValueChange={field.onChange}
                >
                  <FormControl>
                    <SelectTrigger className="text-left">
                      <SelectValue placeholder="Select a time zone" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="max-h-64">
                    {timezoneOptions.map((option) => (
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
            <div className="relative h-[420px] w-full overflow-hidden rounded-xl border">
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
                  Latitude and longitude are automatically updated when you
                  select a location on the map.
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
                      <Input
                        readOnly
                        value={
                          Number.isNaN(field.value)
                            ? ""
                            : field.value.toFixed(6)
                        }
                      />
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
                      <Input
                        readOnly
                        value={
                          Number.isNaN(field.value)
                            ? ""
                            : field.value.toFixed(6)
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </section>
          <section className="rounded-md border p-4">
            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold">Hotel Images</p>
                <p className="text-xs text-muted-foreground">
                  Manage your hotel images (up to {MAX_IMAGES} total)
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageSelect}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setImageError(null);
                  fileInputRef.current?.click();
                }}
                disabled={
                  existingImages.length + newImages.length >= MAX_IMAGES ||
                  form.formState.isSubmitting
                }
                className="w-full"
              >
                <ImageIcon className="mr-2 h-4 w-4" />
                {existingImages.length + newImages.length >= MAX_IMAGES
                  ? `Maximum ${MAX_IMAGES} images reached`
                  : `Add Images (${existingImages.length + newImages.length}/${MAX_IMAGES})`}
              </Button>
              {imageError && (
                <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {imageError}
                </div>
              )}
              {(existingImages.length > 0 || newImages.length > 0) && (
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                  {/* Existing Images */}
                  {existingImages.map((img) => (
                    <div
                      key={img.fileId}
                      className="group relative aspect-video overflow-hidden rounded-lg border bg-muted"
                    >
                      {img.url ? (
                        <img
                          src={img.url}
                          alt="Hotel image"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                          Loading...
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveExistingImage(img.fileId)}
                        className="absolute right-2 top-2 rounded-full bg-destructive p-1.5 text-white opacity-0 transition-opacity group-hover:opacity-100"
                        disabled={form.formState.isSubmitting}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  {/* New Images */}
                  {newImages.map((file, index) => (
                    <div
                      key={`new-${index}`}
                      className="group relative aspect-video overflow-hidden rounded-lg border bg-muted"
                    >
                      <img
                        src={URL.createObjectURL(file)}
                        alt={`Preview ${index + 1}`}
                        className="h-full w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveNewImage(index)}
                        className="absolute right-2 top-2 rounded-full bg-destructive p-1.5 text-white opacity-0 transition-opacity group-hover:opacity-100"
                        disabled={form.formState.isSubmitting}
                      >
                        <X className="h-4 w-4" />
                      </button>
                      <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-2 py-1 text-xs text-white">
                        {file.name.length > 20
                          ? `${file.name.slice(0, 20)}...`
                          : file.name}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {/* Show removed images count */}
              {imagesToRemove.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {imagesToRemove.length} image(s) will be removed on save
                </p>
              )}
            </div>
          </section>
          {requestError ? (
            <div className="rounded-md border border-destructive bg-destructive/10 px-4 py-2 text-sm text-destructive">
              {requestError}
            </div>
          ) : null}
          <Button
            type="submit"
            size="lg"
            className="w-full md:w-auto"
            disabled={form.formState.isSubmitting || isUploadingImages}
          >
            {form.formState.isSubmitting || isUploadingImages ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                {isUploadingImages ? "Uploading images..." : "Saving..."}
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </form>
      </Form>
    </div>
  );
}
