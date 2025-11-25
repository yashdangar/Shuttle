import Link from "next/link";

import PageLayout from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { LocationTable } from "@/components/interfaces/superadmin";

export default function LocationsPage() {
  return (
    <PageLayout
      title="Locations"
      description="Track pickup and drop-off points across every property."
      primaryActions={
        <Button asChild>
          <Link href="/super-admin/locations/new">Add location</Link>
        </Button>
      }
    >
      <LocationTable />
    </PageLayout>
  );
}
