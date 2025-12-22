import PageLayout from "@/components/layout/page-layout";
import { FrontdeskTripTable } from "@/components/interfaces/frontdesk/trips/trip-table";

export default function FrontdeskTripsPage() {
  return (
    <PageLayout
      title="Trips"
      description="View all trips for your hotel."
    >
      <FrontdeskTripTable />
    </PageLayout>
  );
}
