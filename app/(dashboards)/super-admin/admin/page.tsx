"use client";

import PageLayout from "@/components/layout/page-layout";
import { AdminTable, CreateAdminDialog } from "@/components/interfaces/superadmin";

export default function AdminManagementPage() {
  return (
    <PageLayout
      title="Admins"
      description="Manage admin users and their permissions"
      primaryActions={<CreateAdminDialog />}
    >
      <AdminTable />
    </PageLayout>
  );
}
