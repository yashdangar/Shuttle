"use client";

import { HotelList } from "@/components/interfaces/superadmin";
import PageLayout from "@/components/layout/page-layout";

export default function SuperAdminPage() {
  return (
    <PageLayout
      title="Hotels"
      description="Manage hotels and their configurations"
      size="large"
    >
      <HotelList />
    </PageLayout>
  );
}