"use client";

import { useAuthSession } from "@/hooks/use-auth-session";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import PageLayout from "@/components/layout/page-layout";
import { CreateDriverDialog } from "@/components/interfaces/admin/driver/create-driver-dialog";
import { DriverTable } from "@/components/interfaces/admin/driver/driver-table";

export default function AdminDriversPage() {
  const { user: sessionUser, status: sessionStatus } = useAuthSession();
  const isAdmin = sessionUser?.role === "admin";
  const isAuthLoading = sessionStatus === "loading";

  if (!isAuthLoading && !isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Unauthorized</CardTitle>
          <CardDescription>
            Only administrators can manage drivers.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

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
