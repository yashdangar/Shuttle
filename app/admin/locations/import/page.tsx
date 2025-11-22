import PageLayout from "@/components/layout/page-layout";
import { ImportLocationList } from "@/components/interfaces/admin";

export default function ImportLocationsPage() {
  return (
    <PageLayout
      title="Import Locations"
      description="Import public locations created by Super Admin. You can customize the name and address after importing."
    >
      <ImportLocationList />
    </PageLayout>
  );
}


