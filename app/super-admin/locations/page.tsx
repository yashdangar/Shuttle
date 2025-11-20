import PageLayout from "@/components/layout/page-layout";
import { LocationManager } from "@/components/maps/location-manager";

export default function LocationsPage() {
  return (
    <PageLayout title="Locations" description="Manage locations">
      <LocationManager />
    </PageLayout>
  );
}
