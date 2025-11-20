"use client";

import PageLayout from "@/components/layout/page-layout";
import {
  CreateShuttleDialog,
  ShuttleTable,
} from "@/components/interfaces/admin";

export default function AdminShuttlePage() {
  return (
    <PageLayout
      title="Shuttle Management"
      description="Maintain vehicle details and total seat capacity."
      primaryActions={<CreateShuttleDialog />}
    >
      <ShuttleTable />
    </PageLayout>
  );
}

