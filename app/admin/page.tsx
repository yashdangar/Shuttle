"use client";

import { useMemo, useRef, useState } from "react";
import { useQuery } from "convex/react";
import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useFileUpload } from "@/hooks/use-file-upload";
import PageLayout from "@/components/layout/page-layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreateHotelForm } from "@/components/interfaces/admin";
import { Loader2, Upload, Image as ImageIcon, X } from "lucide-react";
import { toast } from "sonner";

export default function AdminPage() {
  const { user: sessionUser, status } = useAuthSession();
  const isAdmin = sessionUser?.role === "admin";
  const hotelArgs = useMemo(
    () =>
      isAdmin && sessionUser?.id
        ? { adminId: sessionUser.id as Id<"users"> }
        : undefined,
    [isAdmin, sessionUser?.id]
  );

  const hotel = useQuery(api.hotels.getHotelByAdmin, hotelArgs ?? "skip");
  const isLoading = status === "loading" || (isAdmin && hotel === undefined);

  const hotelImageUrls = useQuery(
    api.files.getHotelImageUrls,
    hotel?.imageIds && hotel.imageIds.length > 0
      ? ({ fileIds: hotel.imageIds } as const)
      : "skip"
  );

  if (!isAdmin && status !== "loading") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Unauthorized</CardTitle>
          <CardDescription>
            You must be an administrator to access this area.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="mr-2 size-4 animate-spin" />
        Loading hotel info...
      </div>
    );
  }

  if (!hotel) {
    return (
      <PageLayout
        title="Let's set up your hotel"
        description="Create your hotel to unlock driver, frontdesk, and shuttle management."
        size="large"
      >
        <CreateHotelForm />
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title={hotel.name}
      description="You're all set! Manage your staff and shuttles using the navigation."
      size="large"
    >
      <div className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-2">
          <HotelImagesCard
            hotel={hotel}
            imageUrls={hotelImageUrls ?? []}
            userId={sessionUser?.id as Id<"users">}
          />
          <HotelDetailsCard hotel={hotel} />
        </div>
      </div>
    </PageLayout>
  );
}

type SelectedFile = {
  file: File;
  preview: string;
  id: string;
};

