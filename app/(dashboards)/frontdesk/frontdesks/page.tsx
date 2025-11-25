import PageLayout from "@/components/layout/page-layout";
import { FrontdeskTable } from "@/components/interfaces/frontdesk";

export default function FrontdeskFrontdeskPage() {
  return (
    <PageLayout
      title="Frontdesk Management"
      description="View your frontdesk staff in one place."
    >
      <FrontdeskTable />
    </PageLayout>
  );
}
