"use client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function NewReservationPage() {
  const router = useRouter();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <h1 className="text-2xl font-bold mb-4">Add New Reservation</h1>
      <Button onClick={() => router.push("/dashboard")}>
        Back to Dashboard
      </Button>
      <div className="mt-8 text-gray-500">Reservation form coming soon...</div>
    </div>
  );
}
