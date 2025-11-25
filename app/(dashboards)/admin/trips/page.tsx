import Link from "next/link";

import PageLayout from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { AdminTripTable } from "@/components/interfaces/admin";

export default function AdminTripsPage() {
  return (
    <PageLayout
      title="Trips"
      description="Manage your trips and their schedules."
      primaryActions={
        <Button asChild>
          <Link href="/admin/trips/new">Create Trip</Link>
        </Button>
      }
    >
      <AdminTripTable />
    </PageLayout>
  );
}

