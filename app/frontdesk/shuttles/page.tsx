import PageLayout from "@/components/layout/page-layout";
import { ShuttleTable } from "@/components/interfaces/frontdesk";

export default function FrontdeskShuttlePage() {
  return (
    <PageLayout
      title="Shuttle Management"
      description="View vehicle details and total seat capacity."
    >
      <ShuttleTable />
    </PageLayout>
  );
}
