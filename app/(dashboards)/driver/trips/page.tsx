"use client";

import { DriverTripsList } from "@/components/interfaces/driver";

export default function DriverTripsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-4 py-6">
        <DriverTripsList />
      </div>
    </div>
  );
}
