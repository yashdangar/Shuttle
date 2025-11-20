import PageLayout from "@/components/layout/page-layout";
import { AddLocationForm } from "@/components/interfaces/superadmin";

export default function AddLocationPage() {
  return (
    <PageLayout
      title="Add location"
      description="Create a new pickup or drop-off point with its address and coordinates."
    >
      <AddLocationForm />
    </PageLayout>
  );
}
