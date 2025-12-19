"use client";

import { DriverShuttleSelection } from "@/components/interfaces/driver";

export default function DriverPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <DriverShuttleSelection />
      </div>
    </div>
  );
}
