"use client";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function ReservationDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id;
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <h1 className="text-2xl font-bold mb-4">Reservation Details</h1>
      <div className="mb-4">
        Reservation ID: <span className="font-mono">{id}</span>
      </div>
      <Button onClick={() => router.push("/dashboard")}>
        Back to Dashboard
      </Button>
      <div className="mt-8 text-gray-500">
        Reservation details and edit form coming soon...
      </div>
    </div>
  );
}