function HotelImagesCard({
  hotel,
  imageUrls,
  userId,
}: {
  hotel: NonNullable<
    ReturnType<typeof useQuery<typeof api.hotels.getHotelByAdmin>>
  >;
  imageUrls: (string | null)[];
  userId: Id<"users">;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const MAX_IMAGES = 10;
  const currentImageCount = hotel.imageIds.length;
  const canUploadMore = currentImageCount < MAX_IMAGES;

  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const { uploadFile } = useFileUpload("hotel");

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const filesArray = Array.from(files);
    const remainingSlots = MAX_IMAGES - currentImageCount;
    const newFiles: SelectedFile[] = [];

    for (const file of filesArray) {
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name} is not an image file`);
        continue;
      }

      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} is larger than 10MB`);
        continue;
      }

      if (
        currentImageCount + selectedFiles.length + newFiles.length >=
        MAX_IMAGES
      ) {
        toast.error(`Maximum ${MAX_IMAGES} images allowed per hotel`);
        break;
      }

      const preview = URL.createObjectURL(file);
      newFiles.push({
        file,
        preview,
        id: `${Date.now()}-${Math.random()}`,
      });
    }

    if (newFiles.length > 0) {
      setSelectedFiles((prev) => {
        const total = prev.length + newFiles.length;
        if (total > remainingSlots) {
          toast.error(
            `You can only select ${remainingSlots} more image${
              remainingSlots === 1 ? "" : "s"
            }. Maximum ${MAX_IMAGES} images allowed.`
          );
          return prev;
        }
        return [...prev, ...newFiles];
      });
    }

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const handleRemoveSelected = (id: string) => {
    setSelectedFiles((prev) => {
      const fileToRemove = prev.find((f) => f.id === id);
      if (fileToRemove) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      return prev.filter((f) => f.id !== id);
    });
  };

  const handleUploadAll = async () => {
    if (selectedFiles.length === 0) return;

    setIsUploading(true);
    const uploadPromises = selectedFiles.map((selectedFile) =>
      uploadFile(selectedFile.file, { userId, hotelId: hotel.id })
    );

    try {
      await Promise.all(uploadPromises);
      toast.success(
        `Successfully uploaded ${selectedFiles.length} image${
          selectedFiles.length === 1 ? "" : "s"
        }`
      );
      selectedFiles.forEach((f) => URL.revokeObjectURL(f.preview));
      setSelectedFiles([]);
    } catch (error: any) {
      toast.error(error.message || "Failed to upload some images");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSelectClick = () => {
    if (!canUploadMore) {
      toast.error(`Maximum ${MAX_IMAGES} images allowed per hotel`);
      return;
    }
    inputRef.current?.click();
  };

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Hotel Images</CardTitle>
            <CardDescription>
              Upload up to {MAX_IMAGES} images of your hotel
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {selectedFiles.length > 0 && (
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={handleUploadAll}
                disabled={isUploading}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload {selectedFiles.length}
                  </>
                )}
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSelectClick}
              disabled={isUploading || !canUploadMore}
            >
              Select Images
            </Button>
          </div>
        </div>
        <div className="text-xs text-muted-foreground">
          {currentImageCount} / {MAX_IMAGES} images
          {selectedFiles.length > 0 && (
            <span className="ml-2">({selectedFiles.length} selected)</span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          disabled={isUploading || !canUploadMore}
        />

        {selectedFiles.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">
              Selected Images ({selectedFiles.length})
            </p>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {selectedFiles.map((selectedFile) => (
                <div
                  key={selectedFile.id}
                  className="group relative aspect-video overflow-hidden rounded-lg border-2 border-primary/50 bg-muted"
                >
                  <img
                    src={selectedFile.preview}
                    alt={selectedFile.file.name}
                    className="h-full w-full object-cover"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute right-2 top-2 h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
                    onClick={() => handleRemoveSelected(selectedFile.id)}
                    disabled={isUploading}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-1">
                    <p className="truncate text-xs text-white">
                      {selectedFile.file.name}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {imageUrls.length === 0 && selectedFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 p-12 text-center">
            <ImageIcon className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-sm font-medium text-muted-foreground">
              No images uploaded yet
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Click "Select Images" to add hotel images
            </p>
          </div>
        ) : imageUrls.length > 0 ? (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">
              Uploaded Images ({imageUrls.length})
            </p>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {imageUrls.map((url, index) => (
                <div
                  key={hotel.imageIds[index]}
                  className="group relative aspect-video overflow-hidden rounded-lg border bg-muted"
                >
                  {url ? (
                    <img
                      src={url}
                      alt={`Hotel image ${index + 1}`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function HotelDetailsCard({
  hotel,
}: {
  hotel: NonNullable<
    ReturnType<typeof useQuery<typeof api.hotels.getHotelByAdmin>>
  >;
}) {
  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>Hotel Details</CardTitle>
        <CardDescription>{hotel.address}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <span className="text-sm font-medium text-muted-foreground">
              Phone
            </span>
            <span className="text-sm text-foreground">{hotel.phoneNumber}</span>
          </div>
          <div className="flex items-start justify-between">
            <span className="text-sm font-medium text-muted-foreground">
              Email
            </span>
            <span className="text-sm text-foreground">{hotel.email}</span>
          </div>
          <div className="flex items-start justify-between">
            <span className="text-sm font-medium text-muted-foreground">
              Time Zone
            </span>
            <span className="text-sm text-foreground">{hotel.timeZone}</span>
          </div>
          <div className="flex items-start justify-between">
            <span className="text-sm font-medium text-muted-foreground">
              Coordinates
            </span>
            <span className="text-sm text-foreground">
              {hotel.latitude.toFixed(6)}, {hotel.longitude.toFixed(6)}
            </span>
          </div>
        </div>
        <div className="pt-4 border-t">
          <p className="text-xs text-muted-foreground">
            Use the sidebar to manage drivers, frontdesk staff, shuttles, and
            more.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
