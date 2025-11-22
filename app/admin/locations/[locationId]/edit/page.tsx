import type { Id } from "@/convex/_generated/dataModel";

import PageLayout from "@/components/layout/page-layout";
import { EditAdminLocationForm } from "@/components/interfaces/admin";

type EditAdminLocationPageProps = {
  params: Promise<{
    locationId: Id<"locations">;
  }>;
};

export default async function EditAdminLocationPage({
  params,
}: EditAdminLocationPageProps) {
  const { locationId } = await params;

  return (
    <PageLayout
      title="Edit location"
      description="Update this location's name and address."
    >
      <EditAdminLocationForm locationId={locationId} />
    </PageLayout>
  );
}


