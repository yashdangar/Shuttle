import PageLayout from "@/components/layout/page-layout";
import { AddAdminTripForm } from "@/components/interfaces/admin";

export default function AddAdminTripPage() {
  return (
    <PageLayout
      title="Create Trip"
      description="Create a new trip with multiple recurring time slots."
    >
      <AddAdminTripForm />
    </PageLayout>
  );
}

