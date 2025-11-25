"use client";

import PageLayout from "@/components/layout/page-layout";
import {
  CreateDriverDialog,
  DriverTable,
} from "@/components/interfaces/admin";

export default function AdminDriversPage() {

  return (
    <PageLayout
      title="Driver Management"
      description="Search, add, and manage your drivers in one place."
      primaryActions={<CreateDriverDialog />}
    >
      <DriverTable />
    </PageLayout>
  );
}

