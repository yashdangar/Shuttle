import Link from "next/link";

import PageLayout from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { AdminLocationTable } from "@/components/interfaces/admin";

export default function AdminLocationsPage() {
  return (
    <PageLayout
      title="Locations"
      description="Manage your private locations and imported public locations."
      primaryActions={
        <>
          <Button asChild variant="outline">
            <Link href="/admin/locations/import">Import Location</Link>
          </Button>
          <Button asChild>
            <Link href="/admin/locations/new">Create Location</Link>
          </Button>
        </>
      }
    >
      <AdminLocationTable />
    </PageLayout>
  );
}


