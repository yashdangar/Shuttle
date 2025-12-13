"use client";

import { useParams } from "next/navigation";
import { TripInstanceDetail } from "@/components/interfaces/driver";

export default function DriverTripDetailPage() {
  const params = useParams<{ id: string }>();

  if (!params?.id) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p>Trip not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-3xl px-4 py-6">
        <TripInstanceDetail tripInstanceId={params.id} />
      </div>
    </div>
  );
}
