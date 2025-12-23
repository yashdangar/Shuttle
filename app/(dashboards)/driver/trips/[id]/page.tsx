"use client";

import { useParams } from "next/navigation";
import { TripInstanceDetail } from "@/components/interfaces/driver";

export default function DriverTripDetailPage() {
  const params = useParams<{ id: string }>();

  if (!params?.id) {
    return (
      <div className="min-h-screen bg-linear-to-b from-background via-background to-muted/20 flex items-center justify-center">
        <p className="text-muted-foreground">Trip not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-b from-background via-background to-muted/20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-6 sm:py-10">
        <TripInstanceDetail tripInstanceId={params.id} />
      </div>
    </div>
  );
}
