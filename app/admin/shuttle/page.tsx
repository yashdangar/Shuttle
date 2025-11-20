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
  CreateShuttleDialog,
  ShuttleTable,
} from "@/components/interfaces/admin";

export default function AdminShuttlePage() {
  const { user: sessionUser, status: sessionStatus } = useAuthSession();
  const isAdmin = sessionUser?.role === "admin";
  const isAuthLoading = sessionStatus === "loading";

  if (!isAuthLoading && !isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Unauthorized</CardTitle>
          <CardDescription>
            Only administrators can manage shuttles.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

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
