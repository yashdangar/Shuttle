"use client";

import { useState, useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

type UploadType = "profile" | "hotel";

interface UseFileUploadOptions {
  onSuccess?: (fileId: Id<"files">) => void;
  onError?: (error: Error) => void;
}

export function useFileUpload(
  type: UploadType,
  options?: UseFileUploadOptions
) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const generateUploadUrl = useMutation(api.files.index.generateUploadUrl);
  const uploadProfilePicture = useMutation(api.files.index.uploadProfilePicture);
  const uploadHotelImage = useMutation(api.files.index.uploadHotelImage);

  const uploadFile = useCallback(
    async (
      file: File,
      metadata: {
        userId: Id<"users">;
        hotelId?: Id<"hotels">;
      }
    ): Promise<Id<"files"> | null> => {
      setIsUploading(true);
      setError(null);

      try {
        if (type === "hotel" && !metadata.hotelId) {
          throw new Error("hotelId is required for hotel image upload");
        }

        const postUrl = await generateUploadUrl();

        const result = await fetch(postUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });

        if (!result.ok) {
          throw new Error(`Upload failed: ${result.statusText}`);
        }

        const { storageId } = await result.json();

        let fileId: Id<"files">;

        if (type === "profile") {
          fileId = await uploadProfilePicture({
            storageId,
            userId: metadata.userId,
            fileName: file.name,
          });
        } else {
          fileId = await uploadHotelImage({
            storageId,
            hotelId: metadata.hotelId!,
            userId: metadata.userId,
            fileName: file.name,
          });
        }

        options?.onSuccess?.(fileId);
        return fileId;
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error("Unknown upload error");
        setError(error);
        options?.onError?.(error);
        return null;
      } finally {
        setIsUploading(false);
      }
    },
    [type, generateUploadUrl, uploadProfilePicture, uploadHotelImage, options]
  );

  return {
    uploadFile,
    isUploading,
    error,
  };
}
