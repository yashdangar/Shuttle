"use client";

import { DriverTripsList } from "@/components/interfaces/driver";

export default function DriverTripsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-3xl px-4 py-6">
        <DriverTripsList />
      </div>
    </div>
  );
}
