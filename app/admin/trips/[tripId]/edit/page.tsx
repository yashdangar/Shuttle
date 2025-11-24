import type { Id } from "@/convex/_generated/dataModel";

import PageLayout from "@/components/layout/page-layout";
import { EditAdminTripForm } from "@/components/interfaces/admin";

type EditAdminTripPageProps = {
  params: Promise<{
    tripId: Id<"trips">;
  }>;
};

export default async function EditAdminTripPage({
  params,
}: EditAdminTripPageProps) {
  const { tripId } = await params;

  return (
    <PageLayout
      title="Edit Trip"
      description="Update trip details and slots without shuttle assignments."
    >
      <EditAdminTripForm tripId={tripId} />
    </PageLayout>
  );
}

