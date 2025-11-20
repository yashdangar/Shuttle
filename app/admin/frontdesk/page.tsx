"use client";
import PageLayout from "@/components/layout/page-layout";
import {
  CreateFrontdeskDialog,
  FrontdeskTable,
} from "@/components/interfaces/admin";

export default function AdminFrontdeskPage() {
  return (
    <PageLayout
      title="Frontdesk Management"
      description="Search, add, and manage your frontdesk staff in one place."
      primaryActions={<CreateFrontdeskDialog />}
    >
      <FrontdeskTable />
    </PageLayout>
  );
}

