"use client";

import { DriverShuttleSelection } from "@/components/interfaces/driver";

export default function DriverPage() {
  return (
    <div className="min-h-screen bg-linear-to-b from-background via-background to-muted/20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-6 sm:py-10">
        <DriverShuttleSelection />
      </div>
    </div>
  );
}
