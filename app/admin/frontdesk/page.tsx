"use client";

import { useMemo } from "react";
import { useQuery } from "convex/react";
import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { Loader2 } from "lucide-react";
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
  HotelSetupRequired,
} from "@/components/interfaces/admin";

export default function AdminFrontdeskPage() {
  const { user: sessionUser, status } = useAuthSession();
  const isAdmin = sessionUser?.role === "admin";
  const isSuperAdmin = sessionUser?.role === "superadmin";
  const canManage = isAdmin || isSuperAdmin;
  const hotelArgs = useMemo(
    () =>
      isAdmin && sessionUser?.id
        ? { adminId: sessionUser.id as Id<"users"> }
        : undefined,
    [isAdmin, sessionUser?.id]
  );
  const hotel = useQuery(api.hotels.getHotelByAdmin, hotelArgs ?? "skip");
  const isLoading =
    status === "loading" || (isAdmin && hotelArgs && hotel === undefined);

  if (!canManage && status !== "loading") {
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="mr-2 size-4 animate-spin" />
        Loading frontdesk data...
      </div>
    );
  }

  if (isAdmin && hotel === null) {
    return <HotelSetupRequired />;
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

