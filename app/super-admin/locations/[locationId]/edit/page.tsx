import type { Id } from "@/convex/_generated/dataModel";

import PageLayout from "@/components/layout/page-layout";
import { EditLocationForm } from "@/components/interfaces/superadmin";

type EditLocationPageProps = {
  params: Promise<{
    locationId: Id<"locations">;
  }>;
};

export default async function EditLocationPage({
  params,
}: EditLocationPageProps) {
  const { locationId } = await params;

  return (
    <PageLayout
      title="Edit location"
      description="Update this pickup or drop-off point’s address and coordinates."
    >
      <EditLocationForm locationId={locationId} />
    </PageLayout>
  );
}
