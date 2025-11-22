import PageLayout from "@/components/layout/page-layout";
import { DriverTable } from "@/components/interfaces/frontdesk";

export default function FrontdeskDriversPage() {
  return (
    <PageLayout
      title="Driver Management"
      description="View your drivers in one place."
    >
      <DriverTable />
    </PageLayout>
  );
}
