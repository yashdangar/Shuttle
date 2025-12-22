"use client";

import { useParams } from "next/navigation";
import { FrontdeskTripInstanceDetail } from "@/components/interfaces/frontdesk";

export default function FrontdeskTripDetailPage() {
  const params = useParams<{ id: string }>();

  if (!params?.id) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <p>Trip not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <FrontdeskTripInstanceDetail tripInstanceId={params.id} />
    </div>
  );
}

