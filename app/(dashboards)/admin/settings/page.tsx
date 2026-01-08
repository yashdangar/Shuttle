"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAuthSession } from "@/hooks/use-auth-session";
import { EditHotelForm } from "@/components/interfaces/admin/hotel/edit-hotel-form";
import { Loader2 } from "lucide-react";

export default function AdminSettingsPage() {
  const { user, status } = useAuthSession();
  const router = useRouter();

  const hotel = useQuery(
    api.hotels.index.getHotelByAdmin,
    user?.role === "admin" && user?.id
      ? { adminId: user.id as Id<"users"> }
      : "skip"
  );

  useEffect(() => {
    // If user is not an admin, redirect away
    if (status === "authenticated" && user?.role !== "admin") {
      router.push("/");
      return;
    }

    // If admin doesn't have a hotel, redirect to welcome page
    if (
      status === "authenticated" &&
      user?.role === "admin" &&
      hotel !== undefined
    ) {
      if (hotel === null) {
        router.push("/admin/welcome");
      }
    }
  }, [status, user, hotel, router]);

  // Show loading while checking authentication or hotel status
  if (status === "loading" || hotel === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // If user is not an admin, show nothing (redirect will happen)
  if (user?.role !== "admin") {
    return null;
  }

  // If admin doesn't have a hotel, show nothing (redirect will happen)
  if (hotel === null) {
    return null;
  }

  // Show settings page with edit hotel form
  return (
    <div className="container mx-auto min-h-screen py-12">
      <div className="mx-auto max-w-4xl">
        <EditHotelForm />
      </div>
    </div>
  );
}
