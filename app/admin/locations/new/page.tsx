import PageLayout from "@/components/layout/page-layout";
import { AddAdminLocationForm } from "@/components/interfaces/admin";

export default function AddAdminLocationPage() {
  return (
    <PageLayout
      title="Create Location"
      description="Create a new private location for your hotel."
    >
      <AddAdminLocationForm />
    </PageLayout>
  );
}


