"use client";

import { useAuthSession } from "@/hooks/use-auth-session";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import PageLayout from "@/components/layout/page-layout";
import {
  CreateFrontdeskDialog,
  FrontdeskTable,
} from "@/components/interfaces/admin";

export default function AdminFrontdeskPage() {
  const { user: sessionUser, status: sessionStatus } = useAuthSession();
  const isAdmin = sessionUser?.role === "admin";
  const isAuthLoading = sessionStatus === "loading";

  if (!isAuthLoading && !isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Unauthorized</CardTitle>
          <CardDescription>
            Only administrators can manage frontdesk staff.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

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
